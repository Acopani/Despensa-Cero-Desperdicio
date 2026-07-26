// app.js - Lógica principal de la aplicación Despensa Cero Desperdicio

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

// Inicializar la aplicación
async function initializeApp() {
    console.log('Inicializando aplicación...');
    
    try {
        // Simular carga de datos (será reemplazado por storage.js en Task 2)
        await loadMockData();
        
        // Ocultar pantalla de carga y mostrar la aplicación
        setTimeout(() => {
            loadingElement.style.display = 'none';
            appElement.style.display = 'block';
            isAppInitialized = true;
            
            // Actualizar interfaz
            updateSummary();
            renderProductsList();
            
            console.log('Aplicación inicializada correctamente');
        }, 1000);
        
    } catch (error) {
        console.error('Error inicializando aplicación:', error);
        showError('Error al cargar la aplicación. Por favor, recarga la página.');
    }
}

// Cargar datos de ejemplo para desarrollo
async function loadMockData() {
    console.log('Cargando datos de ejemplo...');
    
    // Datos de ejemplo (serán reemplazados por localStorage en Task 2)
    products = [
        {
            id: '1',
            name: 'Manzanas Fuji',
            quantity: 5,
            expiryDate: getDateString(3), // 3 días en el futuro
            barcode: null,
            category: 'Frutas',
            imageUrl: null
        },
        {
            id: '2',
            name: 'Leche Entera',
            quantity: 1,
            expiryDate: getDateString(-1), // 1 día en el pasado (vencido)
            barcode: null,
            category: 'Lácteos',
            imageUrl: null
        },
        {
            id: '3',
            name: 'Pan Integral',
            quantity: 2,
            expiryDate: getDateString(1), // 1 día en el futuro
            barcode: null,
            category: 'Panadería',
            imageUrl: null
        },
        {
            id: '4',
            name: 'Tomates',
            quantity: 6,
            expiryDate: getDateString(7), // 7 días en el futuro
            barcode: null,
            category: 'Verduras',
            imageUrl: null
        },
        {
            id: '5',
            name: 'Arroz Integral',
            quantity: 1,
            expiryDate: getDateString(30), // 30 días en el futuro
            barcode: null,
            category: 'Granos',
            imageUrl: null
        }
    ];
    
    return products;
}

// Helper: obtener fecha formateada con offset de días
function getDateString(daysOffset) {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return date.toISOString().split('T')[0]; // Formato YYYY-MM-DD
}

// Actualizar resumen en la interfaz
function updateSummary() {
    if (!isAppInitialized) return;
    
    // Calcular productos por estado (será mejorado en Task 5)
    const today = new Date();
    let urgentCount = 0;
    let warningCount = 0;
    
    products.forEach(product => {
        const expiryDate = new Date(product.expiryDate);
        const daysUntil = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
        
        if (daysUntil <= 2) {
            urgentCount++;
        } else if (daysUntil <= 5) {
            warningCount++;
        }
    });
    
    // Actualizar elementos del DOM
    totalProductsElement.textContent = products.length;
    urgentProductsElement.textContent = urgentCount;
    warningProductsElement.textContent = warningCount;
}

// Renderizar lista de productos
function renderProductsList() {
    if (!productsListElement || !isAppInitialized) return;
    
    if (products.length === 0) {
        productsListElement.innerHTML = `
            <div class="empty-state">
                <p>No hay productos en tu despensa aún</p>
                <button id="add-first-product" class="btn-primary">Añadir primer producto</button>
            </div>
        `;
        
        // Re-asignar evento al botón
        const newAddFirstBtn = document.getElementById('add-first-product');
        if (newAddFirstBtn) {
            newAddFirstBtn.addEventListener('click', handleAddProduct);
        }
        
        return;
    }
    
    // Ordenar productos por fecha de expiración (más próximos primero)
    const sortedProducts = [...products].sort((a, b) => {
        return new Date(a.expiryDate) - new Date(b.expiryDate);
    });
    
    // Crear HTML de productos
    let productsHTML = '';
    
    sortedProducts.forEach(product => {
        const expiryDate = new Date(product.expiryDate);
        const today = new Date();
        const daysUntil = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
        
        // Determinar clase CSS según estado (será mejorado en Task 5)
        let statusClass = 'safe';
        let statusText = 'En buen estado';
        
        if (daysUntil < 0) {
            statusClass = 'expired';
            statusText = 'Vencido';
        } else if (daysUntil <= 2) {
            statusClass = 'urgent';
            statusText = 'Urgente';
        } else if (daysUntil <= 5) {
            statusClass = 'warning';
            statusText = 'Próximo';
        }
        
        // Formatear fecha legible
        const formattedDate = expiryDate.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
        
        productsHTML += `
            <div class="product-card ${statusClass}" data-id="${product.id}">
                <div class="product-card-header">
                    <h3 class="product-name">${product.name}</h3>
                    <span class="product-quantity">${product.quantity} unidad${product.quantity !== 1 ? 'es' : ''}</span>
                </div>
                <div class="product-card-content">
                    <p class="product-category">${product.category}</p>
                    <p class="product-expiry">
                        <strong>Caduca:</strong> ${formattedDate}
                        <span class="product-status ${statusClass}">${statusText}</span>
                    </p>
                </div>
                <div class="product-card-actions">
                    <button class="btn-secondary edit-product" data-id="${product.id}">Editar</button>
                    <button class="btn-secondary delete-product" data-id="${product.id}">Eliminar</button>
                </div>
            </div>
        `;
    });
    
    productsListElement.innerHTML = productsHTML;
    
    // Añadir eventos a los botones de productos
    attachProductEvents();
}

