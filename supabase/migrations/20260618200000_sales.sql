-- VENUMAIS
-- Vendas, itens, parcelas e funções transacionais.

begin;

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  sale_code integer not null,
  sold_at timestamptz not null default timezone('utc', now()),
  subtotal_amount numeric(12, 2) not null,
  discount_amount numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null,
  payment_mode text not null,
  payment_method text,
  delivery_type text not null default 'pickup',
  notes text,
  confirmation_status text not null default 'confirmed',
  confirmed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint sales_sale_code_positive check (sale_code > 0),
  constraint sales_subtotal_non_negative check (subtotal_amount >= 0),
  constraint sales_discount_non_negative check (discount_amount >= 0),
  constraint sales_total_non_negative check (total_amount >= 0),
  constraint sales_payment_mode_check check (payment_mode in ('cash', 'installment')),
  constraint sales_payment_method_check check (
    payment_method is null or payment_method in ('pix', 'card', 'cash')
  ),
  constraint sales_delivery_type_check check (delivery_type in ('pickup', 'delivery')),
  constraint sales_confirmation_status_check check (
    confirmation_status in ('pending', 'confirmed')
  ),
  constraint sales_notes_length check (notes is null or char_length(notes) <= 500),
  constraint sales_store_sale_code_unique unique (store_id, sale_code)
);

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity integer not null,
  unit_price numeric(12, 2) not null,
  unit_cost numeric(12, 2) not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  constraint sale_items_quantity_positive check (quantity > 0),
  constraint sale_items_unit_price_non_negative check (unit_price >= 0),
  constraint sale_items_unit_cost_non_negative check (unit_cost >= 0),
  constraint sale_items_product_name_length check (char_length(product_name) between 1 and 160)
);

create table if not exists public.sale_installments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  installment_number integer not null,
  due_date date not null,
  amount numeric(12, 2) not null,
  paid boolean not null default false,
  paid_at timestamptz,
  payment_method text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint sale_installments_number_positive check (installment_number > 0),
  constraint sale_installments_amount_non_negative check (amount >= 0),
  constraint sale_installments_payment_method_check check (
    payment_method is null or payment_method in ('pix', 'card', 'cash')
  ),
  constraint sale_installments_unique_number unique (sale_id, installment_number)
);

create index if not exists sales_store_id_idx on public.sales (store_id);
create index if not exists sales_store_id_sold_at_idx on public.sales (store_id, sold_at desc);
create index if not exists sales_customer_id_idx on public.sales (customer_id);
create index if not exists sale_items_sale_id_idx on public.sale_items (sale_id);
create index if not exists sale_installments_sale_id_idx on public.sale_installments (sale_id);
create index if not exists sale_installments_due_date_idx on public.sale_installments (due_date);

drop trigger if exists sales_set_updated_at on public.sales;
create trigger sales_set_updated_at
before update on public.sales
for each row execute function public.set_updated_at();

drop trigger if exists sale_installments_set_updated_at on public.sale_installments;
create trigger sale_installments_set_updated_at
before update on public.sale_installments
for each row execute function public.set_updated_at();

create or replace function public.can_manage_sales(target_store_id uuid)
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
      and coalesce((member.permissions ->> 'manage_sales')::boolean, false)
  );
$$;

revoke all on function public.can_manage_sales(uuid) from public;
grant execute on function public.can_manage_sales(uuid) to authenticated;

