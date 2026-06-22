-- VENUMAIS
-- Produtos: permissões, dimensões, variação no pedido e bucket de imagens.

begin;

create or replace function public.can_manage_products(target_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.store_members member
    where member.store_id = target_store_id
      and member.user_id = auth.uid()
      and member.status = 'active'
      and (
        member.role in ('owner', 'admin')
        or coalesce((member.permissions ->> 'manage_products')::boolean, false)
      )
  );
$$;

-- Dependências do catálogo (caso 20260621180000 não tenha sido aplicada)
alter table public.products
  add column if not exists sell_without_stock boolean not null default false,
  add column if not exists stock_visible boolean not null default true;

alter table public.store_orders
  add column if not exists stock_deducted boolean not null default false;

create or replace function public.deduct_order_stock(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item record;
  v_product record;
begin
  if exists (
    select 1
    from public.store_orders o
    where o.id = p_order_id
      and o.stock_deducted = true
  ) then
    return;
  end if;

  for v_item in
    select item.product_id, item.quantity
    from public.store_order_items item
    where item.order_id = p_order_id
      and item.product_id is not null
  loop
    select product.*
      into v_product
    from public.products product
    where product.id = v_item.product_id
    for update;

    if not found then
      raise exception 'Produto indisponível.';
    end if;

    if not coalesce(v_product.sell_without_stock, false) then
      if v_item.quantity > coalesce(v_product.stock_qty, 0) then
        raise exception 'Quantidade maior que o estoque disponível.';
      end if;

      update public.products
        set stock_qty = stock_qty - v_item.quantity,
            updated_at = timezone('utc', now())
      where id = v_product.id;
    end if;
  end loop;

  update public.store_orders
    set stock_deducted = true
  where id = p_order_id;
end;
$$;

revoke all on function public.deduct_order_stock(uuid) from public;
grant execute on function public.deduct_order_stock(uuid) to authenticated;

alter table public.products
  add column if not exists height_cm numeric(8, 2),
  add column if not exists width_cm numeric(8, 2),
  add column if not exists length_cm numeric(8, 2),
  add column if not exists weight_kg numeric(8, 3);

alter table public.products
  drop constraint if exists products_height_cm_non_negative,
  drop constraint if exists products_width_cm_non_negative,
  drop constraint if exists products_length_cm_non_negative,
  drop constraint if exists products_weight_kg_non_negative;

alter table public.products
  add constraint products_height_cm_non_negative check (height_cm is null or height_cm >= 0),
  add constraint products_width_cm_non_negative check (width_cm is null or width_cm >= 0),
  add constraint products_length_cm_non_negative check (length_cm is null or length_cm >= 0),
  add constraint products_weight_kg_non_negative check (weight_kg is null or weight_kg >= 0);

alter table public.store_order_items
  add column if not exists variation text;

alter table public.store_order_items
  drop constraint if exists store_order_items_variation_length;

alter table public.store_order_items
  add constraint store_order_items_variation_length
    check (variation is null or char_length(variation) between 1 and 80);

drop function if exists public.list_public_products(uuid);

create function public.list_public_products(p_store_id uuid)
returns table (
  id uuid,
  name text,
  category text,
  price numeric,
  promo_price numeric,
  wholesale_price numeric,
  wholesale_min_qty integer,
  price_visible boolean,
  featured boolean,
  stock_qty integer,
  sell_without_stock boolean,
  stock_visible boolean,
  thumb_color text,
  image_url text,
  variations jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.name,
    p.category,
    p.price,
    p.promo_price,
    p.wholesale_price,
    p.wholesale_min_qty,
    p.price_visible,
    p.featured,
    p.stock_qty,
    p.sell_without_stock,
    p.stock_visible,
    p.thumb_color,
    p.image_url,
    p.variations
  from public.products p
  where p.store_id = p_store_id
    and p.active = true
    and (p.stock_qty > 0 or p.sell_without_stock = true)
  order by p.featured desc, lower(p.name);
$$;

revoke all on function public.list_public_products(uuid) from public;
grant execute on function public.list_public_products(uuid) to anon, authenticated;

create or replace function public.create_client_order(
  p_store_id uuid,
  p_delivery_type text,
  p_notes text,
  p_coupon_code text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid;
  v_order_id uuid;
  v_order_code integer;
  v_item jsonb;
  v_product record;
  v_quantity integer;
  v_unit_price numeric(12, 2);
  v_subtotal numeric(12, 2) := 0;
  v_has_hidden_price boolean := false;
  v_variation text;
  v_product_name text;
begin
  if auth.uid() is null then
    raise exception 'Autenticação necessária.';
  end if;

  select customer.id
    into v_customer_id
  from public.customers customer
  where customer.store_id = p_store_id
    and customer.user_id = auth.uid()
  limit 1;

  if not found then
    raise exception 'Cliente não vinculado à loja.';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Informe ao menos um item.';
  end if;

  select coalesce(max(order_row.order_code), 0) + 1
    into v_order_code
  from public.store_orders order_row
  where order_row.store_id = p_store_id;

  insert into public.store_orders (
    store_id,
    customer_id,
    order_code,
    status,
    order_type,
    source,
    delivery_type,
    notes,
    coupon_code
  )
  values (
    p_store_id,
    v_customer_id,
    v_order_code,
    'new',
    'order',
    'client',
    coalesce(nullif(trim(p_delivery_type), ''), 'pickup'),
    nullif(trim(p_notes), ''),
    nullif(trim(p_coupon_code), '')
  )
  returning id into v_order_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item ->> 'quantity')::integer;
    v_variation := nullif(trim(v_item ->> 'variation'), '');

    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Quantidade inválida.';
    end if;

    select product.*
      into v_product
    from public.products product
    where product.id = (v_item ->> 'product_id')::uuid
      and product.store_id = p_store_id
      and product.active = true;

    if not found then
      raise exception 'Produto indisponível.';
    end if;

    if v_variation is not null then
      if not exists (
        select 1
        from jsonb_array_elements_text(v_product.variations) variation_row(value)
        where lower(trim(variation_row.value)) = lower(v_variation)
      ) then
        raise exception 'Variação inválida para o produto %.', v_product.name;
      end if;
    elsif jsonb_array_length(v_product.variations) > 0 then
      raise exception 'Escolha uma variação para o produto %.', v_product.name;
    end if;

    if not coalesce(v_product.sell_without_stock, false)
       and v_quantity > coalesce(v_product.stock_qty, 0) then
      raise exception 'Quantidade maior que o estoque disponível.';
    end if;

    if coalesce(v_product.price_visible, false) then
      if coalesce(v_product.promo_price, 0) > 0 then
        v_unit_price := v_product.promo_price;
      elsif coalesce(v_product.wholesale_price, 0) > 0
        and coalesce(v_product.wholesale_min_qty, 0) > 0
        and v_quantity >= v_product.wholesale_min_qty then
        v_unit_price := v_product.wholesale_price;
      else
        v_unit_price := v_product.price;
      end if;
      v_subtotal := v_subtotal + (v_unit_price * v_quantity);
    else
      v_unit_price := null;
      v_has_hidden_price := true;
    end if;

    v_product_name := v_product.name;

    insert into public.store_order_items (
      order_id,
      product_id,
      product_name,
      quantity,
      unit_price,
      variation
    )
    values (
      v_order_id,
      v_product.id,
      v_product_name,
      v_quantity,
      v_unit_price,
      v_variation
    );
  end loop;

  update public.store_orders
    set status = case when v_has_hidden_price then 'quote' else 'new' end,
        order_type = case when v_has_hidden_price then 'quote' else 'order' end,
        subtotal_amount = case when v_has_hidden_price then null else v_subtotal end,
        discount_amount = 0,
        total_amount = case when v_has_hidden_price then null else v_subtotal end
  where id = v_order_id;

  if not v_has_hidden_price then
    perform public.deduct_order_stock(v_order_id);
  end if;

  return v_order_id;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
on conflict (id) do nothing;

drop policy if exists "product_images_select_public" on storage.objects;
create policy "product_images_select_public"
on storage.objects
for select
to public
using (bucket_id = 'product-images');

drop policy if exists "product_images_insert_authenticated" on storage.objects;
create policy "product_images_insert_authenticated"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "product_images_update_own" on storage.objects;
create policy "product_images_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "product_images_delete_own" on storage.objects;
create policy "product_images_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

commit;
