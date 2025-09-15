-- ==============================================
-- SERKAN STOK - PRODUCTION MIGRATION SCRIPT
-- Mevcut test DB'den production'a tam migration
-- ==============================================

-- ==============================================
-- 1. TABLOLARI OLUŞTUR
-- ==============================================

-- USERS TABLOSU (İlk önce - foreign key dependency)
CREATE TABLE users (
    id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    is_depo_admin BOOLEAN DEFAULT false,
    is_depo_sorumlu1 BOOLEAN DEFAULT false,
    is_depo_sorumlu2 BOOLEAN DEFAULT false,
    is_depo_sorumlu3 BOOLEAN DEFAULT false,
    is_depo_sorumlu4 BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID
);

-- STOCK TABLOSU
CREATE TABLE stock (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    product_code VARCHAR(100) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    main_stock INTEGER DEFAULT 0,
    sub1_stock INTEGER DEFAULT 0,
    sub2_stock INTEGER DEFAULT 0,
    sub3_stock INTEGER DEFAULT 0,
    sub4_stock INTEGER DEFAULT 0,
    min_stock_level INTEGER DEFAULT 5,
    description TEXT,
    unit VARCHAR(20) DEFAULT 'adet'::character varying,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    shelf_address VARCHAR(20),
    product_price DECIMAL(10,2),
    product_image_url TEXT
);

-- STOCK MOVEMENTS TABLOSU
CREATE TABLE stock_movements (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    product_id UUID,
    product_code VARCHAR(50) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    movement_type VARCHAR(20) NOT NULL,
    source_warehouse VARCHAR(10),
    target_warehouse VARCHAR(10),
    quantity INTEGER NOT NULL,
    user_id UUID,
    user_name VARCHAR(100),
    movement_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    sale_price DECIMAL(10,2),
    total_amount DECIMAL(10,2)
);

-- APP SETTINGS TABLOSU
CREATE TABLE app_settings (
    id INTEGER NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==============================================
-- 2. PRIMARY KEY CONSTRAINTS
-- ==============================================

ALTER TABLE users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE stock ADD CONSTRAINT stock_pkey PRIMARY KEY (id);
ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_pkey PRIMARY KEY (id);
ALTER TABLE app_settings ADD CONSTRAINT app_settings_pkey PRIMARY KEY (id);

-- ==============================================
-- 3. UNIQUE CONSTRAINTS
-- ==============================================

ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);
ALTER TABLE stock ADD CONSTRAINT stock_product_code_key UNIQUE (product_code);
ALTER TABLE app_settings ADD CONSTRAINT app_settings_setting_key_key UNIQUE (setting_key);

-- ==============================================
-- 4. FOREIGN KEY CONSTRAINTS
-- ==============================================

ALTER TABLE users ADD CONSTRAINT users_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_product_id_fkey FOREIGN KEY (product_id) REFERENCES stock(id);
ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);

-- ==============================================
-- 5. VIEWS OLUŞTUR
-- ==============================================

-- Stock Summary View
CREATE VIEW stock_summary AS
SELECT 
    id,
    product_code,
    product_name,
    main_stock,
    sub1_stock,
    sub2_stock,
    sub3_stock,
    sub4_stock,
    min_stock_level,
    description,
    unit,
    created_at,
    updated_at,
    (main_stock + sub1_stock + sub2_stock + sub3_stock + sub4_stock) as total_stock,
    (main_stock + sub1_stock + sub2_stock + sub3_stock + sub4_stock) <= min_stock_level as is_low_stock
FROM stock;

-- User Permissions View
CREATE VIEW user_permissions AS
SELECT 
    id,
    name,
    email,
    is_active,
    CASE 
        WHEN is_depo_admin THEN 'Ana Depo Yöneticisi'
        WHEN is_depo_sorumlu1 THEN '1. Araç Sorumlusu'
        WHEN is_depo_sorumlu2 THEN '2. Araç Sorumlusu'
        WHEN is_depo_sorumlu3 THEN '3. Araç Sorumlusu'
        WHEN is_depo_sorumlu4 THEN '4. Araç Sorumlusu'
        ELSE 'Yetkisiz Kullanıcı'
    END as permissions_text,
    created_at,
    (SELECT name FROM users u2 WHERE u2.id = users.created_by) as created_by_name
FROM users;

-- ==============================================
-- 6. RLS AKTİF ET
-- ==============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- 7. RLS POLICIES
-- ==============================================

