# 🍎 Despensa Cero Desperdicio

Una aplicación PWA (Progressive Web App) para gestionar el inventario doméstico y reducir el desperdicio de alimentos. Desarrollada exclusivamente con tecnologías web nativas.

## 🚀 Características

- **PWA 100% offline**: Instalable y funciona sin conexión a internet
- **Escaneo de códigos de barras**: Usa la cámara del dispositivo para identificar productos
- **Gestión de inventario**: Añade, edita y elimina productos manualmente
- **Alertas inteligentes**: Notifica sobre productos próximos a caducar
- **Generador de recetas**: Sugiere recetas basadas en productos urgentes usando IA
- **100% en el navegador**: No requiere backend, todo funciona en localStorage

## 📱 Tecnologías

- **Frontend**: HTML5, CSS3, JavaScript vanilla (sin frameworks)
- **PWA**: Service Workers, Web App Manifest, Cache API
- **Almacenamiento**: localStorage exclusivamente
- **APIs Externas**:
  - Open Food Facts - Datos de productos por código de barras
  - Hugging Face Inference API - Generación de recetas
- **Hardware**: Webcam API para escaneo de códigos de barras

## 🏗️ Estructura del Proyecto

```
Despensa-Cero-Desperdicio/
├── index.html          # Punto de entrada principal
├── manifest.json       # Configuración PWA
├── sw.js              # Service Worker
├── register-sw.js     # Registro del Service Worker
├── styles.css         # Estilos principales
├── app.js             # Lógica principal de la aplicación
├── README.md          # Documentación
└── assets/            # Iconos y recursos
    ├── icon-192.svg
    ├── icon-512.svg
    └── icon-maskable.svg
```

## 🛠️ Plan de Implementación

### Task 1: ✅ Configuración del proyecto base y estructura PWA
- [x] Crear estructura base del proyecto
- [x] Configurar manifest.json para PWA
- [x] Implementar Service Worker básico
- [x] Crear iconos y assets
- [x] Establecer estilos base mobile-first

### Task 2: Sistema de almacenamiento local con localStorage
- [ ] Implementar módulo storage.js
- [ ] CRUD completo para productos
- [ ] Esquema optimizado (<50KB para ~1000 productos)
- [ ] Integración con interfaz principal

### Task 3: Escaneo de códigos de barras con cámara web
- [ ] Componente de cámara modal
- [ ] Integración con Open Food Facts API
- [ ] Manejo de errores y fallbacks
- [ ] Cache local de productos escaneados

### Task 4: Gestión manual de productos como fallback
- [ ] Formulario de registro manual
- [ ] Validaciones y autocomplete
- [ ] UX optimizada para entrada rápida
- [ ] Integración con almacenamiento

### Task 5: Sistema de alertas de expiración locales
- [ ] Cálculo de estado de expiración
- [ ] Semaforización visual (verde/amarillo/rojo)
- [ ] Notificaciones locales (Notification API)
- [ ] Resumen de productos críticos

### Task 6: Motor de sugerencias de recetas con Hugging Face
- [ ] Integración con API Hugging Face
- [ ] Generación de recetas basadas en productos urgentes
- [ ] Cache de respuestas (24h)
- [ ] Recetas predefinidas como fallback

### Task 7: Refinamiento de UX/UI y responsive design
- [ ] Optimizaciones de performance (Lighthouse)
- [ ] Accesibilidad completa (WCAG)
- [ ] Dark mode automático
- [ ] Mejoras en UX para móviles

## 📦 Instalación y Uso

### Desarrollo Local
1. Clona el repositorio:
   ```bash
   git clone https://github.com/tu-usuario/despensa-cero-desperdicio.git
   ```

2. Abre el proyecto en un servidor web local:
   ```bash
   # Usando Python
   python -m http.server 8000
   
   # Usando Node.js (con http-server)
   npx http-server
   ```

3. Accede a la aplicación en `http://localhost:8000`

### Instalación como PWA
1. Abre la aplicación en Chrome/Edge
2. Haz clic en el ícono de instalación en la barra de direcciones
3. La aplicación se instalará en tu dispositivo

## 🌐 APIs Utilizadas

### Open Food Facts
- **URL**: `https://world.openfoodfacts.org/api/v0/product/{barcode}.json`
- **Propósito**: Obtener información de productos por código de barras
- **Límites**: Gratuito, sin API key requerida

### Hugging Face Inference API
- **URL**: `https://api-inference.huggingface.co/models/gpt2`
- **Propósito**: Generar recetas basadas en ingredientes
- **Configuración**: Requiere API key (limitaciones de uso gratuito)

## 🔧 Configuración de Desarrollo

### Variables de Entorno (para Task 6)
Crea un archivo `.env` en la raíz del proyecto:

```env
# Clave de API para Hugging Face (Task 6)
HUGGING_FACE_API_KEY=tu_clave_aqui
```

### Configuración del Service Worker
- **Cache Strategy**: Cache-first para recursos locales, network-first para APIs
- **Offline Support**: Página offline personalizada
- **Push Notifications**: Configuradas para alertas de expiración

## 📊 Métricas Objetivo (Lighthouse)

- **Performance**: >90
- **Accessibility**: >90  
- **Best Practices**: >90
- **PWA**: >90
- **SEO**: >90

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 🙏 Agradecimientos

- [Open Food Facts](https://world.openfoodfacts.org/) por la API de productos
- [Hugging Face](https://huggingface.co/) por la API de inferencia de IA
- Equipo de [Kiro IDE](https://kiro.dev/) por el entorno de desarrollo

---

**Desarrollado con ❤️ para reducir el desperdicio de alimentos**