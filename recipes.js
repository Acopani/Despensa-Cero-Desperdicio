/**
 * Sistema de Recetas con IA (Google Gemini)
 * Genera recetas personalizadas en español basadas en el inventario real
 */

class RecipeSystem {
    constructor() {
        this.GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

        this.STORAGE_KEYS = {
            RECIPE_CACHE: 'despensa-recipes-cache',
            FAVORITE_RECIPES: 'despensa-favorite-recipes',
            SHOPPING_LIST: 'despensa-shopping-list'
        };

        this.cacheDuration = 12 * 60 * 60 * 1000; // 12 horas
        this.currentRecipes = [];
        this.favoriteRecipes = [];
        this.shoppingList = [];

        this.init();
    }

    init() {
        this.loadFromStorage();
        console.log('🍳 Sistema de recetas con IA listo');
    }

    /**
     * Obtener API key de forma segura
     */
    getApiKey() {
        return (window.ENV && window.ENV.GEMINI_API_KEY) || '';
    }

    /**
     * Analizar inventario y generar recetas con IA
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

        // Extraer ingredientes con sus fechas
        const ingredientes = products.map(p => {
            let info = p.name;
            if (p.expiryDate) {
                const days = Math.ceil((new Date(p.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
                if (days <= 3) info += ' (¡vence pronto!)';
            }
            return info;
        });

        console.log('📊 Ingredientes para IA:', ingredientes);

        // Verificar cache
        const cacheKey = `gemini-${ingredientes.sort().join(',')}`;
        const cached = this.getCachedRecipes(cacheKey);
        if (cached) {
            console.log('📦 Recetas obtenidas del cache');
            this.currentRecipes = cached;
            return cached;
        }

        // Consultar Gemini AI
        const recipes = await this.askGeminiForRecipes(ingredientes);

        if (recipes.length > 0) {
            this.cacheRecipes(cacheKey, recipes);
            this.currentRecipes = recipes;
        }

        return recipes;
    }

    /**
     * Consultar Gemini AI para obtener recetas
     */
    async askGeminiForRecipes(ingredientes) {
        const apiKey = this.getApiKey();
        if (!apiKey) {
            console.error('❌ API key de Gemini no configurada. Revisa env.js');
            return [];
        }

        const prompt = `Eres un chef experto. Tengo estos ingredientes en mi despensa:

${ingredientes.map(i => `- ${i}`).join('\n')}

Genera exactamente 6 recetas que pueda preparar usando PRINCIPALMENTE estos ingredientes. 
Prioriza recetas que usen los ingredientes que vencen pronto.

IMPORTANTE:
- Las recetas deben estar en ESPAÑOL
- Usa SOLO los ingredientes que te doy como base principal
- Puedes asumir que tengo ingredientes básicos: sal, pimienta, aceite, agua
- Sé realista con las combinaciones

Responde ÚNICAMENTE con un JSON válido (sin markdown, sin backticks, sin texto extra) con este formato exacto:
[
  {
    "title": "Nombre de la receta",
    "description": "Descripción breve de 1 línea",
    "readyInMinutes": 25,
    "servings": 4,
    "difficulty": "Fácil",
    "ingredients": ["200g de ingrediente 1", "1 taza de ingrediente 2"],
    "ingredientsList": ["ingrediente1", "ingrediente2"],
    "instructions": ["Paso 1", "Paso 2", "Paso 3"],
    "vegetarian": false,
    "vegan": false,
    "glutenFree": true,
    "tips": "Un consejo útil para esta receta"
  }
]

Solo el JSON, nada más.`;

        try {
            console.log('🤖 Consultando Gemini AI...');
            console.log('🔑 API Key (primeros 10 chars):', apiKey.substring(0, 10) + '...');

            const url = `${this.GEMINI_URL}?key=${apiKey}`;
            console.log('🌐 URL:', url.replace(apiKey, 'API_KEY_HIDDEN'));

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 4096
                    }
                }),
                signal: AbortSignal.timeout(20000)
            });

            console.log('📡 Status:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Error respuesta API:', errorText);
                throw new Error(`Gemini API error ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            console.log('📥 Respuesta recibida de Gemini');

            // Extraer texto de la respuesta
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

            if (!text) {
                console.error('❌ Respuesta vacía. Data:', JSON.stringify(data).substring(0, 500));
                throw new Error('Respuesta vacía de Gemini');
            }

            console.log('📝 Texto recibido (primeros 200 chars):', text.substring(0, 200));

            // Parsear JSON de la respuesta
            const recipes = this.parseGeminiResponse(text);

            console.log(`✅ ${recipes.length} recetas generadas por IA`);
            return recipes;

        } catch (error) {
            console.error('❌ Error consultando Gemini:', error.message);
            return [];
        }
    }

    /**
     * Parsear respuesta de Gemini a formato de recetas
     */
    parseGeminiResponse(text) {
        try {
            // Limpiar posibles backticks o texto extra
            let cleanText = text.trim();
            
            // Remover bloques de código markdown si existen
            if (cleanText.startsWith('```')) {
                cleanText = cleanText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
            }

            const parsed = JSON.parse(cleanText);

            if (!Array.isArray(parsed)) {
                throw new Error('Respuesta no es un array');
            }

            // Transformar al formato interno
            return parsed.map((recipe, index) => ({
                id: `gemini-${Date.now()}-${index}`,
                title: recipe.title || 'Receta sin título',
                description: recipe.description || '',
                image: '',
                readyInMinutes: recipe.readyInMinutes || 30,
                servings: recipe.servings || 4,
                difficulty: recipe.difficulty || 'Media',
                ingredients: recipe.ingredients || [],
                ingredientsList: recipe.ingredientsList || [],
                instructions: recipe.instructions || [],
                sourceUrl: '',
                vegetarian: recipe.vegetarian || false,
                vegan: recipe.vegan || false,
                glutenFree: recipe.glutenFree || false,
                tips: recipe.tips || '',
                matchingPercentage: 100, // IA genera recetas basadas en lo que tienes
                matchingIngredients: recipe.ingredientsList || [],
                missingIngredients: []
            }));

        } catch (error) {
            console.error('❌ Error parseando respuesta de Gemini:', error);
            console.log('Respuesta recibida:', text.substring(0, 500));
            return [];
        }
    }

    /**
     * Obtener detalles de una receta (ya los tenemos completos con IA)
     */
    async getRecipeDetails(recipeId) {
        return this.currentRecipes.find(r => r.id == recipeId) ||
               this.favoriteRecipes.find(r => r.id == recipeId) ||
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
        if (!recipe || !recipe.missingIngredients || recipe.missingIngredients.length === 0) {
            // Con IA las recetas usan lo que tienes, pero podemos agregar ingredientes básicos faltantes
            return [];
        }

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
        if (/aceite|vinagre|sal|pimienta|orégano|comino/.test(ing)) return 'Condimentos';
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
            const keys = Object.keys(cache);
            if (keys.length > 20) {
                const sorted = keys.sort((a, b) => cache[a].timestamp - cache[b].timestamp);
                sorted.slice(0, keys.length - 20).forEach(k => delete cache[k]);
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