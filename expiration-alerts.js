/**
 * Sistema de Alertas de Expiración
 * 
 * Calcula estados de productos basados en fechas de expiración
 * y genera notificaciones locales para productos próximos a vencer
 */

class ExpirationAlerts {
    constructor() {
        // Configuración de estados
        this.STATUS = {
            FRESH: { id: 'fresh', label: 'Fresco', color: '#4CAF50', daysThreshold: 7 },
            WARNING: { id: 'warning', label: 'Próximo', color: '#FF9800', daysThreshold: 3 },
            CRITICAL: { id: 'critical', label: 'Urgente', color: '#F44336', daysThreshold: 0 },
            EXPIRED: { id: 'expired', label: 'Vencido', color: '#9E9E9E', daysThreshold: -1 }
        };
        
        // Almacenamiento de notificaciones vistas
        this.viewedAlertsKey = 'despensa-viewed-alerts';
        this.notificationPermission = null;
        
        // Inicialización diferida para evitar problemas de carga
        setTimeout(() => {
            this.init();
        }, 100);
    }
    
    init() {
        try {
            // Verificar permisos de notificación al iniciar
            this.checkNotificationPermission();
            console.log('✅ Sistema de alertas de expiración inicializado');
        } catch (error) {
            console.error('❌ Error inicializando sistema de alertas:', error);
        }
    }
    
