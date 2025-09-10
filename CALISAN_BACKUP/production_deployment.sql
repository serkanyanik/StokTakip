-- PRODUCTION DEPLOYMENT SCRIPT
-- Bu script production ortamı için gereken tüm ayarları yapar

-- 1. Users tablosu RLS politikalarını düzelt
DROP POLICY IF EXISTS "Anyone can insert pending users" ON users;
DROP POLICY IF EXISTS "Users can insert if admin" ON users;

-- Sadece admin'ler kullanıcı oluşturabilir
CREATE POLICY "Only admins can create users" ON users
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users admin_user 
            WHERE admin_user.id = auth.uid() 
            AND admin_user.is_depo_admin = true 
            AND admin_user.is_active = true
        )
    );

-- SELECT politikasını kontrol et
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'users' 
        AND policyname = 'Users can view all users'
    ) THEN
        CREATE POLICY "Users can view all users" ON users
            FOR SELECT
            USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- UPDATE politikasını kontrol et
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'users' 
        AND policyname = 'Admins can update users'
    ) THEN
        CREATE POLICY "Admins can update users" ON users
            FOR UPDATE
            USING (
                EXISTS (
                    SELECT 1 FROM users admin_user 
                    WHERE admin_user.id = auth.uid() 
                    AND admin_user.is_depo_admin = true 
                    AND admin_user.is_active = true
                )
            );
    END IF;
END $$;

-- DELETE politikasını kontrol et
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'users' 
        AND policyname = 'Admins can delete users'
    ) THEN
        CREATE POLICY "Admins can delete users" ON users
            FOR DELETE
            USING (
                EXISTS (
                    SELECT 1 FROM users admin_user 
                    WHERE admin_user.id = auth.uid() 
                    AND admin_user.is_depo_admin = true 
                    AND admin_user.is_active = true
                )
            );
    END IF;
END $$;

-- 2. Pending users tablosunu kaldır (artık gerekli değil)
DROP TABLE IF EXISTS pending_users CASCADE;

-- 3. Production için güvenlik ayarları
-- Auth settings güncelle (Supabase Dashboard'da da yapılmalı)
-- Email confirmations aktif olmalı
-- Signup restrictions aktif olmalı

-- 4. Kontrol
SELECT 
    'Production deployment tamamlandı' as status,
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE is_active = true) as active_users,
    COUNT(*) FILTER (WHERE is_depo_admin = true) as admin_users
FROM users;

-- 5. Güvenlik kontrolleri
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE tablename IN ('users', 'stock_movements', 'products')
ORDER BY tablename, policyname;
