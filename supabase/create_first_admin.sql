-- =============================================================================
-- Birinchi administratorni yaratish
-- =============================================================================
-- Faqat BIR MARTA, birinchi admin uchun. Keyingi xodimlarni /admin/users
-- sahifasidan taklif qilasiz — SQL kerak emas.
--
-- Ishlatish:
--   1. Pastdagi uchta qatorni o'zgartiring (e-mail, parol, ism)
--   2. Supabase Dashboard > SQL Editor ga to'liq nusxalang
--   3. Run
--
-- Parol `bcrypt` bilan xeshlanadi va shu holda saqlanadi. Ochiq matnda hech
-- qayerda qolmaydi — bu skriptni ishga tushirgandan keyin faylni o'chirib
-- tashlashingiz mumkin.
-- =============================================================================

do $$
declare
  -- ↓↓↓ SHU UCHTASINI O'ZGARTIRING ↓↓↓
  v_email    text := 'admin@romansiada.uz';
  v_password text := 'BuYerdaKuchliParol123';
  v_name     text := 'Bosh administrator';
  -- ↑↑↑ SHU UCHTASINI O'ZGARTIRING ↑↑↑

  v_user_id uuid := gen_random_uuid();
begin
  if exists (select 1 from auth.users where email = lower(v_email)) then
    raise notice 'Bu e-mail bilan hisob allaqachon bor: %', v_email;
    -- Mavjud hisobni admin qilish (parol o'zgarmaydi).
    update public.profiles
       set role = 'admin', is_active = true, full_name = coalesce(nullif(full_name, ''), v_name)
     where email = lower(v_email);
    return;
  end if;

  -- 1) Auth hisobi.
  --
  -- `email_confirmed_at` darhol to'ldiriladi — aks holda Supabase tasdiqlash
  -- xatini kutadi va kirish ishlamaydi.
  --
  -- `raw_user_meta_data` ichidagi `role` ni `handle_new_user` triggeri (0001)
  -- o'qiydi va `profiles` qatorini to'g'ri rol bilan yaratadi. Shuning uchun
  -- alohida UPDATE kerak emas.
  --
  -- Token ustunlari BO'SH SATR bo'lishi shart, NULL emas.
  --
  -- GoTrue Go tilida yozilgan va bu ustunlarni NULL bo'lmaydigan `string` ga
  -- o'qiydi. Bittasi NULL bo'lsa, butun auth API 500 qaytaradi:
  -- "Database error loading user". Hisob bazada ko'rinadi, lekin login ham,
  -- foydalanuvchilar ro'yxati ham ishlamaydi — sabab esa hech qayerda
  -- ko'rinmaydi. Qo'lda hisob yaratishdagi eng ko'p uchraydigan tuzoq shu.
  --
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change,
    email_change_token_new,
    email_change_token_current,
    phone_change,
    phone_change_token,
    reauthentication_token
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    lower(v_email),
    extensions.crypt(v_password, extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', v_name, 'role', 'admin'),
    now(),
    now(),
    '', '', '', '', '', '', '', ''
  );

  -- 2) Identity qatori.
  --
  -- GoTrue e-mail+parol bilan kirishda `auth.identities` jadvalidan foydalanadi.
  -- Busiz hisob yaratiladi, lekin login "Invalid login credentials" qaytaradi —
  -- eng ko'p uchraydigan xato shu.
  insert into auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    gen_random_uuid(),
    v_user_id,
    v_user_id::text,
    jsonb_build_object('sub', v_user_id::text, 'email', lower(v_email), 'email_verified', true),
    'email',
    now(),
    now(),
    now()
  );

  -- 3) Ishonch uchun: trigger ishlamay qolgan bo'lsa ham profil to'g'ri bo'lsin.
  insert into public.profiles (id, email, full_name, role, is_active)
  values (v_user_id, lower(v_email), v_name, 'admin', true)
  on conflict (id) do update
    set role = 'admin', is_active = true, full_name = excluded.full_name;

  raise notice 'Tayyor. Kirish: % ', v_email;
end
$$;

-- Tekshirish
select p.email, p.full_name, p.role, p.is_active,
       (u.email_confirmed_at is not null) as tasdiqlangan
  from public.profiles p
  join auth.users u on u.id = p.id;
