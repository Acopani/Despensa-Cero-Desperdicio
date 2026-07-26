/**
 * Sistema de Recetas Basadas en Inventario
 * Task 6: Generación de recetas usando productos disponibles en la despensa
 * 
 * Usa Spoonacular API como fuente principal de recetas
 */

class RecipeSystem {
    constructor() {
        this.API_CONFIG = {
            SPOONACULAR: {
                baseUrl: 'https://api.spoonacular.com',
                apiKey: '2a81d1412ba54749a9b9a232c9ca4612',
                endpoints: {
                    findByIngredients: '/recipes/findByIngredients',
                    recipeInfo: '/recipes/{id}/information'
                }
            }
        };

        this.STORAGE_KEYS = {
            RECIPE_CACHE: 'despensa-recipes-cache',
            FAVORITE_RECIPES: 'despensa-favorite-recipes',
            SHOPPING_LIST: 'despensa-shopping-list'
        };

        this.cacheDuration = 24 * 60 * 60 * 1000;
        this.currentRecipes = [];
        this.favoriteRecipes = [];
        this.shoppingList = [];
        this.isInitialized = false;

        this.init();
    }

    init() {
        this.loadFromStorage();
        this.isInitialized = true;
        console.log('🍳 Sistema de recetas listo');
    }

    /**
     * Analizar inventario y generar sugerencias
     */
    async analyzeInventoryAndSuggestRecipes() {
        if (!window.productStorage) {
            console.error('❌ Sistema de almacenamiento no disponible');
            return [];
        }

        const products = window.productStorage.getAllProducts();

        if (products.length === 0) {
            return [];
        }

        // Extraer ingredientes disponibles
        const availableIngredients = products.map(p => p.name.toLowerCase().trim());

        console.log('📊 Ingredientes en tu despensa:', availableIngredients);

        // Buscar recetas en la API
        let recipes = await this.fetchFromAPI(availableIngredients.slice(0, 10));

        // Calcular matching
        recipes = recipes.map(recipe => {
            const match = this.calculateMatch(recipe, availableIngredients);
            return { ...recipe, ...match };
        });

        // Ordenar por porcentaje de coincidencia
        recipes.sort((a, b) => b.matchingPercentage - a.matchingPercentage);

        this.currentRecipes = recipes;
        return recipes;
    }

    /**
     * Calcular match de ingredientes
     */
    calculateMatch(recipe, availableIngredients) {
        if (!recipe.ingredientsList || recipe.ingredientsList.length === 0) {
            return { matchingPercentage: 0, matchingIngredients: [], missingIngredients: recipe.ingredients || [] };
        }

        const matching = [];
        const missing = [];

        recipe.ingredientsList.forEach(ingredient => {
            const ingLower = ingredient.toLowerCase();
            const found = availableIngredients.some(available => {
                return ingLower.includes(available) || available.includes(ingLower) ||
                       ingLower.split(' ').some(word => word.length > 3 && available.includes(word)) ||
                       available.split(' ').some(word => word.length > 3 && ingLower.includes(word));
            });

            if (found) {
                matching.push(ingredient);
            } else {
                missing.push(ingredient);
            }
        });

        const percentage = Math.round((matching.length / recipe.ingredientsList.length) * 100);

        return {
            matchingPercentage: percentage,
            matchingIngredients: matching,
            missingIngredients: missing,
            matchingCount: matching.length,
            totalIngredients: recipe.ingredientsList.length
        };
    }

