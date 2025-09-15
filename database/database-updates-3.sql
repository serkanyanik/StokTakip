-- STEP 1: Stock tablosuna raf adresi alanı ekleme
ALTER TABLE stock ADD COLUMN IF NOT EXISTS shelf_address VARCHAR(20);

-- STEP 2: Stock_movements tablosu ve eksik kolonları kontrol et
-- Önce tabloyu oluştur (yoksa)
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Eksik kolonları tek tek ekle
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES stock(id) ON DELETE CASCADE;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS product_code VARCHAR(50);
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS movement_type VARCHAR(20); -- 'in', 'out', 'transfer'
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS source_warehouse VARCHAR(10); -- 'main', 'sub1', 'sub2', 'sub3', 'sub4'
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS target_warehouse VARCHAR(10); -- 'main', 'sub1', 'sub2', 'sub3', 'sub4', 'external'
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS quantity INTEGER;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS user_name VARCHAR(100);
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS movement_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS notes TEXT;

-- NOT NULL kısıtlamalarını ekle (sadece yoksa)
DO $$
BEGIN
    -- product_code için NOT NULL kısıtlaması
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stock_movements' 
        AND column_name = 'product_code' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE stock_movements ALTER COLUMN product_code SET NOT NULL;
    END IF;
    
    -- product_name için NOT NULL kısıtlaması
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stock_movements' 
        AND column_name = 'product_name' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE stock_movements ALTER COLUMN product_name SET NOT NULL;
    END IF;
    
    -- movement_type için NOT NULL kısıtlaması
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stock_movements' 
        AND column_name = 'movement_type' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE stock_movements ALTER COLUMN movement_type SET NOT NULL;
    END IF;
    
    -- quantity için NOT NULL kısıtlaması
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stock_movements' 
        AND column_name = 'quantity' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE stock_movements ALTER COLUMN quantity SET NOT NULL;
    END IF;
END $$;

-- STEP 3: RLS politikaları (tablodan sonra çalıştırın)
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Mevcut policy'leri önce kaldır, sonra yeniden oluştur
DROP POLICY IF EXISTS "Users can view stock movements based on permissions" ON stock_movements;
DROP POLICY IF EXISTS "Users can insert stock movements based on permissions" ON stock_movements;

-- Tüm kullanıcılar kendi yetkileri dahilindeki hareketleri görür
CREATE POLICY "Users can view stock movements based on permissions" ON stock_movements
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND (
                users.is_depo_admin = true OR
                users.is_depo_sorumlu1 = true OR
                users.is_depo_sorumlu2 = true OR
                users.is_depo_sorumlu3 = true OR
                users.is_depo_sorumlu4 = true
            )
        )
    );

-- Sadece yetkili kullanıcılar hareket kaydı oluşturabilir
CREATE POLICY "Users can insert stock movements based on permissions" ON stock_movements
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND (
                users.is_depo_admin = true OR
                users.is_depo_sorumlu1 = true OR
                users.is_depo_sorumlu2 = true OR
                users.is_depo_sorumlu3 = true OR
                users.is_depo_sorumlu4 = true
            )
        )
    );

-- STEP 4: Performans indexleri (en son çalıştırın)
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(movement_date);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_warehouses ON stock_movements(source_warehouse, target_warehouse);
CREATE INDEX IF NOT EXISTS idx_stock_shelf_address ON stock(shelf_address);
