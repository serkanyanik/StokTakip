// Supabase konfigürasyonu

const SUPABASE_CONFIG = {
    url: 'https://nvgjncpzywrjfkoxgjpi.supabase.co', // Supabase proje URL
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52Z2puY3B6eXdyamZrb3hnanBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MzIyMjAsImV4cCI6MjA3MzUwODIyMH0.oVCbLflMd7-emwlPGFVarZne7bF_y8EEAghRqcxDn30' // Supabase anon key
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

// Depo isimleri (düzenlenebilir)
let WAREHOUSE_NAMES = {
    [WAREHOUSE_TYPES.MAIN]: 'Ana Depo',
    [WAREHOUSE_TYPES.SUB1]: '1. Araç',
    [WAREHOUSE_TYPES.SUB2]: '2. Araç',
    [WAREHOUSE_TYPES.SUB3]: '3. Araç',
    [WAREHOUSE_TYPES.SUB4]: '4. Araç'
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

// Yardımcı fonksiyonlar

// Türkçe karakterleri doğru şekilde dönüştüren yardımcı fonksiyonlar
function toTurkishLowerCase(str) {
    if (!str) return str;

    // Tamamen manuel karakter dönüşümü - JavaScript'in toLowerCase() metodunu güvenli kullan
    const upperToLower = {
        'A': 'a', 'B': 'b', 'C': 'c', 'D': 'd', 'E': 'e', 'F': 'f', 'G': 'g', 'H': 'h',
        'İ': 'i', 'I': 'ı', 'J': 'j', 'K': 'k', 'L': 'l', 'M': 'm', 'N': 'n', 'O': 'o',
        'P': 'p', 'Q': 'q', 'R': 'r', 'S': 's', 'T': 't', 'U': 'u', 'V': 'v', 'W': 'w',
        'X': 'x', 'Y': 'y', 'Z': 'z', 'Ğ': 'ğ', 'Ü': 'ü', 'Ş': 'ş', 'Ö': 'ö', 'Ç': 'ç'
    };

    return str.split('').map(char => upperToLower[char] || char).join('');
}

function toTurkishUpperCase(str) {
    if (!str) return str;

    // Tamamen manuel karakter dönüşümü - JavaScript'in toUpperCase() metodunu güvenli kullan
    const lowerToUpper = {
        'a': 'A', 'b': 'B', 'c': 'C', 'd': 'D', 'e': 'E', 'f': 'F', 'g': 'G', 'h': 'H',
        'i': 'İ', 'ı': 'I', 'j': 'J', 'k': 'K', 'l': 'L', 'm': 'M', 'n': 'N', 'o': 'O',
        'p': 'P', 'q': 'Q', 'r': 'R', 's': 'S', 't': 'T', 'u': 'U', 'v': 'V', 'w': 'W',
        'x': 'X', 'y': 'Y', 'z': 'Z', 'ğ': 'Ğ', 'ü': 'Ü', 'ş': 'Ş', 'ö': 'Ö', 'ç': 'Ç'
    };

    return str.split('').map(char => lowerToUpper[char] || char).join('');
}

function capitalizeFirstLetter(string) {
    if (!string) return string;

    // Her kelimenin ilk harfini büyük, geri kalanını küçük yap (Türkçe karakterler için doğru dönüşüm)
    return string.split(' ').map(word => {
        if (!word) return word;
        // İlk karakteri Türkçe büyük harfe çevir
        const firstChar = word.charAt(0);
        const upperFirstChar = toTurkishUpperCase(firstChar);
        // Geri kalan karakterleri Türkçe küçük harfe çevir  
        const restChars = toTurkishLowerCase(word.slice(1));
        return upperFirstChar + restChars;
    }).join(' ');
}
