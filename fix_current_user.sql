-- ACİL: Mevcut kullanıcıyı düzelt
-- Bu script'i production_deployment.sql'den ÖNCE çalıştırın

-- 1. Önce mevcut auth kullanıcılarını kontrol edelim
-- (Bu sadece bilgi için, auth.users tablosunu göremeyiz)

-- 2. Users tablosundaki mevcut kullanıcıları kontrol et
SELECT 
    id,
    name,
    email,
    is_depo_admin,
    is_active,
    created_at
FROM users
ORDER BY created_at;

-- 3. Eğer hiç kullanıcı yoksa, sizin kullanıcınızı manuel ekleyin
-- AUTH kullanıcı ID'nizi buraya yazın (0fe2b9bb-bb8b-42f6-9139-38b0c93d2c2f gibi)

INSERT INTO users (
    id, 
    name, 
    email, 
    is_depo_admin, 
    is_depo_sorumlu1, 
    is_depo_sorumlu2, 
    is_depo_sorumlu3, 
    is_depo_sorumlu4, 
    is_active, 
    created_by
) VALUES (
    '0fe2b9bb-bb8b-42f6-9139-38b0c93d2c2f',  -- SİZİN AUTH ID'NİZ
    'Admin Kullanıcı',                        -- İSİM
    'YOUR_EMAIL@gmail.com',                   -- E-POSTA ADRESİNİZ
    true,                                     -- Ana depo admin
    true,                                     -- Alt depo 1
    true,                                     -- Alt depo 2  
    true,                                     -- Alt depo 3
    true,                                     -- Alt depo 4
    true,                                     -- Aktif
    '0fe2b9bb-bb8b-42f6-9139-38b0c93d2c2f'   -- Kendini oluşturmuş
) ON CONFLICT (id) DO UPDATE SET
    is_depo_admin = true,
    is_active = true;

-- 4. Kontrol
SELECT 
    'Kullanıcı düzeltildi' as status,
    id,
    name,
    email,
    is_depo_admin,
    is_active
FROM users 
WHERE email = 'YOUR_EMAIL@gmail.com';  -- Kendi e-postanızı yazın
