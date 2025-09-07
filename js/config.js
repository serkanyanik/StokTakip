// Supabase konfigürasyonu
// Bu dosyayı düzenleyerek kendi Supabase proje bilgilerinizi ekleyin

const SUPABASE_CONFIG = {
    url: 'https://vkeyoaoabhobmrgawsuc.supabase.co', // Supabase proje URL
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrZXlvYW9hYmhvYm1yZ2F3c3VjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyNTA3NDEsImV4cCI6MjA3MjgyNjc0MX0.q7oqevdF_R7Qwg5HNmkI9WmGQjiBkr-YhmyzJajqWQ4' // Supabase anon key
};

// Supabase client oluştur
const supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

// Depo türleri
const WAREHOUSE_TYPES = {
    MAIN: 'main',
    SUB1: 'sub1',
    SUB2: 'sub2',
    SUB3: 'sub3',
    SUB4: 'sub4'
};

// Depo isimleri
const WAREHOUSE_NAMES = {
    [WAREHOUSE_TYPES.MAIN]: 'Ana Depo',
    [WAREHOUSE_TYPES.SUB1]: '1. Depo',
    [WAREHOUSE_TYPES.SUB2]: '2. Depo',
    [WAREHOUSE_TYPES.SUB3]: '3. Depo',
    [WAREHOUSE_TYPES.SUB4]: '4. Depo'
};

// Yetkiler için kolay erişim
const USER_PERMISSIONS = {
    ADMIN: 'is_depo_admin',
    SUB1: 'is_depo_sorumlu1',
    SUB2: 'is_depo_sorumlu2',
    SUB3: 'is_depo_sorumlu3',
    SUB4: 'is_depo_sorumlu4'
};

// Depo türü ile yetki eşleştirmesi
const WAREHOUSE_TO_PERMISSION = {
    [WAREHOUSE_TYPES.MAIN]: USER_PERMISSIONS.ADMIN,
    [WAREHOUSE_TYPES.SUB1]: USER_PERMISSIONS.SUB1,
    [WAREHOUSE_TYPES.SUB2]: USER_PERMISSIONS.SUB2,
    [WAREHOUSE_TYPES.SUB3]: USER_PERMISSIONS.SUB3,
    [WAREHOUSE_TYPES.SUB4]: USER_PERMISSIONS.SUB4
};

// Düşük stok uyarı seviyesi
const LOW_STOCK_THRESHOLD = 5;
