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
            return recipes;
        }

        // Fallback: generar recetas locales inteligentes
        console.log('🔄 Usando generador local de recetas...');
        const localRecipes = this.generateLocalRecipes(products);
        this.currentRecipes = localRecipes;
        return localRecipes;
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
                
                // Detectar rate limit
                if (response.status === 429) {
                    const retryMatch = errorText.match(/retry in (\d+)/i);
                    const retrySeconds = retryMatch ? parseInt(retryMatch[1]) : 60;
                    console.warn(`⏳ Rate limit alcanzado. Reintentar en ${retrySeconds}s`);
                    
                    // Guardar info de rate limit
                    this.rateLimitedUntil = Date.now() + (retrySeconds * 1000);
                    throw new Error(`RATE_LIMIT:${retrySeconds}`);
                }
                
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

    /**
     * Generador local inteligente de recetas (fallback cuando Gemini no está disponible)
     * Combina ingredientes del usuario con una base de conocimiento de recetas comunes
     */
    generateLocalRecipes(products) {
        const ingredientes = products.map(p => p.name.toLowerCase().trim());
        const recetas = [];

        // Base de conocimiento: combinaciones de ingredientes → recetas
        const recetaBase = [
            {
                requiere: ['leche'],
                title: 'Leche con Canela y Miel',
                description: 'Bebida reconfortante, ideal para antes de dormir.',
                readyInMinutes: 5, servings: 1, difficulty: 'Fácil',
                ingredients: ['1 taza de leche', 'Una pizca de canela', '1 cucharada de miel'],
                instructions: ['Calentar la leche sin hervir', 'Agregar canela y miel', 'Mezclar bien y servir caliente'],
                vegetarian: true, glutenFree: true, tips: 'Puedes usar leche vegetal como alternativa.'
            },
            {
                requiere: ['pan'],
                title: 'Tostadas con Aceite y Sal',
                description: 'Tostadas crujientes al estilo mediterráneo.',
                readyInMinutes: 5, servings: 2, difficulty: 'Fácil',
                ingredients: ['4 rebanadas de pan', 'Aceite de oliva', 'Sal', 'Tomate rallado (opcional)'],
                instructions: ['Tostar el pan', 'Rociar con aceite de oliva', 'Añadir sal y tomate rallado si tienes'],
                vegetarian: true, glutenFree: false, tips: 'Ideal para acompañar cualquier comida.'
            },
            {
                requiere: ['tomate'],
                title: 'Tomates Aliñados',
                description: 'Ensalada sencilla de tomates frescos con aliño clásico.',
                readyInMinutes: 10, servings: 2, difficulty: 'Fácil',
                ingredients: ['3 tomates maduros', 'Aceite de oliva', 'Vinagre', 'Sal', 'Orégano'],
                instructions: ['Lavar y cortar los tomates en rodajas', 'Aliñar con aceite, vinagre y sal', 'Espolvorear orégano', 'Dejar reposar 5 minutos'],
                vegetarian: true, glutenFree: true, tips: 'Mejor con tomates a temperatura ambiente.'
            },
            {
                requiere: ['tortilla'],
                title: 'Quesadillas Rápidas',
                description: 'Tortillas dobladas y tostadas, rellenas de lo que tengas.',
                readyInMinutes: 10, servings: 2, difficulty: 'Fácil',
                ingredients: ['4 tortillas', 'Queso rallado o en rebanadas', 'Aceite', 'Sal'],
                instructions: ['Calentar sartén con un poco de aceite', 'Colocar tortilla y añadir relleno', 'Doblar y cocinar 2 min por lado', 'Cortar en triángulos y servir'],
                vegetarian: true, glutenFree: false, tips: 'Añade cualquier sobra que tengas: jamón, verduras, frijoles.'
            },
            {
                requiere: ['leche', 'pan'],
                title: 'Torrijas (Pan Francés)',
                description: 'Pan remojado en leche y huevo, dorado en sartén. Un clásico.',
                readyInMinutes: 15, servings: 4, difficulty: 'Fácil',
                ingredients: ['8 rebanadas de pan (mejor si es del día anterior)', '2 tazas de leche', '2 huevos', 'Azúcar y canela', 'Aceite para freír'],
                instructions: ['Calentar leche con canela y azúcar', 'Remojar rebanadas de pan en la leche', 'Pasar por huevo batido', 'Freír en aceite caliente hasta dorar', 'Espolvorear con azúcar y canela'],
                vegetarian: true, glutenFree: false, tips: 'Mejor con pan del día anterior que absorbe más.'
            },
            {
                requiere: ['tomate', 'tortilla'],
                title: 'Chilaquiles Rojos',
                description: 'Tortillas en salsa de tomate, un desayuno mexicano clásico.',
                readyInMinutes: 20, servings: 3, difficulty: 'Fácil',
                ingredients: ['6 tortillas cortadas en triángulos', '4 tomates', '1/4 cebolla', '1 diente de ajo', 'Aceite', 'Sal', 'Crema y queso (opcional)'],
                instructions: ['Freír los triángulos de tortilla hasta dorar', 'Licuar tomates con cebolla, ajo y sal', 'Hervir la salsa 5 minutos', 'Añadir las tortillas fritas a la salsa', 'Servir con crema y queso si tienes'],
                vegetarian: true, glutenFree: true, tips: 'Añade un huevo estrellado encima para hacerlo más completo.'
            },
            {
                requiere: ['leche', 'tortilla'],
                title: 'Enfrijoladas con Crema de Leche',
                description: 'Tortillas bañadas en salsa cremosa, fáciles y deliciosas.',
                readyInMinutes: 15, servings: 2, difficulty: 'Fácil',
                ingredients: ['4 tortillas', '1 taza de leche', 'Frijoles (si tienes)', 'Sal', 'Queso rallado'],
                instructions: ['Calentar las tortillas en sartén', 'Mezclar leche con un poco de sal (o frijoles licuados)', 'Bañar las tortillas con la mezcla', 'Enrollar y servir con queso encima'],
                vegetarian: true, glutenFree: true, tips: 'Si no tienes frijoles, la crema de leche con sal es una alternativa simple.'
            },
            {
                requiere: ['pan', 'tomate'],
                title: 'Bruschetta de Tomate',
                description: 'Pan tostado con tomate fresco picado al estilo italiano.',
                readyInMinutes: 10, servings: 4, difficulty: 'Fácil',
                ingredients: ['4 rebanadas de pan', '3 tomates picados', '1 diente de ajo', 'Aceite de oliva', 'Sal y albahaca'],
                instructions: ['Tostar el pan', 'Frotar con ajo crudo', 'Picar tomates en cubos pequeños', 'Mezclar con aceite, sal y albahaca', 'Colocar sobre el pan tostado'],
                vegetarian: true, glutenFree: false, tips: 'Añade un chorrito de vinagre balsámico si tienes.'
            },
            {
                requiere: ['manzana', 'leche'],
                title: 'Batido de Manzana',
                description: 'Smoothie cremoso de manzana con leche, ideal para el desayuno.',
                readyInMinutes: 5, servings: 2, difficulty: 'Fácil',
                ingredients: ['2 manzanas peladas', '1 taza de leche', '1 cda de miel o azúcar', 'Canela al gusto', 'Hielo (opcional)'],
                instructions: ['Pelar y cortar las manzanas', 'Licuar con leche, miel y canela', 'Añadir hielo si deseas', 'Servir inmediatamente'],
                vegetarian: true, glutenFree: true, tips: 'También queda bien con un poco de avena para más consistencia.'
            },
            {
                requiere: ['manzana'],
                title: 'Manzanas Asadas con Canela',
                description: 'Postre sencillo y saludable de manzanas caramelizadas.',
                readyInMinutes: 20, servings: 2, difficulty: 'Fácil',
                ingredients: ['2 manzanas', '2 cdas de azúcar o miel', 'Canela en polvo', 'Un poco de mantequilla o aceite'],
                instructions: ['Cortar manzanas en gajos', 'Calentar sartén con mantequilla', 'Añadir manzanas y azúcar', 'Cocinar 10 min a fuego medio', 'Espolvorear canela y servir'],
                vegetarian: true, glutenFree: true, tips: 'Sirve con yogur o helado de vainilla.'
            },
            {
                requiere: ['pan', 'leche', 'tomate'],
                title: 'Sopa de Tomate con Pan',
                description: 'Sopa caliente de tomate espesada con pan, reconfortante y fácil.',
                readyInMinutes: 20, servings: 3, difficulty: 'Fácil',
                ingredients: ['4 tomates', '2 rebanadas de pan', '1 taza de leche', '1 diente de ajo', 'Aceite', 'Sal y pimienta'],
                instructions: ['Sofreír ajo en aceite', 'Añadir tomates cortados y cocinar 10 min', 'Añadir pan troceado y leche', 'Triturar todo junto', 'Salpimentar y servir caliente'],
                vegetarian: true, glutenFree: false, tips: 'El pan del día anterior espesa mejor la sopa.'
            },
            {
                requiere: ['tortilla', 'tomate', 'leche'],
                title: 'Enchiladas Suizas Caseras',
                description: 'Tortillas rellenas bañadas en salsa de tomate con crema.',
                readyInMinutes: 25, servings: 3, difficulty: 'Media',
                ingredients: ['6 tortillas', '4 tomates', '1/2 taza de leche', 'Queso rallado', 'Sal', 'Crema (o más leche)'],
                instructions: ['Licuar tomates con sal', 'Hervir la salsa 5 minutos', 'Mezclar un poco de leche para suavizar', 'Pasar tortillas por la salsa', 'Enrollar y colocar en refractario', 'Bañar con salsa restante y queso', 'Hornear 10 min o calentar en microondas'],
                vegetarian: true, glutenFree: true, tips: 'Rellena con pollo desmenuzado o frijoles si tienes.'
            }
        ];

        // Encontrar recetas que coincidan con los ingredientes disponibles
        recetaBase.forEach(receta => {
            const matches = receta.requiere.filter(req => 
                ingredientes.some(ing => ing.includes(req) || req.includes(ing))
            );

            if (matches.length === receta.requiere.length) {
                recetas.push({
                    id: `local-${Date.now()}-${recetas.length}`,
                    title: receta.title,
                    description: receta.description,
                    image: '',
                    readyInMinutes: receta.readyInMinutes,
                    servings: receta.servings,
                    difficulty: receta.difficulty,
                    ingredients: receta.ingredients,
                    ingredientsList: receta.requiere,
                    instructions: receta.instructions,
                    sourceUrl: '',
                    vegetarian: receta.vegetarian || false,
                    vegan: receta.vegan || false,
                    glutenFree: receta.glutenFree || false,
                    tips: receta.tips || '',
                    matchingPercentage: 100,
                    matchingIngredients: matches,
                    missingIngredients: []
                });
            }
        });

        // Ordenar: primero las que usan más ingredientes
        recetas.sort((a, b) => b.ingredientsList.length - a.ingredientsList.length);

        console.log(`✅ ${recetas.length} recetas generadas localmente`);
        return recetas;
    }
}

// Inicializar y exportar globalmente
window.recipeSystem = new RecipeSystem();