-- SerkanStok Database Schema Export
-- Bu script'i mevcut Supabase projenizde çalıştırarak tam schema'yı alabilirsiniz

-- ==============================================
-- MEVCUT SCHEMA EXPORT
-- ==============================================

-- 1. Tüm tabloların yapısını görmek için
SELECT 
    table_name,
    STRING_AGG(ntrol ett e 
        column_name || ' ' || 
        CASE 
            WHEN data_type = 'character varying' THEN 'VARCHAR(' || COALESCE(character_maximum_length::text, '255') || ')'
            WHEN data_type = 'bigint' THEN 'BIGINT'
            WHEN data_type = 'integer' THEN 'INTEGER'
            WHEN data_type = 'numeric' THEN 'DECIMAL(' || numeric_precision || ',' || numeric_scale || ')'
            WHEN data_type = 'text' THEN 'TEXT'
            WHEN data_type = 'timestamp with time zone' THEN 'TIMESTAMP WITH TIME ZONE'
            WHEN data_type = 'boolean' THEN 'BOOLEAN'
            ELSE UPPER(data_type)
        END ||
        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
        CASE 
            WHEN column_default LIKE 'nextval%' THEN ' PRIMARY KEY'
            WHEN column_default IS NOT NULL AND column_default != 'NULL' THEN ' DEFAULT ' || column_default 
            ELSE '' 
        END,
        ',\n    '
        ORDER BY ordinal_position
    ) AS columns
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name NOT LIKE 'auth%'
  AND table_name NOT LIKE 'storage%'
  AND table_name NOT LIKE 'realtime%'
GROUP BY table_name
ORDER BY table_name;

-- 2. RLS Policies Export
SELECT 
    'CREATE POLICY "' || policyname || '" ON ' || tablename || 
    ' FOR ' || cmd ||
    CASE 
        WHEN qual IS NOT NULL THEN ' USING (' || qual || ')'
        ELSE ''
    END ||
    CASE 
        WHEN with_check IS NOT NULL THEN ' WITH CHECK (' || with_check || ')'
        ELSE ''
    END || ';' AS policy_sql
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Table Constraints (Foreign Keys, Unique, etc.)
SELECT
    'ALTER TABLE ' || table_name || ' ADD CONSTRAINT ' || constraint_name || ' ' ||
    CASE constraint_type
        WHEN 'PRIMARY KEY' THEN 'PRIMARY KEY (' || column_name || ')'
        WHEN 'FOREIGN KEY' THEN 'FOREIGN KEY (' || column_name || ') REFERENCES ' || 
            referenced_table_name || '(' || referenced_column_name || ')'
        WHEN 'UNIQUE' THEN 'UNIQUE (' || column_name || ')'
    END || ';' AS constraint_sql
FROM (
    SELECT 
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS referenced_table_name,
        ccu.column_name AS referenced_column_name
    FROM information_schema.table_constraints tc
    LEFT JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
    LEFT JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name
    WHERE tc.table_schema = 'public'
        AND tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE')
) AS constraints
ORDER BY table_name, constraint_type;

-- ==============================================
-- YENİ SUPABASE PROJESİNDE ÇALIŞTIR
-- ==============================================

-- 1. USERS TABLOSU (EN ÖNCE OLUŞTUR - FOREIGN KEY BAĞIMLILIĞI VAR)
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

-- 2. STOCK TABLOSU
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

-- 3. STOCK MOVEMENTS TABLOSU
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

-- 4. APP SETTINGS TABLOSU
CREATE TABLE app_settings (
    id INTEGER NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==============================================
-- PRIMARY KEY VE UNIQUE CONSTRAINTS
-- ==============================================

-- Primary Keys
ALTER TABLE app_settings ADD CONSTRAINT app_settings_pkey PRIMARY KEY (id);
ALTER TABLE stock ADD CONSTRAINT stock_pkey PRIMARY KEY (id);
ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_pkey PRIMARY KEY (id);
ALTER TABLE users ADD CONSTRAINT users_pkey PRIMARY KEY (id);

-- Unique Constraints
ALTER TABLE app_settings ADD CONSTRAINT app_settings_setting_key_key UNIQUE (setting_key);
ALTER TABLE stock ADD CONSTRAINT stock_product_code_key UNIQUE (product_code);
ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);

-- ==============================================
-- FOREIGN KEY CONSTRAINTS
-- ==============================================

-- Stock movements foreign keys
ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_product_id_fkey FOREIGN KEY (product_id) REFERENCES stock(id);
ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);

-- Users self-reference foreign key
ALTER TABLE users ADD CONSTRAINT users_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id);

-- ==============================================
-- VIEWS (STOCK SUMMARY VE USER PERMISSIONS)
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
-- RLS (ROW LEVEL SECURITY) AKTİF ET
-- ==============================================

ALTER TABLE stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- RLS POLİCİES (TAM UYUMLU)
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

-- USERS POLICIES (TÜM POLİCY'LER EKLENDI)
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
-- İLK KULLANICI OLUŞTUR (GEREKLİ!)
-- ==============================================

-- ÖNCE: Supabase Auth'da email/password ile kayıt olun
-- SONRA: Auth UUID'inizi alın ve aşağıya yazın
INSERT INTO users (id, name, email, is_depo_admin, is_active) 
VALUES (
    'YOUR_AUTH_UID_HERE', -- Supabase Auth'tan aldığınız gerçek UUID
    'Admin Kullanıcı',
    'your-email@example.com', -- Auth'da kullandığınız gerçek email
    true,
    true
);

-- ==============================================
-- VERİFİKASYON VE DATA IMPORT
-- ==============================================

-- Migration sonrası kontrol:
SELECT 'users' as table_name, COUNT(*) FROM users
UNION ALL
SELECT 'stock' as table_name, COUNT(*) FROM stock
UNION ALL
SELECT 'stock_movements' as table_name, COUNT(*) FROM stock_movements
UNION ALL
SELECT 'app_settings' as table_name, COUNT(*) FROM app_settings;

-- RLS policies kontrol:
SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;

-- Constraints kontrol:
SELECT table_name, constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_schema = 'public' 
ORDER BY table_name, constraint_type;

-- ==============================================
-- VERİ EXPORT/IMPORT KOMUTLARI
-- ==============================================

-- MEVCUT PROJEDE ÇALIŞTIR (Data Export):
/*
COPY (SELECT * FROM users) TO STDOUT WITH CSV HEADER;
COPY (SELECT * FROM stock) TO STDOUT WITH CSV HEADER;
COPY (SELECT * FROM stock_movements) TO STDOUT WITH CSV HEADER;
COPY (SELECT * FROM app_settings) TO STDOUT WITH CSV HEADER;
*/

-- CSV dosyalarını indirin ve yeni projede Table Editor > Import ile yükleyin
-- Sıralama: 1.users, 2.stock, 3.stock_movements, 4.app_settings