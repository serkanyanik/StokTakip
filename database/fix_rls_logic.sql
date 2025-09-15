-- RLS Politikasını Düzeltme - MANTIKLI ÇÖZÜM
-- Bu script production_deployment.sql'nin düzeltilmiş hali

-- Mevcut hatalı politikayı kaldır
DROP POLICY IF EXISTS "Only admins can create users" ON users;
DROP POLICY IF EXISTS "Admins can create users" ON users;

-- DOĞRU POLITIKA: Auth'lu herkes kendi profilini oluşturabilir + Admin'ler başkasının profilini oluşturabilir
CREATE POLICY "Users can create profiles" ON users
    FOR INSERT
    WITH CHECK (
        -- Kendi profilini oluşturuyor
        auth.uid() = id
        OR
        -- Ya da admin kullanıcı başkasının profilini oluşturuyor
        EXISTS (
            SELECT 1 FROM users admin_user 
            WHERE admin_user.id = auth.uid() 
            AND admin_user.is_depo_admin = true 
            AND admin_user.is_active = true
        )
    );

-- UPDATE politikasını kontrol et
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'users' 
        AND policyname = 'Users can update own profile or admins can update any'
    ) THEN
        DROP POLICY IF EXISTS "Admins can update users" ON users;
        CREATE POLICY "Users can update own profile or admins can update any" ON users
            FOR UPDATE
            USING (
                -- Kendi profilini güncelliyor
                auth.uid() = id
                OR
                -- Ya da admin kullanıcı
                EXISTS (
                    SELECT 1 FROM users admin_user 
                    WHERE admin_user.id = auth.uid() 
                    AND admin_user.is_depo_admin = true 
                    AND admin_user.is_active = true
                )
            );
    END IF;
END $$;

-- SELECT politikası zaten var, kontrol et
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

-- DELETE sadece admin'ler yapabilir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'users' 
        AND policyname = 'Only admins can delete users'
    ) THEN
        DROP POLICY IF EXISTS "Admins can delete users" ON users;
        CREATE POLICY "Only admins can delete users" ON users
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

-- Test et
SELECT 'RLS politikaları düzeltildi - Artık kullanıcı oluşturma otomatik çalışacak' as status;

-- Politikaları görüntüle
SELECT 
    policyname,
    cmd as operation,
    CASE 
        WHEN with_check IS NOT NULL THEN 'INSERT/UPDATE'
        WHEN qual IS NOT NULL THEN 'SELECT/UPDATE/DELETE' 
        ELSE 'UNKNOWN'
    END as policy_type
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;
