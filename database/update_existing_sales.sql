-- ========================================
-- Mevcut Müşteri Satış Kayıtlarını Güncelleme
-- ========================================
-- Bu script mevcut müşteri satış kayıtlarındaki notes alanından 
-- fiyat bilgisini çıkarıp sale_price ve total_amount sütunlarına aktarır

-- 1. Notes alanında "Birim fiyat:" içeren kayıtları güncelle
UPDATE stock_movements 
SET 
    sale_price = CAST(
        REGEXP_REPLACE(
            SUBSTRING(notes FROM 'Birim fiyat: ([0-9.,]+)₺'), 
            ',', '.', 'g'
        ) AS DECIMAL(10,2)
    ),
    total_amount = CAST(
        REGEXP_REPLACE(
            SUBSTRING(notes FROM 'Toplam: ([0-9.,]+)₺'), 
            ',', '.', 'g'
        ) AS DECIMAL(10,2)
    )
WHERE 
    target_warehouse IN ('customer', 'external') 
    AND movement_type = 'out'
    AND notes LIKE '%Birim fiyat:%'
    AND sale_price IS NULL;

-- 2. Eğer sadece "Müşteri satış" yazıyorsa ve stok tablosundan fiyat alınabiliyorsa
-- (Bu kısım opsiyonel - sadece gerçekten gerekirse çalıştırın)
/*
UPDATE stock_movements sm
SET 
    sale_price = s.product_price,
    total_amount = s.product_price * sm.quantity
FROM stock s
WHERE 
    sm.product_id = s.id
    AND sm.target_warehouse IN ('customer', 'external') 
    AND sm.movement_type = 'out'
    AND sm.notes = 'Müşteri satış'
    AND sm.sale_price IS NULL
    AND s.product_price IS NOT NULL
    AND s.product_price > 0;
*/

-- 3. Güncellenen kayıtları kontrol et
SELECT 
    product_code,
    product_name,
    quantity,
    sale_price,
    total_amount,
    notes,
    created_at
FROM stock_movements 
WHERE 
    target_warehouse IN ('customer', 'external') 
    AND movement_type = 'out'
    AND sale_price IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- ========================================
-- İşlem tamamlandı!
-- ========================================
-- Artık mevcut müşteri satış kayıtlarında fiyat bilgisi olmalı