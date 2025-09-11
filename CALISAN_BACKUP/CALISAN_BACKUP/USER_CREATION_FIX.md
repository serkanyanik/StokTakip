# 🚨 Kullanıcı Oluşturma Sorunu Çözümü

## Sorun
RLS (Row Level Security) politikaları yüzünden kullanıcı profili oluşturulamıyor.

## 🔧 Çözüm 1: RLS Politikasını Düzelt (Önerilen)

Supabase SQL Editor'da aşağıdaki script'i çalıştırın:

```sql
-- Mevcut INSERT politikasını kaldır
DROP POLICY IF EXISTS "Users can insert if admin" ON users;

-- Yeni INSERT politikası ekle
CREATE POLICY "Admins can create users" ON users
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users admin_user 
            WHERE admin_user.id = auth.uid() 
            AND admin_user.is_depo_admin = true 
            AND admin_user.is_active = true
        )
    );
```

## 🔧 Çözüm 2: Manuel Kullanıcı Ekleme

Bekleyen kullanıcıyı manuel olarak eklemek için:

```sql
INSERT INTO users (id, name, email, is_depo_admin, is_depo_sorumlu1, is_depo_sorumlu2, is_depo_sorumlu3, is_depo_sorumlu4, is_active, created_by) 
VALUES ('bcbd86e2-354d-4b6c-ba33-35fe397c8ff8', 'muratorun8', 'muratorun8@gmail.com', true, false, false, false, false, true, '0fe2b9bb-bb8b-42f6-9139-38b0c93d2c2f');
```

## 🔧 Çözüm 3: Edge Function (En Kapsamlı)

1. Supabase CLI kurun:
```bash
npm install -g supabase
```

2. Login olun:
```bash
supabase login
```

3. Projeyi bağlayın:
```bash
cd /Users/moat/ProjectS/SerkanStok
supabase link --project-ref YOUR_PROJECT_ID
```

4. Edge Function'ları deploy edin:
```bash
supabase functions deploy create-user-profile
supabase functions deploy create-user
```

## 🎯 Test

Çözümü uyguladıktan sonra:

1. ✅ Politika düzeltildiyse yeni kullanıcı oluşturma otomatik çalışacak
2. ✅ Manuel ekleme yapıldıysa muratorun8 kullanıcısı giriş yapabilecek
3. ✅ Edge Function deploy edildiyse tüm sistem otomatik çalışacak

## 📋 Kontrol

Kullanıcının eklenip eklenmediğini kontrol edin:

```sql
SELECT id, name, email, is_depo_admin, is_active, created_at 
FROM users 
WHERE email = 'muratorun8@gmail.com';
```

## 💡 Not

- RLS politikası sorunu bir kez çözüldükten sonra gelecekte yeni kullanıcılar otomatik oluşturulacak
- Edge Function en güvenli ve otomatik çözüm
- Manuel ekleme geçici bir çözüm
