-- Stock_movements tablosuna eksik kolonları ekle

-- Satış fiyatı kolonu
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10, 2) DEFAULT NULL;

-- Toplam tutar kolonu
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10, 2) DEFAULT NULL;

-- Açıklamalar
COMMENT ON COLUMN stock_movements.sale_price IS 'Ürünün satış fiyatı (müşteriye satışlarda)';
COMMENT ON COLUMN stock_movements.total_amount IS 'Toplam satış tutarı (quantity * sale_price)';

-- total_amount'u sale_price varsa otomatik hesapla
UPDATE stock_movements 
SET total_amount = quantity * sale_price 
WHERE sale_price IS NOT NULL AND total_amount IS NULL;
