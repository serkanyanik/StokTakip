// Ana uygulama fonksiyonları

let currentWarehouse;
let stockData = [];

// Database setup kontrol fonksiyonu
async function ensureDatabaseSetup() {
    try {
        // Stock_movements tablosunun varlığını kontrol et
        const { data, error } = await supabase
            .from('stock_movements')
            .select('id')
            .limit(1);

        if (error && error.code === 'PGRST106') {
            alert('Veritabanı tabloları eksik. Lütfen Supabase Dashboard\'da database-updates.sql scriptini çalıştırın.');
            return false;
        }

        return true;
    } catch (error) {
        return false;
    }
}

// Sayfa yüklendiğinde çalışacak
document.addEventListener('DOMContentLoaded', async function () {
    // Initialize currentWarehouse
    currentWarehouse = WAREHOUSE_TYPES.MAIN;

    // Bozuk auth token'ları temizle
    try {
        const { error } = await supabase.auth.getSession();
        if (error && (error.name === 'AuthApiError' || error.__isAuthError)) {
            localStorage.clear();
            sessionStorage.clear();
        }
    } catch (e) {
        // Herhangi bir auth hatası durumunda temizle
        localStorage.clear();
        sessionStorage.clear();
    }

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
    const logoutButtonElement = document.getElementById('logoutBtn');
    if (logoutButtonElement) {
        logoutButtonElement.addEventListener('click', function (e) {
            e.preventDefault();
            logout();
        });
    }

    // Şifre değişikliği butonu
    document.getElementById('changeMyPasswordBtn').addEventListener('click', () => {
        const changePasswordModal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
        changePasswordModal.show();
    });

    // Stok ekleme
    document.getElementById('addStockBtn').addEventListener('click', showAddStockModal);
    document.getElementById('saveStockBtn').addEventListener('click', handleAddStock);

    // Stok çıkarma
    document.getElementById('removeStockBtn').addEventListener('click', function () {
        // Normal modal açılımında ürün seçici aktif olmalı
        const productSelect = document.getElementById('selectProduct');
        const productInfo = document.getElementById('selectedProductInfo');
        const productSelectContainer = productSelect.closest('.mb-3');
        const hiddenProductId = document.getElementById('selectedProductId');

        productSelect.disabled = false;
        productSelect.value = '';
        hiddenProductId.value = '';

        // Ürün seçici container'ını göster
        if (productSelectContainer) {
            productSelectContainer.style.display = 'block';
        }

        if (productInfo) {
            productInfo.style.display = 'none';
        }

        showRemoveStockModal();
    });
    document.getElementById('confirmRemoveBtn').addEventListener('click', handleRemoveStock);

    // Arama çubuğu
    document.getElementById('searchInput').addEventListener('input', async () => {
        await applySearchFilter();
    });

    // Depo adı düzenleme
    document.getElementById('editWarehouseNameBtn').addEventListener('click', showEditWarehouseNameModal);

    // Depo adı kaydetme
    document.getElementById('saveWarehouseNameBtn').addEventListener('click', handleSaveWarehouseName);

    // Raporlar butonu
    document.getElementById('reportsBtn').addEventListener('click', showReportsModal);

    // Rapor modal'ı kapatıldığında içeriği temizle
    document.getElementById('reportsModal').addEventListener('hidden.bs.modal', function () {
        resetReportFilters();
    });

    // İşlem türü değiştiğinde arayüzü güncelle
    document.getElementById('operationType').addEventListener('change', handleOperationTypeChange);

    // Ürün seçildiğinde kaynak depo listesini güncelle
    document.getElementById('selectProduct').addEventListener('change', async function () {
        const operationType = document.getElementById('operationType').value;
        const selectedProductId = this.value;

        if (operationType === 'transfer' && currentUser.is_depo_admin && currentWarehouse === WAREHOUSE_TYPES.MAIN) {
            populateSourceWarehouseOptions();
        }

        // Müşteri satışında ürün seçilirse fiyat ve depo yükle
        if (operationType === 'customer_sale' && selectedProductId) {
            await loadLastSalePrice(selectedProductId);
            if (currentUser.is_depo_admin && currentWarehouse === WAREHOUSE_TYPES.MAIN) {
                autoSelectSourceWarehouse(selectedProductId);
            }
        }
    });

    // Modal kapandığında ürün seçici durumunu sıfırla
    document.getElementById('removeStockModal').addEventListener('hidden.bs.modal', function () {
        const productSelect = document.getElementById('selectProduct');
        const productInfo = document.getElementById('selectedProductInfo');
        const productSelectContainer = productSelect.closest('.mb-3');
        const hiddenProductId = document.getElementById('selectedProductId');

        productSelect.disabled = false;
        productSelect.value = '';
        hiddenProductId.value = '';
        document.getElementById('operationType').value = '';
        document.getElementById('removeQuantity').value = '';
        document.getElementById('targetWarehouse').value = '';
        document.getElementById('salePrice').value = '';

        // Fiyat bilgi mesajını temizle
        const salePriceContainer = document.getElementById('salePriceContainer');
        const infoDiv = salePriceContainer ? salePriceContainer.querySelector('.price-info') : null;
        if (infoDiv) {
            infoDiv.remove();
        }

        // Depo bilgi mesajını temizle
        const sourceContainer = document.getElementById('sourceWarehouseContainer');
        const autoSelectInfo = sourceContainer ? sourceContainer.querySelector('.auto-select-info') : null;
        if (autoSelectInfo) {
            autoSelectInfo.remove();
        }

        // Ürün seçici container'ını göster
        if (productSelectContainer) {
            productSelectContainer.style.display = 'block';
        }

        if (productInfo) {
            productInfo.style.display = 'none';
        }

        // Hedef depo container'ını gizle
        document.getElementById('targetWarehouseContainer').style.display = 'none';
        document.getElementById('sourceWarehouseContainer').style.display = 'none';
    });

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
        updateStockTable();

        // Modal'ı kapat
        bootstrap.Modal.getInstance(document.getElementById('editWarehouseNameModal')).hide();

    } catch (error) {
        alert('Ad kaydedilirken bir hata oluştu: ' + error.message);
    }
}

// Depo adlarını localStorage'a kaydet
function saveWarehouseNamesToStorage() {
    try {
        localStorage.setItem('warehouseNames', JSON.stringify(WAREHOUSE_NAMES));
    } catch (error) {
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
    }
}

