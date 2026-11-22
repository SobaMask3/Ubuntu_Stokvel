-- Run AFTER the leader has been invited (Authentication > Users > Invite user).
-- Replace the email and phone, then run in the SQL Editor.
update public.profiles
set role = 'leader', title = 'Chairperson', phone = '0XX XXX XXXX'
where email = 'LEADER-EMAIL@example.com';

-- Check it worked: should show one row with role = leader
select full_name, email, role, title, phone from public.profiles where role = 'leader';