    /**
     * Obtener recetas de Spoonacular API
     */
    async fetchFromAPI(ingredients) {
        const cacheKey = `api-${ingredients.sort().join(',')}`;
        const cached = this.getCachedRecipes(cacheKey);
        if (cached) {
            console.log('📦 Recetas obtenidas del cache');
            return cached;
        }

        try {
            const config = this.API_CONFIG.SPOONACULAR;
            const url = `${config.baseUrl}${config.endpoints.findByIngredients}?ingredients=${ingredients.join(',+')}&number=10&ranking=1&ignorePantry=true&apiKey=${config.apiKey}`;

            console.log('🌐 Consultando Spoonacular API...');
            const response = await fetch(url, { signal: AbortSignal.timeout(8000) });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();

            const recipes = data.map(item => ({
                id: `${item.id}`,
                title: item.title,
                description: `Usa ${item.usedIngredientCount} de tus ingredientes. Faltan ${item.missedIngredientCount}.`,
                image: item.image || '',
                readyInMinutes: 30,
                servings: 4,
                difficulty: item.missedIngredientCount <= 2 ? 'Fácil' : item.missedIngredientCount <= 4 ? 'Media' : 'Difícil',
                ingredients: [
                    ...(item.usedIngredients || []).map(i => i.original),
                    ...(item.missedIngredients || []).map(i => i.original)
                ],
                ingredientsList: [
                    ...(item.usedIngredients || []).map(i => i.name),
                    ...(item.missedIngredients || []).map(i => i.name)
                ],
                instructions: [],
                sourceUrl: '',
                vegetarian: false,
                vegan: false,
                glutenFree: false,
                usedIngredients: (item.usedIngredients || []).map(i => i.name),
                missedIngredients: (item.missedIngredients || []).map(i => i.name)
            }));

            console.log(`✅ ${recipes.length} recetas obtenidas de la API`);
            this.cacheRecipes(cacheKey, recipes);
            return recipes;

        } catch (error) {
            console.error('❌ Error consultando API:', error);
            return [];
        }
    }

    /**
     * Obtener detalles completos de una receta desde la API
     */
    async getRecipeDetails(recipeId) {
        // Primero buscar en recetas actuales
        const existing = this.currentRecipes.find(r => r.id == recipeId) ||
                        this.favoriteRecipes.find(r => r.id == recipeId);

        // Intentar obtener detalles completos de la API
        try {
            const cacheKey = `detail-${recipeId}`;
            const cached = this.getCachedRecipes(cacheKey);
            if (cached) return cached;

            const config = this.API_CONFIG.SPOONACULAR;
            const url = `${config.baseUrl}/recipes/${recipeId}/information?apiKey=${config.apiKey}`;

            const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
            if (!response.ok) return existing || null;

            const data = await response.json();

            const detailed = {
                id: `${data.id}`,
                title: data.title,
                description: data.summary ? data.summary.replace(/<[^>]*>/g, '').substring(0, 300) : '',
                image: data.image || '',
                readyInMinutes: data.readyInMinutes || 30,
                servings: data.servings || 4,
                difficulty: data.readyInMinutes <= 20 ? 'Fácil' : data.readyInMinutes <= 45 ? 'Media' : 'Difícil',
                ingredients: (data.extendedIngredients || []).map(i => i.original),
                ingredientsList: (data.extendedIngredients || []).map(i => i.name),
                instructions: data.analyzedInstructions && data.analyzedInstructions[0]
                    ? data.analyzedInstructions[0].steps.map(s => s.step)
                    : (data.instructions ? [data.instructions.replace(/<[^>]*>/g, '')] : ['Instrucciones no disponibles']),
                sourceUrl: data.sourceUrl || '',
                vegetarian: data.vegetarian || false,
                vegan: data.vegan || false,
                glutenFree: data.glutenFree || false,
                matchingPercentage: existing ? existing.matchingPercentage : 0,
                matchingIngredients: existing ? existing.matchingIngredients : [],
                missingIngredients: existing ? existing.missingIngredients : []
            };

            this.cacheRecipes(cacheKey, detailed);
            return detailed;

        } catch (error) {
            console.warn('⚠️ No se pudieron obtener detalles:', error);
            return existing || null;
        }
    }

    /**
     * Favoritos
     */
    addToFavorites(recipe) {
        if (!recipe || this.favoriteRecipes.find(r => r.id === recipe.id)) return false;
        this.favoriteRecipes.push(recipe);
        this.saveToStorage();
        return true;
    }

    removeFromFavorites(recipeId) {
        const len = this.favoriteRecipes.length;
        this.favoriteRecipes = this.favoriteRecipes.filter(r => r.id !== recipeId);
        if (this.favoriteRecipes.length < len) { this.saveToStorage(); return true; }
        return false;
    }

    isFavorite(recipeId) {
        return this.favoriteRecipes.some(r => r.id == recipeId);
    }

