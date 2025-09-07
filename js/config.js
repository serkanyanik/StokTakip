// Supabase konfigürasyonu
// Bu dosyayı düzenleyerek kendi Supabase proje bilgilerinizi ekleyin

const SUPABASE_CONFIG = {
    url: 'YOUR_SUPABASE_URL', // Supabase proje URL'inizi buraya yazın
    anonKey: 'YOUR_SUPABASE_ANON_KEY' // Supabase anon key'inizi buraya yazın
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
