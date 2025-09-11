-- ========================================
-- Müşteri Satış Fiyatı Tracking - Veritabanı Güncellemesi
-- ========================================
-- Bu script stock_movements tablosuna satış fiyatı ve toplam tutar sütunlarını ekler
-- Supabase SQL Editor'da çalıştırın

-- 1. Satış fiyatı sütunu ekle (birim fiyat)
ALTER TABLE stock_movements 
ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10,2) NULL;

-- 2. Toplam tutar sütunu ekle (miktar × birim fiyat)
ALTER TABLE stock_movements 
ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2) NULL;

-- 3. Sütunlara yorum ekle (opsiyonel - documentation için)
COMMENT ON COLUMN stock_movements.sale_price IS 'Müşteri satışlarında birim satış fiyatı (₺)';
COMMENT ON COLUMN stock_movements.total_amount IS 'Müşteri satışlarında toplam satış tutarı (miktar × birim fiyat)';

-- 4. İndeks ekle - satış raporları için performans optimizasyonu
CREATE INDEX IF NOT EXISTS idx_stock_movements_sale_price 
ON stock_movements(sale_price) 
WHERE sale_price IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_stock_movements_total_amount 
ON stock_movements(total_amount) 
WHERE total_amount IS NOT NULL;

-- 5. Müşteri satış kayıtları için indeks (target_warehouse = 'customer' veya 'external')
CREATE INDEX IF NOT EXISTS idx_stock_movements_customer_sales 
ON stock_movements(target_warehouse, sale_price, total_amount) 
WHERE target_warehouse IN ('customer', 'external');

-- ========================================
-- Güncelleme tamamlandı!
-- ========================================
-- Artık JavaScript kodunuz şu yeni sütunları kullanabilir:
-- - sale_price: Birim satış fiyatı
-- - total_amount: Toplam satış tutarı
-- 
-- Bu sütunlar sadece müşteri satışlarında (target_warehouse = 'customer') doldurulacak
-- Diğer işlemler (transfer, giriş) için NULL kalacak