async function handleSaveWarehouseName() {
    document.getElementById('searchInput').addEventListener('input', async () => {
        await applySearchFilter();
    });

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
async function showDashboard() {
    document.getElementById('loginScreen').classList.add('d-none');
    document.getElementById('dashboard').classList.remove('d-none');

    // Database setup kontrol et
    const dbSetupOk = await ensureDatabaseSetup();
    if (!dbSetupOk) {
        // Database setup gerekiyor - Supabase Dashboard'da database-updates.sql çalıştırın
    }

    // Kullanıcının varsayılan deposunu ayarla
    setDefaultWarehouseForUser();

    updateUserInfo();
    updateWarehouseCards();
    updateTableHeaders(); // Tablo başlıklarını güncelle
    updateCurrentWarehouseDisplay();
    loadStockData();
    updateButtonVisibility();
}

// Kullanıcının varsayılan deposunu ayarla
function setDefaultWarehouseForUser() {
    if (!currentUser) return;

    // Ana depo sorumlusu ise ana depoda başlat
    if (currentUser.is_depo_admin) {
        currentWarehouse = WAREHOUSE_TYPES.MAIN;
        return;
    }

    // Araç sorumluları için yetkili oldukları ilk depoyu bul
    if (currentUser.is_depo_sorumlu1) {
        currentWarehouse = WAREHOUSE_TYPES.SUB1;
    } else if (currentUser.is_depo_sorumlu2) {
        currentWarehouse = WAREHOUSE_TYPES.SUB2;
    } else if (currentUser.is_depo_sorumlu3) {
        currentWarehouse = WAREHOUSE_TYPES.SUB3;
    } else if (currentUser.is_depo_sorumlu4) {
        currentWarehouse = WAREHOUSE_TYPES.SUB4;
    } else {
        // Hiçbir yetkisi yoksa ana depoya yönlendir (fallback)
        currentWarehouse = WAREHOUSE_TYPES.MAIN;
    }
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

    // Rapor butonunu göster/gizle (sadece ana depo sorumlusu)
    const reportsBtn = document.getElementById('reportsBtn');
    if (currentUser.is_depo_admin) {
        reportsBtn.style.display = 'inline-block';
    } else {
        reportsBtn.style.display = 'none';
    }

    // İstatistik kartlarını göster/gizle (sadece ana depo sorumlusu)
    const statisticsCards = document.getElementById('statisticsCards');
    if (currentUser.is_depo_admin) {
        statisticsCards.style.display = 'block';
    } else {
        statisticsCards.style.display = 'none';
    }

    // Dashboard header'ı göster/gizle (araç sorumlularına gösterme)
    const dashboardHeader = document.querySelector('.dashboard-header');
    if (currentUser.is_depo_admin) {
        dashboardHeader.style.display = 'block';
    } else {
        dashboardHeader.style.display = 'none';
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

// Depo kartı oluştur - Modern Tasarım
function createWarehouseCard(warehouseType) {
    const cardDiv = document.createElement('div');

    const isMainWarehouse = warehouseType === WAREHOUSE_TYPES.MAIN;
    const isActive = warehouseType === currentWarehouse;
    const canAccess = hasWarehouseAccess(warehouseType) || canViewOtherWarehouses();

    // Stok sayısını hesapla
    const warehouseStock = getWarehouseStockSummary(warehouseType);

    // Edit butonu sadece ana depo sorumlusu için
    const editButton = currentUser && currentUser.is_depo_admin ?
        `<button class="btn btn-outline-light btn-sm position-absolute top-0 end-0 m-2" 
                onclick="event.stopPropagation(); editWarehouseName('${warehouseType}')" 
                title="${isMainWarehouse ? 'Ana Depo Adını Düzenle' : 'Araç Adını Düzenle'}">
            <i class="fas fa-edit"></i>
        </button>` : '';

    // Transfer butonu sadece ana depo sorumlusu için
    const transferButton = currentUser && currentUser.is_depo_admin ?
        `<button class="btn btn-primary btn-sm position-absolute bottom-0 end-0 m-2" 
                onclick="event.stopPropagation(); showTransferToWarehouseModal('${warehouseType}')" 
                title="${WAREHOUSE_NAMES[warehouseType]}${isMainWarehouse ? ' için Transfer İşlemleri' : ' Aracına Transfer'}">
            <i class="fas fa-exchange-alt"></i>
        </button>` : '';

    cardDiv.className = `warehouse-card ${isMainWarehouse ? 'main-warehouse' : 'sub-warehouse'} ${isActive ? 'active' : ''}`;

    if (canAccess) {
        cardDiv.onclick = () => selectWarehouse(warehouseType);
        cardDiv.style.cursor = 'pointer';
    } else {
        cardDiv.style.opacity = '0.5';
        cardDiv.style.cursor = 'not-allowed';
    }

    cardDiv.innerHTML = `
        ${editButton}
        ${transferButton}
        <div class="card-content">
            <i class="fas ${isMainWarehouse ? 'fa-warehouse' : 'fa-truck-moving'}"></i>
            <h6>${WAREHOUSE_NAMES[warehouseType]}</h6>
            <div class="stock-summary">
                <span class="product-count">${warehouseStock.productCount} ürün</span>
                <span class="total-stock">${warehouseStock.totalStock} toplam adet</span>
            </div>
        </div>
    `;

    return cardDiv;
}

// Depo stok özetini hesapla
function getWarehouseStockSummary(warehouseType) {
    if (!stockData || stockData.length === 0) {
        return { productCount: 0, totalStock: 0 };
    }

    let productCount = 0;
    let totalStock = 0;

    stockData.forEach(item => {
        const stock = getCurrentWarehouseStock(item, warehouseType);
        if (stock > 0) {
            productCount++;
            totalStock += stock;
        }
    });

    return { productCount, totalStock };
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

    // Mevcut arama varsa tekrar uygula
    const searchInput = document.getElementById('searchInput');
    if (searchInput && searchInput.value.trim()) {
        applySearchFilter();
    }
}

// Mevcut depo bilgisini güncelle
function updateCurrentWarehouseDisplay() {
    const warehouseNameSpan = document.getElementById('currentWarehouseName');
    const editBtn = document.getElementById('editWarehouseNameBtn');

    if (warehouseNameSpan) {
        warehouseNameSpan.textContent = WAREHOUSE_NAMES[currentWarehouse];
    }

    // Body class'larını temizle
    document.body.classList.remove(
        'warehouse-main', 'warehouse-sub1', 'warehouse-sub2', 'warehouse-sub3', 'warehouse-sub4',
        'vehicle-user', 'sub1-user', 'sub2-user', 'sub3-user', 'sub4-user'
    );

    // Depo class'ını ekle
    document.body.classList.add(`warehouse-${currentWarehouse}`);

    // Kullanıcı tipine göre class ekle
    if (!currentUser.is_depo_admin) {
        document.body.classList.add('vehicle-user');

        if (currentUser.is_depo_sorumlu1) {
            document.body.classList.add('sub1-user');
        } else if (currentUser.is_depo_sorumlu2) {
            document.body.classList.add('sub2-user');
        } else if (currentUser.is_depo_sorumlu3) {
            document.body.classList.add('sub3-user');
        } else if (currentUser.is_depo_sorumlu4) {
            document.body.classList.add('sub4-user');
        }
    }

    // Tablo başlıklarını güncelle
    updateTableHeadersForUserType();

    // Ana depo sorumlusu ad düzenleyebilir
    if (editBtn && currentUser.is_depo_admin) {
        editBtn.style.display = 'inline-block';
    } else if (editBtn) {
        editBtn.style.display = 'none';
    }
}

// Kullanıcı tipine göre tablo başlıklarını güncelle
function updateTableHeadersForUserType() {
    if (!currentUser) return;

    // Araç sorumluları için sadece kendi sütunlarını "STOK" olarak göster
    if (currentUser.is_depo_sorumlu1) {
        const header = document.getElementById('sub1WarehouseHeader');
        if (header) header.textContent = 'STOK';
    } else if (currentUser.is_depo_sorumlu2) {
        const header = document.getElementById('sub2WarehouseHeader');
        if (header) header.textContent = 'STOK';
    } else if (currentUser.is_depo_sorumlu3) {
        const header = document.getElementById('sub3WarehouseHeader');
        if (header) header.textContent = 'STOK';
    } else if (currentUser.is_depo_sorumlu4) {
        const header = document.getElementById('sub4WarehouseHeader');
        if (header) header.textContent = 'STOK';
    } else if (currentUser.is_depo_admin) {
        // Ana depo sorumlusu için orijinal araç adlarını göster
        const mainHeader = document.getElementById('mainWarehouseHeader');
        const sub1Header = document.getElementById('sub1WarehouseHeader');
        const sub2Header = document.getElementById('sub2WarehouseHeader');
        const sub3Header = document.getElementById('sub3WarehouseHeader');
        const sub4Header = document.getElementById('sub4WarehouseHeader');

        if (mainHeader) mainHeader.textContent = 'Ana Depo';
        if (sub1Header) sub1Header.textContent = WAREHOUSE_NAMES[WAREHOUSE_TYPES.SUB1];
        if (sub2Header) sub2Header.textContent = WAREHOUSE_NAMES[WAREHOUSE_TYPES.SUB2];
        if (sub3Header) sub3Header.textContent = WAREHOUSE_NAMES[WAREHOUSE_TYPES.SUB3];
        if (sub4Header) sub4Header.textContent = WAREHOUSE_NAMES[WAREHOUSE_TYPES.SUB4];
    }
}

// Arama filtresini uygula (ürün kodu, adı, fiyat ve raf adresi dahil)
async function applySearchFilter() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const rows = document.querySelectorAll('#stockTable tbody tr');
    const otherLocationsContainer = document.getElementById('otherLocationsContainer');

    let hasVisibleRows = false;
    let otherLocationMatches = [];

    if (!searchTerm) {
        // Arama terimi yoksa, tüm satırları göster ve diğer lokasyonları gizle
        rows.forEach(row => {
            row.style.display = '';
        });
        otherLocationsContainer.style.display = 'none';
        return;
    }

    // Önce mevcut tablodaki satırları kontrol et
    rows.forEach(row => {
        const productCode = row.cells[0].textContent.toLowerCase().trim();
        const productName = row.cells[1].textContent.toLowerCase().trim();
        const productPrice = row.cells[2].textContent.toLowerCase();
        const shelfAddress = row.cells[4].textContent.toLowerCase();

        const isMatch = productCode.includes(searchTerm) ||
            productName.includes(searchTerm) ||
            productPrice.includes(searchTerm) ||
            shelfAddress.includes(searchTerm);

        if (isMatch) {
            const currentWarehouseStock = getCurrentRowStock(row);

            if (currentWarehouseStock > 0) {
                row.style.display = '';
                hasVisibleRows = true;
            } else {
                row.style.display = 'none';
                const otherStocks = getOtherLocationStocks(row);

                if (otherStocks.length > 0) {
                    const productCode = row.cells[0].textContent.trim();

                    // stockData'dan ürün bilgisini bul
                    const productData = stockData.find(item => item.product_code === productCode);

                    otherLocationMatches.push({
                        productCode: productCode,
                        productName: row.cells[1].textContent.trim(),
                        productPrice: productData ? productData.product_price : null,
                        imageUrl: productData ? productData.product_image_url : null,
                        currentStock: currentWarehouseStock,
                        stocks: otherStocks
                    });
                }
            }
        } else {
            row.style.display = 'none';
        }
    });

    // Mevcut tabloda eşleşme yoksa, tüm veritabanında ara
    if (!hasVisibleRows && otherLocationMatches.length === 0) {
        // Eğer mevcut depoda sonuç bulunamadıysa, diğer depolarda ara
        try {
            const { data: allProducts, error } = await supabase
                .from('stock')
                .select('product_code, product_name, main_stock, sub1_stock, sub2_stock, sub3_stock, sub4_stock, product_image_url, product_price')
                .or(`product_code.ilike.%${searchTerm}%,product_name.ilike.%${searchTerm}%`);

            if (error) throw error;

            // Mevcut depoda stoku olmayan ama diğer depolarda stoku olan ürünleri bul
            allProducts.forEach(product => {
                // Mevcut depodaki stok
                let currentStock = 0;
                switch (currentWarehouse) {
                    case WAREHOUSE_TYPES.MAIN:
                        currentStock = product.main_stock || 0;
                        break;
                    case WAREHOUSE_TYPES.SUB1:
                        currentStock = product.sub1_stock || 0;
                        break;
                    case WAREHOUSE_TYPES.SUB2:
                        currentStock = product.sub2_stock || 0;
                        break;
                    case WAREHOUSE_TYPES.SUB3:
                        currentStock = product.sub3_stock || 0;
                        break;
                    case WAREHOUSE_TYPES.SUB4:
                        currentStock = product.sub4_stock || 0;
                        break;
                }

                // Eğer mevcut depoda stok yoksa, diğer depolarda olup olmadığını kontrol et
                if (currentStock === 0) {
                    const otherStocks = [];

                    if (currentWarehouse !== WAREHOUSE_TYPES.MAIN && product.main_stock > 0) {
                        otherStocks.push({
                            location: WAREHOUSE_NAMES[WAREHOUSE_TYPES.MAIN],
                            stock: product.main_stock,
                            type: WAREHOUSE_TYPES.MAIN
                        });
                    }
                    if (currentWarehouse !== WAREHOUSE_TYPES.SUB1 && product.sub1_stock > 0) {
                        otherStocks.push({
                            location: WAREHOUSE_NAMES[WAREHOUSE_TYPES.SUB1],
                            stock: product.sub1_stock,
                            type: WAREHOUSE_TYPES.SUB1
                        });
                    }
                    if (currentWarehouse !== WAREHOUSE_TYPES.SUB2 && product.sub2_stock > 0) {
                        otherStocks.push({
                            location: WAREHOUSE_NAMES[WAREHOUSE_TYPES.SUB2],
                            stock: product.sub2_stock,
                            type: WAREHOUSE_TYPES.SUB2
                        });
                    }
                    if (currentWarehouse !== WAREHOUSE_TYPES.SUB3 && product.sub3_stock > 0) {
                        otherStocks.push({
                            location: WAREHOUSE_NAMES[WAREHOUSE_TYPES.SUB3],
                            stock: product.sub3_stock,
                            type: WAREHOUSE_TYPES.SUB3
                        });
                    }
                    if (currentWarehouse !== WAREHOUSE_TYPES.SUB4 && product.sub4_stock > 0) {
                        otherStocks.push({
                            location: WAREHOUSE_NAMES[WAREHOUSE_TYPES.SUB4],
                            stock: product.sub4_stock,
                            type: WAREHOUSE_TYPES.SUB4
                        });
                    }

                    if (otherStocks.length > 0) {
                        otherLocationMatches.push({
                            productCode: product.product_code,
                            productName: product.product_name,
                            imageUrl: product.product_image_url,
                            productPrice: product.product_price,
                            currentStock: 0,
                            stocks: otherStocks
                        });
                    }
                }
            });

        } catch (error) {
        }
    }

    // Diğer lokasyonlar sonuçlarını göster
    if (otherLocationMatches.length > 0) {
        showOtherLocationResults(otherLocationMatches);
        otherLocationsContainer.style.display = 'block';
    } else {
        otherLocationsContainer.style.display = 'none';
    }
}

// Mevcut satırdaki stok miktarını al (kullanıcının bulunduğu depo/araç)
function getCurrentRowStock(row) {
    let stockColumnIndex;

    // Kullanıcının bulunduğu depoya göre sütun belirle
    switch (currentWarehouse) {
        case WAREHOUSE_TYPES.MAIN:
            stockColumnIndex = 5; // Ana Depo sütunu
            break;
        case WAREHOUSE_TYPES.SUB1:
            stockColumnIndex = 6; // 1. Araç sütunu
            break;
        case WAREHOUSE_TYPES.SUB2:
            stockColumnIndex = 7; // 2. Araç sütunu
            break;
        case WAREHOUSE_TYPES.SUB3:
            stockColumnIndex = 8; // 3. Araç sütunu
            break;
        case WAREHOUSE_TYPES.SUB4:
            stockColumnIndex = 9; // 4. Araç sütunu
            break;
        default:
            stockColumnIndex = 5;
    }

    const stockText = row.cells[stockColumnIndex].textContent.trim();
    const stockValue = parseInt(stockText) || 0;
    return stockValue;
}

// Diğer lokasyonlardaki stokları al
function getOtherLocationStocks(row) {
    const stocks = [];
    const warehouseColumns = [
        { index: 5, type: WAREHOUSE_TYPES.MAIN, name: WAREHOUSE_NAMES[WAREHOUSE_TYPES.MAIN] },
        { index: 6, type: WAREHOUSE_TYPES.SUB1, name: WAREHOUSE_NAMES[WAREHOUSE_TYPES.SUB1] },
        { index: 7, type: WAREHOUSE_TYPES.SUB2, name: WAREHOUSE_NAMES[WAREHOUSE_TYPES.SUB2] },
        { index: 8, type: WAREHOUSE_TYPES.SUB3, name: WAREHOUSE_NAMES[WAREHOUSE_TYPES.SUB3] },
        { index: 9, type: WAREHOUSE_TYPES.SUB4, name: WAREHOUSE_NAMES[WAREHOUSE_TYPES.SUB4] }
    ];

    warehouseColumns.forEach(warehouse => {
        if (warehouse.type !== currentWarehouse) {
            const stockText = row.cells[warehouse.index].textContent.trim();
            const stock = parseInt(stockText) || 0;
            if (stock > 0) {
                stocks.push({
                    location: warehouse.name,
                    stock: stock,
                    type: warehouse.type
                });
            }
        }
    });

    return stocks;
}

// Diğer lokasyon sonuçlarını göster
function showOtherLocationResults(matches) {
    const content = document.getElementById('otherLocationsContent');
    let html = '';

    // SADECE mevcut lokasyonda stoku 0 olan ürünleri göster
    const filteredMatches = matches.filter(match => match.currentStock === 0);

    if (filteredMatches.length === 0) {
        return;
    }

    filteredMatches.forEach(match => {
        html += `
            <div class="other-location-item">
                <div class="row">
                    <div class="col-md-3">
                        ${match.imageUrl ?
                `<img src="${match.imageUrl}" alt="${match.productName}" class="img-fluid rounded" 
                                 style="max-height: 80px; max-width: 80px; object-fit: cover; cursor: pointer;" 
                                 onclick="openImageModal('${match.imageUrl}', '${match.productName}')">` :
                `<div class="bg-light rounded d-flex align-items-center justify-content-center" style="height: 80px; width: 80px;">
                                <i class="fas fa-box text-muted"></i>
                            </div>`
            }
                    </div>
                    <div class="col-md-9">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <div>
                                <strong class="text-primary">${match.productCode}</strong>
                                <span class="badge bg-warning text-dark ms-2">
                                    <i class="fas fa-exclamation-triangle me-1"></i>
                                    Bu ürün sizde yok
                                </span>
                            </div>
                        </div>
                        <h6 class="mb-2">${match.productName}</h6>
                        ${match.productPrice ?
                `<div class="mb-2">
                                <span class="badge bg-success text-white px-3 py-2" style="font-size: 0.9rem; font-weight: 600;">
                                    Fiyat: ${parseFloat(match.productPrice).toFixed(2)} ₺
                                </span>
                            </div>` :
                `<div class="mb-2">
                                <span class="badge bg-secondary">
                                    <i class="fas fa-info-circle me-1"></i>
                                    Fiyat bilgisi yok
                                </span>
                            </div>`
            }
                        <div class="d-flex flex-wrap gap-2 mt-2">
        `;

        match.stocks.forEach(stock => {
            const badgeClass = stock.type === WAREHOUSE_TYPES.MAIN ? 'bg-primary' : 'bg-success';
            const icon = stock.type === WAREHOUSE_TYPES.MAIN ? 'fas fa-warehouse' : 'fas fa-truck';
            html += `
                <span class="badge ${badgeClass} px-3 py-2">
                    <i class="${icon} me-1"></i>
                    ${stock.location}: <strong>${stock.stock} adet</strong>
                </span>
            `;
        });

        html += `
                        </div>
                        <div class="text-muted mt-2 small">
                            <i class="fas fa-info-circle me-1"></i>
                            Bu ürünü almak için ana lokasyon sorumlusu Serkan Bey ile iletişime geçin.
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    content.innerHTML = html;
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
        updateWarehouseCards();

    } catch (error) {
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
    const createTransferDropdown = () => {
        if (!currentUser.is_depo_admin || (item.main_stock || 0) <= 0) {
            return '';
        }

        const dropdownId = `transferDropdown_${item.id}`;

        return `
            <div class="dropdown">
                <button class="btn btn-primary btn-sm" 
                        type="button" 
                        data-bs-toggle="dropdown" 
                        aria-expanded="false"
                        title="Transfer seçenekleri">
                    <i class="fas fa-arrow-right"></i>
                </button>
                <ul class="dropdown-menu dropdown-menu-end">
                    <li><h6 class="dropdown-header">Hangi araca transfer?</h6></li>
                    <li><button class="dropdown-item" onclick="quickTransfer('${item.id}', 'main', 'sub1')">
                        <i class="fas fa-truck me-2"></i>${WAREHOUSE_NAMES.sub1}
                    </button></li>
                    <li><button class="dropdown-item" onclick="quickTransfer('${item.id}', 'main', 'sub2')">
                        <i class="fas fa-truck me-2"></i>${WAREHOUSE_NAMES.sub2}
                    </button></li>
                    <li><button class="dropdown-item" onclick="quickTransfer('${item.id}', 'main', 'sub3')">
                        <i class="fas fa-truck me-2"></i>${WAREHOUSE_NAMES.sub3}
                    </button></li>
                    <li><button class="dropdown-item" onclick="quickTransfer('${item.id}', 'main', 'sub4')">
                        <i class="fas fa-truck me-2"></i>${WAREHOUSE_NAMES.sub4}
                    </button></li>
                </ul>
            </div>
        `;
    };

    // Inline edit fonksiyonu
    const createEditableField = (fieldName, value, displayValue = null) => {
        if (!currentUser.is_depo_admin) {
            return displayValue || value || '-';
        }

        // value'yu string'e çevir ve güvenli hale getir
        const safeValue = String(value || '').replace(/'/g, '&#39;').replace(/"/g, '&quot;');

        return `<span class="editable-field" 
                      onclick="editField('${item.id}', '${fieldName}', '${safeValue}', this)" 
                      title="Düzenlemek için tıklayın">
                    ${displayValue || value || '<i class="fas fa-plus text-muted"></i> Ekle'}
                </span>`;
    };

    // Ürün görseli için özel buton
    const createImageButton = (imageUrl) => {
        if (!imageUrl) {
            return currentUser.is_depo_admin ?
                `<button class="btn btn-outline-secondary btn-sm" onclick="editField('${item.id}', 'product_image_url', '', this)" title="Görsel ekle">
                    <i class="fas fa-plus"></i>
                </button>` :
                '<span class="text-muted">-</span>';
        }
        // Güvenli string dönüşümü
        const safeImageUrl = String(imageUrl || '').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
        const safeProductName = String(item.product_name || '').replace(/'/g, '&#39;').replace(/"/g, '&quot;');

        return `<button class="btn btn-primary btn-sm" onclick="showProductImage('${safeImageUrl}', '${safeProductName}')" title="Görseli görüntüle">
                    <i class="fas fa-image"></i>
                </button>
                ${currentUser.is_depo_admin ?
                `<button class="btn btn-outline-secondary btn-sm ms-1" onclick="editField('${item.id}', 'product_image_url', '${safeImageUrl}', this)" title="Görsel URL'ini düzenle">
                        <i class="fas fa-edit"></i>
                    </button>` : ''
            }`;
    };

    // Fiyat formatı
    const formatPrice = (price) => {
        if (!price) return null;
        return parseFloat(price).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
    };

    row.innerHTML = `
        <td>${createEditableField('product_code', item.product_code)}</td>
        <td>${createEditableField('product_name', item.product_name)}</td>
        <td>${createEditableField('product_price', item.product_price, formatPrice(item.product_price))}</td>
        <td>${createImageButton(item.product_image_url)}</td>
        <td class="shelf-address-column">
            <span class="shelf-address" onclick="editShelfAddress('${item.id}', '${String(item.product_code || '').replace(/'/g, '&#39;')}', '${String(item.product_name || '').replace(/'/g, '&#39;')}', '${String(item.shelf_address || '').replace(/'/g, '&#39;')}')" 
                  title="Raf adresini düzenle">
                ${item.shelf_address ? `<i class="fas fa-map-marker-alt text-success me-1"></i>${item.shelf_address}` : '<i class="fas fa-plus text-muted"></i> Raf Ekle'}
            </span>
        </td>
        <td class="warehouse-column main-warehouse">
            <span class="stock-count ${getStockClass(item.main_stock)}">${item.main_stock || 0}</span>
        </td>
        <td class="warehouse-column sub1-warehouse">
            <span class="stock-count ${getStockClass(item.sub1_stock)}">${item.sub1_stock || 0}</span>
        </td>
        <td class="warehouse-column sub2-warehouse">
            <span class="stock-count ${getStockClass(item.sub2_stock)}">${item.sub2_stock || 0}</span>
        </td>
        <td class="warehouse-column sub3-warehouse">
            <span class="stock-count ${getStockClass(item.sub3_stock)}">${item.sub3_stock || 0}</span>
        </td>
        <td class="warehouse-column sub4-warehouse">
            <span class="stock-count ${getStockClass(item.sub4_stock)}">${item.sub4_stock || 0}</span>
        </td>
        <td class="warehouse-column total-column"><strong>${total}</strong></td>
        <td class="actions-column">
            <div class="d-flex flex-wrap gap-1">
                ${createTransferDropdown()}
                ${canRemoveStock(currentWarehouse) ?
            `<button class="btn btn-warning btn-sm" onclick="quickRemoveStock('${item.id}')" title="Stok işlemleri">
                        <i class="fas fa-minus"></i>
                    </button>` : ''
        }
                ${currentUser.is_depo_admin ?
            `<button class="btn btn-danger btn-sm" onclick="showDeleteProductModal('${item.id}')" title="Ürünü sil">
                        <i class="fas fa-trash"></i>
                    </button>` : ''
        }
                ${!canRemoveStock(currentWarehouse) && !currentUser.is_depo_admin &&
            currentWarehouse !== 'main' ?
            '<span class="text-muted">-</span>' : ''
        }
            </div>
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

// Inline alan düzenleme
async function editField(productId, fieldName, currentValue, element) {
    if (!currentUser.is_depo_admin) {
        alert('Bu işlem için yetkiniz yok!');
        return;
    }

    const fieldLabels = {
        'product_code': 'Ürün Kodu',
        'product_name': 'Ürün Adı',
        'product_price': 'Fiyat (TL)',
        'product_image_url': 'Görsel URL'
    };

    const fieldLabel = fieldLabels[fieldName] || fieldName;
    let inputType = 'text';
    let step = null;

    if (fieldName === 'product_price') {
        inputType = 'number';
        step = '0.01';
    } else if (fieldName === 'product_image_url') {
        inputType = 'url';
    }

    const newValue = prompt(
        `${fieldLabel} düzenleyin:`,
        currentValue || ''
    );

    if (newValue === null) return; // İptal edildi

    // Validation
    if (fieldName === 'product_code' && newValue.trim() === '') {
        alert('Ürün kodu boş olamaz!');
        return;
    }

    if (fieldName === 'product_name' && newValue.trim() === '') {
        alert('Ürün adı boş olamaz!');
        return;
    }

    if (fieldName === 'product_price' && newValue && isNaN(parseFloat(newValue))) {
        alert('Geçerli bir fiyat girin!');
        return;
    }

    if (fieldName === 'product_image_url' && newValue) {
        try {
            new URL(newValue);
        } catch (e) {
            alert('Geçerli bir URL girin!');
            return;
        }
    }

    try {
        const updateData = {};
        if (fieldName === 'product_price') {
            updateData[fieldName] = newValue ? parseFloat(newValue) : null;
        } else {
            updateData[fieldName] = newValue.trim() || null;
        }

        const { error } = await supabase
            .from('stock')
            .update(updateData)
            .eq('id', productId);

        if (error) throw error;

        // Tabloyu yeniden yükle
        await loadStockData();

        // Başarı durumunda sessizce güncelle

    } catch (error) {
        alert('Güncelleme sırasında bir hata oluştu: ' + error.message);
    }
}

// Ürün görseli gösterme
function showProductImage(imageUrl, productName) {
    document.getElementById('productImageModalTitle').textContent = productName;
    document.getElementById('productImagePreview').src = imageUrl;
    document.getElementById('productImagePreview').alt = productName;

    new bootstrap.Modal(document.getElementById('productImageModal')).show();
}

// Ürün silme modalını göster
function showDeleteProductModal(productId) {
    const item = stockData.find(s => s.id === productId);
    if (!item) {
        alert('Ürün bulunamadı!');
        return;
    }

    const total = (item.main_stock || 0) +
        (item.sub1_stock || 0) +
        (item.sub2_stock || 0) +
        (item.sub3_stock || 0) +
        (item.sub4_stock || 0);

    document.getElementById('deleteProductName').textContent = item.product_name;
    document.getElementById('deleteProductCode').textContent = item.product_code;
    document.getElementById('deleteProductTotalStock').textContent = total;
    document.getElementById('deleteConfirmText').value = '';

    // Silme butonunu deaktif et
    document.getElementById('confirmDeleteBtn').disabled = true;

    // Onay metni kontrolü
    const confirmInput = document.getElementById('deleteConfirmText');
    const deleteBtn = document.getElementById('confirmDeleteBtn');

    confirmInput.oninput = function () {
        deleteBtn.disabled = this.value.toUpperCase() !== 'SİL';
    };

    // Modal açarken productId'yi sakla
    window.currentDeleteProductId = productId;

    new bootstrap.Modal(document.getElementById('deleteProductModal')).show();
}

// Ürün silmeyi onayla
async function confirmDeleteProduct() {
    const productId = window.currentDeleteProductId;
    if (!productId) return;

    try {
        const { error } = await supabase
            .from('stock')
            .delete()
            .eq('id', productId);

        if (error) throw error;

        // Modal'ı kapat
        bootstrap.Modal.getInstance(document.getElementById('deleteProductModal')).hide();

        // Tabloyu yeniden yükle
        await loadStockData();

        // Başarı durumunda sessizce sil

    } catch (error) {
        alert('Ürün silinirken bir hata oluştu: ' + error.message);
    }
}

// Hızlı stok çıkarma
async function quickRemoveStock(stockId) {
    const item = stockData.find(s => s.id === stockId);
    if (!item) return;

    // Ürünü seç ve hidden input'a da yaz
    const productSelect = document.getElementById('selectProduct');
    const hiddenProductId = document.getElementById('selectedProductId');

    productSelect.value = stockId;
    hiddenProductId.value = stockId;

    // Transfer işlemini varsayılan olarak seç
    document.getElementById('operationType').value = 'transfer';

    // Varsayılan miktar 1 yap
    const quantityInput = document.getElementById('removeQuantity');
    if (quantityInput) {
        quantityInput.value = '1';
    }

    // Ürün bilgisini görsel olarak göster ve ürün seçici alanını gizle
    const productInfo = document.getElementById('selectedProductInfo');
    const productSelectContainer = productSelect.closest('.mb-3');

    if (productInfo) {
        productInfo.innerHTML = `
            <div class="alert alert-info mb-3">
                <strong>Seçili Ürün:</strong> ${item.product_name} (${item.product_code})
            </div>
        `;
        productInfo.style.display = 'block';
    }

    // Ürün seçici container'ını gizle
    if (productSelectContainer) {
        productSelectContainer.style.display = 'none';
    }

    showRemoveStockModal();
    // İşlem türü değişikliğini tetikle
    handleOperationTypeChange();

    // Eğer müşteri satışı seçilirse son satış fiyatını getir
    if (document.getElementById('operationType').value === 'customer_sale') {
        await loadLastSalePrice(stockId);
    }

    // Kaynak depo listesini güncelle (transfer modunda)
    if (currentUser.is_depo_admin && currentWarehouse === WAREHOUSE_TYPES.MAIN) {
        populateSourceWarehouseOptions();
    }
}

// Son satış fiyatını getir ve otomatik doldur
async function loadLastSalePrice(stockId) {
    try {

        // 1. Önce ürünün ana tablosundaki GÜNCEL fiyatını al (en güncel fiyat)
        const stockItem = stockData.find(item => item.id === stockId);
        let currentPrice = null;
        if (stockItem && stockItem.product_price) {
            currentPrice = parseFloat(stockItem.product_price);
        }

        // 2. Son satış fiyatını da al (referans için)
        const { data: movements, error } = await supabase
            .from('stock_movements')
            .select('sale_price, created_at')
            .eq('product_id', stockId)
            .in('target_warehouse', ['customer', 'external'])
            .eq('movement_type', 'out')
            .not('sale_price', 'is', null)
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) {
        }

        let lastSalePrice = null;
        let lastSaleDate = null;
        if (movements && movements.length > 0) {
            lastSalePrice = movements[0].sale_price;
            lastSaleDate = new Date(movements[0].created_at);
        }

        const salePriceInput = document.getElementById('salePrice');
        if (salePriceInput) {
            // 3. Öncelik sırası: Güncel ana tablo fiyatı > Son satış fiyatı
            const finalPrice = currentPrice || lastSalePrice;

            if (finalPrice && finalPrice > 0) {
                salePriceInput.value = finalPrice;

                // Bilgi mesajı
                const salePriceContainer = document.getElementById('salePriceContainer');
                let infoDiv = salePriceContainer.querySelector('.price-info');
                if (!infoDiv) {
                    infoDiv = document.createElement('small');
                    infoDiv.className = 'price-info text-muted d-block mt-1';
                    salePriceContainer.appendChild(infoDiv);
                }

                if (currentPrice) {
                    infoDiv.textContent = 'Güncel liste fiyatı';
                    if (lastSalePrice && lastSalePrice !== currentPrice) {
                        infoDiv.textContent += ` (Son satış: ${lastSalePrice}₺)`;
                    }
                } else if (lastSalePrice) {
                    infoDiv.textContent = `Son satış: ${lastSaleDate.toLocaleDateString('tr-TR')}`;
                }
            } else {
            }
        }
    } catch (error) {
    }
}

// Otomatik kaynak depo seçimi
function autoSelectSourceWarehouse(stockId) {
    try {
        const item = stockData.find(s => s.id === stockId);
        if (!item) {
            return;
        }

        const sourceWarehouseSelect = document.getElementById('sourceWarehouse');
        if (!sourceWarehouseSelect) {
            return;
        }

        // Mevcut stokları kontrol et
        const availableWarehouses = [];
        Object.entries(WAREHOUSE_TYPES).forEach(([key, warehouseType]) => {
            const stock = getCurrentWarehouseStock(item, warehouseType);
            if (stock > 0) {
                availableWarehouses.push({
                    type: warehouseType,
                    stock: stock,
                    name: WAREHOUSE_NAMES[warehouseType]
                });
            }
        });


        if (availableWarehouses.length === 1) {
            // Tek depoda stok varsa otomatik seç
            sourceWarehouseSelect.value = availableWarehouses[0].type;

            // Kullanıcıya bilgi ver
            const sourceContainer = document.getElementById('sourceWarehouseContainer');
            let infoDiv = sourceContainer.querySelector('.auto-select-info');
            if (!infoDiv) {
                infoDiv = document.createElement('small');
                infoDiv.className = 'auto-select-info text-success d-block mt-1';
                sourceContainer.appendChild(infoDiv);
            }
            infoDiv.textContent = `Otomatik seçildi: ${availableWarehouses[0].name} (${availableWarehouses[0].stock} adet)`;

        } else if (availableWarehouses.length > 1) {
            // Birden fazla depoda stok varsa bilgi ver
            const sourceContainer = document.getElementById('sourceWarehouseContainer');
            let infoDiv = sourceContainer.querySelector('.auto-select-info');
            if (!infoDiv) {
                infoDiv = document.createElement('small');
                infoDiv.className = 'auto-select-info text-warning d-block mt-1';
                sourceContainer.appendChild(infoDiv);
            }
            infoDiv.textContent = `Bu ürün ${availableWarehouses.length} depoda mevcut. Lütfen kaynak depo seçin.`;

        } else {
            // Hiçbir depoda stok yok
            const sourceContainer = document.getElementById('sourceWarehouseContainer');
            let infoDiv = sourceContainer.querySelector('.auto-select-info');
            if (!infoDiv) {
                infoDiv = document.createElement('small');
                infoDiv.className = 'auto-select-info text-danger d-block mt-1';
                sourceContainer.appendChild(infoDiv);
            }
            infoDiv.textContent = 'Bu ürün hiçbir depoda stokta yok!';
        }
    } catch (error) {
    }
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

        await loadStockData();

    } catch (error) {
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
    // Yetki kontrolü - Sadece ana depo sorumlusu stok ekleyebilir
    if (!currentUser.is_depo_admin) {
        alert('Bu işlem için yetkiniz yok! Sadece ana depo sorumlusu stok ekleyebilir.');
        return;
    }

    const productCode = document.getElementById('productCode').value.trim();
    const productName = document.getElementById('productName').value.trim();
    const productPrice = document.getElementById('productPrice').value.trim();
    const productImageUrl = document.getElementById('productImageUrl').value.trim();
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

    // Fiyat kontrolü
    if (productPrice && isNaN(parseFloat(productPrice))) {
        alert('Geçerli bir fiyat girin!');
        return;
    }

    // URL kontrolü
    if (productImageUrl) {
        try {
            new URL(productImageUrl);
        } catch (e) {
            alert('Geçerli bir görsel URL girin!');
            return;
        }
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

            // Fiyat ve görsel bilgisi varsa güncelle
            if (productPrice) {
                updates.product_price = parseFloat(productPrice);
            }
            if (productImageUrl) {
                updates.product_image_url = productImageUrl;
            }

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

        } else {
            // Yeni ürün ekle
            const newProduct = {
                product_code: productCode.toUpperCase(),
                product_name: productName,
                product_price: productPrice ? parseFloat(productPrice) : null,
                product_image_url: productImageUrl || null,
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

        }

        bootstrap.Modal.getInstance(document.getElementById('addStockModal')).hide();
        await loadStockData();

    } catch (error) {
        alert('Stok eklenirken bir hata oluştu: ' + error.message);
    }
}

// İşlem türü değiştiğinde arayüzü güncelle
function handleOperationTypeChange() {
    const operationType = document.getElementById('operationType').value;
    const quantityLabel = document.getElementById('quantityLabel');
    const targetWarehouseContainer = document.getElementById('targetWarehouseContainer');
    const targetWarehouseLabel = document.getElementById('targetWarehouseLabel');
    const confirmBtn = document.getElementById('confirmRemoveBtn');
    const sourceContainer = document.getElementById('sourceWarehouseContainer');
    const salePriceContainer = document.getElementById('salePriceContainer');
    const formInfoContainer = document.getElementById('formInfoContainer');

    if (operationType === 'add') {
        // Stok girişi modu
        quantityLabel.textContent = 'Giriş Miktarı';
        targetWarehouseLabel.textContent = 'Giriş Yapılacak Depo';
        confirmBtn.textContent = 'Stok Girişi Yap';
        confirmBtn.className = 'btn btn-success';

        // Kaynak depo gizle (stok girişinde kaynak yok)
        sourceContainer.style.display = 'none';

        // Fiyat alanını gizle (stok girişinde fiyat yok)
        salePriceContainer.style.display = 'none';

        // Form bilgisi alanını gizle
        if (formInfoContainer) {
            formInfoContainer.style.display = 'none';
        }

        // Hedef depo container'ını göster
        targetWarehouseContainer.style.display = 'block';

        populateWarehouseOptionsForEntry();

    } else if (operationType === 'transfer') {
        // Transfer/çıkış modu
        quantityLabel.textContent = 'Transfer Miktarı';
        targetWarehouseLabel.textContent = 'Hedef Depo';
        confirmBtn.textContent = 'Transfer/Çıkış Yap';
        confirmBtn.className = 'btn btn-warning';

        // Kaynak depo göster (ana depo admin için)
        if (currentUser.is_depo_admin && currentWarehouse === WAREHOUSE_TYPES.MAIN) {
            sourceContainer.style.display = 'block';
            populateSourceWarehouseOptions();
            setupSourceWarehouseListener();
        } else {
            sourceContainer.style.display = 'none';
        }

        // Fiyat alanını gizle (transfer işleminde fiyat yok)
        salePriceContainer.style.display = 'none';

        // Form bilgisi alanını gizle
        if (formInfoContainer) {
            formInfoContainer.style.display = 'none';
        }

        // Hedef depo container'ını göster
        targetWarehouseContainer.style.display = 'block';

        populateWarehouseOptions();

    } else if (operationType === 'customer_sale') {
        // Müşteri satışı modu
        quantityLabel.textContent = 'Satış Miktarı';
        targetWarehouseLabel.textContent = 'Satış Bilgisi';
        confirmBtn.textContent = 'Müşteri Satışı Yap';
        confirmBtn.className = 'btn btn-danger';

        // Kaynak depo göster (ana depo admin için)
        if (currentUser.is_depo_admin && currentWarehouse === WAREHOUSE_TYPES.MAIN) {
            sourceContainer.style.display = 'block';
            populateSourceWarehouseOptions();
            setupSourceWarehouseListener();
        } else {
            sourceContainer.style.display = 'none';
        }

        // Satış fiyatı alanını göster
        salePriceContainer.style.display = 'block';

        // Form bilgisi alanını göster
        const formInfoContainer = document.getElementById('formInfoContainer');
        if (formInfoContainer) {
            formInfoContainer.style.display = 'block';
        }

        // Hedef depo container'ını gizle (müşteri seçimi gerekmiyor)
        targetWarehouseContainer.style.display = 'none';

        // Varsayılan satış miktarını 1 yap
        const quantityInput = document.getElementById('removeQuantity');
        if (quantityInput && !quantityInput.value) {
            quantityInput.value = '1';
        }

        // Seçili ürün varsa son satış fiyatını yükle
        const selectedProductId = document.getElementById('selectedProductId').value;
        if (selectedProductId) {
            loadLastSalePrice(selectedProductId);

            // Otomatik kaynak depo seçimi (ana depo admin için)
            if (currentUser.is_depo_admin && currentWarehouse === WAREHOUSE_TYPES.MAIN) {
                autoSelectSourceWarehouse(selectedProductId);
            }
        }

    } else {
        // Hiçbir işlem seçilmemiş
        targetWarehouseContainer.style.display = 'none';
        salePriceContainer.style.display = 'none';
        confirmBtn.textContent = 'İşlemi Gerçekleştir';
        confirmBtn.className = 'btn btn-primary';
    }
}


// Stok girişi için depo seçenekleri (sadece mevcut depolara giriş)
function populateWarehouseOptionsForEntry() {
    const select = document.getElementById('targetWarehouse');
    select.innerHTML = '<option value="">Giriş yapılacak depo seçiniz...</option>';

    // Mevcut kullanıcının yetkisine göre depolar
    if (currentUser.is_depo_admin) {
        // Ana depo admin - tüm depolara giriş yapabilir
        Object.entries(WAREHOUSE_NAMES).forEach(([key, name]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = name;
            select.appendChild(option);
        });
    } else {
        // Normal kullanıcı - sadece kendi deposuna giriş
        const option = document.createElement('option');
        option.value = currentWarehouse;
        option.textContent = WAREHOUSE_NAMES[currentWarehouse];
        select.appendChild(option);
    }
}

// Stok çıkarma modalını göster
async function showRemoveStockModal() {
    const productSelect = document.getElementById('selectProduct');

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

    // İşlem türü sıfırla (sadece quickRemove değilse)
    const productSelectContainer = productSelect.closest('.mb-3');
    if (productSelectContainer && productSelectContainer.style.display !== 'none') {
        // Normal modal açılımı - işlem türünü sıfırla
        document.getElementById('operationType').value = '';
    }

    document.getElementById('targetWarehouseContainer').style.display = 'none';

    // Ana depo sorumlusu ve ana depo seçiliyse kaynak depo seçimini gizle (başlangıçta)
    const sourceContainer = document.getElementById('sourceWarehouseContainer');
    sourceContainer.style.display = 'none';

    // Sadece ürün seçici görünürse ürün seçeneklerini doldur
    if (productSelectContainer && productSelectContainer.style.display !== 'none') {
        populateProductOptions();
    }

    new bootstrap.Modal(document.getElementById('removeStockModal')).show();
}// Ürün seçeneklerini doldur
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
    const selectedProductId = document.getElementById('selectedProductId').value || document.getElementById('selectProduct').value;

    select.innerHTML = '<option value="">Kaynak depo seçiniz...</option>';

    if (!selectedProductId) {
        // Ürün seçilmemişse tüm depoları göster
        Object.entries(WAREHOUSE_TYPES).forEach(([key, warehouseType]) => {
            const option = document.createElement('option');
            option.value = warehouseType;
            option.textContent = WAREHOUSE_NAMES[warehouseType];
            select.appendChild(option);
        });
        return;
    }

    // Seçili ürünü bul
    const selectedProduct = stockData.find(item => item.id === selectedProductId);
    if (!selectedProduct) return;

    // Stoğu olan depoları listele
    let hasStock = false;
    Object.entries(WAREHOUSE_TYPES).forEach(([key, warehouseType]) => {
        const stock = getCurrentWarehouseStock(selectedProduct, warehouseType);
        if (stock > 0) {
            hasStock = true;
            const option = document.createElement('option');
            option.value = warehouseType;
            option.textContent = `${WAREHOUSE_NAMES[warehouseType]} (${stock} adet)`;
            select.appendChild(option);
        }
    });

    // Hiçbir depoda stok yoksa
    if (!hasStock) {
        const option = document.createElement('option');
        option.value = "";
        option.textContent = "Stokta ürün yok";
        option.disabled = true;
        select.appendChild(option);
    }
}

// Kaynak depo değiştiğinde ürün listesini güncelle
function setupSourceWarehouseListener() {
    const sourceSelect = document.getElementById('sourceWarehouse');
    sourceSelect.addEventListener('change', function () {
        const selectedWarehouse = this.value;
        const productSelectContainer = document.getElementById('selectProduct').closest('.mb-3');

        // Ürün seçici gizliyse (quickRemove durumu) ürün listesini değiştirme
        if (productSelectContainer && productSelectContainer.style.display === 'none') {
            return;
        }

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

        // Müşteri satış seçeneği kaldırıldı - artık sadece direkt "Müşteri Satış (Çıkış)" işlem türünden yapılabilir
    }
    // Araç sorumluları için - sadece ana depoya geri gönderebilir
    else if (currentWarehouse !== WAREHOUSE_TYPES.MAIN) {
        const mainOption = document.createElement('option');
        mainOption.value = WAREHOUSE_TYPES.MAIN;
        mainOption.textContent = 'Ana Depoya Geri Gönder';
        select.appendChild(mainOption);

        // Müşteri satış seçeneği kaldırıldı - artık sadece direkt "Müşteri Satış (Çıkış)" işlem türünden yapılabilir
    }
}

// Mevcut depo stokunu getir
function getCurrentWarehouseStock(item, warehouseType) {
    const field = `${warehouseType}_stock`;
    return item[field] || 0;
}

// Stok çıkarma işlemi
async function handleRemoveStock() {
    // Yetki kontrolü - Sadece ana depo sorumlusu stok işlemi yapabilir
    if (!currentUser.is_depo_admin) {
        alert('Bu işlem için yetkiniz yok! Sadece ana depo sorumlusu stok işlemleri yapabilir.');
        return;
    }

    const operationType = document.getElementById('operationType').value;
    // Önce hidden input'u kontrol et, yoksa normal select'i kullan
    let productId = document.getElementById('selectedProductId').value;
    if (!productId) {
        productId = document.getElementById('selectProduct').value;
    }
    const quantity = parseInt(document.getElementById('removeQuantity').value);
    const targetWarehouse = document.getElementById('targetWarehouse').value;

    // Müşteri satışında fiyat ve form bilgisini al
    let salePrice = null;
    let formInfo = '';
    if (operationType === 'customer_sale') {
        salePrice = parseFloat(document.getElementById('salePrice').value);
        if (!salePrice || salePrice <= 0) {
            alert('Lütfen geçerli bir satış fiyatı girin!');
            return;
        }

        formInfo = document.getElementById('formInfo').value.trim();
    }

    // Validation
    if (!operationType) {
        alert('Lütfen işlem türü seçin!');
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

    if (!targetWarehouse && operationType !== 'customer_sale') {
        const targetLabel = operationType === 'customer_sale' ? 'müşteri' : 'depo';
        alert(`Lütfen ${targetLabel} seçin!`);
        return;
    }

    try {
        const item = stockData.find(s => s.id === productId);
        if (!item) {
            throw new Error('Ürün bulunamadı!');
        }

        // Müşteri satışında kaynak depo kontrolü
        if (operationType === 'customer_sale' && currentUser.is_depo_admin && currentWarehouse === WAREHOUSE_TYPES.MAIN) {
            const sourceWarehouseSelect = document.getElementById('sourceWarehouse');
            const selectedSource = sourceWarehouseSelect ? sourceWarehouseSelect.value : null;

            if (!selectedSource) {
                // Tek depoda stok varsa otomatik seç
                const availableWarehouses = [];
                Object.entries(WAREHOUSE_TYPES).forEach(([key, warehouseType]) => {
                    const stock = getCurrentWarehouseStock(item, warehouseType);
                    if (stock > 0) {
                        availableWarehouses.push(warehouseType);
                    }
                });

                if (availableWarehouses.length === 1) {
                    sourceWarehouseSelect.value = availableWarehouses[0];
                } else if (availableWarehouses.length > 1) {
                    alert(`Lütfen kaynak depo seçin! Bu ürün ${availableWarehouses.map(w => WAREHOUSE_NAMES[w]).join(', ')} depolarında mevcut.`);
                    return;
                } else {
                    alert('Bu ürün hiçbir depoda stokta yok!');
                    return;
                }
            }
        }

        if (operationType === 'add') {
            // Stok girişi işlemi
            await handleStockEntry(item, targetWarehouse, quantity);
        } else if (operationType === 'transfer') {
            // Transfer/çıkış işlemi
            await handleStockTransfer(item, targetWarehouse, quantity);
        } else if (operationType === 'customer_sale') {
            // Müşteri satışı işlemi - targetWarehouse gerekmiyor
            await handleCustomerSale(item, 'customer', quantity, salePrice, formInfo);
        }

        // Formu temizle
        document.getElementById('removeQuantity').value = '';
        document.getElementById('selectProduct').value = '';
        document.getElementById('selectedProductId').value = '';
        document.getElementById('targetWarehouse').value = '';
        document.getElementById('operationType').value = '';
        document.getElementById('salePrice').value = '';
        document.getElementById('formInfo').value = '';
        if (document.getElementById('sourceWarehouse')) {
            document.getElementById('sourceWarehouse').value = '';
        }

        // Stok verilerini yeniden yükle
        await loadStockData();

    } catch (error) {
        alert(error.message || 'İşlem gerçekleştirilirken bir hata oluştu: ' + error.message);
    } finally {
        // Modal'ı her durumda kapat
        bootstrap.Modal.getInstance(document.getElementById('removeStockModal')).hide();
    }
}

// Stok girişi işlemi
async function handleStockEntry(item, targetWarehouse, quantity) {
    const targetField = `${targetWarehouse}_stock`;
    const currentStock = getCurrentWarehouseStock(item, targetWarehouse);

    const updates = {
        [targetField]: currentStock + quantity
    };

    const { error } = await supabase
        .from('stock')
        .update(updates)
        .eq('id', item.id);

    if (error) throw error;

    // Hareket kaydı oluştur
    await createStockMovement(
        item.id,
        item.product_code,
        item.product_name,
        'in',
        null,
        targetWarehouse,
        quantity,
        `Stok girişi - ${WAREHOUSE_NAMES[targetWarehouse]}`
    );

}

// Stok transfer/çıkış işlemi
async function handleStockTransfer(item, targetWarehouse, quantity) {
    // Kaynak depo belirleme
    let sourceWarehouse = currentWarehouse;
    if (currentUser.is_depo_admin && currentWarehouse === WAREHOUSE_TYPES.MAIN) {
        const selectedSource = document.getElementById('sourceWarehouse').value;
        if (selectedSource) {
            sourceWarehouse = selectedSource;
        }
    }

    const sourceStock = getCurrentWarehouseStock(item, sourceWarehouse);

    if (quantity > sourceStock) {
        throw new Error(`Yetersiz stok! ${WAREHOUSE_NAMES[sourceWarehouse]}'da mevcut stok: ${sourceStock} adet`);
    }

    // Stok güncelleme objesi oluştur
    const updates = {};
    const sourceField = `${sourceWarehouse}_stock`;
    updates[sourceField] = sourceStock - quantity;

    // Eğer başka bir depoya transfer ediyorsa
    if (targetWarehouse !== 'external') {
        const targetField = `${targetWarehouse}_stock`;
        const targetStock = getCurrentWarehouseStock(item, targetWarehouse);
        updates[targetField] = targetStock + quantity;
    }

    const { error } = await supabase
        .from('stock')
        .update(updates)
        .eq('id', item.id);

    if (error) throw error;

    // Hareket kaydı oluştur
    let movementType, notes;
    if (targetWarehouse === 'external') {
        // Bu artık sadece eski kayıtlar için - yeni müşteri satışları customer_sale üzerinden yapılacak
        movementType = 'out';
        notes = 'Müşteri satış (eski sistem)';
        await createStockMovement(item.id, item.product_code, item.product_name, movementType, sourceWarehouse, 'external', quantity, notes);
    } else {
        movementType = 'transfer';
        notes = `${WAREHOUSE_NAMES[sourceWarehouse]} → ${WAREHOUSE_NAMES[targetWarehouse]}`;
        await createStockMovement(item.id, item.product_code, item.product_name, movementType, sourceWarehouse, targetWarehouse, quantity, notes);
    }

}

// Müşteri satışı işlemi
async function handleCustomerSale(item, targetWarehouse, quantity, salePrice, formInfo = '') {
    // Kaynak depo belirleme
    let sourceWarehouse = currentWarehouse;
    if (currentUser.is_depo_admin && currentWarehouse === WAREHOUSE_TYPES.MAIN) {
        const selectedSource = document.getElementById('sourceWarehouse').value;
        if (selectedSource) {
            sourceWarehouse = selectedSource;
        }
    }

    const sourceStock = getCurrentWarehouseStock(item, sourceWarehouse);

    if (quantity > sourceStock) {
        throw new Error(`Yetersiz stok! ${WAREHOUSE_NAMES[sourceWarehouse]}'da mevcut stok: ${sourceStock} adet`);
    }

    // Stok güncelleme
    const updates = {};
    const sourceField = `${sourceWarehouse}_stock`;
    updates[sourceField] = sourceStock - quantity;

    const { error } = await supabase
        .from('stock')
        .update(updates)
        .eq('id', item.id);

    if (error) throw error;

    // Hareket kaydı oluştur (müşteri satışı için özel notlar)
    const notes = `Birim fiyat: ${salePrice}₺ - Toplam: ${(salePrice * quantity).toFixed(2)}₺`;

    await createStockMovement(
        item.id,
        item.product_code,
        item.product_name,
        'out',
        sourceWarehouse,
        'customer',
        quantity,
        notes,
        salePrice, // Fiyat bilgisini ekstra parametre olarak gönder
        formInfo   // Form bilgisini ekstra parametre olarak gönder
    );

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
    // Yetki kontrolü - Sadece ana depo sorumlusu transfer yapabilir
    if (!currentUser.is_depo_admin) {
        alert('Bu işlem için yetkiniz yok! Sadece ana depo sorumlusu transfer işlemleri yapabilir.');
        return;
    }

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

        // Formu temizle
        document.getElementById('transferSourceWarehouse').value = '';
        document.getElementById('transferProductSelect').value = '';
        document.getElementById('transferQuantity').value = '';

    } catch (error) {
        alert('İşlem sırasında bir hata oluştu: ' + error.message);
    }
}

// ==================== YENİ ÖZELLİKLER ====================

// Raporlar modalını göster
function showReportsModal() {
    const modal = new bootstrap.Modal(document.getElementById('reportsModal'));

    // Varsayılan tarih aralığını ayarla
    const now = new Date();
    let startDate, endDate;

    if (now.getDate() <= 5) {
        // Ayın ilk 5 günündeyse son 30 gün
        endDate = new Date(now);
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 30);
    } else {
        // 5. günden sonraysa bu ay
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    document.getElementById('reportStartDate').value = startDate.toISOString().split('T')[0];
    document.getElementById('reportEndDate').value = endDate.toISOString().split('T')[0];

    // Depo seçeneklerini doldur
    populateReportWarehouseOptions();

    // Ürün filtresi başlangıç ayarları (ürün listesi yüklenmeden önce)
    const searchInput = document.getElementById('reportProductSearch');
    const hiddenInput = document.getElementById('reportProduct');
    if (searchInput && hiddenInput) {
        searchInput.value = '';
        hiddenInput.value = 'all';
        // Dropdown'u da gizle
        const dropdown = document.getElementById('reportProductDropdown');
        if (dropdown) {
            dropdown.style.display = 'none';
        }
    }

    // Ürün listesini yükle
    loadProductsForReport();

    // Hızlı filtre event listener'ları ekle
    document.querySelectorAll('input[name="quickFilter"]').forEach(radio => {
        radio.addEventListener('change', function () {
            // Tarih seçili ise otomatik rapor oluştur
            const startDate = document.getElementById('reportStartDate').value;
            const endDate = document.getElementById('reportEndDate').value;

            if (startDate && endDate) {
                generateReport();
            }
        });
    });

    // Filtreleri ve içeriği temizle
    resetReportFilters();

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
async function createStockMovement(productId, productCode, productName, movementType, sourceWarehouse, targetWarehouse, quantity, notes = '', salePrice = null, formInfo = '') {
    try {
        // Önce tabloyu kontrol et
        const { data: tableCheck, error: checkError } = await supabase
            .from('stock_movements')
            .select('*')
            .limit(1);

        if (checkError) {
            return;
        }

        const movementData = {
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
        };

        // Form bilgisi varsa notes'a ekle
        if (formInfo && formInfo.trim()) {
            movementData.notes = `Form: ${formInfo.trim()} | ${notes}`;
        }

        // Müşteri satışında fiyat bilgisini ekle
        if (salePrice !== null) {
            movementData.sale_price = salePrice;
            movementData.total_amount = salePrice * quantity;
        }

        const { error } = await supabase
            .from('stock_movements')
            .insert(movementData);

        if (error) throw error;

    } catch (error) {
    }
}

// Rapor modalı için ürün listesini yükle
async function loadProductsForReport() {
    try {
        const { data: products, error } = await supabase
            .from('stock')
            .select('id, product_code, product_name')
            .order('product_name');

        if (error) throw error;

        // Ürün listesini input elementine data olarak sakla
        const searchInput = document.getElementById('reportProductSearch');
        searchInput.dataset.products = JSON.stringify(products);

        setupProductSearch(products);

        // Ürün filtresini sıfırla
        const reportSearchInput = document.getElementById('reportProductSearch');
        const reportHiddenInput = document.getElementById('reportProduct');
        const reportDropdown = document.getElementById('reportProductDropdown');

        if (reportSearchInput) reportSearchInput.value = '';
        if (reportHiddenInput) reportHiddenInput.value = 'all';
        if (reportDropdown) reportDropdown.style.display = 'none';

    } catch (error) {
    }
}

// Ürün arama sistemi kurulumu
function setupProductSearch(products) {
    const searchInput = document.getElementById('reportProductSearch');
    const dropdown = document.getElementById('reportProductDropdown');
    const hiddenInput = document.getElementById('reportProduct');

    // Arama input'una odaklanınca davranış
    searchInput.addEventListener('focus', () => {
        // Eğer içerik varsa (ürün seçilmişse) temizle
        if (searchInput.value.trim()) {
            searchInput.value = '';
            hiddenInput.value = 'all';
        }

        showAllProducts(products);
        dropdown.style.display = 'block';
    });

    // Arama yaparken filtrele
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        filterProducts(searchTerm, products);
        dropdown.style.display = 'block';
    });

    // Enter tuşuna basıldığında ilk ürünü seç
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const firstProduct = dropdown.querySelector('.dropdown-item[data-value]:not([data-value="all"])');
            if (firstProduct) {
                firstProduct.click();
            }
        }
    });

    // Dışarı tıklanınca dropdown'ı gizle
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.position-relative')) {
            dropdown.style.display = 'none';
        }
    });

    // Başlangıçta dropdown gizli ve "Tüm Ürünler" seçili
    dropdown.style.display = 'none';
    searchInput.value = '';
    hiddenInput.value = 'all';
}

