export type ItemStatus = 'seguro' | 'pronto' | 'urgente' | 'caducado';

export type ItemLocation = 'Nevera' | 'Despensa' | 'Congelador' | 'Frutas' | 'Verduras' | 'Lácteos' | 'Otros';

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string; // 'Litro', 'Unidad', 'Unidades', 'kg', 'g', 'uds', 'L', 'caja'
  location: ItemLocation;
  category: string; // 'Lácteos', 'Frutas', 'Verduras', 'Despensa', 'Huevos', 'Bebidas', 'Carnes'
  status: ItemStatus;
  expiryDate: string; // YYYY-MM-DD
  expiryLabel: string; // "Expira hoy", "Expira en 3 días", "Caducó hace 2 días", "Expira en 6 meses"
  imageUrl: string;
  barcode?: string;
  notes?: string;
}

export interface IngredientSection {
  title: string;
  ingredients: string[];
}

export interface RecipeStep {
  title?: string;
  instruction: string;
  durationMinutes?: number;
  heat?: string;
  temperature?: string;
  cue?: string;
}

export interface Recipe {
  id: string;
  title: string;
  prepTime: number;
  cookTime?: number;
  totalTime?: number;
  servings?: number;
  spiceLevel?: number;
  urgencyNote: string;
  availableStatus: 'DISPONIBLE' | 'FALTA 1' | 'FALTA 2' | '¡Tienes todo!';
  usedExpiringIngredients: string[];
  allIngredients: string[];
  ingredientSections?: IngredientSection[];
  instructions: string[];
  detailedSteps?: RecipeStep[];
  utensils?: string[];
  techniques?: string[];
  category: string;
  imageUrl: string;
  isUrgent?: boolean;
  tips?: string;
  source?: 'ai' | 'local' | 'legacy';
  generatedAt?: string;
}

export interface UserProfile {
  name: string;
  avatarUrl: string;
  notificationsAlerts: boolean;
  notificationsDaily: boolean;
  advanceDays: number;
  darkMode: boolean;
  unitSystem: 'Métrico' | 'Imperial';
  language: 'Español' | 'English';
}

export type TabType = 'inventory' | 'recipes' | 'scanner' | 'settings';
