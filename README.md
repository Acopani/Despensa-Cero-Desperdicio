# Despensa Cero

Aplicación web progresiva para administrar alimentos, controlar caducidades y generar recetas de aprovechamiento.

## Funcionalidades

- Inventario persistente en el navegador con estados de caducidad.
- Alta manual y lectura de códigos de barras mediante Open Food Facts.
- Selección de cámara y formulario manual cuando el escaneo no está disponible.
- Alertas locales para productos próximos a caducar.
- Recetas completas con Gemini y generador local cuando la IA no está disponible.
- Historial de recetas con rotación para reducir recomendaciones repetitivas.
- Tema claro/oscuro, funcionamiento sin conexión e instalación como PWA.
- Migración de inventario y recetas guardados por versiones anteriores.

## Arquitectura y persistencia

El cliente utiliza React, TypeScript, Vite y Tailwind CSS. El servidor Express protege la clave de Gemini y sirve tanto la API como la compilación de producción.

El inventario, las preferencias y las recetas se guardan en `localStorage`. No existe autenticación remota ni sincronización entre dispositivos: cada navegador mantiene sus propios datos.

## Requisitos

- Node.js 20 o posterior.
- Una clave de Gemini solo si se desean recetas generadas con IA.
- HTTPS o `localhost` para utilizar cámara, notificaciones y PWA.

## Configuración local

1. Instala las dependencias:
   ```powershell
   npm install
   ```
2. Copia `.env.example` como `.env.local` y configura `GEMINI_API_KEY`.
3. Inicia la aplicación:
   ```powershell
   npm run dev
   ```
4. Abre `http://localhost:3000`.

La clave de Gemini permanece en el servidor. Si no está configurada, el cliente utiliza el generador culinario local.

## Comandos

| Comando | Uso |
| --- | --- |
| `npm run dev` | Inicia Express y Vite en desarrollo |
| `npm run typecheck` | Comprueba los tipos de cliente y servidor |
| `npm run lint` | Alias de la comprobación de TypeScript |
| `npm run build` | Compila cliente y servidor en `dist/` |
| `npm start` | Ejecuta la compilación de producción |
| `npm run clean` | Elimina los artefactos de `dist/` |

## Estructura

```text
despensa-cero/
├── public/                       # PWA y utilidades de mantenimiento
│   ├── icon.svg
│   ├── manifest.webmanifest
│   ├── refresh.html              # Renueva caché conservando datos
│   ├── reset.html                # Borra inventario y recetas locales
│   └── sw.js
├── server/
│   └── index.ts                  # API Express y conexión con Gemini
├── src/
│   ├── app/
│   │   ├── App.tsx               # Composición y estado global
│   │   └── defaultUser.ts        # Preferencias iniciales
│   ├── features/
│   │   ├── auth/                 # Bienvenida local
│   │   ├── inventory/            # Inventario, formulario y persistencia
│   │   ├── recipes/              # Generación, normalización y catálogo
│   │   ├── scanner/              # Cámara y Open Food Facts
│   │   └── settings/             # Perfil y preferencias
│   ├── shared/
│   │   ├── components/           # Diálogos reutilizables
│   │   ├── layout/               # Navegación y encabezado
│   │   └── services/             # Capacidades compartidas
│   ├── index.css
│   ├── main.tsx                  # Entrada del cliente y PWA
│   └── types.ts                  # Contratos compartidos
├── .env.example
├── package.json
├── tsconfig.json
└── vite.config.ts
```

`node_modules/` y `dist/` son artefactos generados y no forman parte del código fuente.

## Mantenimiento local

- `http://localhost:3000/refresh.html`: elimina service workers y cachés antiguas sin tocar inventario, recetas ni preferencias.
- `http://localhost:3000/reset.html`: elimina inventario, recetas y cachés locales; conserva las preferencias del usuario.

## Producción

```powershell
npm run build
npm start
```

Configura `NODE_ENV=production`, `GEMINI_API_KEY` y, si el proveedor lo requiere, `PORT`. El proveedor debe exponer la aplicación mediante HTTPS para habilitar cámara y notificaciones.
