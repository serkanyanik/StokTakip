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

// Kullanıcı rolleri
const USER_ROLES = {
    MAIN_ADMIN: 'main_admin',
    SUB1_MANAGER: 'sub1_manager',
    SUB2_MANAGER: 'sub2_manager',
    SUB3_MANAGER: 'sub3_manager',
    SUB4_MANAGER: 'sub4_manager'
};

// Depo isimleri
const WAREHOUSE_NAMES = {
    [WAREHOUSE_TYPES.MAIN]: 'Ana Depo',
    [WAREHOUSE_TYPES.SUB1]: '1. Depo',
    [WAREHOUSE_TYPES.SUB2]: '2. Depo',
    [WAREHOUSE_TYPES.SUB3]: '3. Depo',
    [WAREHOUSE_TYPES.SUB4]: '4. Depo'
};

// Rol isimleri
const ROLE_NAMES = {
    [USER_ROLES.MAIN_ADMIN]: 'Ana Depo Sorumlusu',
    [USER_ROLES.SUB1_MANAGER]: '1. Depo Sorumlusu',
    [USER_ROLES.SUB2_MANAGER]: '2. Depo Sorumlusu',
    [USER_ROLES.SUB3_MANAGER]: '3. Depo Sorumlusu',
    [USER_ROLES.SUB4_MANAGER]: '4. Depo Sorumlusu'
};

// Düşük stok uyarı seviyesi
const LOW_STOCK_THRESHOLD = 5;
