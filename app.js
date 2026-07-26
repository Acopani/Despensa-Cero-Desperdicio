// app.js - Lógica principal de la aplicación Despensa Cero Desperdicio
// Actualizado para usar el sistema de almacenamiento storage.js

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

// Variables para modales
let currentModal = null;

// Inicializar la aplicación
async function initializeApp() {
    console.log('Inicializando aplicación...');
    
    try {
        // Verificar si el módulo de almacenamiento está disponible
        if (typeof window.productStorage === 'undefined') {
            throw new Error('Módulo de almacenamiento no disponible');
        }
        
        // Cargar datos desde localStorage
        await loadProductsFromStorage();
        
        // Ocultar pantalla de carga y mostrar la aplicación
        setTimeout(() => {
            loadingElement.style.display = 'none';
            appElement.style.display = 'block';
            isAppInitialized = true;
            
            // Actualizar interfaz
            updateSummary();
            renderProductsList();
            
            console.log('Aplicación inicializada correctamente');
            
            // Mostrar estadísticas en consola
            const stats = window.productStorage.getStatistics();
            console.log('Estadísticas:', stats);
            
        }, 800);
        
    } catch (error) {
        console.error('Error inicializando aplicación:', error);
        showError('Error al cargar la aplicación. Por favor, recarga la página.');
    }
}

// Cargar productos desde el almacenamiento
async function loadProductsFromStorage() {
    console.log('Cargando productos desde almacenamiento...');
    
    if (window.productStorage) {
        products = window.productStorage.getAll();
        console.log(`Productos cargados: ${products.length}`);
        
        // Si no hay productos, añadir datos de ejemplo para desarrollo
        if (products.length === 0 && window.location.hostname === 'localhost') {
            console.log('Añadiendo datos de ejemplo para desarrollo...');
            await addSampleProducts();
            products = window.productStorage.getAll();
        }
    } else {
        throw new Error('Sistema de almacenamiento no disponible');
    }
    
    return products;
}

// Añadir productos de ejemplo para desarrollo
async function addSampleProducts() {
    const sampleProducts = [
        {
            name: 'Manzanas Fuji',
            quantity: 5,
            expiryDate: getDateString(3), // 3 días en el futuro
            category: 'Frutas',
            notes: 'Comprar en el mercado local'
        },
        {
            name: 'Leche Entera',
            quantity: 1,
            expiryDate: getDateString(-1), // 1 día en el pasado (vencido)
            category: 'Lácteos',
            notes: 'Cartón de 1L'
        },
        {
            name: 'Pan Integral',
            quantity: 2,
            expiryDate: getDateString(1), // 1 día en el futuro
            category: 'Panadería',
            notes: 'Pan de molde'
        },
        {
            name: 'Tomates',
            quantity: 6,
            expiryDate: getDateString(7), // 7 días en el futuro
            category: 'Verduras',
            notes: 'Tomate cherry'
        },
        {
            name: 'Arroz Integral',
            quantity: 1,
            expiryDate: getDateString(30), // 30 días en el futuro
            category: 'Granos',
            notes: 'Paquete de 1kg'
        },
        {
            name: 'Yogur Natural',
            quantity: 4,
            expiryDate: getDateString(4), // 4 días en el futuro
            category: 'Lácteos',
            notes: 'Envase de 125g'
        },
        {
            name: 'Queso Cheddar',
            quantity: 1,
            expiryDate: getDateString(10), // 10 días en el futuro
            category: 'Lácteos',
            notes: 'Queso en lonchas'
        },
        {
            name: 'Huevos',
            quantity: 12,
            expiryDate: getDateString(14), // 14 días en el futuro
            category: 'Otros',
            notes: 'Docena de huevos'
        }
    ];
    
    sampleProducts.forEach(product => {
        try {
            window.productStorage.add(product);
        } catch (error) {
            console.error('Error añadiendo producto de ejemplo:', error);
        }
    });
    
    console.log(`${sampleProducts.length} productos de ejemplo añadidos`);
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
    
    if (window.productStorage) {
        const summary = window.productStorage.getSummary();
        
        // Actualizar elementos del DOM
        totalProductsElement.textContent = summary.total;
        urgentProductsElement.textContent = summary.urgent;
        warningProductsElement.textContent = summary.warning;
        
        // Actualizar colores de las tarjetas
        updateSummaryCardColors();
        
    } else {
        // Fallback a cálculo manual
        const today = new Date();
        let urgentCount = 0;
        let warningCount = 0;
        
        products.forEach(product => {
            if (product.expiryStatus === 'urgent') {
                urgentCount++;
            } else if (product.expiryStatus === 'warning') {
                warningCount++;
            }
        });
        
        totalProductsElement.textContent = products.length;
        urgentProductsElement.textContent = urgentCount;
        warningProductsElement.textContent = warningCount;
    }
}

