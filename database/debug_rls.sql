-- RLS politikalarını kontrol et
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'stock';

-- Stock tablosunda RLS aktif mi kontrol et
SELECT schemaname, tablename, rowsecurity, forcerowsecurity 
FROM pg_tables 
WHERE tablename = 'stock';

-- Mevcut kullanıcının yetkilerini kontrol et
SELECT current_user, session_user;

-- Stock tablosuna erişim yetkilerini kontrol et
SELECT table_name, privilege_type 
FROM information_schema.table_privileges 
WHERE table_name = 'stock' 
AND grantee = current_user;

-- Test: Manuel delete sorgusu (ID'yi değiştirmeyi unutmayın)
-- DELETE FROM stock WHERE id = '4e771c08-74ed-4697-b217-06fb3e2053cb';