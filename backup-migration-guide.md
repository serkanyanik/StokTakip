# Supabase Database Migration Rehberi

## 1. Schema & Policies Backup

### SQL Editor'dan Schema Export
Supabase Dashboard > SQL Editor'a gidin ve şu komutu çalıştırın:

```sql
-- Tüm tabloları ve yapılarını görmek için
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- RLS Policies'leri görmek için
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public';
```

### Manuel Schema Export (Alternatif)
```sql
-- CREATE TABLE komutlarını görmek için
SELECT 
    'CREATE TABLE ' || table_name || ' (' ||
    string_agg(
        column_name || ' ' || 
        CASE 
            WHEN data_type = 'character varying' THEN 'varchar(' || character_maximum_length || ')'
            WHEN data_type = 'numeric' THEN 'numeric(' || numeric_precision || ',' || numeric_scale || ')'
            ELSE data_type 
        END ||
        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
        CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
        ', '
    ) || ');'
FROM information_schema.columns 
WHERE table_schema = 'public' 
GROUP BY table_name;
```

## 2. Data Export

### Basit CSV Export
Her tablo için Supabase Dashboard > Table Editor'dan:
1. Tablonun tamamını seçin
2. "Export as CSV" butonuna tıklayın

### SQL ile Data Export
```sql
-- Örnek: stock tablosu için
COPY (SELECT * FROM stock) TO STDOUT WITH CSV HEADER;

-- Örnek: stock_movements tablosu için  
COPY (SELECT * FROM stock_movements) TO STDOUT WITH CSV HEADER;

-- Örnek: app_settings tablosu için
COPY (SELECT * FROM app_settings) TO STDOUT WITH CSV HEADER;
```

## 3. Yeni Supabase Projesinde Import

### Adım 1: Yeni Proje Oluştur
1. Yeni Supabase hesabı açın
2. Yeni proje oluşturun
3. Authentication ayarlarını yapın

### Adım 2: Schema Oluştur
SQL Editor'da sırasıyla çalıştırın:

```sql
-- 1. Ana stock tablosu
CREATE TABLE stock (
    id BIGSERIAL PRIMARY KEY,
    product_code VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_price DECIMAL(10,2),
    product_image_url TEXT,
    main_stock INTEGER DEFAULT 0,
    sub1_stock INTEGER DEFAULT 0,
    sub2_stock INTEGER DEFAULT 0,
    sub3_stock INTEGER DEFAULT 0,
    sub4_stock INTEGER DEFAULT 0,
    shelf_address VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Stock movements tablosu
CREATE TABLE stock_movements (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT REFERENCES stock(id) ON DELETE CASCADE,
    product_code VARCHAR(50) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('in', 'out', 'transfer')),
    source_warehouse VARCHAR(20),
    target_warehouse VARCHAR(20),
    quantity INTEGER NOT NULL,
    notes TEXT,
    sale_price DECIMAL(10,2),
    form_info VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_email VARCHAR(255)
);

-- 3. App settings tablosu
CREATE TABLE app_settings (
    id BIGSERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. RLS (Row Level Security) aktif et
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Stock tablosu policies
CREATE POLICY "Enable read access for all users" ON stock FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON stock FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users only" ON stock FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users only" ON stock FOR DELETE USING (auth.role() = 'authenticated');

-- Stock movements policies
CREATE POLICY "Enable read access for all users" ON stock_movements FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON stock_movements FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- App settings policies
CREATE POLICY "Enable read access for all users" ON app_settings FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON app_settings FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users only" ON app_settings FOR UPDATE USING (auth.role() = 'authenticated');
```

### Adım 3: Data Import
1. CSV dosyalarını Table Editor'dan import edin
2. Veya SQL ile insert komutları çalıştırın

### Adım 4: Config Güncelle
`js/config.js` dosyasındaki:
- `SUPABASE_CONFIG.url`
- `SUPABASE_CONFIG.anonKey`

değerlerini yeni projenin değerleri ile güncelleyin.

## 4. Alternatif Backup Yöntemleri

### pg_dump (Terminal)
Eğer PostgreSQL connection string'iniz varsa:
```bash
pg_dump "postgresql://[username]:[password]@[host]:[port]/[database]" > backup.sql
```

### Supabase CLI
```bash
npx supabase db dump --db-url "postgresql://[connection-string]"
```

## 5. Test & Verification

### Backup Sonrası Kontrol
```sql
-- Tablo sayısını kontrol et
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';

-- Veri sayılarını kontrol et
SELECT 
    'stock' as table_name, COUNT(*) as row_count FROM stock
UNION ALL
SELECT 
    'stock_movements' as table_name, COUNT(*) as row_count FROM stock_movements
UNION ALL
SELECT 
    'app_settings' as table_name, COUNT(*) as row_count FROM app_settings;

-- RLS policies kontrol et
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';
```

## 6. Production Checklist

- [ ] Yeni Supabase projesi oluşturuldu
- [ ] Schema export edildi
- [ ] Data export edildi  
- [ ] Yeni projede schema oluşturuldu
- [ ] RLS policies eklendi
- [ ] Data import edildi
- [ ] Config.js güncellendi
- [ ] Test kullanıcısı oluşturuldu
- [ ] Tüm fonksiyonlar test edildi
- [ ] Domain/DNS ayarları yapıldı (gerekirse)

## 7. Free Tier Limitler
- Database size: 500MB
- API requests: 50,000/ay
- Bandwidth: 2GB/ay
- Realtime connections: 200 concurrent

Bu limitler içinde kalacağınızdan emin olun.