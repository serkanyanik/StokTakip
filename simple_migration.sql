-- Basit kolon ekleme script'i
-- Sadece eksik kolonları ekler, mevcut verilere dokunmaz

-- Users tablosuna yeni kolonlar ekle
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_depo_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_depo_sorumlu1 BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_depo_sorumlu2 BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_depo_sorumlu3 BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_depo_sorumlu4 BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- Mevcut kullanıcınızı ana depo sorumlusu yapın
UPDATE users 
SET is_depo_admin = true, is_active = true
WHERE id = '0fe2b9bb-bb8b-42f6-9139-38b0c93d2c2f';

-- Politikaları güncelle (eski olanları sil, yenilerini ekle)
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Only main admin can insert stock" ON stock;

CREATE POLICY IF NOT EXISTS "Users can view all profiles" ON users
    FOR SELECT TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "Only admin can insert users" ON users
    FOR INSERT TO authenticated 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND is_depo_admin = true
        )
    );

CREATE POLICY IF NOT EXISTS "Only admin can delete users" ON users
    FOR DELETE TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND is_depo_admin = true
        )
    );

CREATE POLICY IF NOT EXISTS "Only admin can insert stock" ON stock
    FOR INSERT TO authenticated 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND is_depo_admin = true
        )
    );