create or replace function public.register_sale(
  p_store_id uuid,
  p_customer_id uuid,
  p_payment_mode text,
  p_payment_method text,
  p_delivery_type text,
  p_notes text,
  p_discount_amount numeric,
  p_items jsonb,
  p_installments jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sale_id uuid;
  v_sale_code integer;
  v_subtotal numeric(12, 2) := 0;
  v_total numeric(12, 2) := 0;
  v_item jsonb;
  v_installment jsonb;
  v_product record;
  v_quantity integer;
  v_unit_price numeric(12, 2);
begin
  if not public.can_manage_sales(p_store_id) then
    raise exception 'Sem permissão para registrar vendas.';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Informe pelo menos um item na venda.';
  end if;

  if jsonb_typeof(p_installments) <> 'array' or jsonb_array_length(p_installments) = 0 then
    raise exception 'Informe pelo menos uma parcela.';
  end if;

  if not exists (
    select 1
    from public.customers customer
    where customer.id = p_customer_id
      and customer.store_id = p_store_id
  ) then
    raise exception 'Cliente inválido para esta loja.';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_quantity := (v_item ->> 'quantity')::integer;
    v_unit_price := (v_item ->> 'unit_price')::numeric;

    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Quantidade inválida em um dos itens.';
    end if;

    if v_unit_price is null or v_unit_price < 0 then
      raise exception 'Preço inválido em um dos itens.';
    end if;

    select id, name, stock_qty, cost
      into v_product
    from public.products
    where id = (v_item ->> 'product_id')::uuid
      and store_id = p_store_id
      and active = true;

    if not found then
      raise exception 'Produto inválido ou inativo.';
    end if;

    if v_product.stock_qty < v_quantity then
      raise exception 'Estoque insuficiente para o produto %.', v_product.name;
    end if;

    v_subtotal := v_subtotal + (v_unit_price * v_quantity);
  end loop;

  v_total := greatest(0, round((v_subtotal - coalesce(p_discount_amount, 0))::numeric, 2));

  select coalesce(max(sale_code), 0) + 1
    into v_sale_code
  from public.sales
  where store_id = p_store_id;

  insert into public.sales (
    store_id,
    customer_id,
    sale_code,
    subtotal_amount,
    discount_amount,
    total_amount,
    payment_mode,
    payment_method,
    delivery_type,
    notes,
    confirmation_status,
    confirmed_at,
    created_by
  )
  values (
    p_store_id,
    p_customer_id,
    v_sale_code,
    v_subtotal,
    coalesce(p_discount_amount, 0),
    v_total,
    p_payment_mode,
    p_payment_method,
    coalesce(p_delivery_type, 'pickup'),
    nullif(trim(p_notes), ''),
    'confirmed',
    timezone('utc', now()),
    auth.uid()
  )
  returning id into v_sale_id;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_quantity := (v_item ->> 'quantity')::integer;
    v_unit_price := (v_item ->> 'unit_price')::numeric;

    select id, name, stock_qty, cost
      into v_product
    from public.products
    where id = (v_item ->> 'product_id')::uuid
      and store_id = p_store_id
    for update;

    insert into public.sale_items (
      sale_id,
      product_id,
      product_name,
      quantity,
      unit_price,
      unit_cost
    )
    values (
      v_sale_id,
      v_product.id,
      v_product.name,
      v_quantity,
      v_unit_price,
      v_product.cost
    );

    update public.products
      set stock_qty = v_product.stock_qty - v_quantity
    where id = v_product.id;
  end loop;

  for v_installment in select value from jsonb_array_elements(p_installments) loop
    insert into public.sale_installments (
      sale_id,
      installment_number,
      due_date,
      amount,
      paid,
      paid_at,
      payment_method
    )
    values (
      v_sale_id,
      (v_installment ->> 'installment_number')::integer,
      (v_installment ->> 'due_date')::date,
      (v_installment ->> 'amount')::numeric,
      coalesce((v_installment ->> 'paid')::boolean, false),
      case
        when coalesce((v_installment ->> 'paid')::boolean, false)
          then coalesce((v_installment ->> 'paid_at')::timestamptz, timezone('utc', now()))
        else null
      end,
      case
        when coalesce((v_installment ->> 'paid')::boolean, false) then p_payment_method
        else null
      end
    );
  end loop;

  return v_sale_id;
end;
$$;

revoke all on function public.register_sale(uuid, uuid, text, text, text, text, numeric, jsonb, jsonb) from public;
grant execute on function public.register_sale(uuid, uuid, text, text, text, text, numeric, jsonb, jsonb) to authenticated;

create or replace function public.mark_installment_paid(
  p_store_id uuid,
  p_installment_id uuid,
  p_payment_method text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_installment record;
begin
  if not public.can_manage_sales(p_store_id) then
    raise exception 'Sem permissão para registrar pagamentos.';
  end if;

  select installment.*
    into v_installment
  from public.sale_installments installment
  join public.sales sale on sale.id = installment.sale_id
  where installment.id = p_installment_id
    and sale.store_id = p_store_id
  for update;

  if not found then
    raise exception 'Parcela não encontrada.';
  end if;

  if v_installment.paid then
    return;
  end if;

  update public.sale_installments
    set paid = true,
        paid_at = timezone('utc', now()),
        payment_method = coalesce(p_payment_method, payment_method)
  where id = p_installment_id;
end;
$$;

revoke all on function public.mark_installment_paid(uuid, uuid, text) from public;
grant execute on function public.mark_installment_paid(uuid, uuid, text) to authenticated;

alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.sale_installments enable row level security;

drop policy if exists "sales_select_members" on public.sales;
create policy "sales_select_members"
on public.sales for select to authenticated
using (public.is_store_member(store_id));

drop policy if exists "sales_insert_manage" on public.sales;
create policy "sales_insert_manage"
on public.sales for insert to authenticated
with check (public.can_manage_sales(store_id));

drop policy if exists "sales_update_manage" on public.sales;
create policy "sales_update_manage"
on public.sales for update to authenticated
using (public.can_manage_sales(store_id))
with check (public.can_manage_sales(store_id));

drop policy if exists "sale_items_select_members" on public.sale_items;
create policy "sale_items_select_members"
on public.sale_items for select to authenticated
using (
  exists (
    select 1 from public.sales sale
    where sale.id = sale_id
      and public.is_store_member(sale.store_id)
  )
);

drop policy if exists "sale_installments_select_members" on public.sale_installments;
create policy "sale_installments_select_members"
on public.sale_installments for select to authenticated
using (
  exists (
    select 1 from public.sales sale
    where sale.id = sale_id
      and public.is_store_member(sale.store_id)
  )
);

drop policy if exists "sale_installments_update_manage" on public.sale_installments;
create policy "sale_installments_update_manage"
on public.sale_installments for update to authenticated
using (
  exists (
    select 1 from public.sales sale
    where sale.id = sale_id
      and public.can_manage_sales(sale.store_id)
  )
)
with check (
  exists (
    select 1 from public.sales sale
    where sale.id = sale_id
      and public.can_manage_sales(sale.store_id)
  )
);

revoke all on table public.sales from anon;
revoke all on table public.sale_items from anon;
revoke all on table public.sale_installments from anon;

grant select, insert, update on table public.sales to authenticated;
grant select on table public.sale_items to authenticated;
grant select, update on table public.sale_installments to authenticated;

commit;
