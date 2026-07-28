# 🥬 Despensa Cero — Control inteligente de alimentos

Aplicación web progresiva para administrar los alimentos del hogar, anticipar sus fechas de caducidad y convertir el inventario disponible en recetas de aprovechamiento. Despensa Cero combina registro manual, escaneo de códigos de barras, alertas locales y generación de recetas con IA para ayudar a reducir el desperdicio alimentario sin depender de una cuenta ni enviar el inventario a una base de datos remota.

## 📋 Índice

- 👥 Equipo
- 🧭 ¿Por qué Kiro?
  - Revisión integral del producto
  - Ingeniería con visión de extremo a extremo
  - Validación antes de cerrar cambios
  - Documentación basada en evidencia
- 🎯 Objetivos del proyecto
- 🏆 Formulario de descripción del proyecto
- ✨ Funcionalidades principales
- 📋 Prerrequisitos
- 🚀 Inicio rápido
- 🎮 Ejecución
- 📜 Scripts disponibles
- 📁 Estructura del proyecto
- 🏗️ Arquitectura y persistencia
- 🛠️ Tecnologías
- 🔐 Privacidad y seguridad
- 🌐 Compatibilidad
- 🧹 Mantenimiento local
- 🤝 Contribuir
- 📝 Licencia

## 👥 Equipo

**Hackathon Kiro — Despensa Cero**

