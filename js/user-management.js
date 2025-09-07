// Kullanıcı yönetimi fonksiyonları

let allUsers = [];

// Kullanıcı yönetimi event listener'larını kur
function setupUserManagementListeners() {
    // Kullanıcı yönetimi butonları
    document.getElementById('userManagementBtn')?.addEventListener('click', showUserManagementModal);
    document.getElementById('addUserBtn')?.addEventListener('click', showAddUserModal);
    document.getElementById('saveUserBtn')?.addEventListener('click', handleAddUser);
    document.getElementById('updateUserBtn')?.addEventListener('click', handleUpdateUser);
    document.getElementById('deleteUserBtn')?.addEventListener('click', handleDeleteUser);
}

// Kullanıcı yönetimi modalını göster
async function showUserManagementModal() {
    await loadAllUsers();
    updateUsersTable();
    new bootstrap.Modal(document.getElementById('userManagementModal')).show();
}

// Tüm kullanıcıları yükle
async function loadAllUsers() {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('name');
        
        if (error) {
            throw error;
        }
        
        allUsers = data || [];
    } catch (error) {
        console.error('Kullanıcılar yüklenirken hata:', error);
        alert('Kullanıcılar yüklenirken bir hata oluştu');
    }
}

// Kullanıcılar tablosunu güncelle
function updateUsersTable() {
    const tbody = document.querySelector('#usersTable tbody');
    tbody.innerHTML = '';
    
    allUsers.forEach(user => {
        const row = createUserRow(user);
        tbody.appendChild(row);
    });
}

// Kullanıcı satırı oluştur
function createUserRow(user) {
    const row = document.createElement('tr');
    
    // Yetkiler listesi
    const permissions = getUserPermissionsList(user);
    
    // Durum
    const status = user.is_active ? 
        '<span class="badge bg-success">Aktif</span>' : 
        '<span class="badge bg-danger">Pasif</span>';
    
    row.innerHTML = `
        <td>${user.name}</td>
        <td>${user.email}</td>
        <td>${permissions}</td>
        <td>${status}</td>
        <td>
            <button class="btn btn-primary btn-sm" onclick="showEditUserModal('${user.id}')">
                <i class="fas fa-edit"></i>
            </button>
            ${user.id !== currentUser.id ? 
                `<button class="btn btn-danger btn-sm ms-1" onclick="confirmDeleteUser('${user.id}')">
                    <i class="fas fa-trash"></i>
                </button>` : 
                ''
            }
        </td>
    `;
    
    return row;
}

// Kullanıcının yetkilerini liste halinde döndür
function getUserPermissionsList(user) {
    const permissions = [];
    
    if (user.is_depo_admin) permissions.push('Ana Depo');
    if (user.is_depo_sorumlu1) permissions.push('1. Depo');
    if (user.is_depo_sorumlu2) permissions.push('2. Depo');
    if (user.is_depo_sorumlu3) permissions.push('3. Depo');
    if (user.is_depo_sorumlu4) permissions.push('4. Depo');
    
    return permissions.length > 0 ? 
        permissions.map(p => `<span class="badge bg-info me-1">${p}</span>`).join('') :
        '<span class="text-muted">Yetkisiz</span>';
}

// Yeni kullanıcı modalını göster
function showAddUserModal() {
    document.getElementById('addUserForm').reset();
    new bootstrap.Modal(document.getElementById('addUserModal')).show();
}

// Yeni kullanıcı ekleme işlemi (Direkt ekleme)
async function handleAddUser() {
    const name = document.getElementById('newUserName').value;
    const email = document.getElementById('newUserEmail').value;
    const password = document.getElementById('newUserPassword').value;
    
    const is_depo_admin = document.getElementById('newUserAdmin').checked;
    const is_depo_sorumlu1 = document.getElementById('newUserSub1').checked;
    const is_depo_sorumlu2 = document.getElementById('newUserSub2').checked;
    const is_depo_sorumlu3 = document.getElementById('newUserSub3').checked;
    const is_depo_sorumlu4 = document.getElementById('newUserSub4').checked;
    
    try {
        // Mevcut kullanıcının oturumunu kaydet
        // Mevcut kullanıcının session'ını sakla
        const { data: currentSession } = await supabase.auth.getSession();
        console.log('Current session saved:', currentSession?.session?.user?.id);
        
        // Yeni kullanıcı oluştur
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    name: name
                }
            }
        });
        
        if (authError) {
            throw authError;
        }
        
        if (!authData.user) {
            throw new Error('Kullanıcı oluşturulamadı');
        }
        
        console.log('New user created:', authData.user.id);
        
        // Hemen mevcut admin oturumunu geri yükle
        if (currentSession?.session) {
            await supabase.auth.setSession(currentSession.session);
            console.log('Admin session restored');
        }
        
        if (!authData.user) {
            throw new Error('Kullanıcı oluşturulamadı');
        }
        
        // Kullanıcı profilini users tablosuna ekle
        const { error: profileError } = await supabase
            .from('users')
            .insert({
                id: authData.user.id,
                name: name,
                email: email,
                is_depo_admin: is_depo_admin,
                is_depo_sorumlu1: is_depo_sorumlu1,
                is_depo_sorumlu2: is_depo_sorumlu2,
                is_depo_sorumlu3: is_depo_sorumlu3,
                is_depo_sorumlu4: is_depo_sorumlu4,
                is_active: true,
                created_by: currentUser.id
            });
        
        // NOT: Yeni kullanıcının auth oturumunu kapatmıyoruz - admin oturumda kalmalı
        
        if (profileError) {
            console.error('Profil oluşturma hatası:', profileError);
            
            alert(`✅ Kullanıcı Auth'da oluşturuldu!\n\n📧 E-posta: ${email}\n🔑 Şifre: ${password}\n\n⚠️ Ancak profil oluşturulamadı. Aşağıdaki SQL komutunu Supabase SQL Editor'da çalıştırın:\n\nINSERT INTO users (id, name, email, is_depo_admin, is_depo_sorumlu1, is_depo_sorumlu2, is_depo_sorumlu3, is_depo_sorumlu4, is_active, created_by) VALUES ('${authData.user.id}', '${name}', '${email}', ${is_depo_admin}, ${is_depo_sorumlu1}, ${is_depo_sorumlu2}, ${is_depo_sorumlu3}, ${is_depo_sorumlu4}, true, '${currentUser.id}');`);
            
        } else {
            alert(`🎉 Kullanıcı başarıyla oluşturuldu!\n\n📧 E-posta: ${email}\n🔑 Şifre: ${password}\n\n✅ Kullanıcı artık giriş yapabilir.`);
        }
        
        bootstrap.Modal.getInstance(document.getElementById('addUserModal')).hide();
        await loadAllUsers();
        updateUsersTable();
        
        // Form'u temizle
        clearAddUserForm();
        
    } catch (error) {
        console.error('Kullanıcı oluşturma hatası:', error);
        alert('Kullanıcı oluşturulurken bir hata oluştu: ' + error.message);
    }
}

