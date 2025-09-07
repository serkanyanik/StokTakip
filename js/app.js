// Ana uygulama fonksiyonları

let currentWarehouse = WAREHOUSE_TYPES.MAIN;
let stockData = [];

// Sayfa yüklendiğinde çalışacak
document.addEventListener('DOMContentLoaded', async function() {
    // Depo adlarını yükle
    loadWarehouseNamesFromStorage();
    
    // Oturum kontrolü yap
    const hasSession = await checkSession();
    
    if (hasSession) {
        showDashboard();
    } else {
        showLoginScreen();
    }
    
    setupEventListeners();
    setupUserManagementListeners();
});

// Event listener'ları kur
function setupEventListeners() {
    // Giriş formu
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Çıkış butonu
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Şifre değişikliği butonu
    document.getElementById('changeMyPasswordBtn').addEventListener('click', () => {
        const changePasswordModal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
        changePasswordModal.show();
    });
    
    // Stok ekleme
    document.getElementById('addStockBtn').addEventListener('click', showAddStockModal);
    document.getElementById('saveStockBtn').addEventListener('click', handleAddStock);
    
    // Stok çıkarma
    document.getElementById('removeStockBtn').addEventListener('click', showRemoveStockModal);
    document.getElementById('confirmRemoveBtn').addEventListener('click', handleRemoveStock);
    
    // Arama çubuğu
    document.getElementById('searchInput').addEventListener('input', applySearchFilter);
    
    // Depo adı düzenleme
    document.getElementById('editWarehouseNameBtn').addEventListener('click', showEditWarehouseNameModal);
    
    // Depo adı kaydetme
    document.getElementById('saveWarehouseNameBtn').addEventListener('click', handleSaveWarehouseName);
}

// Depo adı düzenleme modalını göster
function showEditWarehouseNameModal() {
    if (!currentUser.is_depo_admin) {
        alert('Bu işlem için yetkiniz yok!');
        return;
    }
    
    document.getElementById('warehouseName').value = WAREHOUSE_NAMES[currentWarehouse];
    document.getElementById('editingWarehouseType').value = currentWarehouse;
    
    const modal = new bootstrap.Modal(document.getElementById('editWarehouseNameModal'));
    modal.show();
}

// Depo adını kaydet
async function handleSaveWarehouseName() {
    try {
        const newName = document.getElementById('warehouseName').value.trim();
        const warehouseType = document.getElementById('editingWarehouseType').value;
        
        if (!newName) {
            alert('Lütfen depo adını girin!');
            return;
        }
        
        if (newName.length < 2) {
            alert('Depo adı en az 2 karakter olmalıdır!');
            return;
        }
        
        // Depo adını güncelle (localStorage'da sakla)
        WAREHOUSE_NAMES[warehouseType] = newName;
        saveWarehouseNamesToStorage();
        
        // Görünümü güncelle
        updateWarehouseCards();
        updateCurrentWarehouseDisplay();
        updateStockTable(); // Transfer butonlarındaki tooltipleri güncellemek için
        
        // Modal'ı kapat
        bootstrap.Modal.getInstance(document.getElementById('editWarehouseNameModal')).hide();
        
        alert(`Depo adı "${newName}" olarak güncellendi!`);
        
    } catch (error) {
        console.error('Depo adı kaydetme hatası:', error);
        alert('Depo adı kaydedilirken bir hata oluştu: ' + error.message);
    }
}

// Depo adlarını localStorage'a kaydet
function saveWarehouseNamesToStorage() {
    try {
        localStorage.setItem('warehouseNames', JSON.stringify(WAREHOUSE_NAMES));
    } catch (error) {
        console.error('Depo adları kaydedilemedi:', error);
    }
}

// Depo adlarını localStorage'dan yükle
function loadWarehouseNamesFromStorage() {
    try {
        const saved = localStorage.getItem('warehouseNames');
        if (saved) {
            const savedNames = JSON.parse(saved);
            Object.assign(WAREHOUSE_NAMES, savedNames);
        }
    } catch (error) {
        console.error('Depo adları yüklenemedi:', error);
    }
}