// Tüm ürünleri dropdown'da göster
function showAllProducts(products) {
    const dropdown = document.getElementById('reportProductDropdown');

    let html = `
        <div class="dropdown-item active" data-value="all" onclick="selectReportProduct('all', 'Tüm Ürünler')">
            <i class="fas fa-list me-2"></i>Tüm Ürünler
        </div>
    `;

    products.forEach(product => {
        html += `
            <div class="dropdown-item" 
                 data-value="${product.id}" 
                 onclick="selectReportProduct('${product.id}', '${product.product_code} - ${product.product_name}')">
                <i class="fas fa-box me-2"></i>
                <strong>${product.product_code}</strong> - ${product.product_name}
            </div>
        `;
    });

    dropdown.innerHTML = html;
}

// Ürünleri filtrele
function filterProducts(searchTerm, products) {
    const dropdown = document.getElementById('reportProductDropdown');

    if (!searchTerm) {
        showAllProducts(products);
        return;
    }

    const filteredProducts = products.filter(product =>
        product.product_code.toLowerCase().includes(searchTerm) ||
        product.product_name.toLowerCase().includes(searchTerm)
    );

    let html = '';

    if (filteredProducts.length === 0) {
        html = `
            <div class="dropdown-item disabled">
                <i class="fas fa-exclamation-circle me-2 text-muted"></i>
                <span class="text-muted">Ürün bulunamadı</span>
            </div>
        `;
    } else {
        filteredProducts.forEach(product => {
            html += `
                <div class="dropdown-item" 
                     data-value="${product.id}" 
                     onclick="selectReportProduct('${product.id}', '${product.product_code} - ${product.product_name}')">
                    <i class="fas fa-box me-2"></i>
                    <strong>${product.product_code}</strong> - ${product.product_name}
                </div>
            `;
        });
    }

    dropdown.innerHTML = html;
    dropdown.style.display = 'block';
}