Repositorio mantenido por [@Acopani](https://github.com/Acopani): [Acopani/Despensa-Cero-Desperdicio](https://github.com/Acopani/Despensa-Cero-Desperdicio).

## 🧭 ¿Por qué Kiro?

Kiro no se utilizó únicamente para producir fragmentos aislados de código. Se incorporó como un agente de ingeniería capaz de recorrer el proyecto completo, relacionar la experiencia del usuario con la implementación y comprobar que el resultado estuviera listo para entregarse.

### Revisión integral del producto

Kiro contrastó la documentación con el cliente React, el servidor Express, el manifiesto PWA y los scripts reales del repositorio. Esa revisión permitió detectar diferencias que una inspección limitada a la interfaz no habría mostrado: la rama predeterminada de GitHub todavía apuntaba a una versión antigua, el README público describía tecnologías que ya no se utilizaban y la configuración indicaba un nombre de archivo de entorno distinto del que carga `dotenv`.

El resultado fue una preparación de entrega basada en el estado real del proyecto: la implementación vigente quedó alineada localmente con `main`, la documentación pasó a describir React, TypeScript, Express y Gemini, y la configuración se normalizó para utilizar `.env` sin exponer secretos.

### Ingeniería con visión de extremo a extremo

La aplicación distribuye responsabilidades entre funcionalidades independientes: inventario, escáner, recetas, ajustes, componentes compartidos y servidor. Kiro pudo seguir cada flujo a través de esas capas en lugar de tratar cada archivo de forma aislada. Por ejemplo, una receta generada con IA comienza en el inventario del navegador, pasa por la pantalla de recetas, llega a una ruta protegida del servidor y vuelve normalizada a la interfaz; si el servicio externo no está disponible, la aplicación conserva el flujo mediante un generador local.

Esta visión completa también ayudó a mantener límites importantes del producto:

- La clave de Gemini permanece en el servidor.
- El inventario y las preferencias pertenecen al navegador del usuario.
- El escáner tiene un formulario manual como alternativa.
- La PWA registra su service worker únicamente en producción.
- La pantalla de bienvenida no se presenta como autenticación remota.

### Validación antes de cerrar cambios

Los cambios se comprobaron con los comandos definidos por el propio proyecto:

- `npm run typecheck` para validar los tipos del cliente y del servidor.
- `npm run build` para generar el cliente optimizado y el servidor de producción.
- `git diff --check` para detectar errores de formato en los cambios.

Este flujo reduce el riesgo de que la documentación prometa comandos inexistentes o de que una modificación aparentemente pequeña deje el proyecto sin compilar.

### Documentación basada en evidencia

El README se redactó usando el código y la configuración como fuente de verdad. Por eso no atribuye al repositorio specs, servidores MCP, suites de pruebas, guías de contribución o licencias que todavía no existen. La documentación distingue además entre las capacidades principales, las alternativas locales y las limitaciones actuales, para que una persona evaluadora pueda entender qué está implementado sin depender de afirmaciones difíciles de verificar.

## 🎯 Objetivos del proyecto

Despensa Cero busca reducir el desperdicio de alimentos en los hogares mediante cinco objetivos concretos:

1. **Hacer visible el inventario doméstico:** reunir en un solo lugar qué productos hay, dónde están almacenados y cuándo caducan.
2. **Anticipar pérdidas evitables:** clasificar los alimentos por urgencia y avisar sobre los productos que requieren atención.
3. **Facilitar el registro cotidiano:** permitir altas manuales y lectura de códigos de barras con una alternativa funcional cuando la cámara no esté disponible.
4. **Convertir el inventario en acciones útiles:** proponer recetas que prioricen alimentos próximos a vencer, con IA cuando está configurada y con generación local cuando no lo está.
5. **Mantener una experiencia accesible y privada:** funcionar como PWA, conservar los datos localmente y no exigir una cuenta remota.

## 🏆 Formulario de descripción del proyecto

### ¿En cuál reto o vertical enfocaron su proyecto?

- **Aplicaciones web**
- Enfoque transversal: **sostenibilidad y reducción del desperdicio alimentario**

### Título

**Despensa Cero — Control inteligente de alimentos**

### Breve descripción

Despensa Cero es una aplicación web progresiva que permite administrar el inventario doméstico, controlar fechas de caducidad, recibir alertas y generar recetas para aprovechar los alimentos disponibles antes de que se desperdicien.

### ¿Qué problema soluciona el proyecto?

En muchos hogares se compran alimentos que terminan olvidados en la despensa, el refrigerador o el congelador. La información está dispersa, las fechas de caducidad pasan desapercibidas y, aun cuando una persona identifica un producto urgente, no siempre sabe cómo incorporarlo a una comida. El resultado es desperdicio de alimentos y dinero que podría evitarse con información oportuna.

Despensa Cero reúne el inventario en una sola experiencia, calcula el estado de caducidad de cada producto, permite configurar alertas y transforma los ingredientes disponibles en recetas accionables. La aplicación no se limita a señalar el problema: ayuda a decidir qué consumir primero y cómo aprovecharlo.

### ¿Por qué debería ser seleccionado? ¿Cuáles son sus mayores fortalezas?

- **Resuelve el ciclo completo:** registra alimentos, los organiza, detecta urgencias y propone una acción concreta mediante recetas.
- **Mantiene alternativas funcionales:** si falla la cámara se puede usar el formulario manual; si Gemini no está configurado o no responde, entra en funcionamiento el generador local.
- **Protege los datos y las credenciales:** el inventario permanece en `localStorage` y la clave de Gemini nunca se entrega al navegador.
- **Aprovecha capacidades reales de la plataforma web:** cámara, notificaciones, instalación PWA, funcionamiento sin conexión, tema oscuro y diseño adaptable.
- **Tiene una arquitectura preparada para evolucionar:** cliente tipado por funcionalidades, contratos compartidos y servidor separado para integraciones sensibles.
- **Genera impacto cotidiano medible:** cada producto consumido antes de caducar representa menos residuos y mejor aprovechamiento del gasto familiar.

### Comentarios adicionales

El proyecto parte de una idea sencilla: reducir desperdicio no debería exigir llevar hojas de cálculo ni recordar mentalmente todo lo almacenado. Despensa Cero convierte esa tarea en un flujo práctico que acompaña a la persona desde el registro del alimento hasta su aprovechamiento en una receta.

### Repositorio público

[https://github.com/Acopani/Despensa-Cero-Desperdicio](https://github.com/Acopani/Despensa-Cero-Desperdicio)

## ✨ Funcionalidades principales

- Inventario persistente en el navegador con ubicación, cantidad y fecha de caducidad.
- Estados visuales para alimentos seguros, próximos, urgentes o caducados.
- Alta manual de productos mediante un formulario optimizado para dispositivos móviles.
- Escaneo de códigos de barras con selección de cámara y consulta a Open Food Facts.
- Formulario manual como alternativa cuando el escaneo no está disponible.
- Alertas locales configurables para productos próximos a caducar.
- Recetas completas generadas con Gemini a través de un servidor que protege la clave.
- Generador culinario local cuando la IA no está configurada o no está disponible.
- Historial con rotación de recetas para reducir recomendaciones repetitivas.
- Preferencias locales, tema claro/oscuro y nombre de usuario editable.
- Instalación como PWA y funcionamiento sin conexión después del build de producción.
- Utilidades para renovar cachés o restablecer los datos locales.

## 📋 Prerrequisitos

- **Node.js 20** o posterior.
- **npm**, incluido con Node.js.
- Un navegador web moderno.
- Una clave de **Google Gemini API** solo si se desean recetas generadas con IA.
- `localhost` o HTTPS para utilizar cámara, notificaciones y capacidades PWA.

La clave de Gemini es opcional. Sin ella, el resto de la aplicación continúa funcionando y las recetas utilizan el generador local.

## 🚀 Inicio rápido

### 1. Clonar el repositorio

```powershell
git clone https://github.com/Acopani/Despensa-Cero-Desperdicio.git
Set-Location Despensa-Cero-Desperdicio
```

### 2. Instalar las dependencias

```powershell
npm install
```

### 3. Configurar Gemini — opcional

Copia el archivo de ejemplo y sustituye el valor de la clave:

```powershell
Copy-Item .env.example .env
```

```env
GEMINI_API_KEY="tu_clave_de_gemini"
PORT=3000
```

No confirmes `.env` en Git. El patrón `.env*` ya está incluido en `.gitignore`, con la única excepción de `.env.example`.

Si no vas a utilizar Gemini, puedes omitir este paso.

### 4. Iniciar la aplicación

```powershell
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## 🎮 Ejecución

### Modo desarrollo

```powershell
npm run dev
```

Express inicia en el puerto `3000` —o en el valor definido mediante `PORT`— e integra Vite como middleware con recarga durante el desarrollo.

### Build de producción

```powershell
npm run build
```

El comando genera en `dist/` los recursos optimizados del cliente y `dist/server.cjs` para el servidor.

### Ejecutar la compilación de producción

```powershell
npm start
```

La aplicación queda disponible en [http://localhost:3000](http://localhost:3000), salvo que se configure otro puerto.

### Comprobar el servidor

Con la aplicación en ejecución, el endpoint de salud responde en:

```text
GET http://localhost:3000/api/health
```

Respuesta esperada:

```json
{
  "status": "ok",
  "app": "Despensa Cero"
}
```

## 📜 Scripts disponibles

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Inicia Express y Vite en modo desarrollo. |
| `npm run typecheck` | Comprueba los tipos TypeScript sin generar archivos. |
| `npm run lint` | Ejecuta la comprobación de TypeScript usada actualmente como lint. |
| `npm run build` | Compila el cliente y empaqueta el servidor en `dist/`. |
| `npm start` | Ejecuta el servidor generado en modo producción. |
| `npm run clean` | Elimina el directorio `dist/`. |

## 📁 Estructura del proyecto

```text
Despensa-Cero-Desperdicio/
├── public/                         # Recursos estáticos y capacidades PWA
│   ├── icon.svg
│   ├── manifest.webmanifest
│   ├── refresh.html                # Renueva cachés conservando los datos
│   ├── reset.html                  # Restablece datos y cachés locales
│   └── sw.js                       # Service worker de producción
├── server/
│   └── index.ts                    # Express, API de recetas y servidor web
├── src/
│   ├── app/
│   │   ├── App.tsx                 # Composición, estado y navegación principal
│   │   └── defaultUser.ts          # Preferencias iniciales
│   ├── features/
│   │   ├── auth/                   # Pantalla de bienvenida local
│   │   ├── inventory/              # Inventario, formulario y persistencia
│   │   ├── recipes/                # IA, fallback local, detalle y normalización
│   │   ├── scanner/                # Cámara y consulta a Open Food Facts
│   │   └── settings/               # Perfil, apariencia y notificaciones
│   ├── shared/
│   │   ├── components/             # Diálogos reutilizables
│   │   ├── layout/                 # Encabezado y navegación inferior
│   │   └── services/               # Servicios compartidos del navegador
│   ├── index.css                   # Estilos globales con Tailwind CSS
│   ├── main.tsx                    # Entrada React y registro PWA
│   └── types.ts                    # Contratos compartidos
├── .env.example                    # Variables de entorno de referencia
├── index.html                      # Documento base del cliente
├── package.json                    # Dependencias y scripts
├── tsconfig.json                   # Configuración TypeScript
└── vite.config.ts                  # React, Tailwind, alias y desarrollo
```

`node_modules/` y `dist/` son artefactos generados y no forman parte del código fuente que debe revisarse.

## 🏗️ Arquitectura y persistencia

### Cliente

El cliente utiliza React y TypeScript con una organización por funcionalidades. `App.tsx` conserva el estado de alto nivel y conecta inventario, recetas, escáner y ajustes; cada carpeta de `features/` mantiene la interfaz y la lógica específica de su dominio.

### Servidor

Express cumple dos responsabilidades:

1. En desarrollo integra Vite como middleware; en producción sirve el contenido compilado de `dist/`.
2. Expone `POST /api/recipes/ai`, valida la entrada, aplica un límite temporal en memoria y consulta `gemini-2.5-flash` sin revelar la clave al cliente.

### Persistencia local

El inventario, las preferencias y el historial de recetas se guardan en `localStorage`. No existe autenticación remota ni sincronización entre dispositivos: cada navegador conserva su propia copia de los datos.

La pantalla inicial funciona como una bienvenida local. No crea una cuenta, no valida credenciales y no debe interpretarse como un sistema de inicio de sesión remoto.

### Funcionamiento degradado

Despensa Cero evita que una integración opcional bloquee el uso principal:

- Sin cámara o permiso de cámara, permanece disponible el alta manual.
- Sin resultados de Open Food Facts, el producto puede completarse manualmente.
- Sin clave de Gemini, o ante un fallo del servicio, se utiliza el generador local de recetas.
- Sin permisos de notificación, el inventario y sus estados visuales siguen disponibles.

### PWA y modo sin conexión

El service worker se registra únicamente en producción. Durante el desarrollo, la aplicación elimina registros y cachés PWA anteriores para evitar que recursos obsoletos oculten cambios recientes. Después de compilar y servir la versión de producción, los recursos principales se almacenan para permitir la instalación y mejorar el uso sin conexión.

## 🛠️ Tecnologías

| Tecnología | Uso en el proyecto |
| --- | --- |
| **React 19** | Interfaz, estado y composición de pantallas. |
| **TypeScript** | Contratos y comprobación estática en cliente y servidor. |
| **Vite 6** | Desarrollo, transformación y build del cliente. |
| **Tailwind CSS 4** | Sistema de estilos y diseño adaptable. |
| **Express 4** | API protegida y servidor de la aplicación. |
| **Google Gen AI SDK** | Generación estructurada de recetas con Gemini. |
| **html5-qrcode** | Acceso a cámara y lectura de códigos de barras. |
| **Open Food Facts** | Consulta de información pública asociada a códigos de barras. |
| **Lucide React** | Iconografía de la interfaz. |
| **Service Worker y Web App Manifest** | Instalación PWA, caché y funcionamiento sin conexión. |
| **Web Storage y Notifications API** | Persistencia local y alertas del navegador. |

## 🔐 Privacidad y seguridad

- La clave `GEMINI_API_KEY` se lee exclusivamente en el servidor.
- El servidor desactiva la cabecera `X-Powered-By`, limita el cuerpo JSON y valida los ingredientes antes de enviarlos a Gemini.
- El inventario, las preferencias y las recetas no se almacenan en una base de datos remota.
- Al solicitar una receta con IA, los ingredientes necesarios se procesan a través del servidor y se envían al proveedor de Gemini.
- Al escanear un código, la aplicación consulta Open Food Facts para recuperar información del producto.
- `localStorage` no está cifrado; no debe utilizarse para guardar contraseñas ni información sensible.
- `.env` está excluido de Git para evitar publicar credenciales por accidente.

## 🌐 Compatibilidad

La experiencia principal está diseñada para versiones modernas de Chrome, Edge, Firefox y Safari. Algunas capacidades dependen del navegador y del sistema operativo:

- La cámara, las notificaciones y la instalación PWA requieren un contexto seguro: HTTPS o `localhost`.
- Chrome y Edge suelen ofrecer la experiencia PWA más completa en escritorio y Android.
- La disponibilidad de instalación y notificaciones puede variar en Safari, Firefox e iOS.
- Si una capacidad no está disponible, la aplicación mantiene alternativas manuales para inventario y recetas.

## 🧹 Mantenimiento local

Con la aplicación en ejecución:

- [http://localhost:3000/refresh.html](http://localhost:3000/refresh.html) elimina service workers y cachés anteriores sin borrar inventario, recetas ni preferencias.
- [http://localhost:3000/reset.html](http://localhost:3000/reset.html) elimina inventario, recetas y cachés locales; conserva las preferencias del usuario.

Utiliza `refresh.html` cuando el navegador muestre una versión antigua después de actualizar. Utiliza `reset.html` únicamente cuando quieras reiniciar los datos locales de la aplicación.

## 🤝 Contribuir

1. Haz un fork del repositorio.
2. Crea una rama para el cambio:
   ```powershell
   git switch -c feature/nombre-del-cambio
   ```
3. Implementa el cambio sin incluir `.env`, `node_modules/` ni `dist/`.
4. Valida el proyecto:
   ```powershell
   npm run typecheck
   npm run build
   ```
5. Crea un commit descriptivo y abre un Pull Request contra `main`.

Antes de proponer una modificación, conserva la separación entre funcionalidades, evita mover secretos al cliente y documenta cualquier variable de entorno o integración nueva.

## 📝 Licencia

Este proyecto fue desarrollado para el Hackathon Kiro. El repositorio todavía no incluye un archivo `LICENSE`; antes de reutilizar o redistribuir el código debe definirse y añadirse explícitamente la licencia correspondiente.

---

**Despensa Cero:** menos alimentos olvidados, más decisiones a tiempo y mejores formas de aprovechar lo que ya tienes.
