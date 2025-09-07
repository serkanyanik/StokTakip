-- Manuel Kullanıcı Ekleme
-- Eğer RLS politikası sorunu devam ederse bu SQL'i çalıştırın

-- 1. Mevcut bekleyen kullanıcıyı ekle
INSERT INTO users (id, name, email, is_depo_admin, is_depo_sorumlu1, is_depo_sorumlu2, is_depo_sorumlu3, is_depo_sorumlu4, is_active, created_by) 
VALUES ('bcbd86e2-354d-4b6c-ba33-35fe397c8ff8', 'muratorun8', 'muratorun8@gmail.com', true, false, false, false, false, true, '0fe2b9bb-bb8b-42f6-9139-38b0c93d2c2f')
ON CONFLICT (id) DO NOTHING;

-- 2. Bu kullanıcının durumunu kontrol et
SELECT 
    id,
    name, 
    email,
    is_depo_admin,
    is_depo_sorumlu1,
    is_depo_sorumlu2, 
    is_depo_sorumlu3,
    is_depo_sorumlu4,
    is_active,
    created_at
FROM users 
WHERE email = 'muratorun8@gmail.com';
