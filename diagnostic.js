// Script de diagnóstico para la aplicación
console.log('🔍 Iniciando diagnóstico de la aplicación...');

// Verificar elementos DOM básicos
function checkDOM() {
    console.log('📄 Verificando elementos DOM...');
    
    const requiredElements = [
        'loading',
        'app',
        'total-products',
        'urgent-products',
        'warning-products',
        'products-list',
        'scan-btn',
        'home-btn',
        'recipes-btn',
        'alerts-btn'
    ];
    
    requiredElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            console.log(`✅ Elemento #${id} encontrado`);
        } else {
            console.error(`❌ Elemento #${id} NO encontrado`);
        }
    });
}

// Verificar scripts cargados
function checkScripts() {
    console.log('📦 Verificando scripts cargados...');
    
    const scripts = [
        'lib/html5-qrcode.js',
        'storage.js',
        'expiration-alerts.js',
        'scanner.js',
        'manual-form.js',
        'app.js'
    ];
    
    scripts.forEach(script => {
        const scriptElements = document.querySelectorAll(`script[src="${script}"]`);
        if (scriptElements.length > 0) {
            console.log(`✅ ${script} cargado`);
        } else {
            console.warn(`⚠️ ${script} NO cargado`);
        }
    });
}

// Verificar objetos globales
function checkGlobalObjects() {
    console.log('🌐 Verificando objetos globales...');
    
    const globals = [
        'productStorage',
        'expirationAlerts',
        'scanner',
        'openManualForm'
    ];
    
    globals.forEach(global => {
        if (typeof window[global] !== 'undefined') {
            console.log(`✅ window.${global} disponible`);
        } else {
            console.warn(`⚠️ window.${global} NO disponible`);
        }
    });
}

// Verificar localStorage
function checkLocalStorage() {
    console.log('💾 Verificando localStorage...');
    
    try {
        const storageKeys = Object.keys(localStorage);
        console.log(`📊 Total keys: ${storageKeys.length}`);
        
        // Verificar keys importantes
        const importantKeys = [
            'despensa-products',
            'despensa-categories',
            'despensa-statistics'
        ];
        
        importantKeys.forEach(key => {
            const value = localStorage.getItem(key);
            if (value) {
                console.log(`✅ ${key}: Presente`);
            } else {
                console.log(`📝 ${key}: NO presente (esto es normal si es la primera vez)`);
            }
        });
        
    } catch (error) {
        console.error(`❌ Error accediendo localStorage: ${error.message}`);
    }
}

// Función de emergencia para mostrar la aplicación
function forceShowApp() {
    console.log('🔄 Forzando visualización de la aplicación...');
    
    const loading = document.getElementById('loading');
    const app = document.getElementById('app');
    
    if (loading) {
        loading.style.display = 'none';
        console.log('✅ Pantalla de carga ocultada');
    }
    
    if (app) {
        app.style.display = 'block';
        console.log('✅ Aplicación mostrada');
        
        // Mostrar datos básicos
        const totalElement = document.getElementById('total-products');
        if (totalElement) {
            totalElement.textContent = '0';
        }
    }
}

// Ejecutar diagnóstico completo
function runFullDiagnostic() {
    console.log('🚀 Ejecutando diagnóstico completo...');
    console.log('='.repeat(50));
    
    checkDOM();
    console.log('-'.repeat(30));
    
    checkScripts();
    console.log('-'.repeat(30));
    
    checkGlobalObjects();
    console.log('-'.repeat(30));
    
    checkLocalStorage();
    console.log('-'.repeat(30));
    
    console.log('✅ Diagnóstico completado');
    console.log('='.repeat(50));
    
    // Mostrar resumen
    setTimeout(() => {
        console.log('\n📋 RESUMEN DEL DIAGNÓSTICO:');
        console.log('1. Verifica la consola del navegador (F12)');
        console.log('2. Busca errores en rojo');
        console.log('3. Si hay errores de script, prueba index-fixed.html');
        console.log('4. Si la app no carga, usa forceShowApp()');
    }, 100);
}

// Agregar función de emergencia al objeto window
window.forceShowApp = forceShowApp;
window.runDiagnostic = runFullDiagnostic;

// Ejecutar diagnóstico cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM Content Loaded - Iniciando diagnóstico');
    
    // Ejecutar diagnóstico después de un breve delay
    setTimeout(runFullDiagnostic, 500);
    
    // Plan B: si después de 3 segundos la app no carga, forzarla
    setTimeout(() => {
        const app = document.getElementById('app');
        const loading = document.getElementById('loading');
        
        if (loading && loading.style.display !== 'none' && app && app.style.display === 'none') {
            console.warn('⚠️ La app no se cargó automáticamente - forzando visualización');
            forceShowApp();
        }
    }, 3000);
});

// Manejar errores globales
window.addEventListener('error', (event) => {
    console.error('❌ ERROR GLOBAL:', event.error);
    console.error('📄 En archivo:', event.filename);
    console.error('📝 Línea:', event.lineno, 'Columna:', event.colno);
    
    // Intentar recuperar
    setTimeout(forceShowApp, 1000);
});

console.log('✅ Script de diagnóstico cargado');
console.log('💡 Usa runDiagnostic() para diagnóstico manual');
console.log('🚨 Usa forceShowApp() para forzar visualización de la app');