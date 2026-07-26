// Script para verificar sintaxis de archivos JavaScript
const fs = require('fs');
const path = require('path');

console.log('=== Verificación de sintaxis - Despensa Cero Desperdicio ===\n');

// Archivos a verificar
const filesToCheck = [
    'app.js',
    'storage.js',
    'expiration-alerts.js'
];

let allValid = true;

filesToCheck.forEach(file => {
    console.log(`Verificando ${file}...`);
    
    try {
        // Leer archivo
        const content = fs.readFileSync(file, 'utf8');
        
        // Intentar evaluar como módulo
        eval(content);
        
        // Si llegamos aquí, la sintaxis es válida
        console.log(`  ✅ ${file} - Sintaxis válida\n`);
    } catch (error) {
        console.log(`  ❌ ${file} - Error de sintaxis:`);
        console.log(`     ${error.message}\n`);
        allValid = false;
    }
});

// Verificar que los archivos HTML tienen las etiquetas correctas
console.log('Verificando archivos HTML...\n');

try {
    const indexHtml = fs.readFileSync('index.html', 'utf8');
    
    // Verificar etiquetas básicas
    const checks = [
        { name: 'DOCTYPE', regex: /<!DOCTYPE html>/i, required: true },
        { name: 'HTML tag', regex: /<html.*?>/i, required: true },
        { name: 'Head tag', regex: /<head.*?>.*?<\/head>/is, required: true },
        { name: 'Body tag', regex: /<body.*?>.*?<\/body>/is, required: true },
        { name: 'Loading screen', regex: /id="loading"/i, required: true },
        { name: 'App container', regex: /id="app"/i, required: true },
        { name: 'Script app.js', regex: /script.*?src="app.js"/i, required: true },
        { name: 'Script storage.js', regex: /script.*?src="storage.js"/i, required: true }
    ];
    
    let htmlValid = true;
    checks.forEach(check => {
        if (check.required && !check.regex.test(indexHtml)) {
            console.log(`  ⚠️ index.html - Falta: ${check.name}`);
            htmlValid = false;
        }
    });
    
    if (htmlValid) {
        console.log('  ✅ index.html - Estructura básica correcta\n');
    } else {
        console.log('  ⚠️ index.html - Problemas de estructura\n');
        allValid = false;
    }
    
} catch (error) {
    console.log(`  ❌ Error leyendo index.html: ${error.message}\n`);
    allValid = false;
}

// Verificar existencia de archivos CSS
console.log('Verificando archivos CSS...\n');

const cssFiles = ['styles.css', 'scanner.css'];
cssFiles.forEach(file => {
    try {
        fs.accessSync(file);
        console.log(`  ✅ ${file} - Existe`);
    } catch {
        console.log(`  ⚠️ ${file} - No encontrado`);
    }
});
console.log('');

// Resumen final
console.log('=== RESUMEN ===');
if (allValid) {
    console.log('✅ Todos los archivos JavaScript tienen sintaxis válida');
    console.log('✅ La aplicación debería cargarse correctamente');
    console.log('\n✅ ¡La aplicación está lista para usar!');
} else {
    console.log('❌ Se encontraron errores de sintaxis en algunos archivos');
    console.log('❌ La aplicación podría no cargarse correctamente');
    console.log('\n⚠️  Se recomienda corregir los errores antes de continuar');
}

process.exit(allValid ? 0 : 1);