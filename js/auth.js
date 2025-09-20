// Kimlik doğrulama fonksiyonları

let currentUser = null;

// Giriş yapma
async function login(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            throw error;
        }

        // Kullanıcı bilgilerini al
        const userProfile = await getUserProfile(data.user.id);

        if (!userProfile) {
            throw new Error('Kullanıcı profili bulunamadı');
        }

        currentUser = {
            id: data.user.id,
            email: data.user.email,
            name: userProfile.name,
            is_depo_admin: userProfile.is_depo_admin,
            is_depo_sorumlu1: userProfile.is_depo_sorumlu1,
            is_depo_sorumlu2: userProfile.is_depo_sorumlu2,
            is_depo_sorumlu3: userProfile.is_depo_sorumlu3,
            is_depo_sorumlu4: userProfile.is_depo_sorumlu4,
            is_secretary: userProfile.is_secretary || false,
            is_active: userProfile.is_active
        };

        return currentUser;

    } catch (error) {
        throw error;
    }
}

// Kullanıcı profilini getir
async function getUserProfile(userId) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            throw error;
        }

        return data;

    } catch (error) {
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
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
            // Auth hatası varsa localStorage'ı temizle
            if (error.message && error.message.includes('Invalid Refresh Token')) {
                await supabase.auth.signOut();
                localStorage.clear();
            }
            throw error;
        }

        if (session) {
            const userProfile = await getUserProfile(session.user.id);
            if (userProfile) {
                currentUser = {
                    id: session.user.id,
                    email: session.user.email,
                    name: userProfile.name,
                    is_depo_admin: userProfile.is_depo_admin,
                    is_depo_sorumlu1: userProfile.is_depo_sorumlu1,
                    is_depo_sorumlu2: userProfile.is_depo_sorumlu2,
                    is_depo_sorumlu3: userProfile.is_depo_sorumlu3,
                    is_depo_sorumlu4: userProfile.is_depo_sorumlu4,
                    is_secretary: userProfile.is_secretary || false,
                    is_active: userProfile.is_active
                };

                return currentUser;
            }
        }

        return null;
    } catch (error) {
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

    // Sekreter tüm depoları görebilir
    if (currentUser.is_secretary) return true;

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

// Diğer depoları görüntüleme yetkisi - sekreter de görebilir
function canViewOtherWarehouses() {
    return currentUser && currentUser.is_active && (currentUser.is_depo_admin || currentUser.is_secretary);
}

// Kullanıcı rolü açıklaması
function getUserRoleDescription() {
    if (!currentUser) return 'Yetkisiz';

    if (!currentUser.is_active) return 'Pasif Kullanıcı';

    const roles = [];
    if (currentUser.is_depo_admin) roles.push('Ana Depo');
    if (currentUser.is_depo_sorumlu1) roles.push('1. Araç');
    if (currentUser.is_depo_sorumlu2) roles.push('2. Araç');
    if (currentUser.is_depo_sorumlu3) roles.push('3. Araç');
    if (currentUser.is_depo_sorumlu4) roles.push('4. Araç');
    if (currentUser.is_secretary) roles.push('Ana Depo'); // Sekreter ana depo sorumlusu gibi görünsün

    return roles.length > 0 ? roles.join(', ') : 'Yetkisiz';
}