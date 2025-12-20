// Kimlik doğrulama fonksiyonları

let currentUser = null;

// Giriş yapma
async function login(email, password) {
    try {
        console.log('🔐 Login deneniyor...', email);
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            console.error('❌ Auth hatası:', error);
            throw error;
        }
        console.log('✅ Auth başarılı, user:', data.user.id);

        // Kullanıcı bilgilerini al
        console.log('📋 Kullanıcı profili getiriliyor...');
        const userProfile = await getUserProfile(data.user.id);
        console.log('📋 Profil sonucu:', userProfile);

        if (!userProfile) {
            console.error('❌ Kullanıcı profili bulunamadı!');
            throw new Error('Kullanıcı profili bulunamadı');
        }

        currentUser = {
            id: data.user.id,
            email: data.user.email,
            name: userProfile.name,
            is_depo_admin: userProfile.is_depo_admin || false,
            is_depo_sorumlu1: userProfile.is_depo_sorumlu1 || false,
            is_depo_sorumlu2: userProfile.is_depo_sorumlu2 || false,
            is_depo_sorumlu3: userProfile.is_depo_sorumlu3 || false,
            is_depo_sorumlu4: userProfile.is_depo_sorumlu4 || false,
            is_secretary: userProfile.is_secretary || false,
            is_active: userProfile.is_active !== false
        };

        console.log('✅ Login başarılı, currentUser:', currentUser);
        return currentUser;

    } catch (error) {
        throw error;
    }
}

// Kullanıcı profilini getir
async function getUserProfile(userId) {
    try {
        console.log('🔍 getUserProfile çağrıldı, userId:', userId);
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('❌ getUserProfile hatası:', error);
            throw error;
        }

        console.log('✅ getUserProfile başarılı:', data);
        return data;

    } catch (error) {
        console.error('❌ getUserProfile catch bloğu:', error);
        return null;
    }
}

// Çıkış yapma
async function logout() {
    try {
        // Timeout ile logout işlemini zorla
        const logoutPromise = supabase.auth.signOut();
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 3000)
        );

        await Promise.race([logoutPromise, timeoutPromise]);

    } catch (error) {
    }

    // Her durumda kullanıcıyı temizle ve sayfayı yenile
    currentUser = null;
    localStorage.clear(); // Tüm yerel verileri temizle
    sessionStorage.clear(); // Oturum verilerini temizle
    window.location.reload();
}

// Oturum kontrolü
async function checkSession() {
    try {
        console.log('🔍 checkSession çağrıldı');
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
            console.error('❌ Session hatası:', error);
            // Auth hatası varsa localStorage'ı temizle
            if (error.message && error.message.includes('Invalid Refresh Token')) {
                await supabase.auth.signOut();
                localStorage.clear();
            }
            throw error;
        }

        if (session) {
            console.log('✅ Session var, profil getiriliyor...');
            const userProfile = await getUserProfile(session.user.id);
            if (userProfile) {
                currentUser = {
                    id: session.user.id,
                    email: session.user.email,
                    name: userProfile.name,
                    is_depo_admin: userProfile.is_depo_admin || false,
                    is_depo_sorumlu1: userProfile.is_depo_sorumlu1 || false,
                    is_depo_sorumlu2: userProfile.is_depo_sorumlu2 || false,
                    is_depo_sorumlu3: userProfile.is_depo_sorumlu3 || false,
                    is_depo_sorumlu4: userProfile.is_depo_sorumlu4 || false,
                    is_secretary: userProfile.is_secretary || false,
                    is_active: userProfile.is_active !== false
                };

                console.log('✅ checkSession başarılı, currentUser:', currentUser);
                return currentUser;
            } else {
                console.warn('⚠️ Session var ama profile bulunamadı');
            }
        } else {
            console.log('ℹ️ Session yok');
        }

        return null;
    } catch (error) {
        console.error('❌ checkSession catch bloğu:', error);
        // Auth hatası durumunda da localStorage'ı temizle
        if (error.name === 'AuthApiError' || error.__isAuthError) {
            await supabase.auth.signOut();
            localStorage.clear();
        }
        return null;
    }
}

// Yetki kontrol fonksiyonları

// Depo erişim yetkisi kontrol et
function hasWarehouseAccess(warehouseType) {
    if (!currentUser || !currentUser.is_active) return false;

    // Sekreter tüm depoları görüntüleyebilir ama hiçbir yetki yok
    if (currentUser.is_secretary) {
        return true; // Tüm depoları görüntüleyebilir
    }

    switch (warehouseType) {
        case 'main':
            return currentUser.is_depo_admin;
        case 'sub1':
            return currentUser.is_depo_admin || currentUser.is_depo_sorumlu1;
        case 'sub2':
            return currentUser.is_depo_admin || currentUser.is_depo_sorumlu2;
        case 'sub3':
            return currentUser.is_depo_admin || currentUser.is_depo_sorumlu3;
        case 'sub4':
            return currentUser.is_depo_admin || currentUser.is_depo_sorumlu4;
        default:
            return false;
    }
}

// Stok çıkarma/transfer yetkisi - SADECE ana depo sorumlusu (sekreter yapamaz)
function canRemoveStock(warehouseType) {
    return currentUser && currentUser.is_depo_admin && currentUser.is_active && !currentUser.is_secretary;
}

// Stok ekleme yetkisi - sadece ana depo sorumlusu (sekreter yapamaz)
function canAddStock() {
    return currentUser && currentUser.is_depo_admin && currentUser.is_active && !currentUser.is_secretary;
}

// Transfer yetkisi - sadece ana depo sorumlusu (sekreter yapamaz)
function canTransferStock() {
    return currentUser && currentUser.is_depo_admin && currentUser.is_active && !currentUser.is_secretary;
}

// Kullanıcı yönetimi yetkisi - sekreter yapamaz
function canManageUsers() {
    return currentUser && currentUser.is_depo_admin && currentUser.is_active && !currentUser.is_secretary;
}

// Diğer depoları görüntüleme yetkisi - sadece admin görebilir
function canViewOtherWarehouses() {
    return currentUser && currentUser.is_active && currentUser.is_depo_admin && !currentUser.is_secretary;
}

// Kullanıcı rolü açıklaması
function getUserRoleDescription() {
    if (!currentUser) return 'Yetkisiz';

    if (!currentUser.is_active) return 'Pasif Kullanıcı';

    // Sekreter öncelikli kontrol
    if (currentUser.is_secretary) return 'Sekreter';

    const roles = [];
    if (currentUser.is_depo_admin) roles.push('Ana Depo');
    if (currentUser.is_depo_sorumlu1) roles.push('1. Araç');
    if (currentUser.is_depo_sorumlu2) roles.push('2. Araç');
    if (currentUser.is_depo_sorumlu3) roles.push('3. Araç');
    if (currentUser.is_depo_sorumlu4) roles.push('4. Araç');

    return roles.length > 0 ? roles.join(', ') : 'Yetkisiz';
}