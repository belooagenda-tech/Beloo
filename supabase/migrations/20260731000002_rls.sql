-- Beloo — Row Level Security
-- Cada profissional só acessa dados do seu próprio business_id.
-- A página pública de agendamento nunca acessa estas tabelas diretamente:
-- ela usa funções RPC restritas (ver migration de booking público).

-- ============================================================================
-- Helpers de posse (ownership) — rodam com os privilégios de quem chama (RLS
-- da tabela businesses/clients/appointments já filtra pelo dono autenticado).
-- ============================================================================
create function public.owns_business(target_business_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.businesses b
    where b.id = target_business_id and b.profile_id = auth.uid()
  );
$$;

create function public.owns_client(target_client_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.clients c
    join public.businesses b on b.id = c.business_id
    where c.id = target_client_id and b.profile_id = auth.uid()
  );
$$;

create function public.owns_appointment(target_appointment_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.appointments a
    join public.businesses b on b.id = a.business_id
    where a.id = target_appointment_id and b.profile_id = auth.uid()
  );
$$;

-- ============================================================================
-- profiles
-- ============================================================================
alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());

create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ============================================================================
-- businesses
-- ============================================================================
alter table public.businesses enable row level security;

create policy "businesses_select_own" on public.businesses
  for select using (profile_id = auth.uid());

create policy "businesses_insert_own" on public.businesses
  for insert with check (profile_id = auth.uid());

create policy "businesses_update_own" on public.businesses
  for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "businesses_delete_own" on public.businesses
  for delete using (profile_id = auth.uid());

-- ============================================================================
-- business_hours
-- ============================================================================
alter table public.business_hours enable row level security;

create policy "business_hours_select_own" on public.business_hours
  for select using (owns_business(business_id));

create policy "business_hours_insert_own" on public.business_hours
  for insert with check (owns_business(business_id));

create policy "business_hours_update_own" on public.business_hours
  for update using (owns_business(business_id)) with check (owns_business(business_id));

create policy "business_hours_delete_own" on public.business_hours
  for delete using (owns_business(business_id));

-- ============================================================================
-- business_exceptions
-- ============================================================================
alter table public.business_exceptions enable row level security;

create policy "business_exceptions_select_own" on public.business_exceptions
  for select using (owns_business(business_id));

create policy "business_exceptions_insert_own" on public.business_exceptions
  for insert with check (owns_business(business_id));

create policy "business_exceptions_update_own" on public.business_exceptions
  for update using (owns_business(business_id)) with check (owns_business(business_id));

create policy "business_exceptions_delete_own" on public.business_exceptions
  for delete using (owns_business(business_id));

-- ============================================================================
-- services
-- ============================================================================
alter table public.services enable row level security;

create policy "services_select_own" on public.services
  for select using (owns_business(business_id));

create policy "services_insert_own" on public.services
  for insert with check (owns_business(business_id));

create policy "services_update_own" on public.services
  for update using (owns_business(business_id)) with check (owns_business(business_id));

create policy "services_delete_own" on public.services
  for delete using (owns_business(business_id));

-- ============================================================================
-- clients
-- ============================================================================
alter table public.clients enable row level security;

create policy "clients_select_own" on public.clients
  for select using (owns_business(business_id));

create policy "clients_insert_own" on public.clients
  for insert with check (owns_business(business_id));

create policy "clients_update_own" on public.clients
  for update using (owns_business(business_id)) with check (owns_business(business_id));

create policy "clients_delete_own" on public.clients
  for delete using (owns_business(business_id));

-- ============================================================================
-- client_plans
-- ============================================================================
alter table public.client_plans enable row level security;

create policy "client_plans_select_own" on public.client_plans
  for select using (owns_business(business_id));

create policy "client_plans_insert_own" on public.client_plans
  for insert with check (owns_business(business_id));

create policy "client_plans_update_own" on public.client_plans
  for update using (owns_business(business_id)) with check (owns_business(business_id));

create policy "client_plans_delete_own" on public.client_plans
  for delete using (owns_business(business_id));

-- ============================================================================
-- client_plan_subs
-- ============================================================================
alter table public.client_plan_subs enable row level security;

create policy "client_plan_subs_select_own" on public.client_plan_subs
  for select using (owns_client(client_id));

create policy "client_plan_subs_insert_own" on public.client_plan_subs
  for insert with check (owns_client(client_id));

create policy "client_plan_subs_update_own" on public.client_plan_subs
  for update using (owns_client(client_id)) with check (owns_client(client_id));

create policy "client_plan_subs_delete_own" on public.client_plan_subs
  for delete using (owns_client(client_id));

-- ============================================================================
-- appointments
-- ============================================================================
alter table public.appointments enable row level security;

create policy "appointments_select_own" on public.appointments
  for select using (owns_business(business_id));

create policy "appointments_insert_own" on public.appointments
  for insert with check (owns_business(business_id));

create policy "appointments_update_own" on public.appointments
  for update using (owns_business(business_id)) with check (owns_business(business_id));

create policy "appointments_delete_own" on public.appointments
  for delete using (owns_business(business_id));

-- ============================================================================
-- appointment_payments
-- ============================================================================
alter table public.appointment_payments enable row level security;

create policy "appointment_payments_select_own" on public.appointment_payments
  for select using (owns_appointment(appointment_id));

create policy "appointment_payments_insert_own" on public.appointment_payments
  for insert with check (owns_appointment(appointment_id));

create policy "appointment_payments_update_own" on public.appointment_payments
  for update using (owns_appointment(appointment_id)) with check (owns_appointment(appointment_id));

create policy "appointment_payments_delete_own" on public.appointment_payments
  for delete using (owns_appointment(appointment_id));

-- ============================================================================
-- push_subscriptions — lado do profissional (lado do cliente é escrito só
-- pelas funções RPC do booking público, que rodam como security definer)
-- ============================================================================
alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_select_own" on public.push_subscriptions
  for select using (profile_id = auth.uid());

create policy "push_subscriptions_insert_own" on public.push_subscriptions
  for insert with check (profile_id = auth.uid());

create policy "push_subscriptions_update_own" on public.push_subscriptions
  for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "push_subscriptions_delete_own" on public.push_subscriptions
  for delete using (profile_id = auth.uid());

-- ============================================================================
-- saas_plans — placeholder público (somente leitura)
-- ============================================================================
alter table public.saas_plans enable row level security;

create policy "saas_plans_select_all" on public.saas_plans
  for select using (true);
