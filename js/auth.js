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
            is_active: userProfile.is_active
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
                    name: userProfile.name,
                    is_depo_admin: userProfile.is_depo_admin,
                    is_depo_sorumlu1: userProfile.is_depo_sorumlu1,
                    is_depo_sorumlu2: userProfile.is_depo_sorumlu2,
                    is_depo_sorumlu3: userProfile.is_depo_sorumlu3,
                    is_depo_sorumlu4: userProfile.is_depo_sorumlu4,
                    is_active: userProfile.is_active
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
    if (!currentUser || !currentUser.is_active) return false;
    
    // Ana depo sorumlusu her şeye erişebilir
    if (currentUser.is_depo_admin) {
        return true;
    }
    
    // İlgili depo sorumluluğu kontrolü
    const permissionField = WAREHOUSE_TO_PERMISSION[warehouseType];
    return currentUser[permissionField] || false;
}

// Kullanıcının stok çıkış yetkisi var mı?
function canRemoveStock(warehouseType) {
    if (!currentUser || !currentUser.is_active) return false;
    
    // Ana depo sorumlusu her depodan stok çıkarabilir
    if (currentUser.is_depo_admin) {
        return true;
    }
    
    // Sadece kendi sorumluluğundaki depodan stok çıkarabilir
    const permissionField = WAREHOUSE_TO_PERMISSION[warehouseType];
    return currentUser[permissionField] || false;
}

// Kullanıcının stok ekleme yetkisi var mı?
function canAddStock() {
    if (!currentUser || !currentUser.is_active) return false;
    
    // Sadece ana depo sorumlusu stok ekleyebilir
    return currentUser.is_depo_admin;
}

// Kullanıcının diğer depoları görme yetkisi var mı?
function canViewOtherWarehouses() {
    if (!currentUser || !currentUser.is_active) return false;
    
    // Herkes tüm depoları görebilir (sadece görüntüleme)
    return true;
}

// Kullanıcı yönetimi yetkisi var mı?
function canManageUsers() {
    if (!currentUser || !currentUser.is_active) return false;
    
    // Sadece ana depo sorumlusu kullanıcı yönetimi yapabilir
    return currentUser.is_depo_admin;
}

// Kullanıcının hangi depolardan sorumlu olduğunu döndür
function getUserResponsibleWarehouses() {
    if (!currentUser || !currentUser.is_active) return [];
    
    const warehouses = [];
    
    if (currentUser.is_depo_admin) {
        warehouses.push(WAREHOUSE_TYPES.MAIN);
    }
    if (currentUser.is_depo_sorumlu1) {
        warehouses.push(WAREHOUSE_TYPES.SUB1);
    }
    if (currentUser.is_depo_sorumlu2) {
        warehouses.push(WAREHOUSE_TYPES.SUB2);
    }
    if (currentUser.is_depo_sorumlu3) {
        warehouses.push(WAREHOUSE_TYPES.SUB3);
    }
    if (currentUser.is_depo_sorumlu4) {
        warehouses.push(WAREHOUSE_TYPES.SUB4);
    }
    
    return warehouses;
}

// Kullanıcının rol açıklamasını döndür
function getUserRoleDescription() {
    if (!currentUser || !currentUser.is_active) return 'Aktif Değil';
    
    const roles = [];
    
    if (currentUser.is_depo_admin) {
        roles.push('Ana Depo Sorumlusu');
    }
    if (currentUser.is_depo_sorumlu1) {
        roles.push('1. Depo Sorumlusu');
    }
    if (currentUser.is_depo_sorumlu2) {
        roles.push('2. Depo Sorumlusu');
    }
    if (currentUser.is_depo_sorumlu3) {
        roles.push('3. Depo Sorumlusu');
    }
    if (currentUser.is_depo_sorumlu4) {
        roles.push('4. Depo Sorumlusu');
    }
    
    return roles.length > 0 ? roles.join(', ') : 'Yetkisiz Kullanıcı';
}
