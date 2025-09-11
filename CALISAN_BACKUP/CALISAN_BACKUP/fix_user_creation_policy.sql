-- RLS Politikası Düzeltme - Kullanıcı Oluşturma İzni
-- Bu script, admin kullanıcıların yeni kullanıcı oluşturabilmesi için gerekli politikayı ekler

-- Mevcut INSERT politikasını kaldır (varsa)
DROP POLICY IF EXISTS "Users can insert if admin" ON users;

-- Yeni INSERT politikası ekle - Admin kullanıcılar yeni kullanıcı oluşturabilir
CREATE POLICY "Admins can create users" ON users
    FOR INSERT
    WITH CHECK (
        -- Sadece admin kullanıcılar yeni kullanıcı oluşturabilir
        EXISTS (
            SELECT 1 FROM users admin_user 
            WHERE admin_user.id = auth.uid() 
            AND admin_user.is_depo_admin = true 
            AND admin_user.is_active = true
        )
    );

-- Mevcut SELECT politikasını kontrol et
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'users' 
        AND policyname = 'Users can view all users'
    ) THEN
        CREATE POLICY "Users can view all users" ON users
            FOR SELECT
            USING (true);
    END IF;
END $$;

-- Mevcut UPDATE politikasını kontrol et
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

-- Mevcut DELETE politikasını kontrol et
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

-- Politikaları kontrol et
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;
