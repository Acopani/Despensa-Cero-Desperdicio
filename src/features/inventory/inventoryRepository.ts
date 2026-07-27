import { InventoryItem, ItemLocation, ItemStatus } from '@/types';

const INVENTORY_KEY = 'despensa_inventory';
const LEGACY_KEY = 'despensa_productos';
const LEGACY_BACKUP_KEY = 'despensa_productos_backup';
const PRODUCT_CACHE_KEY = 'despensa_product_cache';

const CATEGORY_IMAGES: Record<string, string> = {
  'Lácteos': 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&q=80&w=400',
  Frutas: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&q=80&w=400',
  Verduras: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=400',
  Huevos: 'https://images.unsplash.com/photo-1516448620398-c5f44bf9f441?auto=format&fit=crop&q=80&w=400',
  Embutidos: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=400',
  'Panadería': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=400',
  Despensa: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=400',
};
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400';

type ParsedInventory = { state: 'missing' | 'valid' | 'invalid'; data: Partial<InventoryItem>[] };

function dateAsUtc(value: string): number {
  const [year, month, day] = value.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

export function getDaysUntilExpiry(expiryDate: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) return null;
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((dateAsUtc(expiryDate) - today) / 86_400_000);
}

export function getExpiryPresentation(expiryDate: string): { status: ItemStatus; expiryLabel: string } {
  const days = getDaysUntilExpiry(expiryDate);
  if (days === null) return { status: 'seguro', expiryLabel: 'Sin fecha de caducidad' };
  if (days < 0) {
    const elapsed = Math.abs(days);
    return { status: 'caducado', expiryLabel: elapsed === 1 ? 'Caducó ayer' : `Caducó hace ${elapsed} días` };
  }
  if (days === 0) return { status: 'urgente', expiryLabel: 'Expira hoy' };
  if (days <= 2) return { status: 'urgente', expiryLabel: days === 1 ? 'Expira mañana' : 'Expira en 2 días' };
  if (days <= 5) return { status: 'pronto', expiryLabel: `Expira en ${days} días` };
  if (days >= 60) return { status: 'seguro', expiryLabel: `Expira en ${Math.round(days / 30)} meses` };
  return { status: 'seguro', expiryLabel: `Expira en ${days} días` };
}

function inferLocation(category = ''): ItemLocation {
  if (/lácteo|huevo|carne|pescado|embutido/i.test(category)) return 'Nevera';
  if (/congel/i.test(category)) return 'Congelador';
  if (/fruta/i.test(category)) return 'Frutas';
  if (/verdura/i.test(category)) return 'Verduras';
  return 'Despensa';
}

export function normalizeItem(raw: Partial<InventoryItem>): InventoryItem {
  const category = String(raw.category || 'Otros');
  const expiryDate = raw.expiryDate ? String(raw.expiryDate) : '';
  return {
    id: String(raw.id || `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    name: String(raw.name || 'Producto sin nombre').trim(),
    quantity: Math.max(0, Number(raw.quantity) || 1),
    unit: String(raw.unit || 'uds'),
    location: raw.location || inferLocation(category),
    category,
    ...getExpiryPresentation(expiryDate),
    expiryDate,
    imageUrl: String(raw.imageUrl || CATEGORY_IMAGES[category] || FALLBACK_IMAGE),
    barcode: raw.barcode ? String(raw.barcode) : undefined,
    notes: raw.notes ? String(raw.notes) : undefined,
  };
}

function parseArray(key: string): ParsedInventory {
  const value = localStorage.getItem(key);
  if (value === null) return { state: 'missing', data: [] };
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? { state: 'valid', data: parsed } : { state: 'invalid', data: [] };
  } catch {
    return { state: 'invalid', data: [] };
  }
}

export const inventoryRepository = {
  load(): InventoryItem[] {
    const current = parseArray(INVENTORY_KEY);
    if (current.state === 'valid') return current.data.map(normalizeItem);

    const legacy = parseArray(LEGACY_KEY);
    if (legacy.state === 'valid' && legacy.data.length) {
      if (!localStorage.getItem(LEGACY_BACKUP_KEY)) localStorage.setItem(LEGACY_BACKUP_KEY, JSON.stringify(legacy.data));
      const migrated = legacy.data.map(normalizeItem);
      this.save(migrated);
      return migrated;
    }
    return [];
  },

  save(items: InventoryItem[]): void {
    localStorage.setItem(INVENTORY_KEY, JSON.stringify(items.map(normalizeItem)));
  },

  async clearCaches(): Promise<void> {
    localStorage.removeItem(PRODUCT_CACHE_KEY);
    localStorage.removeItem('despensa-recipes-cache');
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key.startsWith('despensa-cero-')).map((key) => caches.delete(key)));
    }
  },

  refresh(items: InventoryItem[]): InventoryItem[] {
    return items.map(normalizeItem);
  },
};
