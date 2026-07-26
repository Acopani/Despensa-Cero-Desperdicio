/**
 * Sistema de Recetas Basadas en Inventario
 * Task 6: Generación de recetas usando productos disponibles en la despensa
 * 
 * Usa una base de datos local amplia de recetas + API Spoonacular como complemento
 */

class RecipeSystem {
    constructor() {
        // Configuración de APIs
        this.API_CONFIG = {
            SPOONACULAR: {
                baseUrl: 'https://api.spoonacular.com',
                apiKey: 'e8a27f4068b94e9582e78e5bca5fa29c',
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

        // Base de datos local de recetas
        this.localRecipes = this.getLocalRecipeDatabase();

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
            return this.localRecipes.slice(0, 6);
        }

        const products = window.productStorage.getAllProducts();
        
        if (products.length === 0) {
            return this.localRecipes.slice(0, 6);
        }

        // Extraer ingredientes disponibles
        const availableIngredients = products.map(p => p.name.toLowerCase().trim());
        
        console.log('📊 Ingredientes en tu despensa:', availableIngredients);

        // Buscar recetas que coincidan con ingredientes disponibles
        let recipes = this.matchRecipesWithIngredients(availableIngredients);

        // Intentar complementar con API (si hay internet)
        try {
            const apiRecipes = await this.fetchFromAPI(availableIngredients.slice(0, 5));
            if (apiRecipes && apiRecipes.length > 0) {
                // Agregar recetas de API que no estén duplicadas
                apiRecipes.forEach(apiRecipe => {
                    if (!recipes.find(r => r.title === apiRecipe.title)) {
                        recipes.push(apiRecipe);
                    }
                });
            }
        } catch (error) {
            console.warn('⚠️ API no disponible, usando recetas locales');
        }

        // Recalcular matching para todas las recetas
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
     * Buscar recetas locales que coincidan con ingredientes
     */
    matchRecipesWithIngredients(availableIngredients) {
        return this.localRecipes.map(recipe => {
            const match = this.calculateMatch(recipe, availableIngredients);
            return { ...recipe, ...match };
        }).filter(recipe => recipe.matchingPercentage > 0)
          .sort((a, b) => b.matchingPercentage - a.matchingPercentage);
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
     * Intentar obtener recetas de Spoonacular API
     */
    async fetchFromAPI(ingredients) {
        const cacheKey = `api-${ingredients.join(',')}`;
        const cached = this.getCachedRecipes(cacheKey);
        if (cached) return cached;

        try {
            const config = this.API_CONFIG.SPOONACULAR;
            const url = `${config.baseUrl}${config.endpoints.findByIngredients}?ingredients=${ingredients.join(',+')}&number=5&apiKey=${config.apiKey}`;

            const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
            if (!response.ok) return [];

            const data = await response.json();
            const recipes = data.map(item => ({
                id: `api-${item.id}`,
                title: item.title,
                description: `Receta con ${item.usedIngredientCount} de tus ingredientes`,
                image: item.image || '',
                readyInMinutes: 30,
                servings: 4,
                difficulty: 'Media',
                ingredients: [
                    ...(item.usedIngredients || []).map(i => i.original),
                    ...(item.missedIngredients || []).map(i => i.original)
                ],
                ingredientsList: [
                    ...(item.usedIngredients || []).map(i => i.name),
                    ...(item.missedIngredients || []).map(i => i.name)
                ],
                instructions: ['Ver instrucciones completas en la fuente original'],
                sourceUrl: `https://spoonacular.com/recipes/${item.id}`,
                vegetarian: false,
                vegan: false,
                glutenFree: false
            }));

            this.cacheRecipes(cacheKey, recipes);
            return recipes;
        } catch (error) {
            return [];
        }
    }

    /**
     * Obtener detalles de una receta
     */
    async getRecipeDetails(recipeId) {
        return this.currentRecipes.find(r => r.id == recipeId) ||
               this.favoriteRecipes.find(r => r.id == recipeId) ||
               this.localRecipes.find(r => r.id == recipeId) ||
               null;
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
        if (/pollo|carne|pescado|atún|huevo|jamón|cerdo|res/.test(ing)) return 'Proteínas';
        if (/tomate|cebolla|zanahoria|pimiento|lechuga|espinaca|ajo|patata|papa/.test(ing)) return 'Verduras';
        if (/manzana|plátano|naranja|limón|fresa|uva/.test(ing)) return 'Frutas';
        if (/leche|queso|yogur|nata|mantequilla|crema/.test(ing)) return 'Lácteos';
        if (/arroz|pasta|pan|harina|avena|cereal/.test(ing)) return 'Granos';
        if (/aceite|vinagre|sal|pimienta|orégano|comino|especias/.test(ing)) return 'Condimentos';
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

    getFallbackRecipes() {
        return this.localRecipes.slice(0, 6);
    }

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

    /**
     * BASE DE DATOS LOCAL DE RECETAS
     * 20+ recetas comunes con ingredientes típicos de una despensa
     */
    getLocalRecipeDatabase() {
        return [
            {
                id: 'local-1',
                title: 'Arroz con Pollo',
                description: 'Clásico arroz con pollo, fácil y delicioso para toda la familia.',
                image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&h=300&fit=crop',
                readyInMinutes: 40,
                servings: 4,
                difficulty: 'Media',
                ingredients: ['2 tazas de arroz', '500g pechuga de pollo', '1 cebolla', '2 dientes de ajo', '1 pimiento', '2 tomates', 'Aceite de oliva', 'Sal y pimienta', 'Caldo de pollo'],
                ingredientsList: ['arroz', 'pollo', 'cebolla', 'ajo', 'pimiento', 'tomate', 'aceite', 'sal'],
                instructions: ['Cortar el pollo en trozos y sazonar', 'Sofreír el pollo hasta dorarlo', 'Sofreír cebolla, ajo y pimiento', 'Añadir tomate y cocinar 5 min', 'Agregar arroz y caldo', 'Cocinar a fuego medio 20 min', 'Dejar reposar 5 min antes de servir'],
                vegetarian: false, vegan: false, glutenFree: true
            },
            {
                id: 'local-2',
                title: 'Pasta con Salsa de Tomate',
                description: 'Pasta sencilla con salsa de tomate casera, lista en 20 minutos.',
                image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop',
                readyInMinutes: 20,
                servings: 4,
                difficulty: 'Fácil',
                ingredients: ['400g pasta', '4 tomates maduros', '2 dientes de ajo', '1 cebolla pequeña', 'Aceite de oliva', 'Albahaca fresca', 'Sal y pimienta', 'Queso parmesano'],
                ingredientsList: ['pasta', 'tomate', 'ajo', 'cebolla', 'aceite', 'albahaca', 'queso'],
                instructions: ['Hervir agua con sal para la pasta', 'Picar cebolla y ajo finamente', 'Sofreír en aceite de oliva', 'Añadir tomate picado y cocinar 10 min', 'Cocinar la pasta al dente', 'Mezclar pasta con salsa', 'Servir con queso y albahaca'],
                vegetarian: true, vegan: false, glutenFree: false
            },
            {
                id: 'local-3',
                title: 'Tortilla de Patatas',
                description: 'Tortilla española tradicional con patatas y cebolla.',
                image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop',
                readyInMinutes: 35,
                servings: 4,
                difficulty: 'Media',
                ingredients: ['6 huevos', '4 patatas medianas', '1 cebolla grande', 'Aceite de oliva abundante', 'Sal'],
                ingredientsList: ['huevos', 'patata', 'cebolla', 'aceite', 'sal'],
                instructions: ['Pelar y cortar patatas en rodajas finas', 'Cortar cebolla en juliana', 'Freír patatas y cebolla a fuego medio', 'Batir huevos con sal', 'Mezclar patatas con huevos', 'Cuajar por un lado 4 min', 'Dar la vuelta y cuajar 3 min más'],
                vegetarian: true, vegan: false, glutenFree: true
            },
            {
                id: 'local-4',
                title: 'Ensalada César',
                description: 'Ensalada fresca con lechuga, pollo a la plancha y aderezo cremoso.',
                image: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400&h=300&fit=crop',
                readyInMinutes: 20,
                servings: 2,
                difficulty: 'Fácil',
                ingredients: ['1 lechuga romana', '200g pechuga de pollo', 'Pan para crutones', 'Queso parmesano', '2 cdas mayonesa', '1 diente de ajo', 'Jugo de limón', 'Aceite de oliva'],
                ingredientsList: ['lechuga', 'pollo', 'pan', 'queso', 'mayonesa', 'ajo', 'limón', 'aceite'],
                instructions: ['Cocinar pollo a la plancha y cortar en tiras', 'Cortar pan en cubos y tostar en sartén', 'Lavar y trocear la lechuga', 'Preparar aderezo: mayonesa, ajo, limón y aceite', 'Mezclar lechuga con aderezo', 'Añadir pollo, crutones y queso rallado'],
                vegetarian: false, vegan: false, glutenFree: false
            },
            {
                id: 'local-5',
                title: 'Sopa de Verduras',
                description: 'Sopa nutritiva y reconfortante con verduras de temporada.',
                image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop',
                readyInMinutes: 40,
                servings: 4,
                difficulty: 'Fácil',
                ingredients: ['2 zanahorias', '2 patatas', '1 calabacín', '1 cebolla', '2 dientes de ajo', '1 litro de caldo', 'Aceite de oliva', 'Sal y pimienta'],
                ingredientsList: ['zanahoria', 'patata', 'calabacín', 'cebolla', 'ajo', 'caldo', 'aceite', 'sal'],
                instructions: ['Pelar y cortar verduras en cubos', 'Sofreír cebolla y ajo', 'Añadir resto de verduras', 'Cubrir con caldo caliente', 'Cocinar 25-30 minutos', 'Salpimentar al gusto', 'Triturar o servir en trozos'],
                vegetarian: true, vegan: true, glutenFree: true
            },
            {
                id: 'local-6',
                title: 'Sandwich de Jamón y Queso',
                description: 'Sandwich caliente con jamón y queso fundido, perfecto para un almuerzo rápido.',
                image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=300&fit=crop',
                readyInMinutes: 10,
                servings: 1,
                difficulty: 'Fácil',
                ingredients: ['2 rebanadas de pan', '2 lonchas de jamón', '2 lonchas de queso', 'Mantequilla', 'Lechuga (opcional)', 'Tomate (opcional)'],
                ingredientsList: ['pan', 'jamón', 'queso', 'mantequilla', 'lechuga', 'tomate'],
                instructions: ['Untar pan con mantequilla', 'Colocar jamón y queso', 'Añadir lechuga y tomate si deseas', 'Cerrar sandwich', 'Tostar en sartén o sandwichera 3 min por lado'],
                vegetarian: false, vegan: false, glutenFree: false
            },
            {
                id: 'local-7',
                title: 'Huevos Revueltos con Tomate',
                description: 'Desayuno rápido y nutritivo con huevos y tomate fresco.',
                image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=300&fit=crop',
                readyInMinutes: 10,
                servings: 2,
                difficulty: 'Fácil',
                ingredients: ['4 huevos', '2 tomates', '1 cebolla pequeña', 'Aceite de oliva', 'Sal y pimienta', 'Pan tostado'],
                ingredientsList: ['huevos', 'tomate', 'cebolla', 'aceite', 'sal', 'pan'],
                instructions: ['Picar tomate y cebolla', 'Sofreír cebolla en aceite', 'Añadir tomate y cocinar 3 min', 'Batir huevos con sal', 'Añadir huevos y revolver suavemente', 'Servir con pan tostado'],
                vegetarian: true, vegan: false, glutenFree: false
            },
            {
                id: 'local-8',
                title: 'Smoothie de Frutas',
                description: 'Batido refrescante y saludable con frutas variadas y yogur.',
                image: 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=400&h=300&fit=crop',
                readyInMinutes: 5,
                servings: 2,
                difficulty: 'Fácil',
                ingredients: ['2 plátanos', '1 taza de fresas', '1 yogur natural', '1/2 taza de leche', '1 cda miel', 'Hielo'],
                ingredientsList: ['plátano', 'fresa', 'yogur', 'leche', 'miel'],
                instructions: ['Pelar y cortar plátanos', 'Lavar fresas', 'Poner todo en la licuadora', 'Añadir yogur, leche y miel', 'Licuar hasta obtener textura cremosa', 'Servir frío con hielo'],
                vegetarian: true, vegan: false, glutenFree: true
            },
            {
                id: 'local-9',
                title: 'Pollo al Horno con Verduras',
                description: 'Pollo jugoso al horno acompañado de verduras asadas.',
                image: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&h=300&fit=crop',
                readyInMinutes: 60,
                servings: 4,
                difficulty: 'Media',
                ingredients: ['4 muslos de pollo', '3 patatas', '2 zanahorias', '1 cebolla', '2 dientes de ajo', 'Aceite de oliva', 'Romero', 'Sal y pimienta'],
                ingredientsList: ['pollo', 'patata', 'zanahoria', 'cebolla', 'ajo', 'aceite', 'romero', 'sal'],
                instructions: ['Precalentar horno a 200°C', 'Sazonar pollo con sal, pimienta y romero', 'Cortar verduras en trozos grandes', 'Colocar todo en bandeja de horno', 'Rociar con aceite de oliva', 'Hornear 45 min hasta dorar', 'Dejar reposar 5 min antes de servir'],
                vegetarian: false, vegan: false, glutenFree: true
            },
            {
                id: 'local-10',
                title: 'Gazpacho Andaluz',
                description: 'Sopa fría de tomate perfecta para días calurosos.',
                image: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400&h=300&fit=crop',
                readyInMinutes: 15,
                servings: 4,
                difficulty: 'Fácil',
                ingredients: ['6 tomates maduros', '1 pepino', '1 pimiento verde', '2 dientes de ajo', '3 cdas aceite de oliva', '2 cdas vinagre', 'Pan del día anterior', 'Sal'],
                ingredientsList: ['tomate', 'pepino', 'pimiento', 'ajo', 'aceite', 'vinagre', 'pan', 'sal'],
                instructions: ['Lavar y trocear todas las verduras', 'Remojar pan en agua', 'Poner todo en la licuadora', 'Añadir aceite, vinagre y sal', 'Licuar hasta obtener textura fina', 'Refrigerar mínimo 1 hora', 'Servir frío con tropezones de verdura'],
                vegetarian: true, vegan: true, glutenFree: false
            },
            {
                id: 'local-11',
                title: 'Tacos de Carne',
                description: 'Tacos mexicanos con carne sazonada y guarniciones frescas.',
                image: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400&h=300&fit=crop',
                readyInMinutes: 25,
                servings: 4,
                difficulty: 'Fácil',
                ingredients: ['400g carne molida', '8 tortillas de maíz', '1 cebolla', '2 tomates', 'Lechuga', 'Queso rallado', 'Crema', 'Comino y chile en polvo'],
                ingredientsList: ['carne', 'tortilla', 'cebolla', 'tomate', 'lechuga', 'queso', 'crema', 'comino'],
                instructions: ['Cocinar carne con cebolla picada', 'Sazonar con comino y chile', 'Picar tomate y lechuga', 'Calentar tortillas', 'Montar tacos con carne', 'Añadir guarniciones al gusto', 'Servir con limón'],
                vegetarian: false, vegan: false, glutenFree: true
            },
            {
                id: 'local-12',
                title: 'Avena con Frutas',
                description: 'Desayuno saludable de avena cocida con frutas frescas y miel.',
                image: 'https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=400&h=300&fit=crop',
                readyInMinutes: 10,
                servings: 2,
                difficulty: 'Fácil',
                ingredients: ['1 taza de avena', '2 tazas de leche', '1 plátano', 'Fresas o arándanos', '2 cdas miel', 'Canela'],
                ingredientsList: ['avena', 'leche', 'plátano', 'fresa', 'miel', 'canela'],
                instructions: ['Hervir leche en una olla', 'Añadir avena y reducir fuego', 'Cocinar 5 min revolviendo', 'Servir en bol', 'Decorar con frutas cortadas', 'Añadir miel y canela'],
                vegetarian: true, vegan: false, glutenFree: false
            },
            {
                id: 'local-13',
                title: 'Ensalada de Atún',
                description: 'Ensalada rápida y proteica con atún enlatado.',
                image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&h=300&fit=crop',
                readyInMinutes: 10,
                servings: 2,
                difficulty: 'Fácil',
                ingredients: ['2 latas de atún', '1 lechuga', '2 tomates', '1 pepino', '1 cebolla morada', 'Aceitunas', 'Aceite de oliva', 'Vinagre', 'Sal'],
                ingredientsList: ['atún', 'lechuga', 'tomate', 'pepino', 'cebolla', 'aceitunas', 'aceite', 'vinagre', 'sal'],
                instructions: ['Lavar y trocear lechuga', 'Cortar tomate y pepino', 'Cortar cebolla en aros finos', 'Escurrir atún', 'Mezclar todo en un bol', 'Aliñar con aceite, vinagre y sal', 'Servir fresca'],
                vegetarian: false, vegan: false, glutenFree: true
            },
            {
                id: 'local-14',
                title: 'Quesadillas',
                description: 'Tortillas rellenas de queso fundido con opciones de relleno.',
                image: 'https://images.unsplash.com/photo-1618040996337-56904b7850b9?w=400&h=300&fit=crop',
                readyInMinutes: 15,
                servings: 2,
                difficulty: 'Fácil',
                ingredients: ['4 tortillas de harina', 'Queso para fundir', 'Jamón o pollo', '1 tomate', 'Aguacate', 'Crema agria'],
                ingredientsList: ['tortilla', 'queso', 'jamón', 'tomate', 'aguacate', 'crema'],
                instructions: ['Calentar sartén a fuego medio', 'Colocar tortilla y añadir queso', 'Añadir relleno al gusto', 'Doblar tortilla por la mitad', 'Cocinar 2 min por cada lado', 'Cortar en triángulos', 'Servir con crema y aguacate'],
                vegetarian: false, vegan: false, glutenFree: false
            },
            {
                id: 'local-15',
                title: 'Arroz Frito',
                description: 'Arroz salteado estilo oriental con verduras y huevo.',
                image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&h=300&fit=crop',
                readyInMinutes: 20,
                servings: 4,
                difficulty: 'Fácil',
                ingredients: ['3 tazas de arroz cocido', '2 huevos', '1 zanahoria', '1 cebolla', '2 dientes de ajo', 'Salsa de soja', 'Aceite de sésamo', 'Guisantes'],
                ingredientsList: ['arroz', 'huevos', 'zanahoria', 'cebolla', 'ajo', 'salsa de soja', 'aceite', 'guisantes'],
                instructions: ['Cortar verduras en cubos pequeños', 'Saltear zanahoria y guisantes', 'Añadir cebolla y ajo', 'Apartar verduras y hacer huevo revuelto', 'Añadir arroz y mezclar todo', 'Añadir salsa de soja', 'Servir caliente'],
                vegetarian: false, vegan: false, glutenFree: true
            },
            {
                id: 'local-16',
                title: 'Pancakes (Tortitas)',
                description: 'Tortitas esponjosas americanas perfectas para el desayuno.',
                image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=300&fit=crop',
                readyInMinutes: 20,
                servings: 4,
                difficulty: 'Fácil',
                ingredients: ['2 tazas de harina', '2 huevos', '1.5 tazas de leche', '2 cdas mantequilla derretida', '2 cdas azúcar', '1 cdta polvo de hornear', 'Miel o sirope'],
                ingredientsList: ['harina', 'huevos', 'leche', 'mantequilla', 'azúcar', 'polvo de hornear'],
                instructions: ['Mezclar ingredientes secos', 'Batir huevos con leche y mantequilla', 'Combinar mezcla húmeda con seca', 'Calentar sartén engrasada', 'Verter porciones de masa', 'Voltear cuando aparezcan burbujas', 'Servir con miel o frutas'],
                vegetarian: true, vegan: false, glutenFree: false
            },
            {
                id: 'local-17',
                title: 'Crema de Calabaza',
                description: 'Crema suave y cremosa de calabaza, ideal para cenas ligeras.',
                image: 'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?w=400&h=300&fit=crop',
                readyInMinutes: 35,
                servings: 4,
                difficulty: 'Fácil',
                ingredients: ['500g calabaza', '1 patata', '1 cebolla', '1 diente de ajo', '500ml caldo de verduras', 'Nata líquida', 'Aceite de oliva', 'Sal y nuez moscada'],
                ingredientsList: ['calabaza', 'patata', 'cebolla', 'ajo', 'caldo', 'nata', 'aceite', 'sal'],
                instructions: ['Pelar y cortar calabaza y patata', 'Sofreír cebolla y ajo', 'Añadir calabaza y patata', 'Cubrir con caldo', 'Cocinar 25 min hasta tiernas', 'Triturar hasta obtener crema', 'Añadir nata y nuez moscada'],
                vegetarian: true, vegan: false, glutenFree: true
            },
            {
                id: 'local-18',
                title: 'Wrap de Pollo y Aguacate',
                description: 'Wrap fresco y saludable con pollo, aguacate y verduras.',
                image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400&h=300&fit=crop',
                readyInMinutes: 15,
                servings: 2,
                difficulty: 'Fácil',
                ingredients: ['2 tortillas grandes', '200g pollo cocido', '1 aguacate', '1 tomate', 'Lechuga', 'Mayonesa o yogur', 'Limón', 'Sal y pimienta'],
                ingredientsList: ['tortilla', 'pollo', 'aguacate', 'tomate', 'lechuga', 'mayonesa', 'limón', 'sal'],
                instructions: ['Desmenuzar o cortar pollo en tiras', 'Cortar aguacate y tomate', 'Lavar y secar lechuga', 'Extender mayonesa en tortilla', 'Colocar ingredientes en el centro', 'Enrollar firmemente', 'Cortar por la mitad y servir'],
                vegetarian: false, vegan: false, glutenFree: false
            },
            {
                id: 'local-19',
                title: 'Lentejas Estofadas',
                description: 'Guiso reconfortante de lentejas con verduras, plato completo y nutritivo.',
                image: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400&h=300&fit=crop',
                readyInMinutes: 45,
                servings: 6,
                difficulty: 'Media',
                ingredients: ['400g lentejas', '2 zanahorias', '2 patatas', '1 cebolla', '2 dientes de ajo', '1 hoja de laurel', 'Pimentón', 'Aceite de oliva', 'Sal'],
                ingredientsList: ['lentejas', 'zanahoria', 'patata', 'cebolla', 'ajo', 'laurel', 'pimentón', 'aceite', 'sal'],
                instructions: ['Lavar lentejas y escurrir', 'Picar verduras en trozos', 'Sofreír cebolla y ajo', 'Añadir pimentón brevemente', 'Agregar lentejas y verduras', 'Cubrir con agua', 'Cocinar 35-40 min a fuego medio'],
                vegetarian: true, vegan: true, glutenFree: true
            },
            {
                id: 'local-20',
                title: 'Banana Split Casero',
                description: 'Postre clásico con plátano, helado y toppings variados.',
                image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&h=300&fit=crop',
                readyInMinutes: 10,
                servings: 2,
                difficulty: 'Fácil',
                ingredients: ['2 plátanos', 'Helado de vainilla', 'Chocolate fundido', 'Nata montada', 'Fresas', 'Frutos secos', 'Cereza'],
                ingredientsList: ['plátano', 'helado', 'chocolate', 'nata', 'fresa', 'frutos secos'],
                instructions: ['Pelar plátanos y cortar por la mitad', 'Colocar en plato alargado', 'Añadir bolas de helado', 'Verter chocolate fundido', 'Decorar con nata montada', 'Añadir fresas y frutos secos', 'Coronar con cereza'],
                vegetarian: true, vegan: false, glutenFree: true
            }
        ];
    }
}

// Inicializar y exportar globalmente
window.recipeSystem = new RecipeSystem();