// Kullanıcı düzenleme modalını göster
function showEditUserModal(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    
    document.getElementById('editUserId').value = user.id;
    document.getElementById('editUserName').value = user.name;
    document.getElementById('editUserEmail').value = user.email;
    document.getElementById('editUserAdmin').checked = user.is_depo_admin;
    document.getElementById('editUserSub1').checked = user.is_depo_sorumlu1;
    document.getElementById('editUserSub2').checked = user.is_depo_sorumlu2;
    document.getElementById('editUserSub3').checked = user.is_depo_sorumlu3;
    document.getElementById('editUserSub4').checked = user.is_depo_sorumlu4;
    document.getElementById('editUserActive').checked = user.is_active;
    
    new bootstrap.Modal(document.getElementById('editUserModal')).show();
}

// Kullanıcı güncelleme işlemi
async function handleUpdateUser() {
    const userId = document.getElementById('editUserId').value;
    const name = document.getElementById('editUserName').value;
    const email = document.getElementById('editUserEmail').value;
    
    const is_depo_admin = document.getElementById('editUserAdmin').checked;
    const is_depo_sorumlu1 = document.getElementById('editUserSub1').checked;
    const is_depo_sorumlu2 = document.getElementById('editUserSub2').checked;
    const is_depo_sorumlu3 = document.getElementById('editUserSub3').checked;
    const is_depo_sorumlu4 = document.getElementById('editUserSub4').checked;
    const is_active = document.getElementById('editUserActive').checked;
    
    try {
        const { error } = await supabase
            .from('users')
            .update({
                name: name,
                email: email,
                is_depo_admin: is_depo_admin,
                is_depo_sorumlu1: is_depo_sorumlu1,
                is_depo_sorumlu2: is_depo_sorumlu2,
                is_depo_sorumlu3: is_depo_sorumlu3,
                is_depo_sorumlu4: is_depo_sorumlu4,
                is_active: is_active
            })
            .eq('id', userId);
            
        if (error) {
            throw error;
        }
        
        bootstrap.Modal.getInstance(document.getElementById('editUserModal')).hide();
        alert('Kullanıcı başarıyla güncellendi!');
        await loadAllUsers();
        updateUsersTable();
        
        // Eğer güncellenen kullanıcı kendisiyse, bilgilerini yenile
        if (userId === currentUser.id) {
            const updatedUser = allUsers.find(u => u.id === userId);
            if (updatedUser) {
                currentUser = {
                    ...currentUser,
                    name: updatedUser.name,
                    email: updatedUser.email,
                    is_depo_admin: updatedUser.is_depo_admin,
                    is_depo_sorumlu1: updatedUser.is_depo_sorumlu1,
                    is_depo_sorumlu2: updatedUser.is_depo_sorumlu2,
                    is_depo_sorumlu3: updatedUser.is_depo_sorumlu3,
                    is_depo_sorumlu4: updatedUser.is_depo_sorumlu4,
                    is_active: updatedUser.is_active
                };
                updateUserInfo();
                updateButtonVisibility();
            }
        }
        
    } catch (error) {
        console.error('Kullanıcı güncelleme hatası:', error);
        alert('Kullanıcı güncellenirken bir hata oluştu: ' + error.message);
    }
}

// Kullanıcı silme onayı
function confirmDeleteUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    
    if (confirm(`"${user.name}" kullanıcısını silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz!`)) {
        handleDeleteUser(userId);
    }
}

// Kullanıcı silme işlemi
async function handleDeleteUser(userId = null) {
    try {
        const userIdToDelete = userId || document.getElementById('editUserId').value;
        
        // Kullanıcıyı users tablosundan sil
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', userIdToDelete);
            
        if (error) {
            throw error;
        }
        
        if (!userId) {
            bootstrap.Modal.getInstance(document.getElementById('editUserModal')).hide();
        }
        
        alert('Kullanıcı başarıyla silindi!');
        await loadAllUsers();
        updateUsersTable();
        
    } catch (error) {
        console.error('Kullanıcı silme hatası:', error);
        alert('Kullanıcı silinirken bir hata oluştu: ' + error.message);
    }
}
