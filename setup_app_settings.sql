-- App Settings tablosu oluştur (eğer yoksa)
CREATE TABLE IF NOT EXISTS app_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Depo isimleri için varsayılan kayıt ekle (eğer yoksa)
INSERT INTO app_settings (setting_key, setting_value, created_at, updated_at)
VALUES (
    'warehouse_names',
    '{"main":"Ana Depo","sub1":"Araç 1","sub2":"Araç 2","sub3":"Araç 3","sub4":"Araç 4"}',
    NOW(),
    NOW()
)
ON CONFLICT (setting_key) DO NOTHING;

-- RLS (Row Level Security) politikası ekle
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Herkesin okuyabilmesi ve depo yöneticilerinin yazabilmesi için politika
CREATE POLICY "Herkes app_settings okuyabilir" ON app_settings FOR SELECT USING (true);

CREATE POLICY "Depo yöneticileri app_settings güncelleyebilir" ON app_settings FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.is_depo_admin = true
    )
);