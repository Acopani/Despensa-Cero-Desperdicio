import { useEffect, useRef, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { DEFAULT_USER } from '@/app/defaultUser';
import { LoginScreen } from '@/features/auth/LoginScreen';
import { AddProductBottomSheet } from '@/features/inventory/AddProductBottomSheet';
import { InventoryScreen } from '@/features/inventory/InventoryScreen';
import { inventoryRepository, normalizeItem } from '@/features/inventory/inventoryRepository';
import { normalizeRecipe } from '@/features/recipes/recipeNormalizer';
import { RecipesScreen } from '@/features/recipes/RecipesScreen';
import { ScannerScreen } from '@/features/scanner/ScannerScreen';
import { SettingsScreen } from '@/features/settings/SettingsScreen';
import { BottomNav } from '@/shared/layout/BottomNav';
import { Header } from '@/shared/layout/Header';
import { notifyExpiringItems } from '@/shared/services/notifications';
import { InventoryItem, Recipe, TabType, UserProfile } from '@/types';

function parseJson<T>(key: string): T | null {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function loadUser(): UserProfile {
  const saved = parseJson<UserProfile>('despensa_user');
  const loaded = saved || DEFAULT_USER;
  const profile = { ...loaded } as UserProfile & { email?: string };
  delete profile.email;
  const hasPermission = 'Notification' in window && Notification.permission === 'granted';
  return {
    ...profile,
    notificationsAlerts: Boolean(profile.notificationsAlerts && hasPermission),
    notificationsDaily: Boolean(profile.notificationsDaily && hasPermission),
  };
}

function loadRecipes(): Recipe[] {
  const current = parseJson<any[]>('despensa_recipes');
  const base = Array.isArray(current) ? current : [];
  const favorites = parseJson<any[]>('despensa-favorite-recipes');
  const combined = Array.isArray(favorites) ? [...base, ...favorites] : base;
  return combined
    .map((recipe, index) => normalizeRecipe(recipe, index))
    .filter((recipe, index, recipes) => recipes.findIndex((candidate) => candidate.id === recipe.id || candidate.title === recipe.title) === index);
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('despensa_logged_in') !== 'false');
  const [user, setUser] = useState<UserProfile>(loadUser);
  const [items, setItems] = useState<InventoryItem[]>(() => inventoryRepository.load());
  const [recipes, setRecipes] = useState<Recipe[]>(loadRecipes);
  const [currentTab, setCurrentTab] = useState<TabType>('inventory');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    localStorage.setItem('despensa_user', JSON.stringify(user));
    document.documentElement.classList.toggle('dark', user.darkMode);
  }, [user]);

  useEffect(() => {
    inventoryRepository.save(items);
    if (user.notificationsAlerts || user.notificationsDaily) void notifyExpiringItems(items, user.advanceDays);
  }, [items, user.notificationsAlerts, user.notificationsDaily, user.advanceDays]);

  useEffect(() => localStorage.setItem('despensa_recipes', JSON.stringify(recipes)), [recipes]);
  useEffect(() => () => { if (toastTimer.current) window.clearTimeout(toastTimer.current); }, []);

  const showToast = (message: string) => {
    setToastMsg(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 3000);
  };

  const handleLogin = (name: string) => {
    setUser((previous) => ({ ...previous, name }));
    localStorage.setItem('despensa_logged_in', 'true');
    setIsLoggedIn(true);
    showToast(`¡Bienvenido a Despensa Cero, ${name}!`);
  };

  const handleLogout = () => {
    localStorage.setItem('despensa_logged_in', 'false');
    setIsLoggedIn(false);
  };

  const handleUpdateItem = (updatedItem: InventoryItem) => {
    const normalized = normalizeItem(updatedItem);
    setItems((previous) => previous.map((item) => item.id === normalized.id ? normalized : item));
  };

  const handleDeleteItem = (itemId: string) => {
    setItems((previous) => previous.filter((item) => item.id !== itemId));
    showToast('Producto eliminado del inventario.');
  };

  const handleSaveProduct = (newProduct: InventoryItem) => {
    const normalized = normalizeItem(newProduct);
    setItems((previous) => [normalized, ...previous.filter((item) => item.id !== normalized.id)]);
    showToast(`“${normalized.name}” guardado en ${normalized.location}.`);
  };

  const handleCookRecipe = (recipe: Recipe) => {
    showToast(`“${recipe.title}” marcada como cocinada. Ajusta las cantidades usadas desde el inventario.`);
  };

  const handleGeneratedRecipe = (recipe: Recipe) => {
    setRecipes((previous) => [recipe, ...previous.filter((item) => item.id !== recipe.id)].slice(0, 30));
  };

  const refreshInventory = () => {
    setItems((previous) => inventoryRepository.refresh(previous));
    showToast('Caducidades e inventario actualizados.');
  };

  const clearCaches = async () => {
    await inventoryRepository.clearCaches();
    setRecipes((previous) => previous.filter((recipe) => !/^(ai|local)-/.test(recipe.id)));
    showToast('Caché offline, de productos y recetas temporales eliminada.');
  };

  if (!isLoggedIn) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-[#faf9f9] dark:bg-[#121413] text-[#1a1c1c] dark:text-[#faf9f9] font-sans relative antialiased transition-colors duration-200">
      {toastMsg && <div role="status" className="fixed top-20 left-1/2 -translate-x-1/2 z-[70] bg-[#006e1c] text-white px-5 py-2.5 rounded-full shadow-xl text-xs font-bold flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /><span>{toastMsg}</span></div>}
      <Header currentTab={currentTab} userName={user.name} onRefresh={refreshInventory} />
      <div className="w-full transition-all">
        {currentTab === 'inventory' && <InventoryScreen userName={user.name} items={items} onOpenScanner={() => setCurrentTab('scanner')} onUpdateItem={handleUpdateItem} onDeleteItem={handleDeleteItem} onAddNewItemClick={() => setIsAddModalOpen(true)} />}
        {currentTab === 'recipes' && <RecipesScreen recipes={recipes} inventoryItems={items} onCookRecipe={handleCookRecipe} onGeneratedRecipe={handleGeneratedRecipe} />}
        {currentTab === 'scanner' && <ScannerScreen onClose={() => setCurrentTab('inventory')} onSaveProduct={handleSaveProduct} />}
        {currentTab === 'settings' && <SettingsScreen user={user} onUpdateUser={setUser} onClearCache={() => void clearCaches()} onRefreshData={refreshInventory} onLogout={handleLogout} />}
      </div>
      <AddProductBottomSheet isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSaveProduct={handleSaveProduct} />
      <BottomNav currentTab={currentTab} onSelectTab={setCurrentTab} />
    </div>
  );
}
