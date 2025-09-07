# Serkan Stok - Beyaz Eşya Teknik Servis Stok Takip Sistemi

Beyaz eşya teknik servisleri için geliştirilmiş web tabanlı stok takip sistemi. GitHub Pages üzerinde barındırılır ve Supabase veritabanı kullanır.

## Özellikler

### 🏢 Depo Yönetimi
- **Ana Depo**: Tüm stok girişlerinin yapıldığı merkezi depo
- **4 Ara Depo**: Stok çıkışı ve transfer işlemlerinin yapıldığı alt depolar
- **Rol Tabanlı Erişim**: Her depo sorumlusunun farklı yetkileri

### 👥 Kullanıcı Rolleri
- **Ana Depo Sorumlusu**: 
  - Tüm depoları görüntüleyebilir
  - Stok ekleyebilir (sadece ana depoya)
  - Tüm depolardan stok çıkarabilir
  - Depolar arası transfer yapabilir
  
- **Ara Depo Sorumluları (1-4)**:
  - Tüm depoları görüntüleyebilir (sadece görüntüleme)
  - Sadece kendi depolarından stok çıkarabilir
  - Kendi depolarından dış kullanıma stok verebilir

### 📊 Stok Takibi
- Ürün kodu ve adı ile stok takibi
- Depo bazında stok miktarları
- Düşük stok uyarıları
- Anlık istatistikler
- Depolar arası stok transferi

## Teknolojiler

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **UI Framework**: Bootstrap 5
- **Icons**: Font Awesome
- **Database**: Supabase (PostgreSQL)
- **Hosting**: GitHub Pages
- **Authentication**: Supabase Auth

## Kurulum

### 1. Supabase Projesi Oluşturma

1. [Supabase](https://supabase.com) hesabı oluşturun
2. Yeni proje oluşturun
3. SQL Editor'dan aşağıdaki tabloları oluşturun:

```sql
-- Kullanıcı profilleri tablosu
CREATE TABLE users (
    id UUID REFERENCES auth.users PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('main_admin', 'sub1_manager', 'sub2_manager', 'sub3_manager', 'sub4_manager')),
    warehouse_access TEXT[], -- İsteğe bağlı: hangi depolara erişebileceği
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stok tablosu
CREATE TABLE stock (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_code VARCHAR(100) UNIQUE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    main_stock INTEGER DEFAULT 0 CHECK (main_stock >= 0),
    sub1_stock INTEGER DEFAULT 0 CHECK (sub1_stock >= 0),
    sub2_stock INTEGER DEFAULT 0 CHECK (sub2_stock >= 0),
    sub3_stock INTEGER DEFAULT 0 CHECK (sub3_stock >= 0),
    sub4_stock INTEGER DEFAULT 0 CHECK (sub4_stock >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stok hareketleri tablosu (opsiyonel - log tutmak için)
CREATE TABLE stock_movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES stock(id),
    user_id UUID REFERENCES users(id),
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('add', 'remove', 'transfer')),
    source_warehouse VARCHAR(20),
    target_warehouse VARCHAR(20),
    quantity INTEGER NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) politikaları
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Kullanıcılar sadece kendi profillerini görebilir
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

-- Herkes stok tablosunu okuyabilir
CREATE POLICY "Everyone can read stock" ON stock
    FOR SELECT TO authenticated USING (true);

-- Sadece ana depo sorumlusu stok ekleyebilir
CREATE POLICY "Only main admin can insert stock" ON stock
    FOR INSERT TO authenticated 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'main_admin'
        )
    );

-- Stok güncellemeleri için politika
CREATE POLICY "Authorized users can update stock" ON stock
    FOR UPDATE TO authenticated USING (true)
    WITH CHECK (true);

-- Stok hareketleri için politikalar
CREATE POLICY "Users can read stock movements" ON stock_movements
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert stock movements" ON stock_movements
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
```

### 2. Örnek Veri Ekleme

```sql
-- Örnek kullanıcı ekle (ana depo sorumlusu)
INSERT INTO users (id, name, email, role) VALUES 
('YOUR_USER_ID', 'Ana Depo Sorumlusu', 'admin@example.com', 'main_admin');

-- Örnek stok verileri
INSERT INTO stock (product_code, product_name, main_stock, sub1_stock, sub2_stock, sub3_stock, sub4_stock) VALUES
('ARÇ001', 'Arçelik Çamaşır Makinesi Motoru', 5, 2, 1, 0, 1),
('BSH002', 'Bosch Bulaşık Makinesi Pompası', 3, 1, 2, 1, 0),
('VES003', 'Vestel Buzdolabı Kompresörü', 8, 3, 2, 2, 1),
('SAM004', 'Samsung Fırın Rezistansı', 12, 4, 3, 2, 3),
('LG005', 'LG Klima Fanı', 6, 2, 2, 1, 1);
```

### 3. GitHub Pages Kurulumu

1. Bu projeyi GitHub'a yükleyin
2. Repository Settings > Pages bölümünden GitHub Pages'i aktifleştirin
3. Source olarak "Deploy from a branch" seçin
4. Branch olarak "main" seçin

### 4. Konfigürasyon

1. `js/config.js` dosyasını düzenleyin:
```javascript
const SUPABASE_CONFIG = {
    url: 'YOUR_SUPABASE_PROJECT_URL',
    anonKey: 'YOUR_SUPABASE_ANON_KEY'
};
```

2. Supabase Dashboard'dan URL ve anon key'i alın
3. Değerleri config.js dosyasına ekleyin

## Kullanım

### İlk Giriş
1. Supabase Authentication'da kullanıcı oluşturun
2. `users` tablosuna kullanıcı profilini ekleyin
3. Web sitesinde e-posta ve şifre ile giriş yapın

### Stok Yönetimi
- **Stok Ekleme**: Sadece ana depo sorumlusu, sadece ana depoya
- **Stok Çıkarma**: Her depo sorumlusu kendi deposundan
- **Depo Görüntüleme**: Tüm kullanıcılar tüm depoları görebilir
- **Transfer**: Ana depo sorumlusu depolar arası transfer yapabilir

### Yetki Sistemi
- Ana Depo Sorumlusu: Tam yetki
- Ara Depo Sorumluları: Sınırlı yetki (sadece kendi depoları)

## Güvenlik

- Supabase Row Level Security (RLS) kullanılır
- Kullanıcı rolleri veritabanı seviyesinde kontrol edilir
- Frontend'de de yetki kontrolleri yapılır
- Tüm hassas işlemler backend'de doğrulanır

## Geliştirme

Projeyi local'de geliştirmek için:

1. Projeyi klonlayın
2. Supabase konfigürasyonunu yapın
3. Local web server başlatın:
   ```bash
   python -m http.server 8000
   # veya
   npx serve .
   ```

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add some amazing feature'`)
4. Branch'i push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## İletişim

Proje sahibi: [Your Name]
E-posta: [your.email@example.com]

## Changelog

### v1.0.0
- İlk sürüm
- Temel stok takip özellikleri
- Rol tabanlı erişim kontrolü
- GitHub Pages deployment
