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
            role: userProfile.role,
            name: userProfile.name,
            warehouse_access: userProfile.warehouse_access
        };

        return currentUser;
    } catch (error) {
        console.error('Giriş hatası:', error);
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
        showLoginScreen();
    } catch (error) {
        console.error('Çıkış hatası:', error);
        alert('Çıkış yapılırken bir hata oluştu');
    }
}

// Oturum kontrolü
async function checkSession() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
            const userProfile = await getUserProfile(user.id);
            if (userProfile) {
                currentUser = {
                    id: user.id,
                    email: user.email,
                    role: userProfile.role,
                    name: userProfile.name,
                    warehouse_access: userProfile.warehouse_access
                };
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error('Oturum kontrol hatası:', error);
        return false;
    }
}

// Kullanıcının depo erişim yetkilerini kontrol et
function hasWarehouseAccess(warehouseType) {
    if (!currentUser) return false;
    
    // Ana depo sorumlusu her şeye erişebilir
    if (currentUser.role === USER_ROLES.MAIN_ADMIN) {
        return true;
    }
    
    // Diğer kullanıcılar sadece kendi depolarına erişebilir
    const roleToWarehouse = {
        [USER_ROLES.SUB1_MANAGER]: WAREHOUSE_TYPES.SUB1,
        [USER_ROLES.SUB2_MANAGER]: WAREHOUSE_TYPES.SUB2,
        [USER_ROLES.SUB3_MANAGER]: WAREHOUSE_TYPES.SUB3,
        [USER_ROLES.SUB4_MANAGER]: WAREHOUSE_TYPES.SUB4
    };
    
    return roleToWarehouse[currentUser.role] === warehouseType;
}

// Kullanıcının stok çıkış yetkisi var mı?
function canRemoveStock(warehouseType) {
    if (!currentUser) return false;
    
    // Ana depo sorumlusu her depodan stok çıkarabilir
    if (currentUser.role === USER_ROLES.MAIN_ADMIN) {
        return true;
    }
    
    // Diğer kullanıcılar sadece kendi depolarından stok çıkarabilir
    return hasWarehouseAccess(warehouseType);
}

// Kullanıcının stok ekleme yetkisi var mı?
function canAddStock() {
    if (!currentUser) return false;
    
    // Sadece ana depo sorumlusu stok ekleyebilir
    return currentUser.role === USER_ROLES.MAIN_ADMIN;
}

// Kullanıcının diğer depoları görme yetkisi var mı?
function canViewOtherWarehouses() {
    if (!currentUser) return false;
    
    // Ana depo sorumlusu tüm depoları görebilir
    if (currentUser.role === USER_ROLES.MAIN_ADMIN) {
        return true;
    }
    
    // Diğer kullanıcılar sadece görüntüleme yapabilir (stok çıkaramaz)
    return true;
}