    /**
     * Lista de compras
     */
    generateShoppingList(recipe) {
        if (!recipe || !recipe.missingIngredients) return [];

        const newItems = recipe.missingIngredients.map(ingredient => ({
            ingredient,
            category: this.categorizeIngredient(ingredient),
            purchased: false,
            recipeId: recipe.id,
            recipeTitle: recipe.title
        }));

        this.shoppingList = [...this.shoppingList, ...newItems];
        this.saveToStorage();
        return newItems;
    }

    categorizeIngredient(ingredient) {
        const ing = ingredient.toLowerCase();
        if (/pollo|carne|pescado|atún|huevo|jamón|cerdo|res|chicken|beef|pork|fish|egg/.test(ing)) return 'Proteínas';
        if (/tomate|cebolla|zanahoria|pimiento|lechuga|espinaca|ajo|patata|papa|tomato|onion|carrot|pepper|garlic|potato/.test(ing)) return 'Verduras';
        if (/manzana|plátano|naranja|limón|fresa|uva|apple|banana|orange|lemon|strawberry/.test(ing)) return 'Frutas';
        if (/leche|queso|yogur|nata|mantequilla|crema|milk|cheese|butter|cream/.test(ing)) return 'Lácteos';
        if (/arroz|pasta|pan|harina|avena|cereal|rice|bread|flour|oat/.test(ing)) return 'Granos';
        if (/aceite|vinagre|sal|pimienta|orégano|comino|oil|vinegar|salt|pepper|sugar/.test(ing)) return 'Condimentos';
        return 'Otros';
    }

    getOrganizedShoppingList() {
        const organized = {};
        this.shoppingList.forEach(item => {
            if (!organized[item.category]) organized[item.category] = [];
            organized[item.category].push(item);
        });
        return organized;
    }

    markShoppingItemAsPurchased(ingredient, recipeId) {
        const item = this.shoppingList.find(i => i.ingredient === ingredient && i.recipeId === recipeId);
        if (item) { item.purchased = true; this.saveToStorage(); return true; }
        return false;
    }

    clearCompletedShoppingList() {
        this.shoppingList = this.shoppingList.filter(i => !i.purchased);
        this.saveToStorage();
    }

    getCurrentRecipes() { return this.currentRecipes; }
    getFavoriteRecipes() { return this.favoriteRecipes; }
    getShoppingList() { return this.shoppingList; }
    getFallbackRecipes() { return []; }

    /**
     * Cache
     */
    getCachedRecipes(key) {
        try {
            const cache = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.RECIPE_CACHE) || '{}');
            const entry = cache[key];
            if (entry && Date.now() - entry.timestamp < this.cacheDuration) return entry.data;
            return null;
        } catch { return null; }
    }

    cacheRecipes(key, recipes) {
        try {
            const cache = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.RECIPE_CACHE) || '{}');
            cache[key] = { data: recipes, timestamp: Date.now() };
            // Limitar cache a 30 entradas
            const keys = Object.keys(cache);
            if (keys.length > 30) {
                const sorted = keys.sort((a, b) => cache[a].timestamp - cache[b].timestamp);
                sorted.slice(0, keys.length - 30).forEach(k => delete cache[k]);
            }
            localStorage.setItem(this.STORAGE_KEYS.RECIPE_CACHE, JSON.stringify(cache));
        } catch (e) { console.warn('Cache error:', e); }
    }

    /**
     * Storage
     */
    loadFromStorage() {
        try {
            this.favoriteRecipes = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.FAVORITE_RECIPES) || '[]');
            this.shoppingList = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.SHOPPING_LIST) || '[]');
        } catch {
            this.favoriteRecipes = [];
            this.shoppingList = [];
        }
    }

    saveToStorage() {
        try {
            localStorage.setItem(this.STORAGE_KEYS.FAVORITE_RECIPES, JSON.stringify(this.favoriteRecipes));
            localStorage.setItem(this.STORAGE_KEYS.SHOPPING_LIST, JSON.stringify(this.shoppingList));
        } catch (e) { console.error('Storage error:', e); }
    }
}

// Inicializar y exportar globalmente
window.recipeSystem = new RecipeSystem();