// Añadir eventos a los botones de productos
function attachProductEvents() {
    const editButtons = document.querySelectorAll('.edit-product');
    const deleteButtons = document.querySelectorAll('.delete-product');
    
    editButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const productId = e.target.dataset.id;
            console.log('Editar producto:', productId);
            showToast('Función de edición disponible en Task 4');
        });
    });
    
    deleteButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const productId = e.target.dataset.id;
            if (confirm('¿Eliminar este producto?')) {
                deleteProduct(productId);
            }
        });
    });
}

// Eliminar producto
function deleteProduct(productId) {
    products = products.filter(product => product.id !== productId);
    updateSummary();
    renderProductsList();
    showToast('Producto eliminado');
}

// Manejar añadir producto
function handleAddProduct() {
    console.log('Añadir producto');
    showToast('Funcionalidad de añadir producto disponible en Task 3 y 4');
}

// Mostrar toast notification
function showToast(message, duration = 3000) {
    // Usar la función del register-sw.js si está disponible
    if (typeof window.showToast === 'function') {
        window.showToast(message, duration);
        return;
    }
    
    // Implementación básica como fallback
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: var(--primary-color);
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 1000;
        animation: slideUp 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideDown 0.3s ease forwards';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, duration);
}

// Mostrar error
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: var(--danger-color);
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        z-index: 1000;
        animation: slideUp 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    `;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.style.animation = 'slideDown 0.3s ease forwards';
        setTimeout(() => {
            document.body.removeChild(errorDiv);
        }, 300);
    }, 5000);
}

// Manejar botones de navegación
function setupNavigation() {
    scanBtn.addEventListener('click', () => {
        console.log('Escanear código de barras');
        showToast('Funcionalidad de escaneo disponible en Task 3');
    });
    
    homeBtn.addEventListener('click', () => {
        console.log('Ir a inicio');
        showToast('Ya estás en la página de inicio');
    });
    
    recipesBtn.addEventListener('click', () => {
        console.log('Ver recetas');
        showToast('Funcionalidad de recetas disponible en Task 6');
    });
}

// Añadir CSS para animaciones de toast (si no existen)
function ensureToastStyles() {
    if (!document.querySelector('#toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateX(-50%) translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }
            }
            
            @keyframes slideDown {
                from {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }
                to {
                    opacity: 0;
                    transform: translateX(-50%) translateY(20px);
                }
            }
            
            @media (prefers-reduced-motion: reduce) {
                @keyframes slideUp, @keyframes slideDown {
                    from, to { opacity: 1; transform: none; }
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Configurar eventos cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM cargado, configurando aplicación...');
    
    // Añadir estilos para toast
    ensureToastStyles();
    
    // Configurar navegación
    setupNavigation();
    
    // Configurar botones principales
    if (addProductBtn) {
        addProductBtn.addEventListener('click', handleAddProduct);
    }
    
    if (addFirstProductBtn) {
        addFirstProductBtn.addEventListener('click', handleAddProduct);
    }
    
    // Inicializar la aplicación
    initializeApp();
});

// Verificar estado offline/online
window.addEventListener('online', () => {
    showToast('Conectado a internet');
});

window.addEventListener('offline', () => {
    showToast('Estás offline. Algunas funciones pueden no estar disponibles.', 5000);
});

// API Pública para otros módulos
window.despensaApp = {
    initializeApp,
    updateSummary,
    renderProductsList,
    showToast,
    showError,
    handleAddProduct
};