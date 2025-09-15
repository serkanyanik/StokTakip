-- DELETE politikası ekle
CREATE POLICY "Only admin can delete stock" ON stock FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.is_depo_admin = true
    )
);

-- Politikayı kontrol et
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'stock' AND cmd = 'DELETE';

-- Test delete işlemi (artık çalışmalı)
-- DELETE FROM stock WHERE id = '4e771c08-74ed-4697-b217-06fb3e2053cb';