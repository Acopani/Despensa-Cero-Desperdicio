// Versión simplificada de app.js para resolver problemas de carga

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

// Inicializar la aplicación (versión simplificada)
function initializeAppSimple() {
    console.log('🚀 Inicializando aplicación (versión simplificada)...');
    
    try {
        // Mostrar la aplicación inmediatamente
        setTimeout(() => {
            if (loadingElement) loadingElement.style.display = 'none';
            if (appElement) appElement.style.display = 'block';
            isAppInitialized = true;
            
            console.log('✅ Aplicación mostrada');
            
            // Intentar cargar productos si storage está disponible
            if (window.productStorage) {
                try {
                    products = window.productStorage.getAll();
                    updateSummarySimple();
                    renderProductsListSimple();
                    console.log(`📦 Productos cargados: ${products.length}`);
                } catch (error) {
                    console.warn('⚠️ Error cargando productos:', error);
                }
            }
            
            // Configurar navegación
            setupNavigationSimple();
            
        }, 300);
        
    } catch (error) {
        console.error('❌ Error inicializando aplicación:', error);
        // Forzar mostrar la aplicación de todos modos
        if (loadingElement) loadingElement.style.display = 'none';
        if (appElement) appElement.style.display = 'block';
    }
}

// Actualizar resumen simplificado
function updateSummarySimple() {
    if (!isAppInitialized) return;
    
    try {
        if (window.productStorage) {
            const products = window.productStorage.getAll();
            
            if (totalProductsElement) {
                totalProductsElement.textContent = products.length;
            }
            
            // Calcular productos urgentes y próximos
            let urgentCount = 0;
            let warningCount = 0;
            const today = new Date();
            
            products.forEach(product => {
                if (product.expiryDate) {
                    const expDate = new Date(product.expiryDate);
                    const daysDiff = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
                    
                    if (daysDiff <= 3 && daysDiff >= 0) {
                        urgentCount++;
                    } else if (daysDiff <= 7 && daysDiff > 3) {
                        warningCount++;
                    }
                }
            });
            
            if (urgentProductsElement) urgentProductsElement.textContent = urgentCount;
            if (warningProductsElement) warningProductsElement.textContent = warningCount;
            
            updateSummaryCardColorsSimple();
        } else if (products.length > 0) {
            // Fallback básico
            if (totalProductsElement) totalProductsElement.textContent = products.length;
            if (urgentProductsElement) urgentProductsElement.textContent = '0';
            if (warningProductsElement) warningProductsElement.textContent = '0';
        }
    } catch (error) {
        console.warn('⚠️ Error actualizando resumen:', error);
    }
}

// Actualizar colores de tarjetas
function updateSummaryCardColorsSimple() {
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
}

// Renderizar lista de productos simplificada
function renderProductsListSimple() {
    if (!productsListElement || !products || products.length === 0) return;
    
    try {
        let html = '';
        
        products.forEach(product => {
            const statusClass = getProductStatusClass(product);
            
            html += `
                <div class="product-card">
                    <div class="product-card-header">
                        <h3 class="product-name">${product.name || 'Producto sin nombre'}</h3>
                        <span class="product-quantity">${product.quantity || 1} unidades</span>
                    </div>
                    <div class="product-card-details">
                        <p class="product-category">${product.category || 'Sin categoría'}</p>
                        ${product.expiryDate ? `<p class="product-expiry">Vence: ${product.expiryDate}</p>` : ''}
                        ${product.notes ? `<p class="product-notes">${product.notes}</p>` : ''}
                    </div>
                    <div class="product-status ${statusClass}">
                        ${getStatusLabel(product)}
                    </div>
                </div>
            `;
        });
        
        productsListElement.innerHTML = html;
        
    } catch (error) {
        console.warn('⚠️ Error renderizando lista de productos:', error);
    }
}

// Obtener clase de estado del producto
function getProductStatusClass(product) {
    if (!product.expiryDate) return 'unknown';
    
    const today = new Date();
    const expDate = new Date(product.expiryDate);
    const daysDiff = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysDiff < 0) return 'expired';
    if (daysDiff <= 3) return 'urgent';
    if (daysDiff <= 7) return 'warning';
    return 'fresh';
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

// Configurar navegación simplificada
function setupNavigationSimple() {
    console.log('🔧 Configurando navegación...');
    
    // Botón de escaneo
    if (scanBtn) {
        scanBtn.addEventListener('click', () => {
            console.log('📷 Abrir escáner');
            if (window.scanner && typeof window.scanner.showScannerModal === 'function') {
                window.scanner.showScannerModal();
            } else {
                alert('Funcionalidad de escáner no disponible');
            }
        });
    }
    
    // Botón de inicio
    if (homeBtn) {
        homeBtn.addEventListener('click', () => {
            console.log('🏠 Recargando datos');
            if (window.productStorage) {
                products = window.productStorage.getAll();
                updateSummarySimple();
                renderProductsListSimple();
                showToastSimple('Datos actualizados');
            }
        });
    }
    
    // Botón de recetas
    if (recipesBtn) {
        recipesBtn.addEventListener('click', () => {
            showToastSimple('Funcionalidad de recetas disponible en Task 6');
        });
    }
    
    // Botón de alertas
    if (alertsBtn) {
        alertsBtn.addEventListener('click', () => {
            if (window.expirationAlerts && typeof window.expirationAlerts.showCriticalDashboard === 'function') {
                window.expirationAlerts.showCriticalDashboard();
            } else {
                showToastSimple('Sistema de alertas no disponible');
            }
        });
    }
}

// Mostrar toast simplificado
function showToastSimple(message) {
    console.log('💬 Toast:', message);
    
    // Crear elemento toast si no existe
    let toast = document.getElementById('simple-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'simple-toast';
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #333;
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s;
            font-family: sans-serif;
        `;
        document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.style.opacity = '1';
    
    // Ocultar después de 3 segundos
    setTimeout(() => {
        toast.style.opacity = '0';
    }, 3000);
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM cargado - Iniciando aplicación simplificada');
    initializeAppSimple();
});

// Exportar funciones globales
window.updateProductList = function() {
    if (window.productStorage) {
        products = window.productStorage.getAll();
        updateSummarySimple();
        renderProductsListSimple();
    }
};