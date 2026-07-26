// manual-form.js - Módulo de formulario manual para Despensa Cero Desperdicio
// Formulario optimizado para entrada rápida de productos sin código de barras

class ManualProductForm {
    constructor() {
        this.currentModal = null;
        this.autoCompleteData = null;
        this.lastProductNames = new Set();
        this.formDefaults = {
            quantity: 1,
            expiryDays: {
                'Frutas': 7,
                'Verduras': 5,
                'Lácteos': 10,
                'Carnes': 3,
                'Pescados': 2,
                'Panadería': 3,
                'Granos': 30,
                'Enlatados': 365,
                'Congelados': 90,
                'Bebidas': 180,
                'Especias': 365,
                'Otros': 14
            }
        };
        
        console.log('Inicializando formulario manual');
        this.loadAutoCompleteData();
    }
    
    // Cargar datos para autocomplete
    loadAutoCompleteData() {
        try {
            if (window.productStorage) {
                const products = window.productStorage.getAll();
                this.lastProductNames = new Set(products.map(p => p.name.toLowerCase()));
                console.log(`Datos de autocomplete cargados: ${this.lastProductNames.size} nombres únicos`);
            }
        } catch (error) {
            console.error('Error cargando datos para autocomplete:', error);
        }
    }
    
    // Mostrar formulario manual
    showManualForm(prefilledData = {}) {
        if (this.currentModal) {
            console.log('El formulario manual ya está abierto');
            return;
        }
        
        // Cargar categorías disponibles
        const categories = window.productStorage ? window.productStorage.getCategories() : 
            Object.keys(this.formDefaults.expiryDays);
        
        // Generar opciones de categorías
        const categoriesOptions = categories.map(cat => 
            `<option value="${this.escapeHtml(cat)}">${this.escapeHtml(cat)}</option>`
        ).join('');
        
        // Calcular fechas sugeridas
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        
        // Preparar datos pre-llenados
        const barcode = prefilledData.barcode || '';
        const name = prefilledData.name || '';
        const category = prefilledData.category || 'Otros';
        const suggestedDate = this.calculateSuggestedDate(category);
        
        const modalHTML = `
            <div class="modal-overlay" id="manual-form-modal">
                <div class="modal manual-form-modal">
                    <div class="modal-header">
                        <h2 class="modal-title">${barcode ? 'Registro Manual de Producto' : 'Añadir Producto Manualmente'}</h2>
                        <button class="modal-close" onclick="window.manualForm.closeForm()">×</button>
                    </div>
                    <div class="modal-content manual-form-content">
                        ${barcode ? `<div class="barcode-notice">
                            <p>📷 <strong>Código escaneado:</strong> ${barcode}</p>
                            <p>No encontrado en la base de datos. Por favor, completa la información manualmente.</p>
                        </div>` : ''}
                        
                        <form id="manual-product-form" class="manual-form">
                            <div class="form-row">
                                <div class="form-group" style="flex: 2;">
                                    <label for="manual-product-name" class="form-label">
                                        Nombre del producto *
                                        <span class="form-hint" id="name-hint"></span>
                                    </label>
                                    <input type="text" 
                                           id="manual-product-name" 
                                           class="form-input" 
                                           value="${this.escapeHtml(name)}"
                                           placeholder="Ej: Manzanas, Leche, Pan integral..."
                                           required
                                           autocomplete="off"
                                           list="product-suggestions">
                                    <datalist id="product-suggestions"></datalist>
                                </div>
                                
                                <div class="form-group" style="flex: 1;">
                                    <label for="manual-product-quantity" class="form-label">Cantidad</label>
                                    <div class="quantity-control">
                                        <button type="button" class="quantity-btn minus" onclick="window.manualForm.adjustQuantity(-1)">−</button>
                                        <input type="number" 
                                               id="manual-product-quantity" 
                                               class="form-input quantity-input" 
                                               value="${prefilledData.quantity || this.formDefaults.quantity}"
                                               min="1" 
                                               max="999">
                                        <button type="button" class="quantity-btn plus" onclick="window.manualForm.adjustQuantity(1)">+</button>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group" style="flex: 1;">
                                    <label for="manual-product-category" class="form-label">Categoría</label>
                                    <select id="manual-product-category" 
                                            class="form-select" 
                                            onchange="window.manualForm.updateSuggestedDate()">
                                        ${categoriesOptions}
                                    </select>
                                </div>
                                
                                <div class="form-group" style="flex: 1;">
                                    <label for="manual-expiry-date" class="form-label">
                                        Fecha de caducidad
                                        <span class="form-hint" id="date-hint"></span>
                                    </label>
                                    <input type="date" 
                                           id="manual-expiry-date" 
                                           class="form-input" 
                                           value="${suggestedDate}"
                                           min="${today.toISOString().split('T')[0]}">
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="manual-product-notes" class="form-label">
                                    Notas (opcional)
                                    <span class="form-hint">Marca, lugar de compra, instrucciones especiales...</span>
                                </label>
                                <textarea id="manual-product-notes" 
                                          class="form-input" 
                                          rows="2" 
                                          placeholder="Ej: Comprado en el mercado local, Guardar en refrigerador...">${this.escapeHtml(prefilledData.notes || '')}</textarea>
                            </div>
                            
                            ${barcode ? `<input type="hidden" id="manual-product-barcode" value="${barcode}">` : 
                              `<div class="form-group">
                                <label for="manual-product-barcode" class="form-label">Código de barras (opcional)</label>
                                <input type="text" 
                                       id="manual-product-barcode" 
                                       class="form-input" 
                                       value="${this.escapeHtml(barcode)}"
                                       placeholder="1234567890123">
                              </div>`}
                            
                            <div class="form-actions">
                                <button type="button" class="btn-secondary" onclick="window.manualForm.closeForm()">
                                    Cancelar
                                </button>
                                <button type="submit" class="btn-primary">
                                    <span id="submit-text">Guardar Producto</span>
                                    <span id="submit-loading" style="display: none;">🔄 Guardando...</span>
                                </button>
                            </div>
                        </form>
                        
                        <div class="form-tips">
                            <h4>💡 Consejos para registro rápido:</h4>
                            <ul>
                                <li>Usa el <strong>autocompletado</strong> para productos recurrentes</li>
                                <li>La <strong>fecha se sugiere automáticamente</strong> según la categoría</li>
                                <li>Presiona <strong>Enter</strong> para guardar rápidamente</li>
                                <li>Usa los botones +/- para ajustar cantidad rápidamente</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Insertar modal en el contenedor
        const modalsContainer = document.getElementById('modals-container');
        modalsContainer.innerHTML = modalHTML;
        
        // Guardar referencia al modal actual
        this.currentModal = 'manual-form-modal';
        
        // Inicializar eventos
        this.setupFormEvents();
        
        // Configurar autocomplete
        this.setupAutoComplete();
        
        // Actualizar sugerencia de fecha inicial
        this.updateSuggestedDate();
        
        // Actualizar hint de nombre si hay datos
        if (name) {
            this.updateNameHint(name);
        }
        
        // Enfocar el campo de nombre
        setTimeout(() => {
            const nameInput = document.getElementById('manual-product-name');
            if (nameInput) {
                nameInput.focus();
                nameInput.select();
            }
        }, 100);
        
        console.log('Formulario manual mostrado');
    }
    
    // Configurar eventos del formulario
    setupFormEvents() {
        const form = document.getElementById('manual-product-form');
        if (!form) return;
        
        // Submit del formulario
        form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        
        // Autocomplete en campo nombre
        const nameInput = document.getElementById('manual-product-name');
        if (nameInput) {
            nameInput.addEventListener('input', (e) => this.handleNameInput(e));
            nameInput.addEventListener('keydown', (e) => this.handleNameKeydown(e));
        }
        
        // Enter para guardar rápido
        form.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                if (!e.target.matches('button, [type="submit"]')) {
                    e.preventDefault();
                    const submitBtn = form.querySelector('button[type="submit"]');
                    if (submitBtn) submitBtn.click();
                }
            }
        });
        
        // Cambios en categoría
        const categorySelect = document.getElementById('manual-product-category');
        if (categorySelect) {
            categorySelect.addEventListener('change', () => this.updateSuggestedDate());
        }
    }
    
    // Configurar autocomplete
    setupAutoComplete() {
        const nameInput = document.getElementById('manual-product-name');
        const suggestionsDatalist = document.getElementById('product-suggestions');
        
        if (!nameInput || !suggestionsDatalist || this.lastProductNames.size === 0) {
            return;
        }
        
        // Limpiar sugerencias anteriores
        suggestionsDatalist.innerHTML = '';
        
        // Añadir sugerencias
        this.lastProductNames.forEach(productName => {
            const option = document.createElement('option');
            option.value = productName;
            suggestionsDatalist.appendChild(option);
        });
        
        console.log('Autocomplete configurado con', this.lastProductNames.size, 'sugerencias');
    }
    
    // Manejar entrada en campo nombre
    handleNameInput(event) {
        const input = event.target;
        const value = input.value.trim().toLowerCase();
        
        // Actualizar hint
        this.updateNameHint(value);
        
        // Si el nombre coincide con uno existente, sugerir categoría
        if (value && window.productStorage) {
            const products = window.productStorage.getAll();
            const matchingProduct = products.find(p => 
                p.name.toLowerCase() === value || 
                p.name.toLowerCase().includes(value)
            );
            
            if (matchingProduct) {
                const categorySelect = document.getElementById('manual-product-category');
                if (categorySelect) {
                    // Buscar opción que coincida
                    for (let option of categorySelect.options) {
                        if (option.value === matchingProduct.category) {
                            categorySelect.value = option.value;
                            this.updateSuggestedDate();
                            break;
                        }
                    }
                }
            }
        }
    }
    
    // Manejar teclas en campo nombre
    handleNameKeydown(event) {
        // Tab para autocompletar
        if (event.key === 'Tab' && !event.shiftKey) {
            const input = event.target;
            const value = input.value.trim().toLowerCase();
            
            if (value && this.lastProductNames.size > 0) {
                // Buscar coincidencia parcial
                const match = Array.from(this.lastProductNames).find(name => 
                    name.startsWith(value) && name !== value
                );
                
                if (match) {
                    event.preventDefault();
                    input.value = this.capitalizeFirstLetter(match);
                    this.updateNameHint(match);
                    input.select();
                }
            }
        }
    }
    
    // Actualizar hint del nombre
    updateNameHint(name) {
        const hintElement = document.getElementById('name-hint');
        if (!hintElement) return;
        
        const nameLower = name.toLowerCase().trim();
        
        if (!nameLower) {
            hintElement.textContent = '';
            hintElement.className = 'form-hint';
            return;
        }
        
        if (this.lastProductNames.has(nameLower)) {
            hintElement.textContent = '✓ Producto registrado anteriormente';
            hintElement.className = 'form-hint success';
        } else {
            // Verificar similitudes
            const similarNames = Array.from(this.lastProductNames).filter(existingName =>
                existingName.includes(nameLower) || nameLower.includes(existingName)
            );
            
            if (similarNames.length > 0) {
                hintElement.textContent = `Similar a: ${similarNames.slice(0, 2).map(n => this.capitalizeFirstLetter(n)).join(', ')}`;
                hintElement.className = 'form-hint info';
            } else {
                hintElement.textContent = 'Nuevo producto';
                hintElement.className = 'form-hint new';
            }
        }
    }
    
    // Actualizar fecha sugerida basada en categoría
    updateSuggestedDate() {
        const categorySelect = document.getElementById('manual-product-category');
        const dateInput = document.getElementById('manual-expiry-date');
        const hintElement = document.getElementById('date-hint');
        
        if (!categorySelect || !dateInput || !hintElement) return;
        
        const category = categorySelect.value;
        const suggestedDate = this.calculateSuggestedDate(category);
        
        // Solo actualizar si el campo está vacío o tiene el valor por defecto
        if (!dateInput.value || dateInput.value === dateInput.defaultValue) {
            dateInput.value = suggestedDate;
        }
        
        // Actualizar hint
        const defaultDays = this.formDefaults.expiryDays[category] || 14;
        hintElement.textContent = `Sugerencia: ${defaultDays} días`;
        hintElement.className = 'form-hint info';
    }
    
    // Calcular fecha sugerida
    calculateSuggestedDate(category) {
        const defaultDays = this.formDefaults.expiryDays[category] || 14;
        const date = new Date();
        date.setDate(date.getDate() + defaultDays);
        return date.toISOString().split('T')[0];
    }
    
    // Ajustar cantidad con botones +/- 
    adjustQuantity(change) {
        const quantityInput = document.getElementById('manual-product-quantity');
        if (!quantityInput) return;
        
        let currentValue = parseInt(quantityInput.value) || this.formDefaults.quantity;
        let newValue = currentValue + change;
        
        // Validar límites
        if (newValue < 1) newValue = 1;
        if (newValue > 999) newValue = 999;
        
        quantityInput.value = newValue;
        
        // Animación de feedback
        const button = change > 0 ? document.querySelector('.quantity-btn.plus') : 
                                   document.querySelector('.quantity-btn.minus');
        if (button) {
            button.classList.add('pressed');
            setTimeout(() => button.classList.remove('pressed'), 200);
        }
    }
    
    // Manejar envío del formulario
    async handleFormSubmit(event) {
        event.preventDefault();
        
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const submitText = document.getElementById('submit-text');
        const submitLoading = document.getElementById('submit-loading');
        
        try {
            // Cambiar estado del botón
            if (submitText && submitLoading) {
                submitText.style.display = 'none';
                submitLoading.style.display = 'inline';
            }
            
            if (submitBtn) {
                submitBtn.disabled = true;
            }
            
            // Validar y obtener datos del formulario
            const formData = this.getFormData();
            
            // Validaciones adicionales
            if (!this.validateFormData(formData)) {
                throw new Error('Por favor, completa todos los campos requeridos correctamente.');
            }
            
            // Añadir producto usando storage
            const newProduct = window.productStorage.add(formData);
            
            // Actualizar datos de autocomplete
            this.lastProductNames.add(formData.name.toLowerCase());
            this.updateAutoCompleteSuggestions();
            
            // Cerrar formulario
            this.closeForm();
            
            // Mostrar mensaje de éxito
            setTimeout(() => {
                if (window.despensaApp && window.despensaApp.showToast) {
                    window.despensaApp.showToast(`✅ Producto "${formData.name}" añadido correctamente`);
                }
                
                // Actualizar interfaz principal
                if (window.despensaApp && window.despensaApp.updateSummary) {
                    window.despensaApp.updateSummary();
                }
                if (window.despensaApp && window.despensaApp.renderProductsList) {
                    window.despensaApp.renderProductsList();
                }
            }, 300);
            
            console.log('Producto añadido manualmente:', newProduct);
            
        } catch (error) {
            console.error('Error en formulario manual:', error);
            
            // Restaurar estado del botón
            if (submitText && submitLoading) {
                submitText.style.display = 'inline';
                submitLoading.style.display = 'none';
            }
            
            if (submitBtn) {
                submitBtn.disabled = false;
            }
            
            // Mostrar error
            this.showFormError(error.message || 'Error al guardar el producto');
            
        }
    }
    
    // Obtener datos del formulario
    getFormData() {
        return {
            name: document.getElementById('manual-product-name').value.trim(),
            quantity: parseInt(document.getElementById('manual-product-quantity').value) || this.formDefaults.quantity,
            category: document.getElementById('manual-product-category').value,
            expiryDate: document.getElementById('manual-expiry-date').value,
            notes: document.getElementById('manual-product-notes').value.trim() || null,
            barcode: document.getElementById('manual-product-barcode') ? 
                    document.getElementById('manual-product-barcode').value.trim() || null : null
        };
    }
    
    // Validar datos del formulario
    validateFormData(formData) {
        // Nombre requerido
        if (!formData.name || formData.name.trim() === '') {
            this.highlightFieldError('manual-product-name', 'El nombre del producto es requerido');
            return false;
        }
        
        // Cantidad válida
        if (isNaN(formData.quantity) || formData.quantity < 1) {
            this.highlightFieldError('manual-product-quantity', 'La cantidad debe ser al menos 1');
            return false;
        }
        
        // Categoría válida
        if (!formData.category) {
            this.highlightFieldError('manual-product-category', 'Selecciona una categoría');
            return false;
        }
        
        // Fecha válida (opcional)
        if (formData.expiryDate) {
            const expiryDate = new Date(formData.expiryDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (expiryDate < today) {
                this.highlightFieldError('manual-expiry-date', 'La fecha no puede ser en el pasado');
                return false;
            }
        }
        
        return true;
    }
    
    // Resaltar error en campo
    highlightFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
        if (!field) return;
        
        // Añadir clase de error
        field.classList.add('error');
        
        // Mostrar mensaje de error
        let errorElement = field.parentNode.querySelector('.field-error');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'field-error';
            field.parentNode.appendChild(errorElement);
        }
        errorElement.textContent = message;
        
        // Enfocar campo
        field.focus();
        
        // Remover error después de 5 segundos
        setTimeout(() => {
            field.classList.remove('error');
            if (errorElement && errorElement.parentNode) {
                errorElement.parentNode.removeChild(errorElement);
            }
        }, 5000);
    }
    
    // Mostrar error general del formulario
    showFormError(message) {
        // Buscar o crear contenedor de error
        let errorContainer = document.querySelector('.form-error-container');
        if (!errorContainer) {
            errorContainer = document.createElement('div');
            errorContainer.className = 'form-error-container';
            const form = document.getElementById('manual-product-form');
            if (form) {
                form.parentNode.insertBefore(errorContainer, form);
            }
        }
        
        errorContainer.innerHTML = `
            <div class="form-error">
                <strong>❌ Error:</strong> ${this.escapeHtml(message)}
                <button type="button" class="error-close" onclick="this.parentElement.style.display='none'">×</button>
            </div>
        `;
        
        errorContainer.style.display = 'block';
    }
    
    // Actualizar sugerencias de autocomplete
    updateAutoCompleteSuggestions() {
        const suggestionsDatalist = document.getElementById('product-suggestions');
        if (!suggestionsDatalist) return;
        
        // Limpiar y regenerar
        suggestionsDatalist.innerHTML = '';
        
        // Ordenar nombres alfabéticamente
        const sortedNames = Array.from(this.lastProductNames).sort();
        
        sortedNames.forEach(productName => {
            const option = document.createElement('option');
            option.value = this.capitalizeFirstLetter(productName);
            suggestionsDatalist.appendChild(option);
        });
    }
    
    // Cerrar formulario
    closeForm() {
        // Limpiar modal
        const modalsContainer = document.getElementById('modals-container');
        if (modalsContainer) {
            modalsContainer.innerHTML = '';
        }
        
        this.currentModal = null;
        console.log('Formulario manual cerrado');
    }
    
    // Métodos auxiliares
    
    // Capitalizar primera letra
    capitalizeFirstLetter(text) {
        return text.charAt(0).toUpperCase() + text.slice(1);
    }
    
    // Escapar HTML para seguridad
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Inicializar y exportar globalmente
window.manualForm = new ManualProductForm();

// Función global para abrir formulario manual
window.openManualForm = function(barcode = null, productData = null) {
    const data = productData || {};
    if (barcode) data.barcode = barcode;
    window.manualForm.showManualForm(data);
};