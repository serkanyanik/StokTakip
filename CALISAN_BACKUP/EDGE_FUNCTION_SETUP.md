# Edge Function Kurulum Talimatları

## 1. Supabase CLI Kurulumu

```bash
# NPM ile kurulum
npm install -g supabase

# Homebrew ile kurulum (macOS)
brew install supabase/tap/supabase
```

## 2. Supabase Login

```bash
supabase login
```

## 3. Project ile Bağlantı

```bash
# Proje dizininde çalıştırın
cd /Users/moat/ProjectS/SerkanStok

# Supabase project ID'nizi buraya yazın
supabase link --project-ref YOUR_PROJECT_ID
```

## 4. Edge Function Deploy

```bash
supabase functions deploy create-user
```

## 5. Edge Function Test

```bash
# Local test
supabase functions serve

# Remote test
curl -X POST 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/create-user' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "test@example.com",
    "password": "test123",
    "name": "Test User",
    "is_depo_admin": true,
    "created_by": "YOUR_USER_ID"
  }'
```

## Alternatif: Manuel Kullanıcı Oluşturma

Edge Function deploy edemezseniz, şu anki sistem çalışacak:

1. ✅ Kullanıcı Auth'da otomatik oluşturulur
2. ⚠️ Profil oluşturulamazsa SQL komutu verilir
3. 🔄 Admin SQL komutunu Supabase Dashboard'da çalıştırır

## Notlar

- Edge Function en temiz çözüm
- Manuel SQL alternatifi de çalışır
- Kullanıcılar hemen giriş yapabilir
- E-posta doğrulama otomatik
