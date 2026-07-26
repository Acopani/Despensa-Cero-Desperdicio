// storage.js - Módulo de almacenamiento para Despensa Cero Desperdicio
// Sistema CRUD completo usando localStorage con optimización de espacio

const STORAGE_KEY = 'despensa_productos';
const CATEGORIES_KEY = 'despensa_categorias';
const PRODUCT_CACHE_KEY = 'despensa_product_cache';
const STATISTICS_KEY = 'despensa_estadisticas';

// Clase principal para gestión de almacenamiento
const storage = {
    // Configuración del esquema
    SCHEMA_VERSION: '1.0',
    MAX_STORAGE_SIZE: 50 * 1024, // 50KB máximo para ~1000 productos
    
    // Inicializar almacenamiento
    init() {
        console.log('Inicializando sistema de almacenamiento...');
        
        // Verificar si existe almacenamiento, si no crear estructura vacía
        if (!localStorage.getItem(STORAGE_KEY)) {
            this.reset();
        }
        
        // Verificar categorías por defecto
        if (!localStorage.getItem(CATEGORIES_KEY)) {
            this.initializeDefaultCategories();
        }
        
        // Inicializar estadísticas si no existen
        if (!localStorage.getItem(STATISTICS_KEY)) {
            this.initializeStatistics();
        }
        
        console.log('Almacenamiento inicializado correctamente');
        return this;
    },
    
    // Reiniciar almacenamiento (para desarrollo/testing)
    reset() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
        this.initializeStatistics();
        console.log('Almacenamiento reiniciado');
    },
    
    // Inicializar categorías por defecto
    initializeDefaultCategories() {
        const defaultCategories = [
            'Frutas',
            'Verduras',
            'Lácteos',
            'Carnes',
            'Pescados',
            'Panadería',
            'Granos',
            'Enlatados',
            'Congelados',
            'Bebidas',
            'Especias',
            'Otros'
        ];
        localStorage.setItem(CATEGORIES_KEY, JSON.stringify(defaultCategories));
    },
    
    // Inicializar estadísticas
    initializeStatistics() {
        const stats = {
            totalProductsAdded: 0,
            totalProductsDeleted: 0,
            totalProductsExpired: 0,
            lastUpdated: new Date().toISOString(),
            storageSize: 0
        };
        localStorage.setItem(STATISTICS_KEY, JSON.stringify(stats));
    },
    
    // Obtener todas las categorías
    getCategories() {
        try {
            return JSON.parse(localStorage.getItem(CATEGORIES_KEY)) || [];
        } catch (error) {
            console.error('Error obteniendo categorías:', error);
            return [];
        }
    },
    
    // Añadir nueva categoría
    addCategory(category) {
        if (!category || typeof category !== 'string') {
            throw new Error('Categoría inválida');
        }
        
        const categories = this.getCategories();
        const normalizedCategory = category.trim();
        
        // Evitar duplicados
        if (!categories.some(cat => cat.toLowerCase() === normalizedCategory.toLowerCase())) {
            categories.push(normalizedCategory);
            localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
            return true;
        }
        
        return false;
    },
    
    // Obtener todos los productos
    getAll() {
        try {
            const products = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            
            // Calcular estado de expiración para cada producto
            return products.map(product => {
                return this.calculateExpiryStatus(product);
            });
        } catch (error) {
            console.error('Error obteniendo productos:', error);
            return [];
        }
    },
    
    // Obtener producto por ID
    getById(id) {
        const products = this.getAll();
        return products.find(product => product.id === id);
    },
    
    // Buscar productos por criterios
    search(query, field = 'name') {
        const products = this.getAll();
        
        if (!query || query.trim() === '') {
            return products;
        }
        
        const searchTerm = query.toLowerCase().trim();
        
        return products.filter(product => {
            if (field === 'name' && product.name) {
                return product.name.toLowerCase().includes(searchTerm);
            }
            
            if (field === 'category' && product.category) {
                return product.category.toLowerCase().includes(searchTerm);
            }
            
            if (field === 'barcode' && product.barcode) {
                return product.barcode.includes(searchTerm);
            }
            
            // Búsqueda global
            return (
                (product.name && product.name.toLowerCase().includes(searchTerm)) ||
                (product.category && product.category.toLowerCase().includes(searchTerm)) ||
                (product.barcode && product.barcode.includes(searchTerm))
            );
        });
    },
    
    // Filtrar productos por estado de expiración
    filterByExpiryStatus(status) {
        const products = this.getAll();
        
        return products.filter(product => {
            switch (status) {
                case 'urgent':
                    return product.expiryStatus === 'urgent';
                case 'warning':
                    return product.expiryStatus === 'warning';
                case 'expired':
                    return product.expiryStatus === 'expired';
                case 'safe':
                    return product.expiryStatus === 'safe';
                default:
                    return false;
            }
        });
    },
    
    // Añadir nuevo producto
    add(productData) {
        try {
            // Validar datos del producto
            this.validateProductData(productData);
            
            // Preparar producto con estructura optimizada
            const product = {
                id: this.generateId(),
                name: this.sanitizeText(productData.name),
                quantity: parseInt(productData.quantity) || 1,
                expiryDate: this.normalizeDate(productData.expiryDate),
                barcode: productData.barcode ? String(productData.barcode).trim() : null,
                category: productData.category || 'Otros',
                imageUrl: productData.imageUrl || null,
                addedDate: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                notes: productData.notes ? this.sanitizeText(productData.notes) : null
            };
            
            // Calcular estado de expiración
            this.calculateExpiryStatus(product);
            
            // Obtener productos existentes
            const products = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            
            // Verificar límite de almacenamiento
            this.checkStorageLimit(products, product);
            
            // Añadir nuevo producto
            products.push(product);
            
            // Guardar en localStorage
            localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
            
            // Actualizar estadísticas
            this.updateStatistics('added');
            
            // Actualizar tamaño de almacenamiento
            this.updateStorageSize();
            
            console.log('Producto añadido:', product.id, product.name);
            return product;
            
        } catch (error) {
            console.error('Error añadiendo producto:', error);
            throw error;
        }
    },
    
    // Actualizar producto existente
    update(id, updates) {
        try {
            const products = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            const productIndex = products.findIndex(p => p.id === id);
            
            if (productIndex === -1) {
                throw new Error(`Producto con ID ${id} no encontrado`);
            }
            
            // Preparar actualizaciones
            const updatedProduct = { ...products[productIndex] };
            
            // Aplicar actualizaciones permitidas
            if (updates.name !== undefined) {
                updatedProduct.name = this.sanitizeText(updates.name);
            }
            
            if (updates.quantity !== undefined) {
                updatedProduct.quantity = parseInt(updates.quantity) || 1;
            }
            
            if (updates.expiryDate !== undefined) {
                updatedProduct.expiryDate = this.normalizeDate(updates.expiryDate);
            }
            
            if (updates.category !== undefined) {
                updatedProduct.category = updates.category || 'Otros';
            }
            
            if (updates.notes !== undefined) {
                updatedProduct.notes = updates.notes ? this.sanitizeText(updates.notes) : null;
            }
            
            updatedProduct.lastUpdated = new Date().toISOString();
            
            // Calcular estado de expiración
            this.calculateExpiryStatus(updatedProduct);
            
            // Actualizar producto en el array
            products[productIndex] = updatedProduct;
            
            // Guardar cambios
            localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
            
            // Actualizar estadísticas
            this.updateStatistics('updated');
            
            // Actualizar tamaño de almacenamiento
            this.updateStorageSize();
            
            console.log('Producto actualizado:', id);
            return updatedProduct;
            
        } catch (error) {
            console.error('Error actualizando producto:', error);
            throw error;
        }
    },
    
    // Eliminar producto
    remove(id) {
        try {
            const products = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            const productIndex = products.findIndex(p => p.id === id);
            
            if (productIndex === -1) {
                throw new Error(`Producto con ID ${id} no encontrado`);
            }
            
            const removedProduct = products[productIndex];
            
            // Eliminar producto del array
            products.splice(productIndex, 1);
            
            // Guardar cambios
            localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
            
            // Actualizar estadísticas
            this.updateStatistics('deleted');
            
            // Actualizar tamaño de almacenamiento
            this.updateStorageSize();
            
            console.log('Producto eliminado:', id, removedProduct.name);
            return removedProduct;
            
        } catch (error) {
            console.error('Error eliminando producto:', error);
            throw error;
        }
    },
    
    // Eliminar productos expirados
    removeExpired() {
        try {
            const products = this.getAll();
            const activeProducts = products.filter(product => product.expiryStatus !== 'expired');
            const expiredProducts = products.filter(product => product.expiryStatus === 'expired');
            
            if (expiredProducts.length > 0) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(activeProducts));
                
                // Actualizar estadísticas
                const stats = JSON.parse(localStorage.getItem(STATISTICS_KEY));
                stats.totalProductsExpired = (stats.totalProductsExpired || 0) + expiredProducts.length;
                localStorage.setItem(STATISTICS_KEY, JSON.stringify(stats));
                
                this.updateStorageSize();
                
                console.log(`${expiredProducts.length} productos expirados eliminados`);
            }
            
            return expiredProducts;
            
        } catch (error) {
            console.error('Error eliminando productos expirados:', error);
            throw error;
        }
    },
    
    // Eliminar todos los productos
    clearAll() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
        this.updateStorageSize();
        console.log('Todos los productos eliminados');
    },
    
    // Calcular estado de expiración
    calculateExpiryStatus(product) {
        if (!product.expiryDate) {
            product.daysUntil = null;
            product.expiryStatus = 'unknown';
            return product;
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const expiryDate = new Date(product.expiryDate);
        expiryDate.setHours(0, 0, 0, 0);
        
        const timeDiff = expiryDate.getTime() - today.getTime();
        const daysUntil = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        
        product.daysUntil = daysUntil;
        
        if (daysUntil < 0) {
            product.expiryStatus = 'expired';
        } else if (daysUntil <= 2) {
            product.expiryStatus = 'urgent';
        } else if (daysUntil <= 5) {
            product.expiryStatus = 'warning';
        } else {
            product.expiryStatus = 'safe';
        }
        
        return product;
    },
    
    // Obtener resumen de productos por estado
    getSummary() {
        const products = this.getAll();
        
        const summary = {
            total: products.length,
            urgent: 0,
            warning: 0,
            expired: 0,
            safe: 0,
            unknown: 0
        };
        
        products.forEach(product => {
            if (product.expiryStatus) {
                summary[product.expiryStatus]++;
            } else {
                summary.unknown++;
            }
        });
        
        return summary;
    },
    
    // Obtener estadísticas
    getStatistics() {
        try {
            const stats = JSON.parse(localStorage.getItem(STATISTICS_KEY)) || {};
            const summary = this.getSummary();
            
            return {
                ...stats,
                summary,
                totalProducts: summary.total,
                urgentProducts: summary.urgent,
                warningProducts: summary.warning,
                expiredProducts: summary.expired
            };
            
        } catch (error) {
            console.error('Error obteniendo estadísticas:', error);
            return {};
        }
    },
    
    // Actualizar estadísticas
    updateStatistics(action) {
        try {
            const stats = JSON.parse(localStorage.getItem(STATISTICS_KEY)) || {};
            
            switch (action) {
                case 'added':
                    stats.totalProductsAdded = (stats.totalProductsAdded || 0) + 1;
                    break;
                case 'deleted':
                    stats.totalProductsDeleted = (stats.totalProductsDeleted || 0) + 1;
                    break;
                case 'updated':
                    // No incrementar contador específico para updates
                    break;
            }
            
            stats.lastUpdated = new Date().toISOString();
            localStorage.setItem(STATISTICS_KEY, JSON.stringify(stats));
            
        } catch (error) {
            console.error('Error actualizando estadísticas:', error);
        }
    },
    
    // Actualizar tamaño de almacenamiento
    updateStorageSize() {
        try {
            const products = localStorage.getItem(STORAGE_KEY) || '';
            const categories = localStorage.getItem(CATEGORIES_KEY) || '';
            const stats = localStorage.getItem(STATISTICS_KEY) || '';
            
            const totalSize = products.length + categories.length + stats.length;
            
            const statistics = JSON.parse(localStorage.getItem(STATISTICS_KEY) || '{}');
            statistics.storageSize = totalSize;
            localStorage.setItem(STATISTICS_KEY, JSON.stringify(statistics));
            
            return totalSize;
            
        } catch (error) {
            console.error('Error calculando tamaño de almacenamiento:', error);
            return 0;
        }
    },
    
    // Verificar límite de almacenamiento
    checkStorageLimit(products, newProduct) {
        const productsJSON = JSON.stringify(products);
        const newProductJSON = JSON.stringify(newProduct);
        
        const totalSize = (productsJSON.length + newProductJSON.length) * 2; // UTF-16
        
        if (totalSize > this.MAX_STORAGE_SIZE) {
            throw new Error(`Límite de almacenamiento alcanzado (${this.MAX_STORAGE_SIZE / 1024}KB).`);
        }
        
        return true;
    },
    
    // Métodos auxiliares
    
    // Generar ID único
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    },
    
    // Normalizar fecha
    normalizeDate(dateString) {
        if (!dateString) return null;
        
        try {
            const date = new Date(dateString);
            
            // Si es una fecha inválida, intentar parsear formato YYYY-MM-DD
            if (isNaN(date.getTime())) {
                const parts = dateString.split('-');
                if (parts.length === 3) {
                    const year = parseInt(parts[0]);
                    const month = parseInt(parts[1]) - 1;
                    const day = parseInt(parts[2]);
                    return new Date(year, month, day).toISOString().split('T')[0];
                }
                throw new Error('Formato de fecha inválido');
            }
            
            return date.toISOString().split('T')[0];
            
        } catch (error) {
            console.error('Error normalizando fecha:', error);
            throw new Error('Formato de fecha inválido. Use YYYY-MM-DD');
        }
    },
    
    // Sanitizar texto
    sanitizeText(text) {
        if (!text) return '';
        
        // Limitar longitud para optimizar almacenamiento
        const maxLength = 200;
        let sanitized = String(text).trim().substring(0, maxLength);
        
        // Reemplazar caracteres problemáticos
        sanitized = sanitized.replace(/[<>]/g, '');
        
        return sanitized;
    },
    
    // Validar datos del producto
    validateProductData(productData) {
        if (!productData || typeof productData !== 'object') {
            throw new Error('Datos del producto inválidos');
        }
        
        if (!productData.name || productData.name.trim() === '') {
            throw new Error('El nombre del producto es requerido');
        }
        
        if (productData.quantity !== undefined) {
            const quantity = parseInt(productData.quantity);
            if (isNaN(quantity) || quantity < 1) {
                throw new Error('La cantidad debe ser un número positivo');
            }
        }
        
        if (productData.expiryDate) {
            try {
                this.normalizeDate(productData.expiryDate);
            } catch (error) {
                throw new Error('Fecha de expiración inválida');
            }
        }
        
        return true;
    },
    
    // Métodos de cache para productos escaneados (Task 3)
    cacheProduct(barcode, productData) {
        try {
            const cache = JSON.parse(localStorage.getItem(PRODUCT_CACHE_KEY) || '{}');
            cache[barcode] = {
                data: productData,
                timestamp: Date.now(),
                expires: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 días
            };
            
            localStorage.setItem(PRODUCT_CACHE_KEY, JSON.stringify(cache));
            console.log('Producto cacheado:', barcode);
            return true;
            
        } catch (error) {
            console.error('Error cacheando producto:', error);
            return false;
        }
    },
    
    getCachedProduct(barcode) {
        try {
            const cache = JSON.parse(localStorage.getItem(PRODUCT_CACHE_KEY) || '{}');
            const cached = cache[barcode];
            
            if (cached && cached.expires > Date.now()) {
                console.log('Producto obtenido del cache:', barcode);
                return cached.data;
            }
            
            // Eliminar cache expirado
            if (cached && cached.expires <= Date.now()) {
                delete cache[barcode];
                localStorage.setItem(PRODUCT_CACHE_KEY, JSON.stringify(cache));
            }
            
            return null;
            
        } catch (error) {
            console.error('Error obteniendo producto del cache:', error);
            return null;
        }
    },
    
    clearExpiredCache() {
        try {
            const cache = JSON.parse(localStorage.getItem(PRODUCT_CACHE_KEY) || '{}');
            const now = Date.now();
            let clearedCount = 0;
            
            for (const barcode in cache) {
                if (cache[barcode].expires <= now) {
                    delete cache[barcode];
                    clearedCount++;
                }
            }
            
            localStorage.setItem(PRODUCT_CACHE_KEY, JSON.stringify(cache));
            console.log(`${clearedCount} entradas de cache expiradas eliminadas`);
            return clearedCount;
            
        } catch (error) {
            console.error('Error limpiando cache expirado:', error);
            return 0;
        }
    }
};

