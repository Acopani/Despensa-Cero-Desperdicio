import { getDaysUntilExpiry } from '@/features/inventory/inventoryRepository';
import { InventoryItem } from '@/types';

export type NotificationPermissionState = 'granted' | 'prompt' | 'denied' | 'unsupported';

let permissionRequestInFlight: Promise<boolean> | null = null;

export function getNotificationPermissionState(): NotificationPermissionState {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return 'prompt';
}

export function requestNotificationPermission(): Promise<boolean> {
  const state = getNotificationPermissionState();
  if (state === 'granted') return Promise.resolve(true);
  if (state === 'denied' || state === 'unsupported') return Promise.resolve(false);

  if (!permissionRequestInFlight) {
    permissionRequestInFlight = Notification.requestPermission()
      .then((permission) => permission === 'granted')
      .finally(() => { permissionRequestInFlight = null; });
  }
  return permissionRequestInFlight;
}

export async function notifyExpiringItems(items: InventoryItem[], advanceDays: number): Promise<void> {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const expiring = items.filter((item) => {
    const days = getDaysUntilExpiry(item.expiryDate);
    return days !== null && days >= 0 && days <= advanceDays;
  });
  if (!expiring.length) return;

  const notificationKey = `despensa_notification_${new Date().toISOString().slice(0, 10)}`;
  if (localStorage.getItem(notificationKey)) return;
  const names = expiring.slice(0, 3).map((item) => item.name).join(', ');
  const options = {
    body: `${names}${expiring.length > 3 ? ` y ${expiring.length - 3} más` : ''}. ¡Aprovéchalos hoy!`,
    icon: '/icon.svg', badge: '/icon.svg', tag: 'despensa-expiry',
  };

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification('Alimentos próximos a caducar', options);
    } else {
      new Notification('Alimentos próximos a caducar', options);
    }
    localStorage.setItem(notificationKey, 'shown');
  } catch (error) {
    console.warn('No se pudo mostrar la notificación', error);
  }
}