// Actualizar colores de las tarjetas de resumen
function updateSummaryCardColors() {
    const urgentCard = document.querySelector('.summary-card.urgent');
    const warningCard = document.querySelector('.summary-card.warning');
    
    if (urgentCard) {
        const urgentCount = parseInt(urgentProductsElement.textContent);
        if (urgentCount > 0) {
            urgentCard.style.backgroundColor = 'var(--danger-color)';
            urgentCard.style.color = 'white';
        } else {
            urgentCard.style.backgroundColor = '';
            urgentCard.style.color = '';
        }
    }
    
    if (warningCard) {
        const warningCount = parseInt(warningProductsElement.textContent);
        if (warningCount > 0) {
            warningCard.style.backgroundColor = 'var(--warning-color)';
            warningCard.style.color = 'white';
        } else {
            warningCard.style.backgroundColor = '';
            warningCard.style.color = '';
        }
    }
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
        const dateA = a.expiryDate ? new Date(a.expiryDate) : new Date(9999, 11, 31);
        const dateB = b.expiryDate ? new Date(b.expiryDate) : new Date(9999, 11, 31);
        return dateA - dateB;
    });
    
    // Crear HTML de productos
    let productsHTML = '';
    
    sortedProducts.forEach(product => {
        const expiryDate = product.expiryDate ? new Date(product.expiryDate) : null;
        
        // Determinar clase CSS según estado
        let statusClass = product.expiryStatus || 'safe';
        let statusText = getStatusText(product.expiryStatus);
        
        // Formatear fecha legible
        let formattedDate = 'Sin fecha';
        if (expiryDate) {
            formattedDate = expiryDate.toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short',
                year: expiryDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
            });
        }
        
        // Formatear días restantes
        let daysText = '';
        if (product.daysUntil !== null && product.daysUntil !== undefined) {
            if (product.daysUntil < 0) {
                daysText = `Hace ${Math.abs(product.daysUntil)} días`;
            } else if (product.daysUntil === 0) {
                daysText = 'Hoy';
            } else {
                daysText = `En ${product.daysUntil} día${product.daysUntil !== 1 ? 's' : ''}`;
            }
        }
        
        productsHTML += `
            <div class="product-card ${statusClass}" data-id="${product.id}">
                <div class="product-card-header">
                    <h3 class="product-name">${escapeHtml(product.name)}</h3>
                    <span class="product-quantity">${product.quantity} unidad${product.quantity !== 1 ? 'es' : ''}</span>
                </div>
                <div class="product-card-content">
                    <p class="product-category">${escapeHtml(product.category)}</p>
                    <p class="product-expiry">
                        <strong>Caduca:</strong> ${formattedDate}
                        <span class="product-status ${statusClass}">${statusText} ${daysText ? `(${daysText})` : ''}</span>
                    </p>
                    ${product.notes ? `<p class="product-notes"><em>${escapeHtml(product.notes)}</em></p>` : ''}
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

// Obtener texto para estado
function getStatusText(status) {
    switch (status) {
        case 'urgent': return 'Urgente';
        case 'warning': return 'Próximo';
        case 'expired': return 'Vencido';
        case 'safe': return 'En buen estado';
        default: return 'Sin fecha';
    }
}

// Escapar HTML para seguridad
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Añadir eventos a los botones de productos
function attachProductEvents() {
    const editButtons = document.querySelectorAll('.edit-product');
    const deleteButtons = document.querySelectorAll('.delete-product');
    
    editButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const productId = e.target.dataset.id;
            console.log('Editar producto:', productId);
            showEditProductModal(productId);
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
    try {
        if (window.productStorage) {
            const deletedProduct = window.productStorage.remove(productId);
            
            // Actualizar lista local
            products = products.filter(product => product.id !== productId);
            
            // Actualizar interfaz
            updateSummary();
            renderProductsList();
            
            showToast(`Producto "${deletedProduct.name}" eliminado`);
            
        } else {
            throw new Error('Sistema de almacenamiento no disponible');
        }
        
    } catch (error) {
        console.error('Error eliminando producto:', error);
        showError('Error al eliminar el producto');
    }
}

// Mostrar modal para añadir producto
function handleAddProduct() {
    console.log('Mostrar modal para añadir producto');
    showAddProductModal();
}

// Mostrar modal para añadir producto
function showAddProductModal() {
    // Obtener categorías disponibles
    const categories = window.productStorage ? window.productStorage.getCategories() : [
        'Frutas', 'Verduras', 'Lácteos', 'Carnes', 'Panadería', 'Granos', 'Otros'
    ];
    
    const categoriesOptions = categories.map(cat => 
        `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`
    ).join('');
    
    // Fecha mínima (hoy)
    const today = new Date().toISOString().split('T')[0];
    // Fecha sugerida (7 días desde hoy)
    const suggestedDate = new Date();
    suggestedDate.setDate(suggestedDate.getDate() + 7);
    const suggestedDateStr = suggestedDate.toISOString().split('T')[0];
    
    const modalHTML = `
        <div class="modal-overlay" id="add-product-modal">
            <div class="modal">
                <div class="modal-header">
                    <h2 class="modal-title">Añadir Producto</h2>
                    <button class="modal-close" onclick="closeModal()">×</button>
                </div>
                <div class="modal-content">
                    <form id="add-product-form">
                        <div class="form-group">
                            <label for="product-name" class="form-label">Nombre del producto *</label>
                            <input type="text" id="product-name" class="form-input" 
                                   placeholder="Ej: Manzanas, Leche, Pan..." required>
                        </div>
                        
                        <div class="form-group">
                            <label for="product-quantity" class="form-label">Cantidad</label>
                            <input type="number" id="product-quantity" class="form-input" 
                                   value="1" min="1" max="999">
                        </div>
                        
                        <div class="form-group">
                            <label for="product-category" class="form-label">Categoría</label>
                            <select id="product-category" class="form-select">
                                ${categoriesOptions}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="expiry-date" class="form-label">Fecha de caducidad</label>
                            <input type="date" id="expiry-date" class="form-input" 
                                   min="${today}" value="${suggestedDateStr}">
                        </div>
                        
                        <div class="form-group">
                            <label for="product-notes" class="form-label">Notas (opcional)</label>
                            <textarea id="product-notes" class="form-input" 
                                      rows="3" placeholder="Ej: Comprado en..., Guardar en refrigerador..."></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label for="product-barcode" class="form-label">Código de barras (opcional)</label>
                            <input type="text" id="product-barcode" class="form-input" 
                                   placeholder="1234567890123">
                        </div>
                        
                        <div style="display: flex; gap: 12px; margin-top: 24px;">
                            <button type="button" class="btn-secondary" onclick="closeModal()" style="flex: 1;">
                                Cancelar
                            </button>
                            <button type="submit" class="btn-primary" style="flex: 2;">
                                Guardar Producto
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    // Insertar modal en el contenedor
    const modalsContainer = document.getElementById('modals-container');
    modalsContainer.innerHTML = modalHTML;
    
    // Asignar evento al formulario
    const form = document.getElementById('add-product-form');
    form.addEventListener('submit', handleAddProductSubmit);
    
    // Guardar referencia al modal actual
    currentModal = 'add-product-modal';
    
    // Enfocar el primer campo
    setTimeout(() => {
        document.getElementById('product-name').focus();
    }, 100);
}

