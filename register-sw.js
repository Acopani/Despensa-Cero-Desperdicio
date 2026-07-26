// Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js', {
        scope: './'
      });
      
      console.log('Service Worker registrado con éxito:', registration);
      
      // Verificar actualizaciones del Service Worker
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('Nueva versión del Service Worker disponible');
            // Aquí se podría mostrar una notificación al usuario
          }
        });
      });
      
      // Solicitar permisos de notificación
      if ('Notification' in window && Notification.permission === 'default') {
        try {
          const permission = await Notification.requestPermission();
          console.log('Permiso de notificación:', permission);
        } catch (error) {
          console.error('Error solicitando permisos de notificación:', error);
        }
      }
      
    } catch (error) {
      console.error('Error registrando Service Worker:', error);
    }
  });
}

// Verificar si la app está instalada
window.addEventListener('appinstalled', (event) => {
  console.log('¡App instalada!', event);
  
  // Registrar instalación (opcional, para analytics)
  if (window.gtag) {
    window.gtag('event', 'app_installed');
  }
  
  // Mostrar mensaje de bienvenida
  showToast('¡Aplicación instalada correctamente!');
});

// Verificar si está en modo standalone (instalada como PWA)
function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || 
         window.navigator.standalone ||
         document.referrer.includes('android-app://');
}

// Mostrar toast notifications
function showToast(message, duration = 3000) {
  if (typeof window !== 'undefined') {
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
}

// Añadir estilos para las animaciones de toast
const style = document.createElement('style');
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
`;
document.head.appendChild(style);

// Verificar si estamos offline
function updateOnlineStatus() {
  const isOnline = navigator.onLine;
  console.log('Estado de conexión:', isOnline ? 'online' : 'offline');
  
  if (!isOnline && typeof window !== 'undefined') {
    showToast('Estás offline. Algunas funciones pueden no estar disponibles.', 5000);
  }
}

// Escuchar cambios en el estado de la conexión
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// Inicializar al cargar la página
updateOnlineStatus();