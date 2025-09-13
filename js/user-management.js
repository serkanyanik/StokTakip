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

    // Şifre değişikliği butonuna tıklandığında
    document.getElementById('changePasswordBtn')?.addEventListener('click', () => {
        const editModal = bootstrap.Modal.getInstance(document.getElementById('editUserModal'));
        editModal.hide();
        const changePasswordModal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
        changePasswordModal.show();
    });

    // Şifre kaydet butonuna tıklandığında
    document.getElementById('savePasswordBtn')?.addEventListener('click', handleChangePassword);
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
        // Current session'ı kaydet
        const currentSession = await supabaseClient.auth.getSession();

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

        // Hemen mevcut admin oturumunu geri yükle
        if (currentSession?.session) {
            await supabase.auth.setSession(currentSession.session);
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
            // Kullanıcı başarıyla oluşturuldu - sessizce işle
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
        // Kullanıcı başarıyla güncellendi - sessizce işle
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

        // Kullanıcı başarıyla silindi - sessizce işle
        await loadAllUsers();
        updateUsersTable();

    } catch (error) {
        console.error('Kullanıcı silme hatası:', error);
        alert('Kullanıcı silinirken bir hata oluştu: ' + error.message);
    }
}

// Form alanlarını temizle
function clearAddUserForm() {
    document.getElementById('newUserName').value = '';
    document.getElementById('newUserEmail').value = '';
    document.getElementById('newUserPassword').value = '';
    document.getElementById('newUserAdmin').checked = false;
    document.getElementById('newUserSub1').checked = false;
    document.getElementById('newUserSub2').checked = false;
    document.getElementById('newUserSub3').checked = false;
    document.getElementById('newUserSub4').checked = false;

    // Hata mesajlarını temizle
    const alertDiv = document.getElementById('addUserAlert');
    if (alertDiv) {
        alertDiv.remove();
    }
}

// Hata mesajı göster
function showAddUserError(message) {
    // Eski hata mesajını kaldır
    const oldAlert = document.getElementById('addUserAlert');
    if (oldAlert) {
        oldAlert.remove();
    }

    // Yeni hata mesajı oluştur
    const alertDiv = document.createElement('div');
    alertDiv.id = 'addUserAlert';
    alertDiv.className = 'alert alert-danger';
    alertDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;

    // Modal body'nin başına ekle
    const modalBody = document.querySelector('#addUserModal .modal-body');
    modalBody.insertBefore(alertDiv, modalBody.firstChild);
}

// E-posta validasyonu
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Şifre değişikliği işlemi
async function handleChangePassword() {
    try {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Validasyon kontrolleri
        if (!currentPassword || !newPassword || !confirmPassword) {
            alert('Lütfen tüm alanları doldurun!');
            return;
        }

        if (newPassword.length < 6) {
            alert('Yeni şifre en az 6 karakter olmalıdır!');
            return;
        }

        if (newPassword !== confirmPassword) {
            alert('Yeni şifreler eşleşmiyor!');
            return;
        }

        // Mevcut kullanıcıyı al
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            throw new Error('Kullanıcı bilgileri alınamadı');
        }

        // Mevcut şifreyi doğrula (yeniden giriş yaparak)
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: currentPassword
        });

        if (signInError) {
            alert('Mevcut şifre hatalı!');
            return;
        }

        // Şifreyi güncelle
        const { data, error } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (error) {
            throw error;
        }

        // Formu temizle ve modalı kapat
        document.getElementById('changePasswordForm').reset();
        bootstrap.Modal.getInstance(document.getElementById('changePasswordModal')).hide();

        // Şifre başarıyla değiştirildi - sessizce işle

    } catch (error) {
        console.error('Şifre değişikliği hatası:', error);
        alert('Şifre değiştirilirken bir hata oluştu: ' + error.message);
    }
}
