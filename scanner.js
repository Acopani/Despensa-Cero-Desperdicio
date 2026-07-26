// scanner.js - Módulo de escaneo de códigos de barras para Despensa Cero Desperdicio
// Integración con cámara web y Open Food Facts API

class BarcodeScanner {
    constructor() {
        this.scanner = null;
        this.isScanning = false;
        this.currentModal = null;
        this.lastScanTime = 0;
        this.scanCooldown = 2000; // 2 segundos entre escaneos
        this.testMode = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1';
        
        console.log('Inicializando escáner de códigos de barras');
        console.log('Modo test:', this.testMode);
    }
    
    // Mostrar modal de escaneo
    showScannerModal() {
        if (this.currentModal) {
            console.log('El escáner ya está abierto');
            return;
        }
        
        // Crear modal de escaneo
        const modalHTML = `
            <div class="modal-overlay" id="scanner-modal">
                <div class="modal scanner-modal">
                    <div class="modal-header">
                        <h2 class="modal-title">Escaneo de Código de Barras</h2>
                        <button class="modal-close" onclick="window.scanner.closeScanner()">×</button>
                    </div>
                    <div class="modal-content scanner-content">
                        <div class="scanner-instructions">
                            <p>📷 Enfoca el código de barras del producto dentro del área de escaneo</p>
                            <p>💡 Asegúrate de tener buena iluminación</p>
                            ${this.testMode ? '<p class="test-notice">🔧 MODO TEST ACTIVADO - Se usarán códigos de prueba</p>' : ''}
                        </div>
                        
                        <div class="scanner-container">
                            <div class="scanner-viewport">
                                <video id="camera-stream" playsinline></video>
                                <div class="scanner-overlay">
                                    <div class="scanner-frame"></div>
                                    <div class="scanner-laser"></div>
                                </div>
                            </div>
                            
                            <div class="scanner-controls">
                                <button id="toggle-camera" class="btn-secondary">
                                    🔄 Cambiar cámara
                                </button>
                                <button id="manual-entry" class="btn-secondary">
                                    ✍️ Ingresar manualmente
                                </button>
                            </div>
                        </div>
                        
                        <div class="scanner-status" id="scanner-status">
                            <div class="status-icon">🔍</div>
                            <div class="status-text">Preparando escáner...</div>
                        </div>
                        
                        <div class="scanner-fallback" style="display: none;" id="scanner-fallback">
                            <h3>⚠️ No se pudo escanear el código</h3>
                            <p>El código de barras no fue reconocido o no está en nuestra base de datos.</p>
                            <div class="fallback-actions">
                                <button id="try-again" class="btn-secondary">Intentar de nuevo</button>
                                <button id="manual-fallback" class="btn-primary">Ingresar manualmente</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Insertar modal en el contenedor
        const modalsContainer = document.getElementById('modals-container');
        modalsContainer.innerHTML = modalHTML;
        
        // Guardar referencia al modal actual
        this.currentModal = 'scanner-modal';
        
        // Inicializar eventos
        this.setupScannerEvents();
        
        // Iniciar cámara después de un pequeño delay para que el modal se renderice
        setTimeout(() => {
            this.startCamera();
        }, 100);
        
        console.log('Modal de escáner mostrado');
    }
    
    // Configurar eventos del escáner
    setupScannerEvents() {
        // Botón cambiar cámara
        const toggleCameraBtn = document.getElementById('toggle-camera');
        if (toggleCameraBtn) {
            toggleCameraBtn.addEventListener('click', () => this.toggleCamera());
        }
        
        // Botón entrada manual
        const manualEntryBtn = document.getElementById('manual-entry');
        if (manualEntryBtn) {
            manualEntryBtn.addEventListener('click', () => this.showManualEntry());
        }
        
        // Botones de fallback
        const tryAgainBtn = document.getElementById('try-again');
        if (tryAgainBtn) {
            tryAgainBtn.addEventListener('click', () => this.hideFallback());
        }
        
        const manualFallbackBtn = document.getElementById('manual-fallback');
        if (manualFallbackBtn) {
            manualFallbackBtn.addEventListener('click', () => this.showManualEntry());
        }
        
        // Cerrar con Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentModal === 'scanner-modal') {
                this.closeScanner();
            }
        });
    }
    
    // Iniciar cámara
    async startCamera(facingMode = 'environment') {
        try {
            this.updateStatus('🔍 Iniciando cámara...', 'loading');
            
            // Verificar si la API de medios está disponible
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('API de cámara no disponible en este navegador');
            }
            
            // Verificar permisos
            const permissions = await navigator.permissions.query({ name: 'camera' });
            if (permissions.state === 'denied') {
                throw new Error('Permiso de cámara denegado. Por favor, habilita la cámara en la configuración del navegador.');
            }
            
            // Crear instancia del escáner si no existe
            if (!this.scanner) {
                this.scanner = new Html5Qrcode('camera-stream');
            }
            
            // Configuración de la cámara
            const config = {
                fps: 10,
                qrbox: { width: 250, height: 150 },
                facingMode: facingMode
            };
            
            const videoConstraints = {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                aspectRatio: { ideal: 1.7777777778 }
            };
            
            // Iniciar escaneo
            await this.scanner.start(config, videoConstraints, (decodedText) => {
                this.handleScanSuccess(decodedText);
            });
            
            this.isScanning = true;
            this.updateStatus('✅ Cámara activa - Enfoca el código de barras', 'ready');
            
            console.log('Cámara iniciada correctamente con facingMode:', facingMode);
            
        } catch (error) {
            console.error('Error iniciando cámara:', error);
            this.handleCameraError(error);
        }
    }
    
    // Cambiar entre cámara frontal/trasera
    async toggleCamera() {
        if (!this.isScanning) return;
        
        try {
            this.updateStatus('🔄 Cambiando cámara...', 'loading');
            
            // Detener cámara actual
            if (this.scanner) {
                this.scanner.stop();
            }
            
            // Determinar nueva cámara (alternar entre environment y user)
            const videoElement = document.getElementById('camera-stream');
            const currentStream = videoElement.srcObject;
            let newFacingMode = 'environment';
            
            if (currentStream) {
                const tracks = currentStream.getVideoTracks();
                if (tracks.length > 0) {
                    const settings = tracks[0].getSettings();
                    if (settings.facingMode === 'environment') {
                        newFacingMode = 'user';
                    }
                }
            }
            
            // Reiniciar con nueva cámara
            await this.startCamera(newFacingMode);
            
        } catch (error) {
            console.error('Error cambiando cámara:', error);
            this.updateStatus('❌ Error al cambiar cámara', 'error');
            setTimeout(() => {
                this.updateStatus('✅ Cámara activa - Enfoca el código de barras', 'ready');
            }, 2000);
        }
    }
    
    // Manejar éxito en escaneo
    async handleScanSuccess(barcode) {
        // Verificar que el escáner esté activo
        if (!this.isScanning) {
            console.log('Escaneo ignorado (scanner no activo)');
            return;
        }
        
        // Evitar múltiples escaneos rápidos
        const now = Date.now();
        if (now - this.lastScanTime < this.scanCooldown) {
            console.log('Escaneo ignorado (cooldown)');
            return;
        }
        
        this.lastScanTime = now;
        this.updateStatus(`📷 Código detectado: ${barcode}`, 'scanning');
        
        // Pausar escaneo temporalmente
        this.pauseScanning();
        
        console.log('Código de barras escaneado:', barcode);
        
        // Procesar código
        await this.processBarcode(barcode);
    }
    
    // Procesar código de barras
    async processBarcode(barcode) {
        try {
            // 1. Verificar cache local
            const cachedProduct = window.productStorage.getCachedProduct(barcode);
            if (cachedProduct) {
                console.log('Producto encontrado en cache:', cachedProduct);
                await this.addProductFromCache(barcode, cachedProduct);
                return;
            }
            
            // 2. Consultar Open Food Facts API
            this.updateStatus('🔍 Consultando base de datos...', 'loading');
            
            const productData = await this.fetchProductFromOpenFoodFacts(barcode);
            
            if (productData) {
                // 3. Cachear resultado
                window.productStorage.cacheProduct(barcode, productData);
                
                // 4. Añadir producto
                await this.addScannedProduct(barcode, productData);
            } else {
                // Producto no encontrado en la base de datos
                this.showFallback(barcode);
            }
            
        } catch (error) {
            console.error('Error procesando código de barras:', error);
            this.updateStatus('❌ Error al consultar producto', 'error');
            this.showFallback(barcode, error.message);
        }
    }
    
    // Consultar Open Food Facts API
    async fetchProductFromOpenFoodFacts(barcode) {
        try {
            this.updateStatus('🌐 Conectando con Open Food Facts...', 'loading');
            
            // URL de la API
            const apiUrl = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;
            
            // Configurar timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos
            
            const response = await fetch(apiUrl, {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'DespensaCeroDesperdicio/1.0 (contact@example.com)'
                }
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.status === 1 && data.product) {
                console.log('Producto encontrado en Open Food Facts:', data.product.product_name);
                
                // Extraer información relevante
                const productData = {
                    name: data.product.product_name || `Producto ${barcode}`,
                    barcode: barcode,
                    category: this.extractCategory(data.product),
                    imageUrl: data.product.image_url || null,
                    brand: data.product.brands || null,
                    quantity: data.product.quantity || '1',
                    notes: this.generateProductNotes(data.product)
                };
                
                return productData;
                
            } else {
                console.log('Producto no encontrado en Open Food Facts');
                return null;
            }
            
        } catch (error) {
            console.error('Error consultando Open Food Facts:', error);
            
            // En modo test, devolver datos de prueba
            if (this.testMode) {
                return this.getTestProductData(barcode);
            }
            
            throw error;
        }
    }
    
    // Extraer categoría del producto
    extractCategory(product) {
        if (product.categories_tags && product.categories_tags.length > 0) {
            // Tomar la primera categoría y formatearla
            const categoryTag = product.categories_tags[0];
            const category = categoryTag
                .replace('en:', '')
                .replace(/_/g, ' ')
                .replace(/\b\w/g, l => l.toUpperCase());
            
            return category;
        }
        
        if (product.categories) {
            // Extraer primera categoría
            const categories = product.categories.split(',');
            return categories[0].trim();
        }
        
        return 'Otros';
    }
    
    // Generar notas del producto
    generateProductNotes(product) {
        const notes = [];
        
        if (product.brands) {
            notes.push(`Marca: ${product.brands}`);
        }
        
        if (product.quantity) {
            notes.push(`Cantidad: ${product.quantity}`);
        }
        
        if (product.packaging) {
            notes.push(`Envase: ${product.packaging}`);
        }
        
        if (product.ingredients_text) {
            const ingredients = product.ingredients_text.substring(0, 100);
            if (ingredients.length === 100) {
                notes.push(`Ingredientes: ${ingredients}...`);
            } else {
                notes.push(`Ingredientes: ${ingredients}`);
            }
        }
        
        return notes.length > 0 ? notes.join('\n') : null;
    }
    
    // Obtener datos de producto de prueba
    getTestProductData(barcode) {
        const testProducts = {
            '3017620422003': {
                name: 'Nutella',
                category: 'Dulces',
                brand: 'Ferrero',
                quantity: '400g',
                notes: 'Crema de avellanas y cacao'
            },
            '8715700155101': {
                name: 'Coca-Cola',
                category: 'Bebidas',
                brand: 'Coca-Cola',
                quantity: '330ml',
                notes: 'Refresco de cola'
            },
            '5449000000996': {
                name: 'Agua Mineral Evian',
                category: 'Bebidas',
                brand: 'Evian',
                quantity: '1L',
                notes: 'Agua mineral natural'
            },
            '8410076442949': {
                name: 'Aceite de Oliva Virgen Extra',
                category: 'Aceites',
                brand: 'Carbonell',
                quantity: '1L',
                notes: 'Aceite de oliva de primera presión en frío'
            },
            '7613032629994': {
                name: 'Nesquik',
                category: 'Cacao',
                brand: 'Nestlé',
                quantity: '400g',
                notes: 'Cacao en polvo para bebidas'
            }
        };
        
        if (testProducts[barcode]) {
            console.log('Usando datos de prueba para:', barcode);
            return testProducts[barcode];
        }
        
        // Producto de prueba genérico
        return {
            name: `Producto de Prueba ${barcode.substring(0, 4)}`,
            category: 'Otros',
            brand: 'Marca de Prueba',
            quantity: '1 unidad',
            notes: 'Producto añadido en modo de prueba'
        };
    }
    
    // Añadir producto desde cache
    async addProductFromCache(barcode, cachedProduct) {
        this.updateStatus('✅ Producto encontrado en cache', 'success');
        
        await this.addScannedProduct(barcode, cachedProduct);
    }
    
    // Añadir producto escaneado
    async addScannedProduct(barcode, productData) {
        try {
            this.updateStatus('📝 Preparando formulario...', 'loading');
            
            // Cerrar escáner
            this.closeScanner();
            
            // Mostrar formulario con datos pre-llenados
            setTimeout(() => {
                this.showProductFormWithData(barcode, productData);
            }, 500);
            
        } catch (error) {
            console.error('Error añadiendo producto escaneado:', error);
            this.updateStatus('❌ Error al procesar producto', 'error');
            this.showFallback(barcode, error.message);
        }
    }
    
    // Mostrar formulario con datos pre-llenados
    showProductFormWithData(barcode, productData) {
        // Usar el formulario manual con datos pre-llenados
        if (typeof window.openManualForm === 'function') {
            window.openManualForm(barcode, productData);
        } else if (typeof window.manualForm !== 'undefined') {
            window.manualForm.showManualForm({ barcode, ...productData });
        } else {
            // Fallback: mostrar modal básico
            this.showManualEntry(barcode, productData);
        }
    }
    
    // Mostrar fallback cuando no se encuentra el producto
    showFallback(barcode, errorMessage = null) {
        const fallbackElement = document.getElementById('scanner-fallback');
        const statusElement = document.getElementById('scanner-status');
        
        if (fallbackElement && statusElement) {
            statusElement.style.display = 'none';
            fallbackElement.style.display = 'block';
            
            // Actualizar mensaje si hay error
            if (errorMessage) {
                const errorElement = fallbackElement.querySelector('p');
                if (errorElement) {
                    errorElement.textContent = `Error: ${errorMessage}`;
                }
            }
            
            // Pre-llenar código de barras para entrada manual
            const manualBtn = document.getElementById('manual-fallback');
            if (manualBtn) {
                manualBtn.dataset.barcode = barcode;
            }
        }
        
        console.log('Mostrando fallback para código:', barcode);
    }
    
    // Ocultar fallback
    hideFallback() {
        const fallbackElement = document.getElementById('scanner-fallback');
        const statusElement = document.getElementById('scanner-status');
        
        if (fallbackElement && statusElement) {
            fallbackElement.style.display = 'none';
            statusElement.style.display = 'flex';
            
            this.updateStatus('✅ Cámara activa - Enfoca el código de barras', 'ready');
            this.resumeScanning();
        }
    }
    
    // Mostrar entrada manual
    showManualEntry(barcode = null, productData = null) {
        this.closeScanner();
        
        // Usar el formulario manual
        if (typeof window.openManualForm === 'function') {
            window.openManualForm(barcode, productData);
        } else if (typeof window.manualForm !== 'undefined') {
            const data = productData || {};
            if (barcode) data.barcode = barcode;
            window.manualForm.showManualForm(data);
        } else {
            // Fallback básico
            alert(`Código de barras: ${barcode || 'No detectado'}\nPor favor, ingresa los datos del producto manualmente.`);
        }
    }
    
    // Actualizar estado del escáner
    updateStatus(text, type = 'info') {
        const statusElement = document.getElementById('scanner-status');
        if (!statusElement) return;
        
        const iconElement = statusElement.querySelector('.status-icon');
        const textElement = statusElement.querySelector('.status-text');
        
        if (iconElement && textElement) {
            // Actualizar icono según tipo
            const icons = {
                'loading': '🔄',
                'ready': '✅',
                'scanning': '📷',
                'success': '✅',
                'error': '❌',
                'info': '🔍'
            };
            
            iconElement.textContent = icons[type] || '🔍';
            textElement.textContent = text;
            
            // Actualizar clases CSS
            statusElement.className = 'scanner-status';
            statusElement.classList.add(`status-${type}`);
        }
    }
    
    // Pausar escaneo
    pauseScanning() {
        if (this.scanner && this.isScanning) {
            // En una implementación real, pausaríamos el escaneo
            // Por ahora, solo actualizamos el estado
            this.isScanning = false;
            console.log('Escaneo pausado');
        }
    }
    
    // Reanudar escaneo
    resumeScanning() {
        if (this.scanner && !this.isScanning) {
            this.isScanning = true;
            console.log('Escaneo reanudado');
            
            this.updateStatus('✅ Cámara activa - Enfoca el código de barras', 'ready');
        }
    }
    
    // Manejar error de cámara
    handleCameraError(error) {
        console.error('Error de cámara:', error);
        
        let errorMessage = 'Error desconocido';
        
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            errorMessage = 'Permiso de cámara denegado. Por favor, habilita la cámara en la configuración del navegador.';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            errorMessage = 'No se encontró ninguna cámara disponible.';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            errorMessage = 'La cámara está en uso por otra aplicación o no se puede acceder.';
        } else if (error.name === 'OverconstrainedError') {
            errorMessage = 'No se puede cumplir con los requisitos de la cámara solicitada.';
        } else if (error.name === 'AbortError') {
            errorMessage = 'La operación de la cámara fue abortada.';
        } else {
            errorMessage = error.message || 'Error al acceder a la cámara';
        }
        
        this.updateStatus(`❌ ${errorMessage}`, 'error');
        
        // Mostrar instrucciones de solución de problemas después de un delay
        setTimeout(() => {
            this.showCameraTroubleshooting(errorMessage);
        }, 2000);
    }
    
    // Mostrar solución de problemas para cámara
    showCameraTroubleshooting(errorMessage) {
        const scannerContent = document.querySelector('.scanner-content');
        if (!scannerContent) return;
        
        const troubleshootingHTML = `
            <div class="troubleshooting">
                <h3>⚠️ Solución de problemas de cámara</h3>
                <p><strong>Error:</strong> ${errorMessage}</p>
                
                <div class="troubleshooting-steps">
                    <h4>Pasos para resolver:</h4>
                    <ol>
                        <li>Asegúrate de que la cámara no esté siendo usada por otra aplicación</li>
                        <li>Verifica los permisos de cámara en la configuración del navegador</li>
                        <li>Intenta usar una cámara diferente (frontal/trasera)</li>
                        <li>Reinicia el navegador si el problema persiste</li>
                    </ol>
                </div>
                
                <div class="troubleshooting-actions">
                    <button id="retry-camera" class="btn-primary">Reintentar</button>
                    <button id="use-manual" class="btn-secondary">Usar entrada manual</button>
                </div>
            </div>
        `;
        
        // Reemplazar contenido del escáner
        scannerContent.innerHTML = troubleshootingHTML;
        
        // Configurar eventos
        document.getElementById('retry-camera')?.addEventListener('click', () => {
            this.retryCamera();
        });
        
        document.getElementById('use-manual')?.addEventListener('click', () => {
            this.showManualEntry();
        });
    }
    
    // Reintentar cámara
    async retryCamera() {
        try {
            this.updateStatus('🔄 Reintentando cámara...', 'loading');
            
            // Limpiar contenido actual
            const scannerContent = document.querySelector('.scanner-content');
            if (scannerContent) {
                scannerContent.innerHTML = `
                    <div class="scanner-instructions">
                        <p>📷 Enfoca el código de barras del producto dentro del área de escaneo</p>
                        <p>💡 Asegúrate de tener buena iluminación</p>
                    </div>
                    
                    <div class="scanner-container">
                        <div class="scanner-viewport">
                            <video id="camera-stream" playsinline></video>
                            <div class="scanner-overlay">
                                <div class="scanner-frame"></div>
                                <div class="scanner-laser"></div>
                            </div>
                        </div>
                        
                        <div class="scanner-controls">
                            <button id="toggle-camera" class="btn-secondary">
                                🔄 Cambiar cámara
                            </button>
                            <button id="manual-entry" class="btn-secondary">
                                ✍️ Ingresar manualmente
                            </button>
                        </div>
                    </div>
                    
                    <div class="scanner-status" id="scanner-status">
                        <div class="status-icon">🔄</div>
                        <div class="status-text">Reintentando cámara...</div>
                    </div>
                `;
                
                // Reconfigurar eventos
                this.setupScannerEvents();
            }
            
            // Reiniciar cámara
            await this.startCamera();
            
        } catch (error) {
            console.error('Error reintentando cámara:', error);
            this.handleCameraError(error);
        }
    }
    
    // Cerrar escáner
    closeScanner() {
        // Detener cámara
        if (this.scanner) {
            this.scanner.stop();
            this.scanner = null;
        }
        
        this.isScanning = false;
        
        // Limpiar modal
        const modalsContainer = document.getElementById('modals-container');
        if (modalsContainer) {
            modalsContainer.innerHTML = '';
        }
        
        this.currentModal = null;
        
        console.log('Escáner cerrado');
        
        // Restaurar eventos del teclado
        document.removeEventListener('keydown', this.handleEscapeKey);
    }
    
    // Manejar tecla Escape
    handleEscapeKey = (e) => {
        if (e.key === 'Escape' && this.currentModal === 'scanner-modal') {
            this.closeScanner();
        }
    };
}

// Inicializar y exportar globalmente
window.scanner = new BarcodeScanner();

// Función global para abrir el escáner
window.openScanner = function() {
    window.scanner.showScannerModal();
};