// Exportar como módulo global
window.productStorage = storage.init();

    },
    
    // Eliminar productos vencidos (para uso con el sistema de alertas)
    removeExpiredProducts() {
        try {
            const products = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const activeProducts = [];
            const expiredProducts = [];
            
            products.forEach(product => {
                if (product.expirationDate) {
                    const expDate = new Date(product.expirationDate);
                    expDate.setHours(0, 0, 0, 0);
                    
                    if (expDate < today) {
                        expiredProducts.push(product);
                    } else {
                        activeProducts.push(product);
                    }
                } else {
                    activeProducts.push(product);
                }
            });
            
            // Guardar productos activos
            localStorage.setItem(STORAGE_KEY, JSON.stringify(activeProducts));
            
            // Actualizar estadísticas
            this.updateStatistics();
            
            console.log(`${expiredProducts.length} productos vencidos eliminados`);
            
            // Devolver información sobre los productos eliminados
            return {
                removed: expiredProducts,
                remaining: activeProducts,
                count: expiredProducts.length
            };
            
        } catch (error) {
            console.error('Error eliminando productos vencidos:', error);
            return { removed: [], remaining: [], count: 0 };
        }
    },
    
    // Actualizar producto (compatibilidad con expiration-alerts)
    updateProduct(id, productData) {
        try {
            return this.update(id, productData);
        } catch (error) {
            console.error('Error actualizando producto:', error);
            throw error;
        }
    }
};