    /**
     * Calcular estado de un producto basado en su fecha de expiración
     * @param {string} expirationDate - Fecha de expiración en formato YYYY-MM-DD
     * @returns {Object} Objeto con estado y días restantes
     */
    calculateProductStatus(expirationDate) {
        if (!expirationDate) {
            return {
                status: this.STATUS.FRESH,
                daysRemaining: null,
                isExpired: false,
                shouldAlert: false
            };
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const expDate = new Date(expirationDate);
        expDate.setHours(0, 0, 0, 0);
        
        const timeDiff = expDate.getTime() - today.getTime();
        const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        let status;
        let shouldAlert = false;
        
        if (daysRemaining > this.STATUS.FRESH.daysThreshold) {
            status = this.STATUS.FRESH;
        } else if (daysRemaining > this.STATUS.WARNING.daysThreshold) {
            status = this.STATUS.WARNING;
            shouldAlert = true;
        } else if (daysRemaining >= this.STATUS.CRITICAL.daysThreshold) {
            status = this.STATUS.CRITICAL;
            shouldAlert = true;
        } else {
            status = this.STATUS.EXPIRED;
            shouldAlert = true;
        }
        
        return {
            status,
            daysRemaining,
            isExpired: daysRemaining < 0,
            shouldAlert
        };
    }
    
    /**
     * Analizar todos los productos y generar alertas
     * @returns {Array} Productos que requieren atención
     */
    analyzeAllProducts() {
        const products = window.productStorage.getAllProducts();
        const today = new Date();
        
        const criticalProducts = [];
        const warningProducts = [];
        const expiredProducts = [];
        
        products.forEach(product => {
            if (product.expirationDate) {
                const statusInfo = this.calculateProductStatus(product.expirationDate);
                
                // Actualizar estado del producto
                product.status = statusInfo.status.id;
                product.statusColor = statusInfo.status.color;
                product.daysRemaining = statusInfo.daysRemaining;
                
                if (statusInfo.shouldAlert) {
                    const productData = {
                        ...product,
                        statusInfo
                    };
                    
                    switch (statusInfo.status.id) {
                        case 'critical':
                            criticalProducts.push(productData);
                            break;
                        case 'warning':
                            warningProducts.push(productData);
                            break;
                        case 'expired':
                            expiredProducts.push(productData);
                            break;
                    }
                }
            }
        });
        
        return {
            criticalProducts,
            warningProducts,
            expiredProducts,
            totalAlertProducts: criticalProducts.length + warningProducts.length + expiredProducts.length
        };
    }
    
    /**
     * Verificar y mostrar notificaciones locales
     */
    async showLocalNotifications() {
        // Solo mostrar notificaciones si tenemos permiso
        if (this.notificationPermission !== 'granted') {
            return;
        }
        
        const { criticalProducts, warningProducts, expiredProducts } = this.analyzeAllProducts();
        const totalAlerts = criticalProducts.length + warningProducts.length + expiredProducts.length;
        
        // Solo mostrar notificaciones si hay productos que requieren atención
        if (totalAlerts === 0) {
            return;
        }
        
        // Verificar si ya mostramos notificaciones hoy
        const today = new Date().toDateString();
        const viewedAlerts = this.getViewedAlerts();
        
        if (viewedAlerts.date === today) {
            console.log('Notificaciones ya mostradas hoy');
            return;
        }
        
        // Crear notificación
        let notificationTitle = '⚠️ Despensa - Alerta de Productos';
        let notificationBody = '';
        
        if (expiredProducts.length > 0) {
            notificationTitle = '🚨 ¡Productos Vencidos!';
            notificationBody = `${expiredProducts.length} productos han vencido. ¡Revisa tu despensa!`;
        } else if (criticalProducts.length > 0) {
            notificationTitle = '🔥 Productos Urgentes';
            notificationBody = `${criticalProducts.length} productos vencen en menos de 3 días`;
        } else if (warningProducts.length > 0) {
            notificationTitle = '⚠️ Productos Próximos';
            notificationBody = `${warningProducts.length} productos vencen pronto`;
        }
        
        try {
            const notification = new Notification(notificationTitle, {
                body: notificationBody,
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-72x72.png',
                tag: 'despensa-alerts',
                requireInteraction: true,
                actions: [
                    {
                        action: 'view-alerts',
                        title: 'Ver Alertas'
                    },
                    {
                        action: 'dismiss',
                        title: 'Descartar'
                    }
                ]
            });
            
            // Manejar clics en la notificación
            notification.onclick = () => {
                window.focus();
                this.showCriticalDashboard();
                notification.close();
            };
            
            // Marcar notificaciones como vistas hoy
            this.markAlertsAsViewed(today);
            
            console.log(`Notificación mostrada: ${notificationTitle}`);
            
        } catch (error) {
            console.error('Error mostrando notificación:', error);
        }
    }
    
    /**
     * Verificar permiso de notificaciones
     */
    async checkNotificationPermission() {
        if (!('Notification' in window)) {
            console.log('Este navegador no soporta notificaciones');
            this.notificationPermission = 'unsupported';
            return;
        }
        
        if (Notification.permission === 'granted') {
            this.notificationPermission = 'granted';
        } else if (Notification.permission !== 'denied') {
            try {
                const permission = await Notification.requestPermission();
                this.notificationPermission = permission;
            } catch (error) {
                console.error('Error solicitando permiso de notificación:', error);
                this.notificationPermission = 'error';
            }
        } else {
            this.notificationPermission = 'denied';
        }
    }
    
    /**
     * Mostrar dashboard de productos críticos
     */
    showCriticalDashboard() {
        const products = window.productStorage.getAllProducts();
        const { criticalProducts, warningProducts, expiredProducts } = this.analyzeAllProducts();
        
        const allAlertProducts = [
            ...expiredProducts,
            ...criticalProducts,
            ...warningProducts
        ];
        
        if (allAlertProducts.length === 0) {
            this.showNoAlertsModal();
            return;
        }
        
        this.createAlertsModal(allAlertProducts);
    }
    
    /**
     * Crear modal de alertas
     */
    createAlertsModal(alertProducts) {
        const modalsContainer = document.getElementById('modals-container');
        if (!modalsContainer) return;
        
        // Ordenar productos por urgencia
        const urgencyOrder = { expired: 0, critical: 1, warning: 2 };
        alertProducts.sort((a, b) => urgencyOrder[a.status] - urgencyOrder[b.status]);
        
        // Crear HTML del modal
        const modalHtml = `
            <div class="modal" id="alerts-modal">
                <div class="modal-header">
                    <h2 class="modal-title">
                        <span class="alert-icon">🚨</span>
                        Alertas de Despensa
                        <span class="alert-count">${alertProducts.length}</span>
                    </h2>
                    <button class="modal-close" onclick="window.expirationAlerts.closeAlertsModal()">×</button>
                </div>
                <div class="modal-content alerts-content">
                    <div class="alerts-summary">
                        <p><strong>${alertProducts.length} productos</strong> requieren tu atención</p>
                    </div>
                    
                    <div class="alerts-list">
                        ${alertProducts.map(product => this.createAlertCard(product)).join('')}
                    </div>
                    
                    <div class="alerts-actions">
                        <button class="btn btn-primary" onclick="window.productStorage.removeExpiredProducts()">
                            🗑️ Eliminar Vencidos
                        </button>
                        <button class="btn btn-secondary" onclick="window.expirationAlerts.closeAlertsModal()">
                            ✅ Entendido
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        modalsContainer.innerHTML = modalHtml;
        
        // Agregar estilos específicos
        this.addAlertsStyles();
    }
    
    /**
     * Crear tarjeta de alerta para cada producto
     */
    createAlertCard(product) {
        const statusInfo = this.calculateProductStatus(product.expirationDate);
        const daysText = statusInfo.daysRemaining >= 0 ? 
            `Vence en ${statusInfo.daysRemaining} días` : 
            `Vencido hace ${Math.abs(statusInfo.daysRemaining)} días`;
        
        return `
            <div class="alert-card status-${product.status}" style="border-left-color: ${product.statusColor}">
                <div class="alert-card-header">
                    <span class="alert-product-name">${product.name}</span>
                    <span class="alert-status-badge" style="background-color: ${product.statusColor}">
                        ${statusInfo.status.label}
                    </span>
                </div>
                <div class="alert-card-details">
                    <div class="alert-detail">
                        <span class="alert-label">📅 Fecha expiración:</span>
                        <span class="alert-value">${product.expirationDate || 'No especificada'}</span>
                    </div>
                    <div class="alert-detail">
                        <span class="alert-label">⏱️ Estado:</span>
                        <span class="alert-value">${daysText}</span>
                    </div>
                    <div class="alert-detail">
                        <span class="alert-label">📍 Ubicación:</span>
                        <span class="alert-value">${product.location || 'No especificada'}</span>
                    </div>
                </div>
                <div class="alert-card-actions">
                    <button class="btn btn-small" onclick="window.productStorage.removeProduct(${product.id})">
                        Eliminar
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * Mostrar modal cuando no hay alertas
     */
    showNoAlertsModal() {
        const modalsContainer = document.getElementById('modals-container');
        if (!modalsContainer) return;
        
        const modalHtml = `
            <div class="modal" id="no-alerts-modal">
                <div class="modal-header">
                    <h2 class="modal-title">
                        <span class="success-icon">✅</span>
                        ¡Todo en orden!
                    </h2>
                    <button class="modal-close" onclick="window.expirationAlerts.closeAlertsModal()">×</button>
                </div>
                <div class="modal-content">
                    <div class="no-alerts-message">
                        <div class="success-icon-large">🎉</div>
                        <h3>No hay productos próximos a vencer</h3>
                        <p>Todos tus productos están en buen estado.</p>
                        <p>Continúa escaneando productos para mantener tu despensa actualizada.</p>
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-primary" onclick="window.scanner.showScannerModal()">
                            🔍 Escanear nuevo producto
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        modalsContainer.innerHTML = modalHtml;
    }
    
    /**
     * Cerrar modal de alertas
     */
    closeAlertsModal() {
        const modalsContainer = document.getElementById('modals-container');
        if (modalsContainer) {
            modalsContainer.innerHTML = '';
        }
    }
    
    /**
     * Agregar estilos específicos para alertas
     */
    addAlertsStyles() {
        if (document.getElementById('alerts-styles')) return;
        
        const styleElement = document.createElement('style');
        styleElement.id = 'alerts-styles';
        styleElement.textContent = `
            .alerts-content {
                max-height: 70vh;
                overflow-y: auto;
            }
            
            .alert-icon {
                margin-right: 8px;
            }
            
            .alert-count {
                background-color: #F44336;
                color: white;
                border-radius: 50%;
                width: 24px;
                height: 24px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                margin-left: 8px;
                vertical-align: middle;
            }
            
            .alerts-summary {
                background-color: #FFF3E0;
                padding: 12px;
                border-radius: 8px;
                margin-bottom: 16px;
                border-left: 4px solid #FF9800;
            }
            
            .alert-card {
                background-color: white;
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 12px;
                border: 1px solid #e0e0e0;
                border-left-width: 4px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            }
            
            .alert-card.status-critical {
                background-color: #FFEBEE;
            }
            
            .alert-card.status-warning {
                background-color: #FFF3E0;
            }
            
            .alert-card.status-expired {
                background-color: #F5F5F5;
            }
            
            .alert-card-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            }
            
            .alert-product-name {
                font-weight: bold;
                font-size: 16px;
            }
            
            .alert-status-badge {
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: bold;
            }
            
            .alert-card-details {
                margin-bottom: 12px;
            }
            
            .alert-detail {
                display: flex;
                margin-bottom: 4px;
                font-size: 14px;
            }
            
            .alert-label {
                font-weight: bold;
                min-width: 120px;
                color: #666;
            }
            
            .alert-value {
                flex: 1;
            }
            
            .alert-card-actions {
                display: flex;
                justify-content: flex-end;
            }
            
            .no-alerts-message {
                text-align: center;
                padding: 24px;
            }
            
            .success-icon-large {
                font-size: 48px;
                margin-bottom: 16px;
            }
            
            .alerts-actions {
                display: flex;
                gap: 12px;
                justify-content: center;
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid #e0e0e0;
            }
        `;
        
        document.head.appendChild(styleElement);
    }
    
    /**
     * Obtener alertas ya vistas
     */
    getViewedAlerts() {
        try {
            const stored = localStorage.getItem(this.viewedAlertsKey);
            return stored ? JSON.parse(stored) : { date: null, productIds: [] };
        } catch (error) {
            return { date: null, productIds: [] };
        }
    }
    
    /**
     * Marcar alertas como vistas
     */
    markAlertsAsViewed(date) {
        try {
            const data = { date, timestamp: Date.now() };
            localStorage.setItem(this.viewedAlertsKey, JSON.stringify(data));
        } catch (error) {
            console.error('Error marcando alertas como vistas:', error);
        }
    }
    
    /**
     * Actualizar estados en tiempo real (para usar en setInterval)
     */
    updateRealTimeStatus() {
        const products = window.productStorage.getAllProducts();
        
        products.forEach(product => {
            if (product.expirationDate) {
                const statusInfo = this.calculateProductStatus(product.expirationDate);
                
                // Actualizar en almacenamiento si cambió el estado
                if (product.status !== statusInfo.status.id) {
                    product.status = statusInfo.status.id;
                    product.statusColor = statusInfo.status.color;
                    product.daysRemaining = statusInfo.daysRemaining;
                    
                    // Actualizar en localStorage
                    window.productStorage.updateProduct(product.id, product);
                    
                    // Si el producto ahora requiere alerta, mostrar notificación
                    if (statusInfo.shouldAlert && this.notificationPermission === 'granted') {
                        this.showLocalNotifications();
                    }
                }
            }
        });
        
        // Actualizar UI si existe
        if (typeof window.updateProductList === 'function') {
            window.updateProductList();
        }
    }
    
    /**
     * Iniciar monitoreo en tiempo real
     */
    startRealTimeMonitoring() {
        // Actualizar cada hora
        setInterval(() => {
            this.updateRealTimeStatus();
        }, 3600000); // 1 hora en milisegundos
        
        // También actualizar al cargar la página
        this.updateRealTimeStatus();
        
        console.log('Monitoreo en tiempo real iniciado');
    }
}

// Inicializar y exportar globalmente
window.expirationAlerts = new ExpirationAlerts();