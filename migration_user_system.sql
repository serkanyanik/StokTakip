-- Migration: Kullanıcı sistemi güncelleme (Güvenli Versiyon)
-- Bu script mevcut veritabanınızda güvenle çalıştırılabilir

-- 1. Yeni kolonları ekle (eğer yoksa)
DO $$ 
BEGIN
    -- is_depo_admin kolonu ekle
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_depo_admin') THEN
        ALTER TABLE users ADD COLUMN is_depo_admin BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- is_depo_sorumlu1 kolonu ekle
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_depo_sorumlu1') THEN
        ALTER TABLE users ADD COLUMN is_depo_sorumlu1 BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- is_depo_sorumlu2 kolonu ekle
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_depo_sorumlu2') THEN
        ALTER TABLE users ADD COLUMN is_depo_sorumlu2 BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- is_depo_sorumlu3 kolonu ekle
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_depo_sorumlu3') THEN
        ALTER TABLE users ADD COLUMN is_depo_sorumlu3 BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- is_depo_sorumlu4 kolonu ekle
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_depo_sorumlu4') THEN
        ALTER TABLE users ADD COLUMN is_depo_sorumlu4 BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- is_active kolonu ekle
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_active') THEN
        ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
    
    -- created_by kolonu ekle
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='created_by') THEN
        ALTER TABLE users ADD COLUMN created_by UUID REFERENCES users(id);
    END IF;
END $$;

-- 2. Mevcut 'role' kolonundaki verileri yeni sisteme çevir (eğer role kolonu varsa)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='role') THEN
        UPDATE users SET is_depo_admin = true WHERE role = 'main_admin';
        UPDATE users SET is_depo_sorumlu1 = true WHERE role = 'sub1_manager';
        UPDATE users SET is_depo_sorumlu2 = true WHERE role = 'sub2_manager';
        UPDATE users SET is_depo_sorumlu3 = true WHERE role = 'sub3_manager';
        UPDATE users SET is_depo_sorumlu4 = true WHERE role = 'sub4_manager';
    END IF;
END $$;

-- 3. Mevcut kullanıcınızı ana depo sorumlusu yap
UPDATE users 
SET is_depo_admin = true, is_active = true
WHERE id = '0fe2b9bb-bb8b-42f6-9139-38b0c93d2c2f';

-- 4. Eski politikaları güvenle sil ve yenilerini oluştur
DO $$ 
BEGIN
    -- Eski politikaları sil (varsa)
    DROP POLICY IF EXISTS "Users can view own profile" ON users;
    DROP POLICY IF EXISTS "Users can update own profile" ON users;
    DROP POLICY IF EXISTS "Only main admin can insert stock" ON stock;
    
    -- Yeni politikaları oluştur
    CREATE POLICY "Users can view all profiles" ON users
        FOR SELECT TO authenticated USING (true);

    CREATE POLICY "Users can update own profile" ON users
        FOR UPDATE USING (auth.uid() = id);

    -- Sadece ana depo sorumlusu yeni kullanıcı ekleyebilir
    CREATE POLICY "Only admin can insert users" ON users
        FOR INSERT TO authenticated 
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM users 
                WHERE id = auth.uid() 
                AND is_depo_admin = true
            )
        );

    -- Sadece ana depo sorumlusu kullanıcı silebilir
    CREATE POLICY "Only admin can delete users" ON users
        FOR DELETE TO authenticated 
        USING (
            EXISTS (
                SELECT 1 FROM users 
                WHERE id = auth.uid() 
                AND is_depo_admin = true
            )
        );

    -- Stok politikasını güncelle
    CREATE POLICY "Only admin can insert stock" ON stock
        FOR INSERT TO authenticated 
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM users 
                WHERE id = auth.uid() 
                AND is_depo_admin = true
            )
        );
END $$;
