-- VENUMAIS
-- Compatibilidade de status legado "quote" com novo fluxo.

begin;

update public.store_orders
set status = 'quoted'
where status = 'quote';

alter table public.store_orders
  drop constraint if exists store_orders_status_check;

alter table public.store_orders
  add constraint store_orders_status_check
  check (
    status in (
      'new',
      'quote',
      'quoted',
      'awaiting_payment',
      'payment_review',
      'paid',
      'delivering',
      'delivered',
      'cancelled',
      'converted'
    )
  );

commit;
