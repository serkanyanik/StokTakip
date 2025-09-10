// Ana uygulama fonksiyonları

let currentWarehouse = WAREHOUSE_TYPES.MAIN;
let stockData = [];

// Sayfa yüklendiğinde çalışacak
document.addEventListener('DOMContentLoaded', async function () {
    // Depo adlarını yükle
    loadWarehouseNamesFromStorage();

    // Tablo başlıklarını güncelle (depo adları yüklendikten sonra)
    updateTableHeaders();

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

    // Raporlar butonu
    document.getElementById('reportsBtn').addEventListener('click', showReportsModal);

    // Raf yönetimi butonu
    document.getElementById('shelfManagementBtn').addEventListener('click', showShelfManagementModal);
}

// Depo/araç adı düzenleme modalını göster
function showEditWarehouseNameModal() {
    if (!currentUser.is_depo_admin) {
        alert('Bu işlem için yetkiniz yok!');
        return;
    }

    document.getElementById('warehouseName').value = WAREHOUSE_NAMES[currentWarehouse];
    document.getElementById('editingWarehouseType').value = currentWarehouse;

    // Modal içeriğini türe göre güncelle
    const modalTitle = document.getElementById('editWarehouseModalTitle');
    const label = document.getElementById('editWarehouseLabel');
    const helpText = document.getElementById('editWarehouseHelpText');

    if (currentWarehouse === WAREHOUSE_TYPES.MAIN) {
        modalTitle.textContent = 'Ana Depo Adını Düzenle';
        label.textContent = 'Ana Depo Adı';
        helpText.textContent = 'Ana deponun görünecek adını girin (örn: Merkez Depo, İstanbul Ana Depo)';
    } else {
        modalTitle.textContent = 'Araç Adını Düzenle';
        label.textContent = 'Araç Adı';
        helpText.textContent = 'Bu aracın görünecek adını girin (örn: Ahmet Bey Aracı, İstanbul 1. Araç)';
    }

    const modal = new bootstrap.Modal(document.getElementById('editWarehouseNameModal'));
    modal.show();
}

// Karttan depo/araç adı düzenleme modalını göster
function editWarehouseName(warehouseType) {
    if (!currentUser.is_depo_admin) {
        alert('Bu işlem için yetkiniz yok!');
        return;
    }

    document.getElementById('warehouseName').value = WAREHOUSE_NAMES[warehouseType];
    document.getElementById('editingWarehouseType').value = warehouseType;

    // Modal içeriğini türe göre güncelle
    const modalTitle = document.getElementById('editWarehouseModalTitle');
    const label = document.getElementById('editWarehouseLabel');
    const helpText = document.getElementById('editWarehouseHelpText');

    if (warehouseType === WAREHOUSE_TYPES.MAIN) {
        modalTitle.textContent = 'Ana Depo Adını Düzenle';
        label.textContent = 'Ana Depo Adı';
        helpText.textContent = 'Ana deponun görünecek adını girin (örn: Merkez Depo, İstanbul Ana Depo)';
    } else {
        modalTitle.textContent = 'Araç Adını Düzenle';
        label.textContent = 'Araç Adı';
        helpText.textContent = 'Bu aracın görünecek adını girin (örn: Ahmet Bey Aracı, İstanbul 1. Araç)';
    }

    const modal = new bootstrap.Modal(document.getElementById('editWarehouseNameModal'));
    modal.show();
}

// Depo adını kaydet
async function handleSaveWarehouseName() {
    try {
        const newName = document.getElementById('warehouseName').value.trim();
        const warehouseType = document.getElementById('editingWarehouseType').value;

        const isMainWarehouse = warehouseType === WAREHOUSE_TYPES.MAIN;
        const unitType = isMainWarehouse ? 'depo adını' : 'araç adını';
        const unitTypeMin = isMainWarehouse ? 'Depo adı' : 'Araç adı';

        if (!newName) {
            alert(`Lütfen ${unitType} girin!`);
            return;
        }

        if (newName.length < 2) {
            alert(`${unitTypeMin} en az 2 karakter olmalıdır!`);
            return;
        }

        // Adı güncelle (localStorage'da sakla)
        WAREHOUSE_NAMES[warehouseType] = newName;
        saveWarehouseNamesToStorage();

        // Görünümü güncelle
        updateWarehouseCards();
        updateTableHeaders(); // Tablo başlıklarını güncelle
        updateCurrentWarehouseDisplay();
        updateStockTable(); // Transfer butonlarındaki tooltipleri güncellemek için

        // Modal'ı kapat
        bootstrap.Modal.getInstance(document.getElementById('editWarehouseNameModal')).hide();

        alert(`${isMainWarehouse ? 'Ana depo' : 'Araç'} adı "${newName}" olarak güncellendi!`);

    } catch (error) {
        console.error('Ad kaydetme hatası:', error);
        alert('Ad kaydedilirken bir hata oluştu: ' + error.message);
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

async function handleSaveWarehouseName() {
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
    updateTableHeaders(); // Tablo başlıklarını güncelle
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

    // Raf yönetimi butonunu göster/gizle (sadece ana depo sorumlusu)
    const shelfMgmtBtn = document.getElementById('shelfManagementBtn');
    if (currentUser.is_depo_admin) {
        shelfMgmtBtn.style.display = 'inline-block';
    } else {
        shelfMgmtBtn.style.display = 'none';
    }
}

// Tablo başlıklarını güncelle
function updateTableHeaders() {
    const mainHeader = document.getElementById('mainWarehouseHeader');
    const sub1Header = document.getElementById('sub1WarehouseHeader');
    const sub2Header = document.getElementById('sub2WarehouseHeader');
    const sub3Header = document.getElementById('sub3WarehouseHeader');
    const sub4Header = document.getElementById('sub4WarehouseHeader');

    if (mainHeader) mainHeader.textContent = WAREHOUSE_NAMES[WAREHOUSE_TYPES.MAIN];
    if (sub1Header) sub1Header.textContent = WAREHOUSE_NAMES[WAREHOUSE_TYPES.SUB1];
    if (sub2Header) sub2Header.textContent = WAREHOUSE_NAMES[WAREHOUSE_TYPES.SUB2];
    if (sub3Header) sub3Header.textContent = WAREHOUSE_NAMES[WAREHOUSE_TYPES.SUB3];
    if (sub4Header) sub4Header.textContent = WAREHOUSE_NAMES[WAREHOUSE_TYPES.SUB4];
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

    // Edit butonu sadece ana depo sorumlusu için
    const editButton = currentUser && currentUser.is_depo_admin ?
        `<button class="btn btn-outline-light btn-sm position-absolute top-0 end-0 m-1" 
                onclick="event.stopPropagation(); editWarehouseName('${warehouseType}')" 
                title="${isMainWarehouse ? 'Ana Depo Adını Düzenle' : 'Araç Adını Düzenle'}">
            <i class="fas fa-edit"></i>
        </button>` : '';

    // Transfer butonu sadece ana depo sorumlusu için (tüm depolar için)
    const transferButton = currentUser && currentUser.is_depo_admin ?
        `<button class="btn btn-primary btn-sm position-absolute bottom-0 end-0 m-1" 
                onclick="event.stopPropagation(); showTransferToWarehouseModal('${warehouseType}')" 
                title="${WAREHOUSE_NAMES[warehouseType]}${isMainWarehouse ? ' için Transfer İşlemleri' : ' Aracına Transfer'}">
            <i class="fas fa-exchange-alt"></i>
        </button>` : '';

    col.innerHTML = `
        <div class="warehouse-card ${isMainWarehouse ? 'main-warehouse' : 'sub-warehouse'} ${isActive ? 'active' : ''}" 
             onclick="${canAccess ? `selectWarehouse('${warehouseType}')` : ''}"
             style="${!canAccess ? 'opacity: 0.5; cursor: not-allowed;' : ''} position: relative;">
            ${editButton}
            ${transferButton}
            <div class="text-center">
                <i class="fas ${isMainWarehouse ? 'fa-warehouse' : 'fa-truck-moving'} fa-2x mb-2"></i>
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
    updateWarehouseSummaries(); // Depo özetlerini güncelle
}

// Mevcut depo bilgisini güncelle
function updateCurrentWarehouseDisplay() {
    const warehouseNameSpan = document.getElementById('currentWarehouseName');
    const editBtn = document.getElementById('editWarehouseNameBtn');

    if (warehouseNameSpan) {
        warehouseNameSpan.textContent = WAREHOUSE_NAMES[currentWarehouse];
    }

    // Ana depo sorumlusu ad düzenleyebilir
    if (editBtn && currentUser.is_depo_admin) {
        editBtn.style.display = 'inline-block';
    } else if (editBtn) {
        editBtn.style.display = 'none';
    }
}

// Arama filtresini uygula (ürün kodu, adı ve raf adresi dahil)
function applySearchFilter() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const rows = document.querySelectorAll('#stockTable tbody tr');

    rows.forEach(row => {
        const productCode = row.cells[0].textContent.toLowerCase();
        const productName = row.cells[1].textContent.toLowerCase();
        const shelfAddress = row.cells[2].textContent.toLowerCase();

        if (productCode.includes(searchTerm) || productName.includes(searchTerm) || shelfAddress.includes(searchTerm)) {
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

    // Stok çıkarma/transfer butonu yetkili olduğu depolar için
    if (canRemoveStock(currentWarehouse)) {
        removeBtn.style.display = 'inline-block';

        // Buton yazısını kullanıcı türüne göre güncelle
        const btnText = removeBtn.querySelector('.btn-text') || removeBtn;
        if (currentUser.is_depo_admin) {
            removeBtn.innerHTML = '<i class="fas fa-exchange-alt me-1"></i>Stok İşlemleri';
        } else {
            removeBtn.innerHTML = '<i class="fas fa-arrow-left me-1"></i>Ana Depoya Gönder';
        }
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
    if (!tbody) return;

    tbody.innerHTML = '';

    // Stok verisi yoksa yükleme mesajı
    if (!stockData || stockData.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="9" class="text-center text-muted">Stok verileri yükleniyor...</td>';
        tbody.appendChild(row);
        return;
    }

    // Seçili depoya göre filtrele
    const filteredData = getFilteredStockData();

    if (filteredData.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="9" class="text-center text-muted">Bu depoda stok bulunmuyor</td>';
        tbody.appendChild(row);
        return;
    }

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
            <span class="shelf-address" onclick="editShelfAddress('${item.id}', '${item.product_code}', '${item.product_name}', '${item.shelf_address || ''}')" 
                  title="Raf adresini düzenle">
                ${item.shelf_address ? `<i class="fas fa-map-marker-alt text-success me-1"></i>${item.shelf_address}` : '<i class="fas fa-plus text-muted"></i> Raf Ekle'}
            </span>
        </td>
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

        // Hareket kaydı oluştur
        await createStockMovement(
            stockId, 
            item.product_code, 
            item.product_name, 
            'transfer', 
            sourceWarehouse, 
            targetWarehouse, 
            1, 
            `Hızlı transfer: ${WAREHOUSE_NAMES[sourceWarehouse]} → ${WAREHOUSE_NAMES[targetWarehouse]}`
        );

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

            // Hareket kaydı oluştur
            await createStockMovement(
                existingProduct.id, 
                existingProduct.product_code, 
                existingProduct.product_name, 
                'in', 
                null, 
                targetWarehouse, 
                quantity, 
                'Mevcut ürüne stok ekleme'
            );

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

            // Yeni eklenen ürünün ID'sini al
            const { data: newProductData } = await supabase
                .from('stock')
                .select('id')
                .eq('product_code', productCode.toUpperCase())
                .single();

            if (newProductData) {
                // Hareket kaydı oluştur
                await createStockMovement(
                    newProductData.id, 
                    productCode.toUpperCase(), 
                    productName, 
                    'in', 
                    null, 
                    targetWarehouse, 
                    quantity, 
                    'Yeni ürün ekleme'
                );
            }

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
    // Modal başlığını depo türüne ve kullanıcı yetkisine göre ayarla
    const modalTitle = document.getElementById('removeStockModalTitle');
    if (modalTitle) {
        if (currentWarehouse === WAREHOUSE_TYPES.MAIN && currentUser.is_depo_admin) {
            modalTitle.textContent = 'Stok İşlemleri';
        } else if (currentWarehouse !== WAREHOUSE_TYPES.MAIN) {
            modalTitle.textContent = 'Araç Stok Yönetimi';
        } else {
            modalTitle.textContent = 'Stok Transfer/Çıkar';
        }
    }

    // Ana depo sorumlusu ve ana depo seçiliyse kaynak depo seçimini göster
    const sourceContainer = document.getElementById('sourceWarehouseContainer');
    if (currentUser.is_depo_admin && currentWarehouse === WAREHOUSE_TYPES.MAIN) {
        sourceContainer.style.display = 'block';
        populateSourceWarehouseOptions();
        setupSourceWarehouseListener();
    } else {
        sourceContainer.style.display = 'none';
        populateProductOptions();
    }

    populateWarehouseOptions();
    new bootstrap.Modal(document.getElementById('removeStockModal')).show();
}

// Ürün seçeneklerini doldur
function populateProductOptions() {
    const select = document.getElementById('selectProduct');
    select.innerHTML = '<option value="">Ürün seçiniz...</option>';

    let availableProducts = [];

    // Ana depo sorumlusu ve ana depo seçiliyse tüm depolardaki ürünleri göster
    if (currentUser.is_depo_admin && currentWarehouse === WAREHOUSE_TYPES.MAIN) {
        // Tüm ürünleri listele ve hangi depolarda stok olduğunu göster
        availableProducts = stockData.filter(item => {
            // En az bir depoda stok var mı kontrol et
            return Object.values(WAREHOUSE_TYPES).some(warehouseType => {
                const stock = getCurrentWarehouseStock(item, warehouseType);
                return stock > 0;
            });
        });

        if (availableProducts.length === 0) {
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "Hiçbir depoda stok bulunmuyor";
            option.disabled = true;
            select.appendChild(option);
            return;
        }

        // Ana depo için detaylı stok bilgisi göster
        availableProducts.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;

            // Tüm depolardaki stok durumunu göster
            const stockInfo = Object.values(WAREHOUSE_TYPES).map(warehouseType => {
                const stock = getCurrentWarehouseStock(item, warehouseType);
                return `${WAREHOUSE_NAMES[warehouseType]}: ${stock}`;
            }).join(' | ');

            option.textContent = `${item.product_code} - ${item.product_name} (${stockInfo})`;
            select.appendChild(option);
        });
    } else {
        // Diğer durumlar için sadece mevcut depodaki ürünleri listele
        availableProducts = stockData.filter(item => {
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
}

// Kaynak depo seçeneklerini doldur (Ana depo sorumlusu için)
function populateSourceWarehouseOptions() {
    const select = document.getElementById('sourceWarehouse');
    select.innerHTML = '<option value="">Kaynak depo seçiniz...</option>';

    Object.entries(WAREHOUSE_TYPES).forEach(([key, warehouseType]) => {
        const option = document.createElement('option');
        option.value = warehouseType;
        option.textContent = WAREHOUSE_NAMES[warehouseType];
        select.appendChild(option);
    });
}

// Kaynak depo değiştiğinde ürün listesini güncelle
function setupSourceWarehouseListener() {
    const sourceSelect = document.getElementById('sourceWarehouse');
    sourceSelect.addEventListener('change', function () {
        const selectedWarehouse = this.value;
        if (selectedWarehouse) {
            populateProductOptionsForWarehouse(selectedWarehouse);
        } else {
            // Kaynak seçilmemişse tüm depoları göster
            populateProductOptions();
        }
        // Hedef seçeneklerini de güncelle
        populateWarehouseOptions();
    });
}

// Belirli bir depo için ürün seçeneklerini doldur
function populateProductOptionsForWarehouse(warehouseType) {
    const select = document.getElementById('selectProduct');
    select.innerHTML = '<option value="">Ürün seçiniz...</option>';

    const availableProducts = stockData.filter(item => {
        const stock = getCurrentWarehouseStock(item, warehouseType);
        return stock > 0;
    });

    if (availableProducts.length === 0) {
        const option = document.createElement('option');
        option.value = "";
        option.textContent = `${WAREHOUSE_NAMES[warehouseType]}'da stok bulunmuyor`;
        option.disabled = true;
        select.appendChild(option);
        return;
    }

    availableProducts.forEach(item => {
        const stock = getCurrentWarehouseStock(item, warehouseType);
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = `${item.product_code} - ${item.product_name} (${stock} adet)`;
        select.appendChild(option);
    });
}

// Depo seçeneklerini doldur
function populateWarehouseOptions() {
    const select = document.getElementById('targetWarehouse');
    select.innerHTML = '<option value="">Hedef seçiniz...</option>';

    // Ana depo sorumlusu için - tüm depolar arası transfer
    if (currentUser.is_depo_admin) {
        // Ana depodaysa ve kaynak depo seçimi varsa
        if (currentWarehouse === WAREHOUSE_TYPES.MAIN) {
            const sourceSelect = document.getElementById('sourceWarehouse');
            const selectedSource = sourceSelect ? sourceSelect.value : null;

            // Eğer kaynak depo seçilmişse sadece o depoya uygun seçenekleri göster
            if (selectedSource) {
                // Ana depoya ürün ekleme sadece ana depodan yapılabilir
                if (selectedSource === WAREHOUSE_TYPES.MAIN) {
                    const addToMainOption = document.createElement('option');
                    addToMainOption.value = 'add_to_main';
                    addToMainOption.textContent = 'Ana Depoya Ürün Ekle (Sisteme Giriş)';
                    select.appendChild(addToMainOption);
                }

                // Kaynak depo dışındaki tüm depolara transfer edebilir
                Object.entries(WAREHOUSE_TYPES).forEach(([key, warehouseType]) => {
                    if (warehouseType !== selectedSource) {
                        const option = document.createElement('option');
                        option.value = warehouseType;
                        option.textContent = `${WAREHOUSE_NAMES[warehouseType]}'na Transfer`;
                        select.appendChild(option);
                    }
                });
            } else {
                // Kaynak seçilmemişse genel seçenekleri göster
                const addToMainOption = document.createElement('option');
                addToMainOption.value = 'add_to_main';
                addToMainOption.textContent = 'Ana Depoya Ürün Ekle (Sisteme Giriş)';
                select.appendChild(addToMainOption);

                Object.entries(WAREHOUSE_TYPES).forEach(([key, warehouseType]) => {
                    if (warehouseType !== currentWarehouse) {
                        const option = document.createElement('option');
                        option.value = warehouseType;
                        option.textContent = `${WAREHOUSE_NAMES[warehouseType]}'na Transfer`;
                        select.appendChild(option);
                    }
                });
            }
        } else {
            // Diğer depolardan ana depoya transfer
            Object.entries(WAREHOUSE_TYPES).forEach(([key, warehouseType]) => {
                if (warehouseType !== currentWarehouse) {
                    const option = document.createElement('option');
                    option.value = warehouseType;
                    option.textContent = `${WAREHOUSE_NAMES[warehouseType]}'na Transfer`;
                    select.appendChild(option);
                }
            });
        }

        // Dış kullanım seçeneği
        const externalOption = document.createElement('option');
        externalOption.value = 'external';
        externalOption.textContent = 'Dış Kullanım (Çıkış)';
        select.appendChild(externalOption);
    }
    // Araç sorumluları için - sadece ana depoya geri gönderebilir
    else if (currentWarehouse !== WAREHOUSE_TYPES.MAIN) {
        const mainOption = document.createElement('option');
        mainOption.value = WAREHOUSE_TYPES.MAIN;
        mainOption.textContent = 'Ana Depoya Geri Gönder';
        select.appendChild(mainOption);

        // Dış kullanım seçeneği (araçlar da kullanabilir)
        const externalOption = document.createElement('option');
        externalOption.value = 'external';
        externalOption.textContent = 'Kullanıldı (Çıkış)';
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

    // Ana depo sorumlusu ve ana depo seçiliyse kaynak depo kontrolü
    let sourceWarehouse = currentWarehouse;
    if (currentUser.is_depo_admin && currentWarehouse === WAREHOUSE_TYPES.MAIN) {
        const selectedSource = document.getElementById('sourceWarehouse').value;
        if (selectedSource) {
            sourceWarehouse = selectedSource;
        }
    }

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

        const sourceStock = getCurrentWarehouseStock(item, sourceWarehouse);

        if (quantity > sourceStock) {
            alert(`Yetersiz stok! ${WAREHOUSE_NAMES[sourceWarehouse]}'da mevcut stok: ${sourceStock} adet`);
            return;
        }

        // Stok güncelleme objesi oluştur
        const updates = {};
        const sourceField = `${sourceWarehouse}_stock`;

        // Ana depoya ürün ekleme (sisteme giriş) - sadece ana depodayken
        if (targetWarehouse === 'add_to_main' && sourceWarehouse === WAREHOUSE_TYPES.MAIN) {
            updates[sourceField] = sourceStock + quantity;
        } else {
            updates[sourceField] = sourceStock - quantity;

            // Eğer başka bir depoya transfer ediyorsa
            if (targetWarehouse !== 'external') {
                const targetField = `${targetWarehouse}_stock`;
                const targetStock = getCurrentWarehouseStock(item, targetWarehouse);
                updates[targetField] = targetStock + quantity;
            }
        }

        const { error } = await supabase
            .from('stock')
            .update(updates)
            .eq('id', productId);

        if (error) throw error;

        // Hareket kaydı oluştur
        let movementType, notes;
        if (targetWarehouse === 'add_to_main' && sourceWarehouse === WAREHOUSE_TYPES.MAIN) {
            movementType = 'in';
            notes = 'Sisteme giriş (stok artışı)';
            await createStockMovement(productId, item.product_code, item.product_name, movementType, null, sourceWarehouse, quantity, notes);
        } else if (targetWarehouse === 'external') {
            movementType = 'out';
            notes = 'Dış kullanım';
            await createStockMovement(productId, item.product_code, item.product_name, movementType, sourceWarehouse, 'external', quantity, notes);
        } else {
            movementType = 'transfer';
            notes = `${WAREHOUSE_NAMES[sourceWarehouse]} → ${WAREHOUSE_NAMES[targetWarehouse]}`;
            await createStockMovement(productId, item.product_code, item.product_name, movementType, sourceWarehouse, targetWarehouse, quantity, notes);
        }

        bootstrap.Modal.getInstance(document.getElementById('removeStockModal')).hide();
        await loadStockData();

        if (targetWarehouse === 'add_to_main' && sourceWarehouse === WAREHOUSE_TYPES.MAIN) {
            alert(`${item.product_name} ürününe ${quantity} adet başarıyla eklendi (Sisteme Giriş)!`);
        } else if (targetWarehouse === 'external') {
            alert(`${item.product_name} ürününden ${quantity} adet başarıyla çıkarıldı (${WAREHOUSE_NAMES[sourceWarehouse]})!`);
        } else {
            alert(`${item.product_name}: ${quantity} adet ${WAREHOUSE_NAMES[sourceWarehouse]} → ${WAREHOUSE_NAMES[targetWarehouse]} transfer edildi!`);
        }

        // Formu temizle
        document.getElementById('removeQuantity').value = '';
        document.getElementById('selectProduct').value = '';
        document.getElementById('targetWarehouse').value = '';
        if (document.getElementById('sourceWarehouse')) {
            document.getElementById('sourceWarehouse').value = '';
        }

    } catch (error) {
        console.error('Stok çıkarma hatası:', error);
        alert('İşlem sırasında bir hata oluştu: ' + error.message);
    }
}

// Stok ekleme yetkisi kontrol et - auth.js'te tanımlı

// Düşük stoklu ürünler modalını göster
function showLowStockModal() {
    const modal = new bootstrap.Modal(document.getElementById('lowStockModal'));
    modal.show();
    loadLowStockProducts();
}

// Düşük stoklu ürünleri yükle ve göster
function loadLowStockProducts() {
    const content = document.getElementById('lowStockContent');
    
    // Yükleme animasyonu göster
    content.innerHTML = `
        <div class="text-center">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Yükleniyor...</span>
            </div>
            <p class="mt-2">Düşük stoklu ürünler kontrol ediliyor...</p>
        </div>
    `;

    // Kısa bir delay ile veriler yüklendiği hissini ver
    setTimeout(() => {
        const lowStockProducts = getLowStockProducts();
        displayLowStockProducts(lowStockProducts);
    }, 500);
}

// Düşük stoklu ürünleri filtrele ve sırala
function getLowStockProducts() {
    return stockData
        .map(item => {
            const totalStock = (item.main_stock || 0) +
                (item.sub1_stock || 0) +
                (item.sub2_stock || 0) +
                (item.sub3_stock || 0) +
                (item.sub4_stock || 0);
            
            return {
                ...item,
                totalStock: totalStock
            };
        })
        .filter(item => item.totalStock < LOW_STOCK_THRESHOLD && item.totalStock >= 0)
        .sort((a, b) => a.totalStock - b.totalStock); // En düşük stok en üstte
}

// Düşük stoklu ürünleri modal içinde göster
function displayLowStockProducts(lowStockProducts) {
    const content = document.getElementById('lowStockContent');
    
    if (lowStockProducts.length === 0) {
        content.innerHTML = `
            <div class="text-center text-success">
                <i class="fas fa-check-circle fa-3x mb-3"></i>
                <h5>Harika! 🎉</h5>
                <p class="mb-0">Hiçbir ürünün stoğu kritik seviyede değil.</p>
                <small class="text-muted">Tüm ürünler ${LOW_STOCK_THRESHOLD} adet veya daha fazla stoka sahip.</small>
            </div>
        `;
        return;
    }

    let html = `
        <div class="alert alert-warning">
            <i class="fas fa-exclamation-triangle me-2"></i>
            <strong>${lowStockProducts.length} ürün</strong> kritik stok seviyesinde (${LOW_STOCK_THRESHOLD} adetten az)
        </div>
        <div class="table-responsive">
            <table class="table table-striped table-hover">
                <thead class="table-dark">
                    <tr>
                        <th>Ürün Kodu</th>
                        <th>Ürün Adı</th>
                        <th class="text-center">Toplam</th>
                        <th class="text-center">${WAREHOUSE_NAMES[WAREHOUSE_TYPES.MAIN]}</th>
                        <th class="text-center">${WAREHOUSE_NAMES[WAREHOUSE_TYPES.SUB1]}</th>
                        <th class="text-center">${WAREHOUSE_NAMES[WAREHOUSE_TYPES.SUB2]}</th>
                        <th class="text-center">${WAREHOUSE_NAMES[WAREHOUSE_TYPES.SUB3]}</th>
                        <th class="text-center">${WAREHOUSE_NAMES[WAREHOUSE_TYPES.SUB4]}</th>
                        <th class="text-center">Durum</th>
                    </tr>
                </thead>
                <tbody>
    `;

    lowStockProducts.forEach((item, index) => {
        const isZeroStock = item.totalStock === 0;
        const rowClass = isZeroStock ? 'table-danger' : 'table-warning';
        const statusIcon = isZeroStock ? 
            '<i class="fas fa-times-circle text-danger" title="Stok tükendi"></i>' : 
            '<i class="fas fa-exclamation-triangle text-warning" title="Düşük stok"></i>';

        html += `
            <tr class="${rowClass}">
                <td>
                    <strong>${item.product_code}</strong>
                    ${index === 0 ? '<span class="badge bg-danger ms-1">EN DÜŞÜK</span>' : ''}
                </td>
                <td>${item.product_name}</td>
                <td class="text-center">
                    <span class="badge ${isZeroStock ? 'bg-danger' : 'bg-warning text-dark'} fs-6">
                        ${item.totalStock}
                    </span>
                </td>
                <td class="text-center">
                    <span class="stock-count ${getStockClass(item.main_stock)}">${item.main_stock || 0}</span>
                </td>
                <td class="text-center">
                    <span class="stock-count ${getStockClass(item.sub1_stock)}">${item.sub1_stock || 0}</span>
                </td>
                <td class="text-center">
                    <span class="stock-count ${getStockClass(item.sub2_stock)}">${item.sub2_stock || 0}</span>
                </td>
                <td class="text-center">
                    <span class="stock-count ${getStockClass(item.sub3_stock)}">${item.sub3_stock || 0}</span>
                </td>
                <td class="text-center">
                    <span class="stock-count ${getStockClass(item.sub4_stock)}">${item.sub4_stock || 0}</span>
                </td>
                <td class="text-center">${statusIcon}</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
        <div class="mt-3">
            <small class="text-muted">
                <i class="fas fa-info-circle me-1"></i>
                Kritik seviye: ${LOW_STOCK_THRESHOLD} adet altı • 
                Tabloda ürünler en düşük stoktan yükseğe doğru sıralanmıştır
            </small>
        </div>
    `;

    content.innerHTML = html;
}

// Transfer to warehouse modal
function showTransferToWarehouseModal(targetWarehouse) {
    const modal = document.getElementById('transferToWarehouseModal');
    if (!modal) {
        console.error('Transfer modal bulunamadı');
        return;
    }

    // Modal başlığını güncelle
    const modalTitle = modal.querySelector('.modal-title');
    if (modalTitle) {
        if (targetWarehouse === WAREHOUSE_TYPES.MAIN) {
            modalTitle.textContent = `Ana Depo Transfer İşlemleri`;
        } else {
            modalTitle.textContent = `${WAREHOUSE_NAMES[targetWarehouse]}'ya Stok Transfer`;
        }
    }

    // Hedef depoyu modal'a kaydet
    modal.setAttribute('data-target-warehouse', targetWarehouse);

    // Kaynak depo seçeneklerini güncelle
    updateSourceWarehouseOptions(targetWarehouse);

    // Ürün listesini temizle
    const productSelect = document.getElementById('transferProductSelect');
    productSelect.innerHTML = '<option value="">Önce kaynak depo seçin</option>';

    // Modal'ı göster
    new bootstrap.Modal(modal).show();
}

function updateSourceWarehouseOptions(targetWarehouse) {
    const sourceSelect = document.getElementById('transferSourceWarehouse');
    if (!sourceSelect) return;

    sourceSelect.innerHTML = '<option value="">Kaynak Depo Seçin</option>';

    // Tüm depoları listele (hedef depo hariç)
    Object.keys(WAREHOUSE_TYPES).forEach(key => {
        const warehouseType = WAREHOUSE_TYPES[key];
        if (warehouseType !== targetWarehouse) {
            const option = document.createElement('option');
            option.value = warehouseType;
            option.textContent = WAREHOUSE_NAMES[warehouseType];
            sourceSelect.appendChild(option);
        }
    });

    // Kaynak depo değiştiğinde ürün listesini güncelle
    sourceSelect.addEventListener('change', function () {
        updateTransferProductOptions(this.value);
    });
}

function updateTransferProductOptions(sourceWarehouse) {
    const productSelect = document.getElementById('transferProductSelect');
    if (!productSelect) return;

    productSelect.innerHTML = '<option value="">Ürün Seçin</option>';

    if (!sourceWarehouse || !stockData) return;

    // Kaynak depoda stoku olan ürünleri listele
    stockData
        .filter(item => getCurrentWarehouseStock(item, sourceWarehouse) > 0)
        .forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            const stock = getCurrentWarehouseStock(item, sourceWarehouse);
            option.textContent = `${item.product_name} (Stok: ${stock})`;
            productSelect.appendChild(option);
        });
}

async function executeWarehouseTransfer() {
    const modal = document.getElementById('transferToWarehouseModal');
    const targetWarehouse = modal.getAttribute('data-target-warehouse');
    const sourceWarehouse = document.getElementById('transferSourceWarehouse').value;
    const productId = document.getElementById('transferProductSelect').value;
    const quantity = parseInt(document.getElementById('transferQuantity').value);

    if (!sourceWarehouse) {
        alert('Lütfen kaynak depo seçin!');
        return;
    }

    if (!productId) {
        alert('Lütfen ürün seçin!');
        return;
    }

    if (!quantity || quantity <= 0) {
        alert('Lütfen geçerli bir miktar girin!');
        return;
    }

    try {
        const item = stockData.find(s => s.id === productId);
        if (!item) {
            alert('Ürün bulunamadı!');
            return;
        }

        const sourceStock = getCurrentWarehouseStock(item, sourceWarehouse);

        if (quantity > sourceStock) {
            alert(`Yetersiz stok! ${WAREHOUSE_NAMES[sourceWarehouse]}'da mevcut stok: ${sourceStock} adet`);
            return;
        }

        // Stok güncelleme
        const updates = {};
        const sourceField = `${sourceWarehouse}_stock`;
        const targetField = `${targetWarehouse}_stock`;

        updates[sourceField] = sourceStock - quantity;
        updates[targetField] = getCurrentWarehouseStock(item, targetWarehouse) + quantity;

        const { error } = await supabase
            .from('stock')
            .update(updates)
            .eq('id', productId);

        if (error) throw error;

        // Hareket kaydı oluştur
        await createStockMovement(
            productId, 
            item.product_code, 
            item.product_name, 
            'transfer', 
            sourceWarehouse, 
            targetWarehouse, 
            quantity, 
            `Depo arası transfer: ${WAREHOUSE_NAMES[sourceWarehouse]} → ${WAREHOUSE_NAMES[targetWarehouse]}`
        );

        bootstrap.Modal.getInstance(modal).hide();
        await loadStockData();

        alert(`${item.product_name} ürününden ${quantity} adet başarıyla ${WAREHOUSE_NAMES[sourceWarehouse]}'dan ${WAREHOUSE_NAMES[targetWarehouse]}'ya transfer edildi!`);

        // Formu temizle
        document.getElementById('transferSourceWarehouse').value = '';
        document.getElementById('transferProductSelect').value = '';
        document.getElementById('transferQuantity').value = '';

    } catch (error) {
        console.error('Transfer hatası:', error);
        alert('İşlem sırasında bir hata oluştu: ' + error.message);
    }
}

// ==================== YENİ ÖZELLİKLER ====================

// Raporlar modalını göster
function showReportsModal() {
    const modal = new bootstrap.Modal(document.getElementById('reportsModal'));
    
    // Varsayılan tarih aralığını bu ay olarak ayarla
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    document.getElementById('reportStartDate').value = firstDay.toISOString().split('T')[0];
    document.getElementById('reportEndDate').value = lastDay.toISOString().split('T')[0];
    
    // Depo seçeneklerini doldur
    populateReportWarehouseOptions();
    
    modal.show();
}

// Rapor için depo seçeneklerini doldur
function populateReportWarehouseOptions() {
    const select = document.getElementById('reportWarehouse');
    select.innerHTML = '<option value="all">Tüm Depolar</option>';
    
    Object.entries(WAREHOUSE_TYPES).forEach(([key, warehouseType]) => {
        const option = document.createElement('option');
        option.value = warehouseType;
        option.textContent = WAREHOUSE_NAMES[warehouseType];
        select.appendChild(option);
    });
}

// Stok hareket kaydı oluştur
async function createStockMovement(productId, productCode, productName, movementType, sourceWarehouse, targetWarehouse, quantity, notes = '') {
    try {
        const { error } = await supabase
            .from('stock_movements')
            .insert({
                product_id: productId,
                product_code: productCode,
                product_name: productName,
                movement_type: movementType,
                source_warehouse: sourceWarehouse,
                target_warehouse: targetWarehouse,
                quantity: quantity,
                user_id: currentUser.id,
                user_name: currentUser.name,
                notes: notes
            });

        if (error) throw error;
    } catch (error) {
        console.error('Stok hareket kaydı oluşturma hatası:', error);
    }
}

// Rapor oluştur
async function generateReport() {
    const startDate = document.getElementById('reportStartDate').value;
    const endDate = document.getElementById('reportEndDate').value;
    const warehouse = document.getElementById('reportWarehouse').value;
    
    if (!startDate || !endDate) {
        alert('Lütfen başlangıç ve bitiş tarihlerini seçin!');
        return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
        alert('Başlangıç tarihi bitiş tarihinden büyük olamaz!');
        return;
    }
    
    const content = document.getElementById('reportContent');
    content.innerHTML = `
        <div class="text-center py-3">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Rapor oluşturuluyor...</span>
            </div>
            <p class="mt-2">Rapor hazırlanıyor...</p>
        </div>
    `;
    
    try {
        let query = supabase
            .from('stock_movements')
            .select('*')
            .gte('movement_date', startDate)
            .lte('movement_date', endDate + ' 23:59:59')
            .order('movement_date', { ascending: false });
            
        if (warehouse !== 'all') {
            query = query.or(`source_warehouse.eq.${warehouse},target_warehouse.eq.${warehouse}`);
        }
        
        const { data: movements, error } = await query;
        
        if (error) throw error;
        
        displayReport(movements, startDate, endDate, warehouse);
        
    } catch (error) {
        console.error('Rapor oluşturma hatası:', error);
        content.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Rapor oluşturulurken bir hata oluştu: ${error.message}
            </div>
        `;
    }
}

// Raporu görüntüle
function displayReport(movements, startDate, endDate, warehouse) {
    const content = document.getElementById('reportContent');
    const exportBtn = document.getElementById('exportReportBtn');
    
    if (!movements || movements.length === 0) {
        content.innerHTML = `
            <div class="alert alert-info text-center">
                <i class="fas fa-info-circle fa-2x mb-3"></i>
                <h5>Veri Bulunamadı</h5>
                <p>Seçilen tarih aralığında ve depoda hiç hareket kaydı bulunmuyor.</p>
            </div>
        `;
        exportBtn.style.display = 'none';
        return;
    }
    
    let html = `
        <div class="mb-3">
            <h6>
                <i class="fas fa-calendar me-2"></i>
                ${formatDate(startDate)} - ${formatDate(endDate)} 
                ${warehouse !== 'all' ? `(${WAREHOUSE_NAMES[warehouse]})` : '(Tüm Depolar)'}
            </h6>
            <small class="text-muted">Toplam ${movements.length} hareket</small>
        </div>
        
        <div class="table-responsive">
            <table class="table table-striped table-hover">
                <thead class="table-dark">
                    <tr>
                        <th>Tarih</th>
                        <th>Ürün</th>
                        <th>İşlem</th>
                        <th>Kaynak</th>
                        <th>Hedef</th>
                        <th>Miktar</th>
                        <th>Kullanıcı</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    movements.forEach(movement => {
        const movementTypeText = {
            'in': 'Giriş',
            'out': 'Çıkış',
            'transfer': 'Transfer'
        }[movement.movement_type] || movement.movement_type;
        
        const sourceText = movement.source_warehouse ? 
            WAREHOUSE_NAMES[movement.source_warehouse] || movement.source_warehouse : '-';
        const targetText = movement.target_warehouse === 'external' ? 'Dış Kullanım' :
            (movement.target_warehouse ? WAREHOUSE_NAMES[movement.target_warehouse] || movement.target_warehouse : '-');
            
        html += `
            <tr>
                <td>${formatDateTime(movement.movement_date)}</td>
                <td>
                    <strong>${movement.product_code}</strong><br>
                    <small class="text-muted">${movement.product_name}</small>
                </td>
                <td>
                    <span class="badge bg-${getMovementTypeBadgeColor(movement.movement_type)}">
                        ${movementTypeText}
                    </span>
                </td>
                <td>${sourceText}</td>
                <td>${targetText}</td>
                <td><strong>${movement.quantity}</strong></td>
                <td>${movement.user_name}</td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    content.innerHTML = html;
    exportBtn.style.display = 'inline-block';
}

// Hareket tipi için badge rengini getir
function getMovementTypeBadgeColor(type) {
    switch (type) {
        case 'in': return 'success';
        case 'out': return 'danger';
        case 'transfer': return 'primary';
        default: return 'secondary';
    }
}

// Raf yönetimi modalını göster
function showShelfManagementModal() {
    const modal = new bootstrap.Modal(document.getElementById('shelfManagementModal'));
    modal.show();
}

// Raf için ürün ara
function searchProductsForShelf() {
    const searchTerm = document.getElementById('shelfProductSearch').value.trim();
    
    if (!searchTerm) {
        alert('Lütfen arama terimi girin!');
        return;
    }
    
    const filteredProducts = stockData.filter(item => 
        item.product_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.shelf_address && item.shelf_address.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    displayShelfProducts(filteredProducts);
}

// Raf ürünlerini görüntüle
function displayShelfProducts(products) {
    const container = document.getElementById('shelfProductsList');
    
    if (products.length === 0) {
        container.innerHTML = `
            <div class="alert alert-warning text-center">
                <i class="fas fa-search fa-2x mb-2"></i>
                <p>Arama kriterlerine uygun ürün bulunamadı.</p>
            </div>
        `;
        return;
    }
    
    let html = '<div class="list-group">';
    
    products.forEach(product => {
        html += `
            <div class="list-group-item">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1">${product.product_code} - ${product.product_name}</h6>
                        <small class="text-muted">
                            Ana Depo: ${product.main_stock || 0} adet
                            ${product.shelf_address ? 
                                `<span class="badge bg-success ms-2"><i class="fas fa-map-marker-alt"></i> ${product.shelf_address}</span>` : 
                                '<span class="badge bg-secondary ms-2">Raf adresi yok</span>'
                            }
                        </small>
                    </div>
                    <button class="btn btn-primary btn-sm" 
                            onclick="editShelfAddress('${product.id}', '${product.product_code}', '${product.product_name}', '${product.shelf_address || ''}')">
                        <i class="fas fa-edit"></i> Düzenle
                    </button>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// Raf adresi düzenleme modalını aç
function editShelfAddress(productId, productCode, productName, currentAddress) {
    const modal = new bootstrap.Modal(document.getElementById('editShelfModal'));
    
    document.getElementById('shelfProductInfo').innerHTML = `
        <strong>${productCode}</strong> - ${productName}
    `;
    document.getElementById('shelfAddress').value = currentAddress;
    
    // Modal'a product ID'yi kaydet
    modal._element.setAttribute('data-product-id', productId);
    
    modal.show();
}

// Raf adresini kaydet
async function saveShelfAddress() {
    const modal = document.getElementById('editShelfModal');
    const productId = modal.getAttribute('data-product-id');
    const shelfAddress = document.getElementById('shelfAddress').value.trim();
    
    try {
        const { error } = await supabase
            .from('stock')
            .update({ shelf_address: shelfAddress || null })
            .eq('id', productId);
            
        if (error) throw error;
        
        // Stok verilerini yenile
        await loadStockData();
        
        // Modal'ı kapat
        bootstrap.Modal.getInstance(modal).hide();
        
        // Raf yönetimi modalındaki listeyi güncelle
        if (document.getElementById('shelfProductSearch').value.trim()) {
            searchProductsForShelf();
        }
        
    } catch (error) {
        console.error('Raf adresi kaydetme hatası:', error);
        alert('Raf adresi kaydedilirken bir hata oluştu: ' + error.message);
    }
}

// Tarih formatlama fonksiyonları
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('tr-TR');
}

function formatDateTime(dateString) {
    return new Date(dateString).toLocaleString('tr-TR');
}

// Excel export (basit CSV olarak)
function exportReport() {
    const table = document.querySelector('#reportContent table');
    if (!table) return;
    
    let csv = '';
    const rows = table.querySelectorAll('tr');
    
    rows.forEach(row => {
        const cols = row.querySelectorAll('th, td');
        const csvRow = Array.from(cols).map(col => 
            '"' + col.textContent.replace(/"/g, '""') + '"'
        ).join(',');
        csv += csvRow + '\n';
    });
    
    // CSV dosyası oluştur ve indir
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'stok-raporu.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
