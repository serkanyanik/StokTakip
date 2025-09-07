-- Serkan Stok Veritabanı Şeması
-- Supabase PostgreSQL için SQL komutları

-- 1. Kullanıcı profilleri tablosu
CREATE TABLE users (
    id UUID REFERENCES auth.users PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('main_admin', 'sub1_manager', 'sub2_manager', 'sub3_manager', 'sub4_manager')),
    warehouse_access TEXT[], -- Hangi depolara erişebileceği (opsiyonel)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Stok tablosu
CREATE TABLE stock (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_code VARCHAR(100) UNIQUE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    main_stock INTEGER DEFAULT 0 CHECK (main_stock >= 0),
    sub1_stock INTEGER DEFAULT 0 CHECK (sub1_stock >= 0),
    sub2_stock INTEGER DEFAULT 0 CHECK (sub2_stock >= 0),
    sub3_stock INTEGER DEFAULT 0 CHECK (sub3_stock >= 0),
    sub4_stock INTEGER DEFAULT 0 CHECK (sub4_stock >= 0),
    min_stock_level INTEGER DEFAULT 5, -- Minimum stok seviyesi
    description TEXT,
    unit VARCHAR(20) DEFAULT 'adet',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Stok hareketleri tablosu (log tutmak için)
CREATE TABLE stock_movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES stock(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('add', 'remove', 'transfer')),
    source_warehouse VARCHAR(20), -- 'main', 'sub1', 'sub2', 'sub3', 'sub4'
    target_warehouse VARCHAR(20), -- 'main', 'sub1', 'sub2', 'sub3', 'sub4', 'external'
    quantity INTEGER NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Indeksler
CREATE INDEX idx_stock_product_code ON stock(product_code);
CREATE INDEX idx_stock_product_name ON stock(product_name);
CREATE INDEX idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_user_id ON stock_movements(user_id);
CREATE INDEX idx_stock_movements_created_at ON stock_movements(created_at);

-- 5. Otomatik güncelleme fonksiyonu
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger'lar
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_stock_updated_at
    BEFORE UPDATE ON stock
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- 7. RLS (Row Level Security) politikaları
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Users tablosu politikaları
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Stock tablosu politikaları
CREATE POLICY "Everyone can read stock" ON stock
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only main admin can insert stock" ON stock
    FOR INSERT TO authenticated 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'main_admin'
        )
    );

CREATE POLICY "Authorized users can update stock" ON stock
    FOR UPDATE TO authenticated 
    USING (true)
    WITH CHECK (true);

-- Stock movements tablosu politikaları
CREATE POLICY "Users can read stock movements" ON stock_movements
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert stock movements" ON stock_movements
    FOR INSERT TO authenticated 
    WITH CHECK (auth.uid() = user_id);

-- 8. Örnek veri ekleme (isteğe bağlı)
-- Not: Bu verileri eklemeden önce Supabase Auth'da kullanıcı oluşturun
-- ve user_id'yi gerçek UUID ile değiştirin

/*
-- Örnek kullanıcılar
INSERT INTO users (id, name, email, role) VALUES 
('00000000-0000-0000-0000-000000000001', 'Ahmet Yılmaz', 'ahmet@serkanstok.com', 'main_admin'),
('00000000-0000-0000-0000-000000000002', 'Mehmet Demir', 'mehmet@serkanstok.com', 'sub1_manager'),
('00000000-0000-0000-0000-000000000003', 'Ayşe Kaya', 'ayse@serkanstok.com', 'sub2_manager'),
('00000000-0000-0000-0000-000000000004', 'Fatma Öz', 'fatma@serkanstok.com', 'sub3_manager'),
('00000000-0000-0000-0000-000000000005', 'Ali Çelik', 'ali@serkanstok.com', 'sub4_manager');

-- Örnek stok verileri
INSERT INTO stock (product_code, product_name, main_stock, sub1_stock, sub2_stock, sub3_stock, sub4_stock, description) VALUES
('ARÇ001', 'Arçelik Çamaşır Makinesi Motoru', 15, 3, 2, 1, 2, 'Arçelik marka çamaşır makinesi için orijinal motor'),
('BSH002', 'Bosch Bulaşık Makinesi Pompası', 8, 2, 1, 1, 1, 'Bosch bulaşık makinesi drenaj pompası'),
('VES003', 'Vestel Buzdolabı Kompresörü', 12, 4, 3, 2, 2, 'Vestel buzdolabı kompresör ünitesi'),
('SAM004', 'Samsung Fırın Rezistansı', 20, 5, 4, 3, 4, 'Samsung fırın üst ısıtıcı rezistansı'),
('LG005', 'LG Klima Fanı', 10, 3, 2, 2, 2, 'LG split klima iç ünite fanı'),
('ARÇ006', 'Arçelik Bulaşık Makinesi Filtresi', 25, 6, 5, 4, 5, 'Arçelik bulaşık makinesi alt filtre'),
('BSH007', 'Bosch Çamaşır Makinesi Kapı Kilidi', 6, 2, 1, 1, 1, 'Bosch çamaşır makinesi güvenlik kilidi'),
('VES008', 'Vestel Fırın Cam Kapağı', 4, 1, 1, 0, 1, 'Vestel ankastre fırın iç cam kapağı'),
('SAM009', 'Samsung Buzdolabı Termostat', 8, 2, 2, 1, 2, 'Samsung buzdolabı elektronik termostat'),
('LG010', 'LG Çamaşır Makinesi Amortisörü', 14, 4, 3, 2, 3, 'LG çamaşır makinesi arka amortisör seti');
*/

-- 9. Faydalı view'lar
CREATE VIEW stock_summary AS
SELECT 
    s.*,
    (s.main_stock + s.sub1_stock + s.sub2_stock + s.sub3_stock + s.sub4_stock) as total_stock,
    CASE 
        WHEN (s.main_stock + s.sub1_stock + s.sub2_stock + s.sub3_stock + s.sub4_stock) <= s.min_stock_level 
        THEN true 
        ELSE false 
    END as is_low_stock
FROM stock s
ORDER BY s.product_name;

-- 10. Stok hareketi log fonksiyonu
CREATE OR REPLACE FUNCTION log_stock_movement(
    p_product_id UUID,
    p_user_id UUID,
    p_movement_type VARCHAR,
    p_source_warehouse VARCHAR,
    p_target_warehouse VARCHAR,
    p_quantity INTEGER,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    movement_id UUID;
BEGIN
    INSERT INTO stock_movements (
        product_id, user_id, movement_type, 
        source_warehouse, target_warehouse, quantity, notes
    ) VALUES (
        p_product_id, p_user_id, p_movement_type,
        p_source_warehouse, p_target_warehouse, p_quantity, p_notes
    ) RETURNING id INTO movement_id;
    
    RETURN movement_id;
END;
$$ LANGUAGE plpgsql;