// Mostrar modal para editar producto
function showEditProductModal(productId) {
    const product = window.productStorage.getById(productId);
    if (!product) {
        showError('Producto no encontrado');
        return;
    }
    
    // Obtener categorías disponibles
    const categories = window.productStorage.getCategories();
    const categoriesOptions = categories.map(cat => 
        `<option value="${escapeHtml(cat)}" ${cat === product.category ? 'selected' : ''}>
            ${escapeHtml(cat)}
        </option>`
    ).join('');
    
    const modalHTML = `
        <div class="modal-overlay" id="edit-product-modal">
            <div class="modal">
                <div class="modal-header">
                    <h2 class="modal-title">Editar Producto</h2>
                    <button class="modal-close" onclick="closeModal()">×</button>
                </div>
                <div class="modal-content">
                    <form id="edit-product-form" data-id="${productId}">
                        <div class="form-group">
                            <label for="edit-product-name" class="form-label">Nombre del producto *</label>
                            <input type="text" id="edit-product-name" class="form-input" 
                                   value="${escapeHtml(product.name)}" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-product-quantity" class="form-label">Cantidad</label>
                            <input type="number" id="edit-product-quantity" class="form-input" 
                                   value="${product.quantity}" min="1" max="999">
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-product-category" class="form-label">Categoría</label>
                            <select id="edit-product-category" class="form-select">
                                ${categoriesOptions}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-expiry-date" class="form-label">Fecha de caducidad</label>
                            <input type="date" id="edit-expiry-date" class="form-input" 
                                   value="${product.expiryDate || ''}">
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-product-notes" class="form-label">Notas (opcional)</label>
                            <textarea id="edit-product-notes" class="form-input" 
                                      rows="3">${escapeHtml(product.notes || '')}</textarea>
                        </div>
                        
                        <div style="display: flex; gap: 12px; margin-top: 24px;">
                            <button type="button" class="btn-secondary" onclick="closeModal()" style="flex: 1;">
                                Cancelar
                            </button>
                            <button type="submit" class="btn-primary" style="flex: 2;">
                                Actualizar Producto
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    // Insertar modal en el contenedor
    const modalsContainer = document.getElementById('modals-container');
    modalsContainer.innerHTML = modalHTML;
    
    // Asignar evento al formulario
    const form = document.getElementById('edit-product-form');
    form.addEventListener('submit', (e) => handleEditProductSubmit(e, productId));
    
    // Guardar referencia al modal actual
    currentModal = 'edit-product-modal';
}

// Manejar envío del formulario de añadir producto
function handleAddProductSubmit(event) {
    event.preventDefault();
    
    try {
        const formData = {
            name: document.getElementById('product-name').value.trim(),
            quantity: document.getElementById('product-quantity').value,
            category: document.getElementById('product-category').value,
            expiryDate: document.getElementById('expiry-date').value,
            notes: document.getElementById('product-notes').value.trim(),
            barcode: document.getElementById('product-barcode').value.trim() || null
        };
        
        // Validar campos requeridos
        if (!formData.name) {
            showError('El nombre del producto es requerido');
            return;
        }
        
        // Añadir producto usando storage
        const newProduct = window.productStorage.add(formData);
        
        // Actualizar lista local
        products.push(newProduct);
        
        // Actualizar interfaz
        updateSummary();
        renderProductsList();
        
        // Cerrar modal y mostrar mensaje
        closeModal();
        showToast(`Producto "${formData.name}" añadido correctamente`);
        
        console.log('Producto añadido:', newProduct);
        
    } catch (error) {
        console.error('Error añadiendo producto:', error);
        showError(error.message || 'Error al añadir el producto');
    }
}

// Manejar envío del formulario de editar producto
function handleEditProductSubmit(event, productId) {
    event.preventDefault();
    
    try {
        const formData = {
            name: document.getElementById('edit-product-name').value.trim(),
            quantity: document.getElementById('edit-product-quantity').value,
            category: document.getElementById('edit-product-category').value,
            expiryDate: document.getElementById('edit-expiry-date').value,
            notes: document.getElementById('edit-product-notes').value.trim()
        };
        
        // Validar campos requeridos
        if (!formData.name) {
            showError('El nombre del producto es requerido');
            return;
        }
        
        // Actualizar producto usando storage
        const updatedProduct = window.productStorage.update(productId, formData);
        
        // Actualizar producto en lista local
        const productIndex = products.findIndex(p => p.id === productId);
        if (productIndex !== -1) {
            products[productIndex] = updatedProduct;
        }
        
        // Actualizar interfaz
        updateSummary();
        renderProductsList();
        
        // Cerrar modal y mostrar mensaje
        closeModal();
        showToast(`Producto "${formData.name}" actualizado correctamente`);
        
        console.log('Producto actualizado:', updatedProduct);
        
    } catch (error) {
        console.error('Error actualizando producto:', error);
        showError(error.message || 'Error al actualizar el producto');
    }
}

// Cerrar modal actual
function closeModal() {
    const modalsContainer = document.getElementById('modals-container');
    modalsContainer.innerHTML = '';
    currentModal = null;
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
        // Ya estamos en inicio, pero podemos recargar los datos
        products = window.productStorage.getAll();
        updateSummary();
        renderProductsList();
        showToast('Datos actualizados');
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
            
            .product-notes {
                font-size: 0.9em;
                color: var(--text-light);
                margin-top: 8px;
                font-style: italic;
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
    
    // Hacer funciones globalmente disponibles
    window.closeModal = closeModal;
    window.handleAddProduct = handleAddProduct;
});

// Verificar estado offline/online
window.addEventListener('online', () => {
    showToast('Conectado a internet');
});

window.addEventListener('offline', () => {
    showToast('Estás offline. La aplicación funciona localmente.', 5000);
});

// API Pública para otros módulos
window.despensaApp = {
    initializeApp,
    updateSummary,
    renderProductsList,
    showToast,
    showError,
    handleAddProduct,
    showAddProductModal,
    showEditProductModal,
    closeModal
};