-- Kullanıcılar tablosuna sekreter sütunu ekle

ALTER TABLE users 
ADD COLUMN is_secretary BOOLEAN DEFAULT FALSE;

-- Mevcut verileri güncelle (opsiyonel)
UPDATE users 
SET is_secretary = FALSE 
WHERE is_secretary IS NULL;

-- İndeks ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_users_is_secretary ON users(is_secretary);

-- Yorum ekle
COMMENT ON COLUMN users.is_secretary IS 'Kullanıcının sekreter/asistan yetkisi (sadece görüntüleme)';