// Ürün seçimi
function selectReportProduct(value, displayText) {
    const searchInput = document.getElementById('reportProductSearch');
    const dropdown = document.getElementById('reportProductDropdown');
    const hiddenInput = document.getElementById('reportProduct');

    searchInput.value = displayText;
    hiddenInput.value = value;
    dropdown.style.display = 'none';
}// Rapor oluştur
async function generateReport() {
    const startDate = document.getElementById('reportStartDate').value;
    const endDate = document.getElementById('reportEndDate').value;
    const warehouse = document.getElementById('reportWarehouse').value;
    const productFilter = document.getElementById('reportProduct').value;
    const quickFilter = document.querySelector('input[name="quickFilter"]:checked').value;

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
            .gte('created_at', startDate)
            .lte('created_at', endDate + ' 23:59:59')
            .order('created_at', { ascending: false });

        if (warehouse !== 'all') {
            query = query.or(`source_warehouse.eq.${warehouse},target_warehouse.eq.${warehouse}`);
        }

        if (productFilter !== 'all') {
            query = query.eq('product_id', productFilter);
        }

        // Hızlı filtre uygula
        if (quickFilter !== 'all') {
            if (quickFilter === 'customer') {
                // Müşteri satışları (out ve target customer/external)
                query = query.eq('movement_type', 'out').in('target_warehouse', ['customer', 'external']);
            } else {
                // Diğer işlem türleri
                query = query.eq('movement_type', quickFilter);
            }
        }

        const { data: movements, error } = await query;

        if (error) throw error;

        displayReport(movements, startDate, endDate, warehouse, productFilter, quickFilter);

    } catch (error) {
        content.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Rapor oluşturulurken bir hata oluştu: ${error.message}
            </div>
        `;
    }
}

// Raporu görüntüle
function displayReport(movements, startDate, endDate, warehouse, productFilter = 'all', quickFilter = 'all') {
    const content = document.getElementById('reportContent');
    const exportBtn = document.getElementById('exportReportBtn');

    if (!movements || movements.length === 0) {
        content.innerHTML = `
            <div class="alert alert-info text-center">
                <i class="fas fa-info-circle fa-2x mb-3"></i>
                <h5>Veri Bulunamadı</h5>
                <p>Seçilen kriterlerde hiç hareket kaydı bulunmuyor.</p>
            </div>
        `;
        exportBtn.style.display = 'none';
        return;
    }

    // Ürün filtresi bilgisini al
    let productFilterText = 'Tüm Ürünler';
    if (productFilter !== 'all') {
        const searchInput = document.getElementById('reportProductSearch');
        productFilterText = searchInput.value || 'Seçili Ürün';
    }

    // Hızlı filtre bilgisini al
    const quickFilterTexts = {
        'all': 'Tümü',
        'in': 'Giriş',
        'out': 'Çıkış',
        'transfer': 'Transfer',
        'customer': 'Müşteri Satış'
    };
    const quickFilterText = quickFilterTexts[quickFilter] || 'Tümü';

    let html = `
        <div class="mb-3">
            <h6>
                <i class="fas fa-calendar me-2"></i>
                ${formatDate(startDate)} - ${formatDate(endDate)} 
                ${warehouse !== 'all' ? `(${WAREHOUSE_NAMES[warehouse]})` : '(Tüm Depolar)'}
            </h6>
            <div class="row">
                <div class="col-md-4">
                    <small class="text-muted">
                        <i class="fas fa-box me-1"></i>
                        Ürün: ${productFilterText}
                    </small>
                </div>
                <div class="col-md-4">
                    <small class="text-muted">
                        <i class="fas fa-filter me-1"></i>
                        İşlem: ${quickFilterText}
                    </small>
                </div>
                <div class="col-md-4 text-end">
                    <small class="text-muted">Toplam ${movements.length} hareket</small>
                </div>
            </div>
        </div>
        
        <div class="table-responsive">
            <table class="table table-striped table-hover">
                <thead class="table-dark">
                    <tr>
                        <th>Tarih</th>
                        <th>Ürün Kodu</th>
                        <th>Ürün Adı</th>
                        <th>İşlem</th>
                        <th>Kaynak</th>
                        <th>Hedef</th>
                        <th>Miktar</th>
                        <th>Satış Fiyatı</th>
                        <th>Kullanıcı</th>
                        <th>Notlar</th>
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
        const targetText = (movement.target_warehouse === 'external' || movement.target_warehouse === 'customer') ? 'Müşteri Satış' :
            (movement.target_warehouse ? WAREHOUSE_NAMES[movement.target_warehouse] || movement.target_warehouse : '-');

        // Ürün görseli kontrolü
        const product = stockData.find(p => p.product_code === movement.product_code);
        const hasImage = product && product.product_image_url;

        const productCodeDisplay = hasImage ?
            `<a href="#" onclick="showProductImage('${String(product.product_image_url || '').replace(/'/g, '&#39;')}', '${String(movement.product_name || '').replace(/'/g, '&#39;')}')" 
               class="text-decoration-none" title="Ürün görselini görüntüle">
               <i class="fas fa-image text-primary me-1"></i><strong>${movement.product_code}</strong>
             </a>` :
            `<strong>${movement.product_code}</strong>`;

        // Satış fiyatı gösterimi (sadece müşteri satışlarında)
        let priceDisplay = '-';
        if ((movement.target_warehouse === 'customer' || movement.target_warehouse === 'external') && movement.sale_price) {
            const totalAmount = movement.total_amount || (movement.sale_price * movement.quantity);
            priceDisplay = `
                <div>
                    <strong>${movement.sale_price}₺</strong>
                    <small class="text-muted d-block">Toplam: ${totalAmount.toFixed(2)}₺</small>
                </div>
            `;
        } else if ((movement.target_warehouse === 'external' || movement.target_warehouse === 'customer') && movement.notes && movement.notes.includes('Birim fiyat:')) {
            // Eski kayıtlar için notes'tan fiyat bilgisini çıkar
            const priceMatch = movement.notes.match(/Birim fiyat: ([\d.]+)₺/);
            const totalMatch = movement.notes.match(/Toplam: ([\d.]+)₺/);
            if (priceMatch) {
                priceDisplay = `
                    <div>
                        <strong>${priceMatch[1]}₺</strong>
                        ${totalMatch ? `<small class="text-muted d-block">Toplam: ${totalMatch[1]}₺</small>` : ''}
                    </div>
                `;
            }
        }

        html += `
            <tr>
                <td>${formatDateTime(movement.movement_date || movement.created_at)}</td>
                <td>${productCodeDisplay}</td>
                <td>${movement.product_name}</td>
                <td>
                    <span class="badge bg-${getMovementTypeBadgeColor(movement.movement_type)}">
                        ${movementTypeText}
                    </span>
                </td>
                <td>${sourceText}</td>
                <td>${targetText}</td>
                <td><strong>${movement.quantity}</strong></td>
                <td>${priceDisplay}</td>
                <td>${movement.user_name}</td>
                <td>
                    <small class="text-muted">${movement.notes || '-'}</small>
                </td>
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
}// Rapor filtrelerini temizle
function resetReportFilters() {
    const searchInput = document.getElementById('reportProductSearch');
    const hiddenInput = document.getElementById('reportProduct');
    const dropdown = document.getElementById('reportProductDropdown');

    if (searchInput) searchInput.value = '';
    if (hiddenInput) hiddenInput.value = 'all';
    if (dropdown) dropdown.style.display = 'none';

    // Hızlı filtreyi "Tümü" olarak sıfırla
    const allFilter = document.getElementById('filterAll');
    if (allFilter) allFilter.checked = true;

    // İçerik alanını temizle ki başlangıç mesajı gösterilsin
    const reportContent = document.getElementById('reportContent');
    if (reportContent) {
        reportContent.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-chart-line mb-3" style="font-size: 3rem; color: #6c757d;"></i>
                <p class="text-muted">Rapor oluşturmak için tarih aralığı seçin ve "Rapor Oluştur" butonuna tıklayın.</p>
            </div>
        `;
    }

    // Export butonunu da gizle
    const exportBtn = document.getElementById('exportReportBtn');
    if (exportBtn) exportBtn.style.display = 'none';
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

    // Modalı açtığımızda tüm ürünleri listele
    loadAllProductsForShelf();
}

