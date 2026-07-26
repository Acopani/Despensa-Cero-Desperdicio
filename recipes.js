/**
 * Sistema de Recetas Basadas en Inventario
 * Task 6: Generación de recetas usando productos disponibles en la despensa
 * 
 * Funcionalidades:
 * 1. Análisis de inventario para identificar productos disponibles
 * 2. Integración con APIs de recetas gratuitas (Spoonacular, Edamam)
 * 3. Sistema de matching inteligente de ingredientes
 * 4. Interfaz de usuario para mostrar recetas sugeridas
 * 5. Generación de lista de compras automática
 */

class RecipeSystem {
    constructor() {
        // Configuración de APIs
        this.API_CONFIG = {
            SPOONACULAR: {
                name: 'Spoonacular',
                baseUrl: 'https://api.spoonacular.com',
                apiKey: 'e8a27f4068b94e9582e78e5bca5fa29c', // API key de prueba (free tier)
                requestsPerDay: 150,
                endpoints: {
                    search: '/recipes/complexSearch',
                    findByIngredients: '/recipes/findByIngredients',
                    recipeInfo: '/recipes/{id}/information'
                }
            },
            EDAMAM: {
                name: 'Edamam',
                baseUrl: 'https://api.edamam.com',
                appId: 'YOUR_APP_ID', // Se requiere registro
                appKey: 'YOUR_APP_KEY',
                requestsPerMonth: 10000,
                endpoints: {
                    search: '/api/recipes/v2'
                }
            }
        };
        
        // Configuración local
        this.STORAGE_KEYS = {
            RECIPE_CACHE: 'despensa-recipes-cache',
            FAVORITE_RECIPES: 'despensa-favorite-recipes',
            RECIPE_HISTORY: 'despensa-recipe-history',
            SHOPPING_LIST: 'despensa-shopping-list'
        };
        
        // Cache de recetas (24 horas)
        this.cacheDuration = 24 * 60 * 60 * 1000; // 24 horas en ms
        
        // Estado del sistema
        this.currentRecipes = [];
        this.favoriteRecipes = [];
        this.shoppingList = [];
        this.isInitialized = false;
        
        this.init();
    }
    
    init() {
        console.log('🍳 Sistema de recetas inicializando...');
        
        // Cargar datos del localStorage
        this.loadFromStorage();
        
        // Actualizar estado
        this.isInitialized = true;
        
        console.log('✅ Sistema de recetas listo');
        console.log(`   - ${this.favoriteRecipes.length} recetas favoritas`);
        console.log(`   - ${this.shoppingList.length} items en lista de compras`);
    }
    
    /**
     * Analizar inventario y generar sugerencias de recetas
     */
    async analyzeInventoryAndSuggestRecipes() {
        if (!window.productStorage) {
            console.error('❌ Sistema de almacenamiento no disponible');
            return [];
        }
        
        try {
            const products = window.productStorage.getAllProducts();
            const analysis = this.analyzeProducts(products);
            
            console.log('📊 Análisis de inventario:');
            console.log(`   - Total productos: ${products.length}`);
            console.log(`   - Productos críticos: ${analysis.criticalProducts.length}`);
            console.log(`   - Categorías principales: ${analysis.mainCategories.join(', ')}`);
            
            // Buscar recetas basadas en productos críticos primero
            let recipes = [];
            
            if (analysis.criticalProducts.length > 0) {
                console.log('🔍 Buscando recetas para productos críticos...');
                const criticalRecipes = await this.findRecipesByProducts(analysis.criticalProducts);
                recipes.push(...criticalRecipes);
            }
            
            // Si no hay suficientes recetas, buscar por categorías principales
            if (recipes.length < 3 && analysis.mainCategories.length > 0) {
                console.log('🔍 Buscando recetas por categorías principales...');
                const categoryRecipes = await this.findRecipesByCategories(analysis.mainCategories);
                recipes.push(...categoryRecipes.slice(0, 5 - recipes.length));
            }
            
            // Eliminar duplicados y ordenar por relevancia
            recipes = this.removeDuplicateRecipes(recipes);
            recipes = this.sortRecipesByRelevance(recipes, analysis);
            
            console.log(`✅ ${recipes.length} recetas sugeridas encontradas`);
            this.currentRecipes = recipes;
            
            return recipes;
            
        } catch (error) {
            console.error('❌ Error analizando inventario:', error);
            return [];
        }
    }
    
