// Kimlik doğrulama fonksiyonları

let currentUser = null;

// Giriş yapma
async function login(email, password) {
    try {
        console.log('Login attempt:', email);

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            console.error('Auth error:', error);
            throw error;
        }

        console.log('Auth success, user ID:', data.user.id);

        // Kullanıcı bilgilerini al
        const userProfile = await getUserProfile(data.user.id);
        console.log('User profile:', userProfile);

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
            is_active: userProfile.is_active
        };

        console.log('Current user set:', currentUser);
        return currentUser;

    } catch (error) {
        console.error('Giriş hatası:', error);
        throw error;
    }
}

// Kullanıcı profilini getir
async function getUserProfile(userId) {
    try {
        console.log('Getting profile for user ID:', userId);

        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Profile fetch error:', error);
            throw error;
        }

        console.log('Profile data:', data);
        return data;

    } catch (error) {
        console.error('Kullanıcı profili getirme hatası:', error);
        return null;
    }
}

// Çıkış yapma
async function logout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) {
            throw error;
        }

        currentUser = null;
        window.location.reload();
    } catch (error) {
        console.error('Çıkış hatası:', error);
        // Hata olsa bile çıkış yap
        currentUser = null;
        window.location.reload();
    }
}

// Oturum kontrolü
async function checkSession() {
    try {
        console.log('Checking session...');

        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
            console.error('Session check error:', error);
            throw error;
        }

        if (session) {
            console.log('Session found, user ID:', session.user.id);

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
                    is_active: userProfile.is_active
                };

                console.log('Session restored, current user:', currentUser);
                return currentUser;
            }
        } else {
            console.log('No session found');
        }

        return null;
    } catch (error) {
        console.error('Oturum kontrol hatası:', error);
        return null;
    }
}

// Yetki kontrol fonksiyonları

// Depo erişim yetkisi kontrol et
function hasWarehouseAccess(warehouseType) {
    if (!currentUser || !currentUser.is_active) return false;

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

// Stok çıkarma yetkisi
function canRemoveStock(warehouseType) {
    return hasWarehouseAccess(warehouseType);
}

// Kullanıcı yönetimi yetkisi
function canManageUsers() {
    return currentUser && currentUser.is_depo_admin && currentUser.is_active;
}

// Kullanıcı rolü açıklaması
function getUserRoleDescription() {
    if (!currentUser) return 'Yetkisiz';

    if (!currentUser.is_active) return 'Pasif Kullanıcı';

    const roles = [];
    if (currentUser.is_depo_admin) roles.push('Ana Depo');
    if (currentUser.is_depo_sorumlu1) roles.push('1. Depo');
    if (currentUser.is_depo_sorumlu2) roles.push('2. Depo');
    if (currentUser.is_depo_sorumlu3) roles.push('3. Depo');
    if (currentUser.is_depo_sorumlu4) roles.push('4. Depo');

    return roles.length > 0 ? roles.join(', ') : 'Yetkisiz';
}