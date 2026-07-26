// Versión corregida de app.js - Sin problemas de carga

// Variables globales
let products = [];
let isAppInitialized = false;

// DOM Elements
const loadingElement = document.getElementById('loading');
const appElement = document.getElementById('app');
const totalProductsElement = document.getElementById('total-products');
const urgentProductsElement = document.getElementById('urgent-products');
const warningProductsElement = document.getElementById('warning-products');
const productsListElement = document.getElementById('products-list');
const addProductBtn = document.getElementById('add-product-btn');
const addFirstProductBtn = document.getElementById('add-first-product');
const scanBtn = document.getElementById('scan-btn');
const homeBtn = document.getElementById('home-btn');
const recipesBtn = document.getElementById('recipes-btn');
const alertsBtn = document.getElementById('alerts-btn');

// Variables para modales
let currentModal = null;

// Inicializar la aplicación (versión segura)
async function initializeApp() {
    console.log('🚀 Inicializando aplicación...');
    
    try {
        // Mostrar la aplicación después de un breve delay
        setTimeout(() => {
            if (loadingElement) loadingElement.style.display = 'none';
            if (appElement) appElement.style.display = 'block';
            isAppInitialized = true;
            
            console.log('✅ Aplicación visible');
            
            // Cargar datos si storage está disponible
            if (window.productStorage) {
                try {
                    products = window.productStorage.getAll();
                    updateSummary();
                    renderProductsList();
                    console.log(`📦 ${products.length} productos cargados`);
                } catch (error) {
                    console.warn('⚠️ Error cargando productos:', error);
                }
            }
            
            // Configurar navegación
            setupNavigation();
            
            // Iniciar sistema de alertas de forma segura
            startAlertsSystemSafely();
            
        }, 300);
        
    } catch (error) {
        console.error('❌ Error en initializeApp:', error);
        
        // Forzar mostrar la aplicación de todos modos
        if (loadingElement) loadingElement.style.display = 'none';
        if (appElement) appElement.style.display = 'block';
    }
}

// Iniciar sistema de alertas de forma segura
function startAlertsSystemSafely() {
    setTimeout(() => {
        try {
            if (window.expirationAlerts && typeof window.expirationAlerts.startRealTimeMonitoring === 'function') {
                window.expirationAlerts.startRealTimeMonitoring();
                console.log('🔔 Monitoreo de alertas iniciado');
            }
        } catch (error) {
            console.warn('⚠️ No se pudo iniciar monitoreo de alertas:', error);
        }
    }, 1000);
    
    // Notificaciones locales (con más delay)
    setTimeout(() => {
        try {
            if (window.expirationAlerts && typeof window.expirationAlerts.showLocalNotifications === 'function') {
                window.expirationAlerts.showLocalNotifications();
            }
        } catch (error) {
            console.warn('⚠️ No se pudieron mostrar notificaciones:', error);
        }
    }, 2000);
}

// Cargar productos desde el almacenamiento (método seguro)
async function loadProductsFromStorage() {
    console.log('📥 Cargando productos...');
    
    if (window.productStorage) {
        try {
            products = window.productStorage.getAll();
            console.log(`✅ ${products.length} productos cargados`);
            
            // Datos de ejemplo solo en desarrollo local
            if (products.length === 0 && window.location.hostname === 'localhost') {
                console.log('➕ Añadiendo datos de ejemplo...');
                await addSampleProducts();
                products = window.productStorage.getAll();
            }
            
            return products;
        } catch (error) {
            console.error('❌ Error cargando productos:', error);
            return [];
        }
    } else {
        console.warn('⚠️ productStorage no disponible');
        return [];
    }
}

// Añadir productos de ejemplo (solo para desarrollo)
async function addSampleProducts() {
    if (!window.productStorage) return;
    
    const sampleProducts = [
        {
            name: 'Manzanas Fuji',
            quantity: 5,
            expiryDate: getDateString(3),
            category: 'Frutas',
            notes: 'Comprar en el mercado local'
        },
        {
            name: 'Leche Entera',
            quantity: 1,
            expiryDate: getDateString(-1),
            category: 'Lácteos',
            notes: 'Cartón de 1L'
        },
        {
            name: 'Pan Integral',
            quantity: 2,
            expiryDate: getDateString(1),
            category: 'Panadería',
            notes: 'Pan de molde'
        },
        {
            name: 'Tomates',
            quantity: 6,
            expiryDate: getDateString(7),
            category: 'Verduras',
            notes: 'Tomate cherry'
        },
        {
            name: 'Arroz Integral',
            quantity: 1,
            expiryDate: getDateString(30),
            category: 'Granos',
            notes: 'Paquete de 1kg'
        }
    ];
    
    sampleProducts.forEach(product => {
        try {
            window.productStorage.add(product);
        } catch (error) {
            console.warn('⚠️ Error añadiendo producto de ejemplo:', error);
        }
    });
}

