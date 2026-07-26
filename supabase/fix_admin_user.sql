-- =============================================================================
-- Tuzatish: "Database error loading user"
-- =============================================================================
-- `create_first_admin.sql` ning birinchi versiyasi `auth.users` ga yozganda
-- token ustunlarini to'ldirmagan — ular NULL bo'lib qolgan.
--
-- GoTrue (Supabase Auth) Go tilida yozilgan va bu ustunlarni NULL bo'lmaydigan
-- `string` ga o'qiydi. NULL uchrasa, o'qish yiqiladi va butun auth API 500
-- qaytaradi: "Database error loading user" / "Database error finding users".
-- Qator bazada bor — lekin login ham, foydalanuvchilar ro'yxati ham ishlamaydi.
--
-- Quyidagi UPDATE bo'sh satr qo'yadi. Supabase o'zi yaratgan hisoblarda bu
-- ustunlar allaqachon '' bo'ladi, shuning uchun ularga ta'sir qilmaydi.
-- =============================================================================

update auth.users
   set confirmation_token         = coalesce(confirmation_token, ''),
       recovery_token             = coalesce(recovery_token, ''),
       email_change               = coalesce(email_change, ''),
       email_change_token_new     = coalesce(email_change_token_new, ''),
       email_change_token_current = coalesce(email_change_token_current, ''),
       phone_change               = coalesce(phone_change, ''),
       phone_change_token         = coalesce(phone_change_token, ''),
       reauthentication_token     = coalesce(reauthentication_token, '')
 where confirmation_token is null
    or recovery_token is null
    or email_change is null
    or email_change_token_new is null
    or email_change_token_current is null
    or phone_change is null
    or phone_change_token is null
    or reauthentication_token is null;

-- Tekshirish: hisob va profil joyidami
select u.email,
       (u.email_confirmed_at is not null) as tasdiqlangan,
       exists (select 1 from auth.identities i where i.user_id = u.id) as identity_bor,
       p.role,
       p.is_active
  from auth.users u
  left join public.profiles p on p.id = u.id;