// Stok ekleme yetkisi kontrol etlogout);
    
    // Şifre değişikliği butonu
    document.getElementById('changeMyPasswordBtn').addEventListener('click', () => {
        const changePasswordModal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
        changePasswordModal.show();
    });
    
    // Stok ekleme
    document.getElementById('addStockBtn').addEventListener('click', showAddStockModal);
    document.getElementById('saveStockBtn').addEventListener('click', handleAddStock);
    
    // Stok çıkarma
    document.getElementById('removeStockBtn').addEventListener('click', showRemoveStockModal);
    document.getElementById('confirmRemoveBtn').addEventListener('click', handleRemoveStock);
    
    // Arama çubuğu
    document.getElementById('searchInput').addEventListener('input', applySearchFilter);
    
    // Depo adı düzenleme
    document.getElementById('editWarehouseNameBtn').addEventListener('click', showEditWarehouseNameModal);
    
    // Depo adı kaydetme
    document.getElementById('saveWarehouseNameBtn').addEventListener('click', handleSaveWarehouseName);
}

// Giriş işlemi
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        await login(email, password);
        showDashboard();
    } catch (error) {
        alert('Giriş yapılamadı: ' + error.message);
    }
}

// Giriş ekranını göster
function showLoginScreen() {
    document.getElementById('loginScreen').classList.remove('d-none');
    document.getElementById('dashboard').classList.add('d-none');
}

// Dashboard'u göster
function showDashboard() {
    document.getElementById('loginScreen').classList.add('d-none');
    document.getElementById('dashboard').classList.remove('d-none');
    
    updateUserInfo();
    updateWarehouseCards();
    updateCurrentWarehouseDisplay();
    loadStockData();
    updateButtonVisibility();
}

// Kullanıcı bilgilerini güncelle
function updateUserInfo() {
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userRole').textContent = getUserRoleDescription();
    
    // Kullanıcı yönetimi butonunu göster/gizle
    const userMgmtBtn = document.getElementById('userManagementBtn');
    if (canManageUsers()) {
        userMgmtBtn.style.display = 'inline-block';
    } else {
        userMgmtBtn.style.display = 'none';
    }
}

// Depo kartlarını güncelle
function updateWarehouseCards() {
    const container = document.getElementById('warehouseCards');
    container.innerHTML = '';
    
    Object.entries(WAREHOUSE_TYPES).forEach(([key, warehouseType]) => {
        const card = createWarehouseCard(warehouseType);
        container.appendChild(card);
    });
}

// Depo kartı oluştur
function createWarehouseCard(warehouseType) {
    const col = document.createElement('div');
    col.className = 'col-md-2 col-sm-4 col-6 mb-3';
    
    const isMainWarehouse = warehouseType === WAREHOUSE_TYPES.MAIN;
    const isActive = warehouseType === currentWarehouse;
    const canAccess = hasWarehouseAccess(warehouseType) || canViewOtherWarehouses();
    
    col.innerHTML = `
        <div class="warehouse-card ${isMainWarehouse ? 'main-warehouse' : 'sub-warehouse'} ${isActive ? 'active' : ''}" 
             onclick="${canAccess ? `selectWarehouse('${warehouseType}')` : ''}"
             style="${!canAccess ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
            <div class="text-center">
                <i class="fas ${isMainWarehouse ? 'fa-warehouse' : 'fa-building'} fa-2x mb-2"></i>
                <h6 class="mb-1">${WAREHOUSE_NAMES[warehouseType]}</h6>
                <small class="stock-summary" id="summary-${warehouseType}">
                    Yükleniyor...
                </small>
            </div>
        </div>
    `;
    
    return col;
}

// Depo seç
function selectWarehouse(warehouseType) {
    if (!hasWarehouseAccess(warehouseType) && !canViewOtherWarehouses()) {
        return;
    }
    
    currentWarehouse = warehouseType;
    updateWarehouseCards();
    updateButtonVisibility();
    updateCurrentWarehouseDisplay();
    updateStockTable();
}

// Mevcut depo bilgisini güncelle
function updateCurrentWarehouseDisplay() {
    const warehouseNameSpan = document.getElementById('currentWarehouseName');
    const editBtn = document.getElementById('editWarehouseNameBtn');
    
    if (warehouseNameSpan) {
        warehouseNameSpan.textContent = WAREHOUSE_NAMES[currentWarehouse];
    }
    
    // Ana depo sorumlusu depo adını düzenleyebilir
    if (editBtn && currentUser.is_depo_admin) {
        editBtn.style.display = 'inline-block';
    } else if (editBtn) {
        editBtn.style.display = 'none';
    }
}