// Actualizar resumen en la interfaz
function updateSummary() {
    if (!isAppInitialized) return;
    
    try {
        // Usar sistema de alertas si está disponible
        if (window.expirationAlerts && window.productStorage) {
            const products = window.productStorage.getAllProducts();
            const analysis = window.expirationAlerts.analyzeAllProducts();
            
            if (totalProductsElement) totalProductsElement.textContent = products.length;
            if (urgentProductsElement) urgentProductsElement.textContent = analysis.criticalProducts.length;
            if (warningProductsElement) warningProductsElement.textContent = analysis.warningProducts.length + analysis.expiredProducts.length;
            
            updateSummaryCardColors();
            updateAlertsIndicator(analysis);
            
        } else if (window.productStorage) {
            // Fallback al sistema anterior
            const summary = window.productStorage.getSummary();
            
            if (totalProductsElement) totalProductsElement.textContent = summary.total;
            if (urgentProductsElement) urgentProductsElement.textContent = summary.urgent;
            if (warningProductsElement) warningProductsElement.textContent = summary.warning;
            
            updateSummaryCardColors();
        } else {
            // Fallback básico
            if (totalProductsElement) totalProductsElement.textContent = products.length;
            if (urgentProductsElement) urgentProductsElement.textContent = 0;
            if (warningProductsElement) warningProductsElement.textContent = 0;
            
            updateSummaryCardColors();
        }
    } catch (error) {
        console.warn('⚠️ Error actualizando resumen:', error);
        
        // Fallback mínimo
        if (totalProductsElement) totalProductsElement.textContent = products.length || 0;
        updateSummaryCardColors();
    }
}

// Actualizar indicador de alertas
function updateAlertsIndicator(analysis) {
    const alertsBadge = document.getElementById('alerts-badge');
    if (!alertsBadge) return;
    
    try {
        const totalAlerts = analysis.criticalProducts.length + 
                           analysis.warningProducts.length + 
                           analysis.expiredProducts.length;
        
        if (totalAlerts > 0) {
            alertsBadge.textContent = totalAlerts > 99 ? '99+' : totalAlerts;
            alertsBadge.classList.remove('hidden');
        } else {
            alertsBadge.classList.add('hidden');
        }
    } catch (error) {
        console.warn('⚠️ Error actualizando indicador de alertas:', error);
    }
}

// Actualizar colores de las tarjetas de resumen
function updateSummaryCardColors() {
    try {
        const cards = document.querySelectorAll('.summary-card');
        cards.forEach(card => {
            const valueElement = card.querySelector('.card-value');
            if (valueElement) {
                const value = parseInt(valueElement.textContent) || 0;
                if (value > 0) {
                    card.style.backgroundColor = 'rgba(255, 152, 0, 0.1)';
                    card.style.borderLeftColor = '#FF9800';
                } else {
                    card.style.backgroundColor = '';
                    card.style.borderLeftColor = '';
                }
            }
        });
    } catch (error) {
        console.warn('⚠️ Error actualizando colores de tarjetas:', error);
    }
}

// Renderizar lista de productos
function renderProductsList() {
    if (!productsListElement) return;
    
    try {
        if (!products || products.length === 0) {
            productsListElement.innerHTML = `
                <div class="empty-state">
                    <p>No hay productos en tu despensa aún</p>
                    <button id="add-first-product" class="btn-primary">Añadir primer producto</button>
                </div>
            `;
            
            // Configurar botón de añadir primer producto
            const addFirstBtn = document.getElementById('add-first-product');
            if (addFirstBtn) {
                addFirstBtn.addEventListener('click', openManualForm);
            }
            
            return;
        }
        
        let html = '';
        
        products.forEach(product => {
            const statusClass = getProductStatusClass(product);
            const statusLabel = getStatusLabel(product);
            
            html += `
                <div class="product-card">
                    <div class="product-card-header">
                        <h3 class="product-name">${escapeHtml(product.name || 'Producto sin nombre')}</h3>
                        <span class="product-quantity">${product.quantity || 1} unidades</span>
                    </div>
                    <div class="product-card-details">
                        <p class="product-category">${escapeHtml(product.category || 'Sin categoría')}</p>
                        ${product.expiryDate ? `<p class="product-expiry">Vence: ${product.expiryDate}</p>` : ''}
                        ${product.notes ? `<p class="product-notes">${escapeHtml(product.notes)}</p>` : ''}
                    </div>
                    <div class="product-status ${statusClass}">
                        ${statusLabel}
                    </div>
                    <div class="product-card-actions">
                        <button class="btn btn-small" onclick="deleteProduct('${product.id}')">
                            Eliminar
                        </button>
                    </div>
                </div>
            `;
        });
        
        productsListElement.innerHTML = html;
        
    } catch (error) {
        console.error('❌ Error renderizando lista de productos:', error);
        productsListElement.innerHTML = `
            <div class="empty-state">
                <p>Error cargando productos. Intenta recargar la página.</p>
            </div>
        `;
    }
}