// Tüm ürünleri raf yönetimi için yükle
function loadAllProductsForShelf() {
    displayShelfProducts(stockData);
}

// Raf ürünlerini filtrele (klavyeden yazdıkça)
function filterShelfProducts() {
    const searchTerm = document.getElementById('shelfProductSearch').value.toLowerCase().trim();

    const filteredProducts = stockData.filter(item =>
        item.product_code.toLowerCase().includes(searchTerm) ||
        item.product_name.toLowerCase().includes(searchTerm) ||
        (item.shelf_address && item.shelf_address.toLowerCase().includes(searchTerm))
    );

    displayShelfProducts(filteredProducts);
}

// Raf ürünlerini görüntüle
function displayShelfProducts(products) {
    const container = document.getElementById('shelfProductsList');

    if (products.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted py-4">
                    <i class="fas fa-search fa-2x mb-2"></i>
                    <p>Arama kriterlerine uygun ürün bulunamadı.</p>
                </td>
            </tr>`;
        return;
    }

    container.innerHTML = products.map(item => {
        const shelfDisplay = item.shelf_address ?
            `<span class="badge bg-success">${item.shelf_address}</span>` :
            '<span class="text-muted">Atanmamış</span>';

        return `
            <tr>
                <td><strong>${item.product_code}</strong></td>
                <td>${item.product_name}</td>
                <td>${shelfDisplay}</td>
                <td><span class="badge bg-primary">${item.main_stock || 0}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" 
                            onclick="editShelfAddress('${item.id}', '${String(item.product_code || '').replace(/'/g, '&#39;')}', '${String(item.product_name || '').replace(/'/g, '&#39;')}', '${String(item.shelf_address || '').replace(/'/g, '&#39;')}')"
                            title="Raf adresi düzenle">
                        <i class="fas fa-edit"></i> Düzenle
                    </button>
                </td>
            </tr>`;
    }).join('');
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

    // Dosya adını oluştururken tarih ve filtre bilgilerini ekle
    const startDate = document.getElementById('reportStartDate').value;
    const endDate = document.getElementById('reportEndDate').value;
    const warehouse = document.getElementById('reportWarehouse').value;
    const productFilter = document.getElementById('reportProduct').value;

    let filename = `stok-raporu_${startDate}_${endDate}`;

    if (warehouse !== 'all') {
        filename += `_${WAREHOUSE_NAMES[warehouse].replace(/\s+/g, '-')}`;
    }

    if (productFilter !== 'all') {
        const searchInput = document.getElementById('reportProductSearch');
        const selectedProductText = searchInput.value;
        if (selectedProductText) {
            const productCode = selectedProductText.split(' - ')[0];
            filename += `_${productCode}`;
        }
    }

    filename += '.csv';

    // CSV dosyası oluştur ve indir
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Resim modal'ını aç
function openImageModal(imageUrl, productName) {
    const modal = new bootstrap.Modal(document.getElementById('imageModal'));
    const modalImage = document.getElementById('modalImage');
    const modalTitle = document.getElementById('imageModalTitle');

    modalImage.src = imageUrl;
    modalImage.alt = productName;
    modalTitle.textContent = productName;

    modal.show();
}

// Ürün resmi göster (ana tabloda kullanılır)
function showProductImage(imageUrl, productName) {
    openImageModal(imageUrl, productName);
}