    /**
     * Analizar productos disponibles
     */
    analyzeProducts(products) {
        const analysis = {
            criticalProducts: [], // Productos próximos a vencer
            mainCategories: [],   // Categorías más frecuentes
            availableIngredients: [], // Todos los ingredientes disponibles
            categoryCount: {}     // Conteo por categoría
        };
        
        // Usar sistema de alertas si está disponible
        if (window.expirationAlerts) {
            const alertAnalysis = window.expirationAlerts.analyzeAllProducts();
            analysis.criticalProducts = [
                ...alertAnalysis.criticalProducts,
                ...alertAnalysis.warningProducts,
                ...alertAnalysis.expiredProducts
            ].map(p => p.name);
        } else {
            // Fallback: identificar productos próximos manualmente
            const today = new Date();
            products.forEach(product => {
                if (product.expirationDate) {
                    const expDate = new Date(product.expirationDate);
                    const daysDiff = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
                    
                    if (daysDiff <= 7) {
                        analysis.criticalProducts.push(product.name);
                    }
                }
            });
        }
        
        // Analizar categorías
        products.forEach(product => {
            if (product.category) {
                analysis.categoryCount[product.category] = 
                    (analysis.categoryCount[product.category] || 0) + 1;
            }
            
            // Agregar a ingredientes disponibles
            if (product.name) {
                analysis.availableIngredients.push(product.name.toLowerCase());
            }
        });
        
        // Obtener categorías principales (top 5)
        analysis.mainCategories = Object.entries(analysis.categoryCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(entry => entry[0]);
        
        return analysis;
    }
    
    /**
     * Buscar recetas por productos específicos
     */
    async findRecipesByProducts(products) {
        if (!products || products.length === 0) return [];
        
        try {
            // Primero verificar cache
            const cacheKey = `recipes-by-products-${products.join('-')}`;
            const cached = this.getCachedRecipes(cacheKey);
            
            if (cached && cached.length > 0) {
                console.log('📦 Recetas obtenidas del cache');
                return cached;
            }
            
            // Usar Spoonacular API (Find by Ingredients)
            const apiConfig = this.API_CONFIG.SPOONACULAR;
            const ingredients = products.slice(0, 5).join(',+'); // Máximo 5 ingredientes
            
            const url = `${apiConfig.baseUrl}${apiConfig.endpoints.findByIngredients}?ingredients=${ingredients}&number=10&apiKey=${apiConfig.apiKey}`;
            
            console.log('🌐 Consultando Spoonacular API...');
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Transformar datos
            const recipes = data.map(recipe => this.transformSpoonacularRecipe(recipe));
            
            // Cachear resultados
            this.cacheRecipes(cacheKey, recipes);
            
            return recipes;
            
        } catch (error) {
            console.error('❌ Error buscando recetas por productos:', error);
            
            // Fallback a recetas de ejemplo
            return this.getFallbackRecipes();
        }
    }
    
    /**
     * Buscar recetas por categorías
     */
    async findRecipesByCategories(categories) {
        if (!categories || categories.length === 0) return [];
        
        try {
            // Cache key
            const cacheKey = `recipes-by-categories-${categories.join('-')}`;
            const cached = this.getCachedRecipes(cacheKey);
            
            if (cached && cached.length > 0) {
                return cached;
            }
            
            // Usar Spoonacular API (Complex Search)
            const apiConfig = this.API_CONFIG.SPOONACULAR;
            const query = categories.slice(0, 2).join(' '); // Usar 2 categorías principales
            
            const url = `${apiConfig.baseUrl}${apiConfig.endpoints.search}?query=${encodeURIComponent(query)}&number=10&addRecipeInformation=true&apiKey=${apiConfig.apiKey}`;
            
            console.log('🌐 Consultando Spoonacular API por categorías...');
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Transformar datos
            const recipes = data.results.map(recipe => this.transformSpoonacularRecipe(recipe));
            
            // Cachear resultados
            this.cacheRecipes(cacheKey, recipes);
            
            return recipes;
            
        } catch (error) {
            console.error('❌ Error buscando recetas por categorías:', error);
            
            // Fallback
            return this.getFallbackRecipes();
        }
    }
    
    /**
     * Transformar receta de Spoonacular a formato interno
     */
    transformSpoonacularRecipe(apiRecipe) {
        return {
            id: apiRecipe.id || Date.now().toString(),
            title: apiRecipe.title || 'Receta sin título',
            description: apiRecipe.summary ? 
                apiRecipe.summary.replace(/<[^>]*>/g, '').substring(0, 200) + '...' : 
                'Descripción no disponible',
            image: apiRecipe.image || 'assets/recipe-placeholder.jpg',
            readyInMinutes: apiRecipe.readyInMinutes || 30,
            servings: apiRecipe.servings || 4,
            difficulty: this.calculateDifficulty(apiRecipe.readyInMinutes),
            ingredients: apiRecipe.extendedIngredients ? 
                apiRecipe.extendedIngredients.map(ing => ing.original) : 
                ['Ingredientes no disponibles'],
            instructions: apiRecipe.analyzedInstructions && apiRecipe.analyzedInstructions[0] ?
                apiRecipe.analyzedInstructions[0].steps.map(step => step.step) :
                ['Instrucciones no disponibles'],
            sourceUrl: apiRecipe.sourceUrl || '',
            spoonacularScore: apiRecipe.spoonacularScore || 0,
            healthScore: apiRecipe.healthScore || 0,
            vegetarian: apiRecipe.vegetarian || false,
            vegan: apiRecipe.vegan || false,
            glutenFree: apiRecipe.glutenFree || false,
            dairyFree: apiRecipe.dairyFree || false,
            matchingIngredients: 0, // Se calculará después
            missingIngredients: []  // Se calculará después
        };
    }
    
    /**
     * Calcular dificultad basada en tiempo de preparación
     */
    calculateDifficulty(readyInMinutes) {
        if (readyInMinutes <= 20) return 'Fácil';
        if (readyInMinutes <= 45) return 'Media';
        return 'Difícil';
    }
    
    /**
     * Eliminar recetas duplicadas
     */
    removeDuplicateRecipes(recipes) {
        const seen = new Set();
        return recipes.filter(recipe => {
            if (seen.has(recipe.id)) return false;
            seen.add(recipe.id);
            return true;
        });
    }
    
    /**
     * Ordenar recetas por relevancia
     */
    sortRecipesByRelevance(recipes, inventoryAnalysis) {
        return recipes.map(recipe => {
            // Calcular coincidencia de ingredientes
            const matchInfo = this.calculateIngredientMatch(recipe, inventoryAnalysis);
            recipe.matchingIngredients = matchInfo.matchingCount;
            recipe.matchingPercentage = matchInfo.percentage;
            recipe.missingIngredients = matchInfo.missingIngredients;
            
            return recipe;
        }).sort((a, b) => {
            // Primero por porcentaje de coincidencia
            if (b.matchingPercentage !== a.matchingPercentage) {
                return b.matchingPercentage - a.matchingPercentage;
            }
            
            // Luego por puntuación de Spoonacular
            if (b.spoonacularScore !== a.spoonacularScore) {
                return b.spoonacularScore - a.spoonacularScore;
            }
            
            // Finalmente por tiempo de preparación
            return a.readyInMinutes - b.readyInMinutes;
        });
    }
    
    /**
     * Calcular coincidencia de ingredientes
     */
    calculateIngredientMatch(recipe, inventoryAnalysis) {
        if (!recipe.ingredients || !inventoryAnalysis.availableIngredients) {
            return { matchingCount: 0, percentage: 0, missingIngredients: [] };
        }
        
        const availableIngredients = new Set(
            inventoryAnalysis.availableIngredients.map(ing => ing.toLowerCase())
        );
        
        let matchingCount = 0;
        const missingIngredients = [];
        
        recipe.ingredients.forEach(ingredient => {
            // Extraer el ingrediente principal (antes de la primera coma o paréntesis)
            const mainIngredient = ingredient.split(/[,\(\)]/)[0].toLowerCase().trim();
            
            // Verificar si el ingrediente está disponible
            let found = false;
            
            // Búsqueda simple de coincidencia
            for (const availableIngredient of availableIngredients) {
                if (availableIngredient.includes(mainIngredient) || 
                    mainIngredient.includes(availableIngredient)) {
                    found = true;
                    break;
                }
            }
            
            if (found) {
                matchingCount++;
            } else {
                missingIngredients.push(ingredient);
            }
        });
        
        const percentage = recipe.ingredients.length > 0 ? 
            (matchingCount / recipe.ingredients.length) * 100 : 0;
        
        return {
            matchingCount,
            percentage: Math.round(percentage),
            missingIngredients
        };
    }
    
    /**
     * Obtener recetas de ejemplo (fallback)
     */
    getFallbackRecipes() {
        return [
            {
                id: '1',
                title: 'Ensalada Mediterránea',
                description: 'Ensalada fresca con tomate, pepino, aceitunas y queso feta.',
                image: 'https://spoonacular.com/recipeImages/1-312x231.jpg',
                readyInMinutes: 15,
                servings: 2,
                difficulty: 'Fácil',
                ingredients: [
                    '2 tomates maduros',
                    '1 pepino',
                    '100g queso feta',
                    '50g aceitunas',
                    'Aceite de oliva',
                    'Sal y pimienta'
                ],
                instructions: [
                    'Lavar y cortar los tomates y el pepino',
                    'Cortar el queso feta en cubos',
                    'Mezclar todos los ingredientes en un bol',
                    'Aliñar con aceite de oliva, sal y pimienta',
                    'Servir inmediatamente'
                ],
                sourceUrl: '',
                spoonacularScore: 85,
                healthScore: 90,
                vegetarian: true,
                vegan: false,
                glutenFree: true,
                dairyFree: false,
                matchingIngredients: 3,
                missingIngredients: ['queso feta', 'aceitunas']
            },
            {
                id: '2',
                title: 'Sopa de Verduras',
                description: 'Sopa caliente y nutritiva con diversas verduras de temporada.',
                image: 'https://spoonacular.com/recipeImages/2-312x231.jpg',
                readyInMinutes: 40,
                servings: 4,
                difficulty: 'Media',
                ingredients: [
                    '2 zanahorias',
                    '2 patatas',
                    '1 cebolla',
                    '2 dientes de ajo',
                    '1 litro de caldo de verduras',
                    'Aceite de oliva',
                    'Sal y hierbas al gusto'
                ],
                instructions: [
                    'Pelar y cortar las verduras en trozos pequeños',
                    'Sofreír la cebolla y el ajo en aceite de oliva',
                    'Añadir el resto de verduras y sofreír 5 minutos',
                    'Añadir el caldo y cocinar 30 minutos',
                    'Triturar si se desea y servir caliente'
                ],
                sourceUrl: '',
                spoonacularScore: 78,
                healthScore: 85,
                vegetarian: true,
                vegan: true,
                glutenFree: true,
                dairyFree: true,
                matchingIngredients: 2,
                missingIngredients: ['zanahorias', 'patatas', 'caldo de verduras']
            },
            {
                id: '3',
                title: 'Tortilla Española',
                description: 'Tortilla clásica con patatas y cebolla, perfecta para cualquier comida.',
                image: 'https://spoonacular.com/recipeImages/3-312x231.jpg',
                readyInMinutes: 30,
                servings: 4,
                difficulty: 'Media',
                ingredients: [
                    '6 huevos',
                    '3 patatas medianas',
                    '1 cebolla grande',
                    'Aceite de oliva',
                    'Sal al gusto'
                ],
                instructions: [
                    'Pelar y cortar las patatas en rodajas finas',
                    'Pelar y cortar la cebolla en juliana',
                    'Freír las patatas y cebolla en abundante aceite',
                    'Batir los huevos en un bol grande',
                    'Mezclar las patatas y cebolla con los huevos',
                    'Cuajar la tortilla en una sartén por ambos lados'
                ],
                sourceUrl: '',
                spoonacularScore: 82,
                healthScore: 70,
                vegetarian: true,
                vegan: false,
                glutenFree: true,
                dairyFree: true,
                matchingIngredients: 1,
                missingIngredients: ['huevos', 'patatas', 'cebolla']
            }
        ];
    }
    
    /**
     * Obtener detalles completos de una receta
     */
    async getRecipeDetails(recipeId) {
        // Primero buscar en recetas actuales
        const existingRecipe = this.currentRecipes.find(r => r.id === recipeId);
        if (existingRecipe) return existingRecipe;
        
        // Buscar en favoritos
        const favoriteRecipe = this.favoriteRecipes.find(r => r.id === recipeId);
        if (favoriteRecipe) return favoriteRecipe;
        
        try {
            // Intentar obtener de la API
            const apiConfig = this.API_CONFIG.SPOONACULAR;
            const url = `${apiConfig.baseUrl}${apiConfig.endpoints.recipeInfo.replace('{id}', recipeId)}?apiKey=${apiConfig.apiKey}`;
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            
            const data = await response.json();
            return this.transformSpoonacularRecipe(data);
            
        } catch (error) {
            console.error('❌ Error obteniendo detalles de receta:', error);
            return null;
        }
    }
    
    /**
     * Agregar receta a favoritos
     */
    addToFavorites(recipe) {
        if (!recipe || !recipe.id) return false;
        
        // Verificar si ya está en favoritos
        const existingIndex = this.favoriteRecipes.findIndex(r => r.id === recipe.id);
        
        if (existingIndex === -1) {
            this.favoriteRecipes.push(recipe);
            this.saveToStorage();
            console.log(`⭐ Receta "${recipe.title}" agregada a favoritos`);
            return true;
        }
        
        return false;
    }
    
    /**
     * Eliminar receta de favoritos
     */
    removeFromFavorites(recipeId) {
        const initialLength = this.favoriteRecipes.length;
        this.favoriteRecipes = this.favoriteRecipes.filter(r => r.id !== recipeId);
        
        if (this.favoriteRecipes.length < initialLength) {
            this.saveToStorage();
            console.log(`🗑️ Receta eliminada de favoritos`);
            return true;
        }
        
        return false;
    }
    
    /**
     * Verificar si una receta es favorita
     */
    isFavorite(recipeId) {
        return this.favoriteRecipes.some(r => r.id === recipeId);
    }
    
    /**
     * Generar lista de compras para una receta
     */
    generateShoppingList(recipe) {
        if (!recipe || !recipe.missingIngredients) return [];
        
        const shoppingList = recipe.missingIngredients.map(ingredient => ({
            ingredient,
            category: this.categorizeIngredient(ingredient),
            purchased: false,
            recipeId: recipe.id,
            recipeTitle: recipe.title
        }));
        
        this.shoppingList = [...this.shoppingList, ...shoppingList];
        this.saveToStorage();
        
        console.log(`🛒 Lista de compras generada con ${shoppingList.length} items`);
        return shoppingList;
    }
    
    /**
     * Categorizar ingrediente
     */
    categorizeIngredient(ingredient) {
        const ingredientLower = ingredient.toLowerCase();
        
        if (ingredientLower.includes('pollo') || ingredientLower.includes('carne') || 
            ingredientLower.includes('pescado') || ingredientLower.includes('huevo')) {
            return 'Proteínas';
        }
        
        if (ingredientLower.includes('tomate') || ingredientLower.includes('cebolla') || 
            ingredientLower.includes('zanahoria') || ingredientLower.includes('pimiento')) {
            return 'Verduras';
        }
        
        if (ingredientLower.includes('manzana') || ingredientLower.includes('plátano') || 
            ingredientLower.includes('naranja') || ingredientLower.includes('uva')) {
            return 'Frutas';
        }
        
        if (ingredientLower.includes('leche') || ingredientLower.includes('queso') || 
            ingredientLower.includes('yogur') || ingredientLower.includes('mantequilla')) {
            return 'Lácteos';
        }
        
        if (ingredientLower.includes('arroz') || ingredientLower.includes('pasta') || 
            ingredientLower.includes('pan') || ingredientLower.includes('harina')) {
            return 'Granos';
        }
        
        if (ingredientLower.includes('aceite') || ingredientLower.includes('vinagre') || 
            ingredientLower.includes('sal') || ingredientLower.includes('especia')) {
            return 'Condimentos';
        }
        
        return 'Otros';
    }
    
    /**
     * Obtener lista de compras organizada
     */
    getOrganizedShoppingList() {
        const organized = {};
        
        this.shoppingList.forEach(item => {
            if (!organized[item.category]) {
                organized[item.category] = [];
            }
            organized[item.category].push(item);
        });
        
        return organized;
    }
    
    /**
     * Marcar item de lista de compras como comprado
     */
    markShoppingItemAsPurchased(ingredient, recipeId) {
        const item = this.shoppingList.find(item => 
            item.ingredient === ingredient && item.recipeId === recipeId
        );
        
        if (item) {
            item.purchased = true;
            this.saveToStorage();
            return true;
        }
        
        return false;
    }
    
    /**
     * Eliminar item de lista de compras
     */
    removeShoppingItem(ingredient, recipeId) {
        const initialLength = this.shoppingList.length;
        this.shoppingList = this.shoppingList.filter(item => 
            !(item.ingredient === ingredient && item.recipeId === recipeId)
        );
        
        if (this.shoppingList.length < initialLength) {
            this.saveToStorage();
            return true;
        }
        
        return false;
    }
    
    /**
     * Limpiar lista de compras completada
     */
    clearCompletedShoppingList() {
        const initialLength = this.shoppingList.length;
        this.shoppingList = this.shoppingList.filter(item => !item.purchased);
        
        if (this.shoppingList.length < initialLength) {
            this.saveToStorage();
            console.log(`🧹 ${initialLength - this.shoppingList.length} items completados eliminados`);
        }
    }
    
    /**
     * Cache management
     */
    getCachedRecipes(key) {
        try {
            const cache = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.RECIPE_CACHE) || '{}');
            const cachedData = cache[key];
            
            if (cachedData && Date.now() - cachedData.timestamp < this.cacheDuration) {
                return cachedData.data;
            }
            
            // Eliminar cache expirado
            if (cachedData) {
                delete cache[key];
                localStorage.setItem(this.STORAGE_KEYS.RECIPE_CACHE, JSON.stringify(cache));
            }
            
            return null;
            
        } catch (error) {
            console.error('❌ Error obteniendo cache:', error);
            return null;
        }
    }
    
    cacheRecipes(key, recipes) {
        try {
            const cache = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.RECIPE_CACHE) || '{}');
            cache[key] = {
                data: recipes,
                timestamp: Date.now()
            };
            
            // Limitar tamaño del cache (mantener solo 50 entradas)
            const keys = Object.keys(cache);
            if (keys.length > 50) {
                // Eliminar las más antiguas
                const sortedKeys = keys.sort((a, b) => cache[a].timestamp - cache[b].timestamp);
                const toRemove = sortedKeys.slice(0, keys.length - 50);
                toRemove.forEach(key => delete cache[key]);
            }
            
            localStorage.setItem(this.STORAGE_KEYS.RECIPE_CACHE, JSON.stringify(cache));
            
        } catch (error) {
            console.error('❌ Error cacheando recetas:', error);
        }
    }
    
    /**
     * Storage management
     */
    loadFromStorage() {
        try {
            // Favoritos
            const favorites = localStorage.getItem(this.STORAGE_KEYS.FAVORITE_RECIPES);
            this.favoriteRecipes = favorites ? JSON.parse(favorites) : [];
            
            // Lista de compras
            const shoppingList = localStorage.getItem(this.STORAGE_KEYS.SHOPPING_LIST);
            this.shoppingList = shoppingList ? JSON.parse(shoppingList) : [];
            
        } catch (error) {
            console.error('❌ Error cargando datos de recetas:', error);
            this.favoriteRecipes = [];
            this.shoppingList = [];
        }
    }
    
    saveToStorage() {
        try {
            localStorage.setItem(this.STORAGE_KEYS.FAVORITE_RECIPES, JSON.stringify(this.favoriteRecipes));
            localStorage.setItem(this.STORAGE_KEYS.SHOPPING_LIST, JSON.stringify(this.shoppingList));
        } catch (error) {
            console.error('❌ Error guardando datos de recetas:', error);
        }
    }
    
    /**
     * API para otros módulos
     */
    getCurrentRecipes() {
        return this.currentRecipes;
    }
    
    getFavoriteRecipes() {
        return this.favoriteRecipes;
    }
    
    getShoppingList() {
        return this.shoppingList;
    }
    
    clearCurrentRecipes() {
        this.currentRecipes = [];
    }
}

// Inicializar y exportar globalmente
window.recipeSystem = new RecipeSystem();