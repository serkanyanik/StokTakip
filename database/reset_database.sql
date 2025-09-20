-- UYARI: Bu script tüm verileri siler!
-- Sadece test ortamında kullanın!

-- 1. Tabloları sil (bağımlılık sırasına göre)
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS stock CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 2. Yeni tabloları oluştur
-- Kullanıcı profilleri tablosu
CREATE TABLE users (
    id UUID REFERENCES auth.users PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    is_depo_admin BOOLEAN DEFAULT FALSE, -- Ana depo sorumlusu (tüm yetkiler)
    is_depo_sorumlu1 BOOLEAN DEFAULT FALSE, -- 1. Depo sorumlusu
    is_depo_sorumlu2 BOOLEAN DEFAULT FALSE, -- 2. Depo sorumlusu
    is_depo_sorumlu3 BOOLEAN DEFAULT FALSE, -- 3. Depo sorumlusu
    is_depo_sorumlu4 BOOLEAN DEFAULT FALSE, -- 4. Depo sorumlusu
    is_active BOOLEAN DEFAULT TRUE, -- Kullanıcı aktif mi?
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id) -- Kim tarafından oluşturuldu
);

-- Stok tablosu
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

-- Stok hareketleri tablosu
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

-- RLS aktifleştir
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Politikalar
CREATE POLICY "Users can view all profiles" ON users
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Only admin can insert users" ON users
    FOR INSERT TO authenticated 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND is_depo_admin = true
        )
    );

CREATE POLICY "Only admin can delete users" ON users
    FOR DELETE TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND is_depo_admin = true
        )
    );

CREATE POLICY "Everyone can read stock" ON stock
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only admin can insert stock" ON stock
    FOR INSERT TO authenticated 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND is_depo_admin = true
        )
    );

CREATE POLICY "Authorized users can update stock" ON stock
    FOR UPDATE TO authenticated 
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Users can read stock movements" ON stock_movements
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert stock movements" ON stock_movements
    FOR INSERT TO authenticated 
    WITH CHECK (auth.uid() = user_id);

-- Ana kullanıcını ekle
INSERT INTO users (id, name, email, is_depo_admin, is_active) VALUES 
('0fe2b9bb-bb8b-42f6-9139-38b0c93d2c2f', 'Proje Admin', 'muratorun88@gmail.com', true, true)
ON CONFLICT (id) 
DO UPDATE SET 
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    is_depo_admin = EXCLUDED.is_depo_admin,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Örnek stok verileri
INSERT INTO stock (product_code, product_name, main_stock, sub1_stock, sub2_stock, sub3_stock, sub4_stock, description) VALUES
('ARÇ001', 'Arçelik Çamaşır Makinesi Motoru', 15, 3, 2, 1, 2, 'Arçelik marka çamaşır makinesi için orijinal motor'),
('BSH002', 'Bosch Bulaşık Makinesi Pompası', 8, 2, 1, 1, 1, 'Bosch bulaşık makinesi drenaj pompası'),
('VES003', 'Vestel Buzdolabı Kompresörü', 12, 4, 3, 2, 2, 'Vestel buzdolabı kompresör ünitesi'),
('SAM004', 'Samsung Fırın Rezistansı', 20, 5, 4, 3, 4, 'Samsung fırın üst ısıtıcı rezistansı'),
('LG005', 'LG Klima Fanı', 10, 3, 2, 2, 2, 'LG split klima iç ünite fanı');
