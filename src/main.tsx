import { createRoot } from 'react-dom/client';
import App from '@/app/App';
import './index.css';

const PWA_CACHE = 'despensa-cero-v5';

async function removeDevelopmentPwaState(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith('despensa-cero-')).map((key) => caches.delete(key)));
  }
}

const isProduction = Boolean((import.meta as any).env?.PROD);

if (!isProduction) {
  void removeDevelopmentPwaState();
}

createRoot(document.getElementById('root')!).render(<App />);

if ('serviceWorker' in navigator && isProduction) {
  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
      const assetUrls = Array.from(document.querySelectorAll<HTMLScriptElement | HTMLLinkElement>('script[src], link[rel="stylesheet"]'))
        .map((element) => element instanceof HTMLScriptElement ? element.src : element.href)
        .filter(Boolean);
      const cache = await caches.open(PWA_CACHE);
      await cache.addAll(assetUrls);
    } catch (error) {
      console.warn('No se pudo preparar el modo offline', error);
    }
  });
}
