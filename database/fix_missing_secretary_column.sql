-- Users tablosuna is_secretary kolonunu ekle
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_secretary BOOLEAN DEFAULT FALSE;

-- Mevcut kayıtlar için is_secretary'yi false yap
UPDATE users SET is_secretary = FALSE WHERE is_secretary IS NULL;

-- Açıklama ekle
COMMENT ON COLUMN users.is_secretary IS 'Sekreter kullanıcı (tüm depoları görüntüleyebilir ama değişiklik yapamaz)';
