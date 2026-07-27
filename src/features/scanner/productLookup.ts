import { ItemLocation } from '@/types';

const CACHE_KEY = 'despensa_product_cache';
const MAX_CACHE_ITEMS = 100;
const CACHE_LIFETIME = 7 * 24 * 60 * 60 * 1000;

export interface ProductLookupResult {
  name: string;
  category: string;
  location: ItemLocation;
  imageUrl?: string;
  barcode: string;
  unit?: string;
  notes?: string;
}

type CacheEntry = { timestamp: number; expires: number; product: ProductLookupResult };

function locationFor(category: string): ItemLocation {
  if (['Lácteos', 'Huevos', 'Carnes', 'Embutidos'].includes(category)) return 'Nevera';
  if (category === 'Frutas') return 'Frutas';
  if (category === 'Verduras') return 'Verduras';
  return 'Despensa';
}

function normalizeCachedProduct(barcode: string, raw: any): ProductLookupResult | null {
  if (!raw) return null;
  const name = raw.name || raw.product_name;
  if (!name) return null;
  const category = raw.category || 'Despensa';
  return {
    name: String(name), category, location: raw.location || locationFor(category),
    imageUrl: raw.imageUrl || raw.image_url || undefined, barcode,
    unit: raw.unit || undefined, notes: raw.notes || undefined,
  };
}

function readCache(): Record<string, CacheEntry> {
  try {
    const rawCache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    const normalized: Record<string, CacheEntry> = {};
    Object.entries(rawCache).forEach(([barcode, raw]: [string, any]) => {
      const product = normalizeCachedProduct(barcode, raw.product || raw.data);
      const expires = Number(raw.expires) || (Number(raw.timestamp) + CACHE_LIFETIME);
      if (product && expires > Date.now()) normalized[barcode] = { timestamp: Number(raw.timestamp) || Date.now(), expires, product };
    });
    return normalized;
  } catch {
    return {};
  }
}

function saveToCache(barcode: string, product: ProductLookupResult): void {
  const cache = readCache();
  cache[barcode] = { timestamp: Date.now(), expires: Date.now() + CACHE_LIFETIME, product };
  const entries = Object.entries(cache).sort(([, a], [, b]) => b.timestamp - a.timestamp);
  localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(entries.slice(0, MAX_CACHE_ITEMS))));
}

function categoryFromProduct(product: Record<string, any>): string {
  const tags: string[] = product.categories_tags || [];
  const text = `${tags.join(' ')} ${product.categories || ''} ${product.product_name_es || ''} ${product.product_name || ''}`.toLowerCase();
  if (/dair|milk|cheese|yog|lácteo/.test(text)) return 'Lácteos';
  if (/sausage|charcut|cold.?cut|ham|salami|choriz|embutido/.test(text)) return 'Embutidos';
  if (/bread|bakery|baked.?goods|panader|boulanger|pastry/.test(text)) return 'Panadería';
  if (/fruit|fruta/.test(text)) return 'Frutas';
  if (/vegetable|verdura/.test(text)) return 'Verduras';
  if (/egg|huevo/.test(text)) return 'Huevos';
  if (/meat|carne|fish|pescado/.test(text)) return 'Carnes';
  if (/beverage|drink|bebida/.test(text)) return 'Bebidas';
  return 'Despensa';
}

export async function lookupProduct(barcode: string): Promise<ProductLookupResult | null> {
  const normalized = barcode.trim();
  if (!normalized) return null;
  const cached = readCache()[normalized];
  if (cached) return cached.product;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(normalized)}.json`, { headers: { Accept: 'application/json' }, signal: controller.signal });
    if (!response.ok) throw new Error(`Open Food Facts respondió ${response.status}`);
    const data = await response.json();
    if (data.status !== 1 || !data.product) return null;
    const category = categoryFromProduct(data.product);
    const notes = [data.product.brands ? `Marca: ${data.product.brands}` : '', data.product.quantity ? `Formato: ${data.product.quantity}` : ''].filter(Boolean).join(' · ');
    const product: ProductLookupResult = {
      name: data.product.product_name_es || data.product.product_name || `Producto ${normalized}`,
      category, location: locationFor(category), imageUrl: data.product.image_front_url || data.product.image_url || undefined,
      barcode: normalized, notes: notes || undefined,
    };
    saveToCache(normalized, product);
    return product;
  } finally {
    window.clearTimeout(timeout);
  }
}