// Obtener clase de estado del producto
function getProductStatusClass(product) {
    if (!product.expiryDate) return 'unknown';
    
    try {
        const today = new Date();
        const expDate = new Date(product.expiryDate);
        const daysDiff = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
        
        if (daysDiff < 0) return 'expired';
        if (daysDiff <= 3) return 'urgent';
        if (daysDiff <= 7) return 'warning';
        return 'fresh';
    } catch (error) {
        return 'unknown';
    }
}

// Obtener etiqueta de estado
function getStatusLabel(product) {
    const statusClass = getProductStatusClass(product);
    
    switch (statusClass) {
        case 'expired': return '⌛ Vencido';
        case 'urgent': return '🔥 Urgente';
        case 'warning': return '⚠️ Próximo';
        case 'fresh': return '🍃 Fresco';
        default: return '❓ Desconocido';
    }
}

// Función para eliminar producto
window.deleteProduct = function(productId) {
    if (window.productStorage && confirm('¿Eliminar este producto?')) {
        try {
            window.productStorage.remove(productId);
            products = window.productStorage.getAll();
            updateSummary();
            renderProductsList();
            showToast('Producto eliminado');
        } catch (error) {
            console.error('❌ Error eliminando producto:', error);
            showToast('Error al eliminar producto');
        }
    }
};

// Configurar navegación
function setupNavigation() {
    console.log('🔧 Configurando navegación...');
    
    // Botón de alertas
    if (alertsBtn) {
        alertsBtn.addEventListener('click', () => {
            if (window.expirationAlerts && typeof window.expirationAlerts.showCriticalDashboard === 'function') {
                window.expirationAlerts.showCriticalDashboard();
            } else {
                showToast('Sistema de alertas no disponible');
            }
        });
    }
    
    // Botón de escaneo
    if (scanBtn) {
        scanBtn.addEventListener('click', () => {
            if (window.scanner && typeof window.scanner.showScannerModal === 'function') {
                window.scanner.showScannerModal();
            } else {
                openManualForm();
            }
        });
    }
    
    // Botón de inicio
    if (homeBtn) {
        homeBtn.addEventListener('click', () => {
            if (window.productStorage) {
                products = window.productStorage.getAll();
                updateSummary();
                renderProductsList();
                showToast('Datos actualizados');
            }
        });
    }
    
    // Botón de recetas
    if (recipesBtn) {
        recipesBtn.addEventListener('click', () => {
            showToast('Funcionalidad de recetas disponible en Task 6');
        });
    }
    
    // Botón de añadir producto (header)
    if (addProductBtn) {
        addProductBtn.addEventListener('click', openManualForm);
    }
}

// Abrir formulario manual
function openManualForm() {
    if (typeof window.openManualForm === 'function') {
        window.openManualForm();
    } else {
        showToast('Formulario manual no disponible');
    }
}

// Abrir escáner
function openScanner() {
    if (window.scanner && typeof window.scanner.showScannerModal === 'function') {
        window.scanner.showScannerModal();
    } else {
        openManualForm();
    }
}

// Mostrar toast
function showToast(message) {
    console.log('���� Toast:', message);
    
    try {
        // Usar sistema de toast existente o crear uno simple
        let toast = document.getElementById('toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast';
            toast.style.cssText = `
                position: fixed;
                bottom: 80px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 12px 24px;
                border-radius: 6px;
                z-index: 1000;
                opacity: 0;
                transition: opacity 0.3s;
                font-family: sans-serif;
                white-space: nowrap;
            `;
            document.body.appendChild(toast);
        }
        
        toast.textContent = message;
        toast.style.opacity = '1';
        
        setTimeout(() => {
            toast.style.opacity = '0';
        }, 3000);
    } catch (error) {
        console.warn('⚠️ Error mostrando toast:', error);
    }
}

// Mostrar error
function showError(message) {
    console.error('❌ Error:', message);
    alert(message);
}

// Función auxiliar para fechas
function getDateString(daysOffset) {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return date.toISOString().split('T')[0];
}

// Función para escapar HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM Content Loaded - Iniciando aplicación');
    initializeApp();
});

// Función global para actualizar lista de productos
window.updateProductList = function() {
    if (window.productStorage) {
        products = window.productStorage.getAll();
        updateSummary();
        renderProductsList();
    }
};

console.log('✅ app.js cargado (versión corregida)');