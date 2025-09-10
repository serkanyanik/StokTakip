-- Stock tablosuna raf adresi alanı ekleme
ALTER TABLE stock ADD COLUMN IF NOT EXISTS shelf_address VARCHAR(20);

-- Stok hareketleri tablosu oluşturma
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES stock(id) ON DELETE CASCADE,
    product_code VARCHAR(50) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    movement_type VARCHAR(20) NOT NULL, -- 'in', 'out', 'transfer'
    source_warehouse VARCHAR(10), -- 'main', 'sub1', 'sub2', 'sub3', 'sub4'
    target_warehouse VARCHAR(10), -- 'main', 'sub1', 'sub2', 'sub3', 'sub4', 'external'
    quantity INTEGER NOT NULL,
    user_id UUID REFERENCES users(id),
    user_name VARCHAR(100),
    movement_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
