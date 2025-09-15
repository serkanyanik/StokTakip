-- =====================================================
-- EKSİK KOLON VE İNDEXLER - Tablolar zaten mevcut
-- =====================================================

-- Eksik kolon ekleniyor
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS movement_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Performans için indexler ekleniyor
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(movement_date);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_warehouses ON stock_movements(source_warehouse, target_warehouse);
CREATE INDEX IF NOT EXISTS idx_stock_shelf_address ON stock(shelf_address);
