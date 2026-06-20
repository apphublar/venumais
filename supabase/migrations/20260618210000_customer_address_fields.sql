-- VENUMAIS
-- Campos estruturados de endereço do cliente.

begin;

alter table public.customers
  add column if not exists address_postal_code text,
  add column if not exists address_street text,
  add column if not exists address_number text,
  add column if not exists address_complement text,
  add column if not exists address_neighborhood text,
  add column if not exists address_city text,
  add column if not exists address_state text;

alter table public.customers
  drop constraint if exists customers_address_postal_code_length;

alter table public.customers
  add constraint customers_address_postal_code_length
  check (address_postal_code is null or char_length(address_postal_code) between 8 and 9);

alter table public.customers
  drop constraint if exists customers_address_street_length;

alter table public.customers
  add constraint customers_address_street_length
  check (address_street is null or char_length(address_street) <= 160);

alter table public.customers
  drop constraint if exists customers_address_number_length;

alter table public.customers
  add constraint customers_address_number_length
  check (address_number is null or char_length(address_number) <= 20);

alter table public.customers
  drop constraint if exists customers_address_complement_length;

alter table public.customers
  add constraint customers_address_complement_length
  check (address_complement is null or char_length(address_complement) <= 80);

alter table public.customers
  drop constraint if exists customers_address_neighborhood_length;

alter table public.customers
  add constraint customers_address_neighborhood_length
  check (address_neighborhood is null or char_length(address_neighborhood) <= 80);

alter table public.customers
  drop constraint if exists customers_address_city_length;

alter table public.customers
  add constraint customers_address_city_length
  check (address_city is null or char_length(address_city) <= 80);

alter table public.customers
  drop constraint if exists customers_address_state_length;

alter table public.customers
  add constraint customers_address_state_length
  check (address_state is null or char_length(address_state) = 2);

commit;
