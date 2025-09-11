-- Stock tablosuna yeni alanlar ekleme
ALTER TABLE stock ADD COLUMN IF NOT EXISTS shelf_address VARCHAR(20);
ALTER TABLE stock ADD COLUMN IF NOT EXISTS product_price DECIMAL(10,2);
ALTER TABLE stock ADD COLUMN IF NOT EXISTS product_image_url TEXT;

-- Stok hareketleri tablosu güvenli oluşturma ve eksik kolonları ekleme
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Eksik kolonları tek tek güvenli bir şekilde ekle
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

-- RLS politikaları
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

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

-- Indexler
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(movement_date);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_warehouses ON stock_movements(source_warehouse, target_warehouse);
CREATE INDEX IF NOT EXISTS idx_stock_shelf_address ON stock(shelf_address);