// Arama filtresini uygula
function applySearchFilter() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const rows = document.querySelectorAll('#stockTable tbody tr');
    
    rows.forEach(row => {
        const productCode = row.cells[0].textContent.toLowerCase();
        const productName = row.cells[1].textContent.toLowerCase();
        
        if (productCode.includes(searchTerm) || productName.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Buton görünürlüğünü güncelle
function updateButtonVisibility() {
    const addBtn = document.getElementById('addStockBtn');
    const removeBtn = document.getElementById('removeStockBtn');
    
    // Stok ekleme butonu sadece ana depo sorumlusu için görünür
    if (canAddStock()) {
        addBtn.style.display = 'inline-block';
    } else {
        addBtn.style.display = 'none';
    }
    
    // Stok çıkarma butonu yetkili olduğu depolar için
    if (canRemoveStock(currentWarehouse)) {
        removeBtn.style.display = 'inline-block';
    } else {
        removeBtn.style.display = 'none';
    }
}

// Stok verilerini yükle
async function loadStockData() {
    try {
        const { data, error } = await supabase
            .from('stock')
            .select('*')
            .order('product_name');
        
        if (error) {
            throw error;
        }
        
        stockData = data || [];
        updateStockTable();
        updateStatistics();
        updateWarehouseSummaries();
        
    } catch (error) {
        console.error('Stok verileri yüklenirken hata:', error);
        alert('Stok verileri yüklenirken bir hata oluştu');
    }
}

// Stok tablosunu güncelle
function updateStockTable() {
    const tbody = document.querySelector('#stockTable tbody');
    tbody.innerHTML = '';
    
    // Seçili depoya göre filtrele
    const filteredData = getFilteredStockData();
    
    filteredData.forEach(item => {
        const row = createStockRow(item);
        tbody.appendChild(row);
    });
    
    // Arama çubuğu varsa filtreleme uygula
    applySearchFilter();
}

// Seçili depoya göre stok verilerini filtrele
function getFilteredStockData() {
    if (currentWarehouse === WAREHOUSE_TYPES.MAIN) {
        // Ana depoda tüm stokları göster
        return stockData;
    } else {
        // Seçili depoda stoku olan ürünleri göster
        const warehouseField = `${currentWarehouse}_stock`;
        return stockData.filter(item => (item[warehouseField] || 0) > 0);
    }
}

// Stok satırı oluştur
function createStockRow(item) {
    const row = document.createElement('tr');
    
    const total = (item.main_stock || 0) + 
                  (item.sub1_stock || 0) + 
                  (item.sub2_stock || 0) + 
                  (item.sub3_stock || 0) + 
                  (item.sub4_stock || 0);
    
    // Ana depodan transfer için buton oluşturma fonksiyonu
    const createTransferButton = (targetWarehouse, targetStockField) => {
        if (!currentUser.is_depo_admin || (item.main_stock || 0) <= 0 || targetWarehouse === 'main') {
            return '';
        }
        return `<button class="btn btn-primary btn-sm ms-1" 
                        onclick="quickTransfer('${item.id}', 'main', '${targetWarehouse}')" 
                        title="Ana depodan ${WAREHOUSE_NAMES[targetWarehouse]}'ya 1 adet transfer et">
                    <i class="fas fa-arrow-right"></i>
                </button>`;
    };
    
    row.innerHTML = `
        <td>${item.product_code}</td>
        <td>${item.product_name}</td>
        <td>
            <span class="stock-count ${getStockClass(item.main_stock)}">${item.main_stock || 0}</span>
        </td>
        <td>
            <span class="stock-count ${getStockClass(item.sub1_stock)}">${item.sub1_stock || 0}</span>
            ${createTransferButton('sub1', 'sub1_stock')}
        </td>
        <td>
            <span class="stock-count ${getStockClass(item.sub2_stock)}">${item.sub2_stock || 0}</span>
            ${createTransferButton('sub2', 'sub2_stock')}
        </td>
        <td>
            <span class="stock-count ${getStockClass(item.sub3_stock)}">${item.sub3_stock || 0}</span>
            ${createTransferButton('sub3', 'sub3_stock')}
        </td>
        <td>
            <span class="stock-count ${getStockClass(item.sub4_stock)}">${item.sub4_stock || 0}</span>
            ${createTransferButton('sub4', 'sub4_stock')}
        </td>
        <td><strong>${total}</strong></td>
        <td>
            ${canRemoveStock(currentWarehouse) ? 
                `<button class="btn btn-warning btn-sm" onclick="quickRemoveStock('${item.id}')">
                    <i class="fas fa-minus"></i>
                </button>` : 
                '<span class="text-muted">-</span>'
            }
        </td>
    `;
    
    return row;
}

// Stok miktarına göre CSS sınıfı döndür
function getStockClass(stock) {
    if (!stock || stock === 0) return 'zero';
    if (stock <= LOW_STOCK_THRESHOLD) return 'low';
    return 'good';
}

// Hızlı stok çıkarma
function quickRemoveStock(stockId) {
    const item = stockData.find(s => s.id === stockId);
    if (!item) return;
    
    document.getElementById('selectProduct').value = stockId;
    populateWarehouseOptions();
    showRemoveStockModal();
}

// Hızlı transfer işlemi
async function quickTransfer(stockId, sourceWarehouse, targetWarehouse) {
    try {
        const item = stockData.find(s => s.id === stockId);
        if (!item) {
            alert('Ürün bulunamadı!');
            return;
        }
        
        // Yetki kontrolü
        if (!currentUser.is_depo_admin) {
            alert('Bu işlem için yetkiniz yok!');
            return;
        }
        
        const sourceField = `${sourceWarehouse}_stock`;
        const targetField = `${targetWarehouse}_stock`;
        
        const sourceStock = item[sourceField] || 0;
        const targetStock = item[targetField] || 0;
        
        if (sourceStock <= 0) {
            alert(`${WAREHOUSE_NAMES[sourceWarehouse]}'da yeterli stok yok!`);
            return;
        }
        
        // Onay isteme
        const confirmed = confirm(
            `${item.product_name} (${item.product_code})\n\n` +
            `1 adet transfer edilecek:\n` +
            `${WAREHOUSE_NAMES[sourceWarehouse]} (${sourceStock}) → ${WAREHOUSE_NAMES[targetWarehouse]} (${targetStock})\n\n` +
            `Onaylıyor musunuz?`
        );
        
        if (!confirmed) return;
        
        // Stok güncelleme
        const updates = {
            [sourceField]: sourceStock - 1,
            [targetField]: targetStock + 1
        };
        
        const { error } = await supabase
            .from('stock')
            .update(updates)
            .eq('id', stockId);
            
        if (error) throw error;
        
        // Tabloyu güncelle
        await loadStockData();
        
        // Başarı mesajı
        const toastMsg = `✅ ${item.product_name}: ${WAREHOUSE_NAMES[sourceWarehouse]} → ${WAREHOUSE_NAMES[targetWarehouse]} (1 adet)`;
        
        // Toast bildirimi göster (eğer yoksa alert)
        if (typeof showToast === 'function') {
            showToast(toastMsg, 'success');
        } else {
            alert(toastMsg);
        }
        
    } catch (error) {
        console.error('Hızlı transfer hatası:', error);
        alert('Transfer sırasında bir hata oluştu: ' + error.message);
    }
}

// İstatistikleri güncelle
function updateStatistics() {
    document.getElementById('totalProducts').textContent = stockData.length;
    
    const totalStock = stockData.reduce((sum, item) => {
        return sum + (item.main_stock || 0) + 
                    (item.sub1_stock || 0) + 
                    (item.sub2_stock || 0) + 
                    (item.sub3_stock || 0) + 
                    (item.sub4_stock || 0);
    }, 0);
    
    document.getElementById('totalStock').textContent = totalStock;
    
    const lowStockProducts = stockData.filter(item => {
        const total = (item.main_stock || 0) + 
                     (item.sub1_stock || 0) + 
                     (item.sub2_stock || 0) + 
                     (item.sub3_stock || 0) + 
                     (item.sub4_stock || 0);
        return total <= LOW_STOCK_THRESHOLD;
    }).length;
    
    document.getElementById('lowStockProducts').textContent = lowStockProducts;
}

// Depo özetlerini güncelle
function updateWarehouseSummaries() {
    Object.values(WAREHOUSE_TYPES).forEach(warehouseType => {
        const summaryElement = document.getElementById(`summary-${warehouseType}`);
        if (summaryElement) {
            const count = getWarehouseStockCount(warehouseType);
            summaryElement.textContent = `${count} ürün`;
        }
    });
}

// Depo stok sayısını getir
function getWarehouseStockCount(warehouseType) {
    const field = `${warehouseType}_stock`;
    return stockData.reduce((sum, item) => sum + (item[field] || 0), 0);
}

// Stok ekleme modalını göster
function showAddStockModal() {
    document.getElementById('addStockForm').reset();
    populateAddStockWarehouseOptions();
    new bootstrap.Modal(document.getElementById('addStockModal')).show();
}

// Stok ekleme için depo seçeneklerini doldur
function populateAddStockWarehouseOptions() {
    const select = document.getElementById('addStockWarehouse');
    if (!select) return;
    
    select.innerHTML = '';
    
    // Ana depo sorumlusu tüm depolara ekleyebilir
    if (currentUser.is_depo_admin) {
        Object.entries(WAREHOUSE_TYPES).forEach(([key, warehouseType]) => {
            const option = document.createElement('option');
            option.value = warehouseType;
            option.textContent = WAREHOUSE_NAMES[warehouseType];
            if (warehouseType === currentWarehouse) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    }
}

// Stok ekleme işlemi
async function handleAddStock() {
    const productCode = document.getElementById('productCode').value.trim();
    const productName = document.getElementById('productName').value.trim();
    const quantity = parseInt(document.getElementById('quantity').value);
    const targetWarehouse = document.getElementById('addStockWarehouse')?.value || WAREHOUSE_TYPES.MAIN;
    
    // Validation
    if (!productCode || !productName || !quantity || quantity <= 0) {
        alert('Lütfen tüm alanları doğru şekilde doldurun!');
        return;
    }
    
    if (!targetWarehouse) {
        alert('Lütfen hedef depo seçin!');
        return;
    }
    
    // Ürün kodu kontrolü (alphanumeric)
    if (!/^[a-zA-Z0-9-_]+$/.test(productCode)) {
        alert('Ürün kodu sadece harf, rakam, tire ve alt çizgi içerebilir!');
        return;
    }
    
    try {
        // Ürün zaten var mı kontrol et
        const existingProduct = stockData.find(item => 
            item.product_code.toLowerCase() === productCode.toLowerCase()
        );
        
        if (existingProduct) {
            // Mevcut ürünün seçilen depo stokunu artır
            const targetField = `${targetWarehouse}_stock`;
            const currentStock = existingProduct[targetField] || 0;
            
            const updates = {
                [targetField]: currentStock + quantity
            };
            
            const { error } = await supabase
                .from('stock')
                .update(updates)
                .eq('id', existingProduct.id);
                
            if (error) throw error;
            
            alert(`${existingProduct.product_name} ürününe ${quantity} adet eklendi (${WAREHOUSE_NAMES[targetWarehouse]})`);
        } else {
            // Yeni ürün ekle
            const newProduct = {
                product_code: productCode.toUpperCase(),
                product_name: productName,
                main_stock: 0,
                sub1_stock: 0,
                sub2_stock: 0,
                sub3_stock: 0,
                sub4_stock: 0
            };
            
            // Seçilen depoya stok ekle
            newProduct[`${targetWarehouse}_stock`] = quantity;
            
            const { error } = await supabase
                .from('stock')
                .insert(newProduct);
                
            if (error) throw error;
            
            alert(`Yeni ürün "${productName}" başarıyla ${WAREHOUSE_NAMES[targetWarehouse]}'ya eklendi!`);
        }
        
        bootstrap.Modal.getInstance(document.getElementById('addStockModal')).hide();
        await loadStockData();
        
    } catch (error) {
        console.error('Stok ekleme hatası:', error);
        alert('Stok eklenirken bir hata oluştu: ' + error.message);
    }
}

// Stok çıkarma modalını göster
function showRemoveStockModal() {
    populateProductOptions();
    populateWarehouseOptions();
    new bootstrap.Modal(document.getElementById('removeStockModal')).show();
}

// Ürün seçeneklerini doldur
function populateProductOptions() {
    const select = document.getElementById('selectProduct');
    select.innerHTML = '<option value="">Ürün seçiniz...</option>';
    
    // Mevcut depoda stoku olan ürünleri listele
    const availableProducts = stockData.filter(item => {
        const currentStock = getCurrentWarehouseStock(item, currentWarehouse);
        return currentStock > 0;
    });
    
    if (availableProducts.length === 0) {
        const option = document.createElement('option');
        option.value = "";
        option.textContent = "Bu depoda stok bulunmuyor";
        option.disabled = true;
        select.appendChild(option);
        return;
    }
    
    availableProducts.forEach(item => {
        const currentStock = getCurrentWarehouseStock(item, currentWarehouse);
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = `${item.product_code} - ${item.product_name} (${currentStock} adet)`;
        select.appendChild(option);
    });
}

// Depo seçeneklerini doldur
function populateWarehouseOptions() {
    const select = document.getElementById('targetWarehouse');
    select.innerHTML = '<option value="">Hedef seçiniz...</option>';
    
    // Ana depo sorumlusu için - tüm depolar arası transfer
    if (currentUser.is_depo_admin) {
        // Kaynak depo dışındaki tüm depolara transfer edebilir
        Object.entries(WAREHOUSE_TYPES).forEach(([key, warehouseType]) => {
            if (warehouseType !== currentWarehouse) {
                const option = document.createElement('option');
                option.value = warehouseType;
                option.textContent = `${WAREHOUSE_NAMES[warehouseType]}'ya Transfer`;
                select.appendChild(option);
            }
        });
        
        // Dış kullanım seçeneği
        const externalOption = document.createElement('option');
        externalOption.value = 'external';
        externalOption.textContent = 'Dış Kullanım (Çıkış)';
        select.appendChild(externalOption);
    }
}

// Mevcut depo stokunu getir
function getCurrentWarehouseStock(item, warehouseType) {
    const field = `${warehouseType}_stock`;
    return item[field] || 0;
}

// Stok çıkarma işlemi
async function handleRemoveStock() {
    const productId = document.getElementById('selectProduct').value;
    const quantity = parseInt(document.getElementById('removeQuantity').value);
    const targetWarehouse = document.getElementById('targetWarehouse').value;
    
    // Validation
    if (!productId) {
        alert('Lütfen ürün seçin!');
        return;
    }
    
    if (!quantity || quantity <= 0) {
        alert('Lütfen geçerli bir miktar girin!');
        return;
    }
    
    if (!targetWarehouse) {
        alert('Lütfen hedef seçin!');
        return;
    }
    
    try {
        const item = stockData.find(s => s.id === productId);
        if (!item) {
            alert('Ürün bulunamadı!');
            return;
        }
        
        const currentStock = getCurrentWarehouseStock(item, currentWarehouse);
        
        if (quantity > currentStock) {
            alert(`Yetersiz stok! Mevcut stok: ${currentStock} adet`);
            return;
        }
        
        // Stok güncelleme objesi oluştur
        const updates = {};
        const sourceField = `${currentWarehouse}_stock`;
        updates[sourceField] = currentStock - quantity;
        
        // Eğer başka bir depoya transfer ediyorsa
        if (targetWarehouse !== 'external') {
            const targetField = `${targetWarehouse}_stock`;
            const targetStock = getCurrentWarehouseStock(item, targetWarehouse);
            updates[targetField] = targetStock + quantity;
        }
        
        const { error } = await supabase
            .from('stock')
            .update(updates)
            .eq('id', productId);
            
        if (error) throw error;
        
        bootstrap.Modal.getInstance(document.getElementById('removeStockModal')).hide();
        await loadStockData();
        
        if (targetWarehouse === 'external') {
            alert(`${item.product_name} ürününden ${quantity} adet başarıyla çıkarıldı!`);
        } else {
            alert(`${item.product_name} ürününden ${quantity} adet başarıyla ${WAREHOUSE_NAMES[targetWarehouse]}'ya transfer edildi!`);
        }
        
        // Formu temizle
        document.getElementById('removeQuantity').value = '';
        document.getElementById('selectProduct').value = '';
        document.getElementById('targetWarehouse').value = '';
        
    } catch (error) {
        console.error('Stok çıkarma hatası:', error);
        alert('İşlem sırasında bir hata oluştu: ' + error.message);
    }
}

// Stok ekleme yetkisi kontrol et
function canAddStock() {
    return currentUser && currentUser.is_depo_admin && currentUser.is_active;
}
