# Serkan Stok - Kurulum Rehberi

Bu rehber Serkan Stok sistemini kurmanız için adım adım talimatlar içerir.

## 🚀 Hızlı Başlangıç

### 1. Gereksinimler
- Supabase hesabı (ücretsiz)
- GitHub hesabı (ücretsiz)
- Modern web tarayıcısı

### 2. Supabase Kurulumu

#### Adım 1: Supabase Projesi Oluşturun
1. [Supabase.com](https://supabase.com)'a gidin
2. "Start your project" butonuna tıklayın
3. GitHub ile giriş yapın
4. "New project" oluşturun
5. Proje adı: `serkan-stok` (veya istediğiniz ad)
6. Database Password belirleyin (güçlü şifre)
7. Region: `West Europe (eu-west-1)` seçin
8. "Create new project" butonuna tıklayın

#### Adım 2: Veritabanı Şemasını Oluşturun
1. Proje oluşturulduktan sonra sol menüden "SQL Editor" seçin
2. "New query" butonuna tıklayın
3. `database_schema.sql` dosyasının içeriğini kopyalayın
4. SQL Editor'a yapıştırın
5. "Run" butonuna tıklayın

#### Adım 3: Authentication Ayarlarını Yapın
1. Sol menüden "Authentication" seçin
2. "Settings" sekmesine geçin
3. "Site URL" alanına GitHub Pages URL'inizi yazın: `https://yourusername.github.io/serkan-stok`
4. "Additional Redirect URLs" alanına da aynı URL'i ekleyin
5. "Save" butonuna tıklayın

#### Adım 4: API Anahtarlarını Alın
1. Sol menüden "Settings" > "API" seçin
2. "Project URL" ve "anon/public" key'i kopyalayın
3. Bu bilgileri not edin (sonra kullanacağız)

### 3. GitHub Kurulumu

#### Adım 1: Repository Oluşturun
1. GitHub'da yeni repository oluşturun
2. Repository adı: `serkan-stok` (veya istediğiniz ad)
3. Public olarak ayarlayın
4. "Create repository" butonuna tıklayın

#### Adım 2: Kodu Yükleyin
Projenizi GitHub'a yüklemek için terminal açın ve şu komutları çalıştırın:

```bash
cd /path/to/SerkanStok
git init
git add .
git commit -m "İlk commit: Serkan Stok sistemi"
git branch -M main
git remote add origin https://github.com/yourusername/serkan-stok.git
git push -u origin main
```

#### Adım 3: GitHub Pages'i Aktifleştirin
1. Repository'nizde "Settings" sekmesine gidin
2. Sol menüden "Pages" seçin
3. "Source" olarak "Deploy from a branch" seçin
4. "Branch" olarak "main" seçin
5. "Save" butonuna tıklayın
6. Birkaç dakika sonra siteniz `https://yourusername.github.io/serkan-stok` adresinde yayında olacak

### 4. Konfigürasyon

#### js/config.js Dosyasını Düzenleyin
1. Proje dosyalarında `js/config.js` dosyasını açın
2. Aşağıdaki satırları Supabase bilgilerinizle değiştirin:

```javascript
const SUPABASE_CONFIG = {
    url: 'YOUR_SUPABASE_PROJECT_URL', // Buraya Supabase Project URL'inizi yazın
    anonKey: 'YOUR_SUPABASE_ANON_KEY' // Buraya Supabase anon key'inizi yazın
};
```

3. Dosyayı kaydedin
4. GitHub'a push edin:

```bash
git add js/config.js
git commit -m "Supabase konfigürasyonu eklendi"
git push
```

### 5. İlk Kullanıcıyı Oluşturun

#### Adım 1: Authentication Kullanıcısı Oluşturun
1. Supabase Dashboard'da "Authentication" > "Users" seçin
2. "Add user" butonuna tıklayın
3. E-posta ve şifre girin
4. "Create user" butonuna tıklayın
5. Oluşturulan kullanıcının ID'sini kopyalayın

#### Adım 2: Kullanıcı Profilini Oluşturun
1. "SQL Editor" seçin
2. `migration_user_system.sql` dosyasının içeriğini kopyalayın ve çalıştırın
3. Bu script mevcut sistemi yeni kullanıcı yapısına çevirecek
4. Veya yeni kurulumda aşağıdaki SQL komutunu çalıştırın:

```sql
-- Yeni sistem için kullanıcı ekleme
INSERT INTO users (id, name, email, is_depo_admin, is_active) VALUES 
('0fe2b9bb-bb8b-42f6-9139-38b0c93d2c2f', 'Ana Depo Sorumlusu', 'muratorun88@gmail.com', true, true)
ON CONFLICT (id) 
DO UPDATE SET 
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    is_depo_admin = EXCLUDED.is_depo_admin,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();
```

### 6. Örnek Veriyi Ekleyin (Opsiyonel)

Sistemi test etmek için örnek ürünler ekleyebilirsiniz:

```sql
INSERT INTO stock (product_code, product_name, main_stock, sub1_stock, sub2_stock, sub3_stock, sub4_stock, description) VALUES
('ARÇ001', 'Arçelik Çamaşır Makinesi Motoru', 15, 3, 2, 1, 2, 'Arçelik marka çamaşır makinesi için orijinal motor'),
('BSH002', 'Bosch Bulaşık Makinesi Pompası', 8, 2, 1, 1, 1, 'Bosch bulaşık makinesi drenaj pompası'),
('VES003', 'Vestel Buzdolabı Kompresörü', 12, 4, 3, 2, 2, 'Vestel buzdolabı kompresör ünitesi');
```

## ✅ Test Edin

1. GitHub Pages URL'inize gidin: `https://yourusername.github.io/serkan-stok`
2. Oluşturduğunuz kullanıcı bilgileri ile giriş yapın
3. Stok listesini görüntüleyin
4. Stok ekleme/çıkarma işlemlerini test edin

## 🔧 Yerel Geliştirme

Projeyi yerel bilgisayarınızda geliştirmek için:

1. Repository'yi klonlayın:
```bash
git clone https://github.com/yourusername/serkan-stok.git
cd serkan-stok
```

2. Yerel web sunucusu başlatın:
```bash
python3 -m http.server 8000
```

3. Tarayıcıda `http://localhost:8000` adresine gidin

## 📋 Sonraki Adımlar

1. **Kullanıcı yönetimi**: Ana depo sorumlusu olarak sisteme giriş yapın ve "Kullanıcı Yönetimi" butonundan yeni kullanıcılar ekleyin
2. **Yetki atamaları**: Kullanıcılara hangi depoların sorumluluğunu verebileceğinizi belirleyin (bir kullanıcı birden fazla deponun sorumlusu olabilir)
3. **Stok verilerini ekleyin**: Gerçek ürün verilerinizi sisteme girin
4. **Yedekleme ayarlayın**: Supabase'de otomatik yedekleme aktifleştirin
5. **Domain bağlayın**: İsteğe bağlı olarak kendi domain'inizi GitHub Pages'e bağlayın

## 🎯 Yeni Özellikler

### 👥 Esnek Kullanıcı Sistemi
- **Ana Depo Sorumlusu**: Tüm yetkiler + kullanıcı yönetimi
- **Çoklu Depo Sorumluluğu**: Bir kullanıcı birden fazla deponun sorumlusu olabilir
- **Dinamik Yetki Sistemi**: Boolean kolonlarla esnek yetki yönetimi

### 🔧 Kullanıcı Yönetimi Özellikleri
- Web arayüzünden yeni kullanıcı ekleme
- Kullanıcı bilgilerini düzenleme
- Yetki atama/kaldırma
- Kullanıcı aktivasyonu/deaktivasyonu
- Kullanıcı silme işlemleri

## 🆘 Sorun Giderme

### "Giriş yapılamadı" hatası
- Supabase Authentication ayarlarını kontrol edin
- Site URL'lerinin doğru olduğunu onaylayın

### "Veritabanı bağlantı hatası"
- Supabase API anahtarlarını kontrol edin
- config.js dosyasındaki URL'lerin doğru olduğunu onaylayın

### Stok işlemleri çalışmıyor
- RLS politikalarının doğru çalıştığını kontrol edin
- Kullanıcı rollerinin doğru atandığını onaylayın

## 📞 Destek

Herhangi bir sorunla karşılaştığınızda:
1. README.md dosyasını tekrar okuyun
2. GitHub Issues'de sorun bildirin
3. Supabase dokümantasyonunu kontrol edin

---

**Tebrikler! 🎉 Serkan Stok sisteminiz artık çalışıyor!**