-- APP_SETTINGS POLICIES
CREATE POLICY "Herkes app_settings okuyabilir" ON app_settings FOR SELECT USING (true);
CREATE POLICY "Depo yöneticileri app_settings güncelleyebilir" ON app_settings FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() AND users.is_depo_admin = true
    )
);

-- STOCK POLICIES
CREATE POLICY "Everyone can read stock" ON stock FOR SELECT USING (true);
CREATE POLICY "Only admin can insert stock" ON stock FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() AND users.is_depo_admin = true
    )
);
CREATE POLICY "Authorized users can update stock" ON stock FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Only admin can delete stock" ON stock FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() AND users.is_depo_admin = true
    )
);

-- STOCK_MOVEMENTS POLICIES
CREATE POLICY "Users can view stock movements based on permissions" ON stock_movements FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() AND (
            users.is_depo_admin = true OR 
            users.is_depo_sorumlu1 = true OR 
            users.is_depo_sorumlu2 = true OR 
            users.is_depo_sorumlu3 = true OR 
            users.is_depo_sorumlu4 = true
        )
    )
);
CREATE POLICY "Users can insert stock movements based on permissions" ON stock_movements FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() AND (
            users.is_depo_admin = true OR 
            users.is_depo_sorumlu1 = true OR 
            users.is_depo_sorumlu2 = true OR 
            users.is_depo_sorumlu3 = true OR 
            users.is_depo_sorumlu4 = true
        )
    )
);

-- USERS POLICIES (TÜM 8 POLİCY)
CREATE POLICY "Users can view all users" ON users FOR SELECT USING (true);
CREATE POLICY "Users can view all profiles" ON users FOR SELECT USING (true);
CREATE POLICY "Users can create profiles" ON users FOR INSERT WITH CHECK (
    auth.uid() = id OR 
    EXISTS (
        SELECT 1 FROM users admin_user 
        WHERE admin_user.id = auth.uid() AND 
              admin_user.is_depo_admin = true AND 
              admin_user.is_active = true
    )
);
CREATE POLICY "Only admin can insert users" ON users FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM users users_1 
        WHERE users_1.id = auth.uid() AND users_1.is_depo_admin = true
    )
);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can update own profile or admins can update any" ON users FOR UPDATE USING (
    auth.uid() = id OR 
    EXISTS (
        SELECT 1 FROM users admin_user 
        WHERE admin_user.id = auth.uid() AND 
              admin_user.is_depo_admin = true AND 
              admin_user.is_active = true
    )
);
CREATE POLICY "Only admin can delete users" ON users FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM users users_1 
        WHERE users_1.id = auth.uid() AND users_1.is_depo_admin = true
    )
);
CREATE POLICY "Only admins can delete users" ON users FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM users admin_user 
        WHERE admin_user.id = auth.uid() AND 
              admin_user.is_depo_admin = true AND 
              admin_user.is_active = true
    )
);

-- ==============================================
-- 8. İLK ADMIN KULLANICI (ÖNEMLİ!)
-- ==============================================

-- ÖNCE: Yeni Supabase'de email/password ile kayıt olun
-- SONRA: Dashboard > Auth > Users'dan UUID'inizi kopyalayın
-- SON: Aşağıdaki VALUES kısmını düzenleyin

INSERT INTO users (id, name, email, is_depo_admin, is_active) 
VALUES (
    'YOUR_AUTH_UUID_HERE',  -- ← Gerçek UUID buraya
    'Admin Kullanıcı',
    'your-email@domain.com', -- ← Gerçek email buraya
    true,
    true
);

-- ==============================================
-- 9. VERİFİKASYON
-- ==============================================

-- Tablolar kontrol
SELECT 'users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'stock' as table_name, COUNT(*) FROM stock
UNION ALL
SELECT 'stock_movements' as table_name, COUNT(*) FROM stock_movements
UNION ALL
SELECT 'app_settings' as table_name, COUNT(*) FROM app_settings;

-- RLS policies kontrol
SELECT tablename, COUNT(*) as policy_count 
FROM pg_policies 
WHERE schemaname = 'public' 
GROUP BY tablename 
ORDER BY tablename;

-- Constraints kontrol  
SELECT table_name, constraint_type, COUNT(*) as constraint_count
FROM information_schema.table_constraints 
WHERE table_schema = 'public'
GROUP BY table_name, constraint_type
ORDER BY table_name, constraint_type;

-- ==============================================
-- MIGRATION TAMAMLANDI!
-- 
-- SON ADIMLAR:
-- 1. CSV dosyalarını mevcut projeden export edin
-- 2. Yeni projede Table Editor'dan import edin  
-- 3. js/config.js'de URL ve API key güncelleyin
-- ==============================================