-- ============================================
-- MS TEKNİK SERVİS - ACİL DATABASE FİX
-- ============================================
-- Bu script eksik kolonları ekleyerek login sorununu çözer

-- 1. Users tablosuna is_secretary kolonunu ekle
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_secretary BOOLEAN DEFAULT FALSE;

-- Mevcut kayıtlar için is_secretary'yi false yap
UPDATE users SET is_secretary = FALSE WHERE is_secretary IS NULL;

COMMENT ON COLUMN users.is_secretary IS 'Sekreter kullanıcı (tüm depoları görüntüleyebilir ama değişiklik yapamaz)';

-- 2. Stock_movements tablosuna satış kolonlarını ekle
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10, 2) DEFAULT NULL;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10, 2) DEFAULT NULL;

COMMENT ON COLUMN stock_movements.sale_price IS 'Ürünün satış fiyatı (müşteriye satışlarda)';
COMMENT ON COLUMN stock_movements.total_amount IS 'Toplam satış tutarı (quantity * sale_price)';

-- total_amount'u sale_price varsa otomatik hesapla
UPDATE stock_movements 
SET total_amount = quantity * sale_price 
WHERE sale_price IS NOT NULL AND total_amount IS NULL;

-- 3. Kontrol sorguları
SELECT 'Users tablosu kontrol:' as message;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users' 
AND column_name IN ('is_secretary', 'is_depo_admin', 'is_active')
ORDER BY column_name;

SELECT 'Stock_movements tablosu kontrol:' as message;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'stock_movements' 
AND column_name IN ('sale_price', 'total_amount')
ORDER BY column_name;

-- 4. Test sorgusu - users tablosundaki tüm boolean kolonları göster
SELECT 'Users tablosu boolean kolonları:' as message;
SELECT id, email, name, is_depo_admin, is_secretary, is_active
FROM users
LIMIT 5;
