-- Pending Users Tablosu Oluşturma
-- Bu tablo RLS bypass sorunu için geçici kullanıcı verilerini saklar

CREATE TABLE IF NOT EXISTS pending_users (
    id SERIAL PRIMARY KEY,
    auth_id UUID UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    is_depo_admin BOOLEAN DEFAULT FALSE,
    is_depo_sorumlu1 BOOLEAN DEFAULT FALSE,
    is_depo_sorumlu2 BOOLEAN DEFAULT FALSE,
    is_depo_sorumlu3 BOOLEAN DEFAULT FALSE,
    is_depo_sorumlu4 BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- RLS aktif et
ALTER TABLE pending_users ENABLE ROW LEVEL SECURITY;

-- Sadece admin kullanıcılar pending user oluşturabilir (Production güvenli)
CREATE POLICY "Only admins can create pending users" ON pending_users
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users admin_user 
            WHERE admin_user.id = auth.uid() 
            AND admin_user.is_depo_admin = true 
            AND admin_user.is_active = true
        )
    );

-- Sadece auth'lu kullanıcılar pending users görebilir
CREATE POLICY "Authenticated users can view pending users" ON pending_users
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Sadece admin'ler pending users güncelleyebilir
CREATE POLICY "Admins can update pending users" ON pending_users
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users admin_user 
            WHERE admin_user.id = auth.uid() 
            AND admin_user.is_depo_admin = true 
            AND admin_user.is_active = true
        )
    );

-- Sadece admin'ler pending users silebilir  
CREATE POLICY "Admins can delete pending users" ON pending_users
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users admin_user 
            WHERE admin_user.id = auth.uid() 
            AND admin_user.is_depo_admin = true 
            AND admin_user.is_active = true
        )
    );

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_pending_users_auth_id ON pending_users(auth_id);
CREATE INDEX IF NOT EXISTS idx_pending_users_email ON pending_users(email);
CREATE INDEX IF NOT EXISTS idx_pending_users_status ON pending_users(status);

-- Kontrol
SELECT 'pending_users tablosu oluşturuldu' as status;
