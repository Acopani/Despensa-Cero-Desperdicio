/**
 * Interfaz de Usuario para el Sistema de Recetas
 * Maneja la presentación visual de recetas, lista de compras y favoritos
 */

class RecipesUI {
    constructor() {
        this.currentView = 'suggestions'; // suggestions, detail, favorites, shopping
        this.currentRecipe = null;
        this.isLoading = false;
        
        console.log('🍳 RecipesUI inicializado');
    }

    /**
     * Mostrar la sección principal de recetas
     */
    showRecipesSection() {
        const modalsContainer = document.getElementById('modals-container');
        if (!modalsContainer) return;

        this.isLoading = true;

        modalsContainer.innerHTML = `
            <div class="modal recipes-modal" id="recipes-modal">
                <div class="modal-header recipes-header">
                    <h2 class="modal-title">🍳 Recetas Sugeridas</h2>
                    <button class="modal-close" onclick="window.recipesUI.closeRecipes()">×</button>
                </div>
                <div class="recipes-tabs">
                    <button class="tab-btn active" data-tab="suggestions" onclick="window.recipesUI.switchTab('suggestions')">
                        💡 Sugerencias
                    </button>
                    <button class="tab-btn" data-tab="favorites" onclick="window.recipesUI.switchTab('favorites')">
                        ⭐ Favoritos
                    </button>
                    <button class="tab-btn" data-tab="shopping" onclick="window.recipesUI.switchTab('shopping')">
                        🛒 Compras
                    </button>
                </div>
                <div class="modal-content recipes-content" id="recipes-content">
                    <div class="recipes-loading">
                        <div class="loading-spinner"></div>
                        <p>Analizando tu despensa y buscando recetas...</p>
                    </div>
                </div>
            </div>
        `;

        this.addRecipesStyles();
        this.loadSuggestions();
    }

    /**
     * Cargar sugerencias de recetas
     */
    async loadSuggestions() {
        const contentEl = document.getElementById('recipes-content');
        if (!contentEl) return;

        this.isLoading = true;

        try {
            let recipes = [];

            if (window.recipeSystem) {
                recipes = await window.recipeSystem.analyzeInventoryAndSuggestRecipes();
            }

            this.isLoading = false;
            
            // Mostrar resumen de inventario + recetas
            this.renderSuggestionsWithInventory(recipes);

        } catch (error) {
            console.error('❌ Error cargando sugerencias:', error);
            this.isLoading = false;

            contentEl.innerHTML = `
                <div class="recipes-empty">
                    <div class="empty-icon">🔌</div>
                    <h3>Error al cargar recetas</h3>
                    <p>No se pudieron obtener sugerencias. Verifica tu conexión a internet.</p>
                    <button class="btn-primary" onclick="window.recipesUI.loadSuggestions()">
                        🔄 Reintentar
                    </button>
                </div>
            `;
        }
    }

    /**
     * Renderizar sugerencias mostrando el inventario actual
     */
    renderSuggestionsWithInventory(recipes) {
        const contentEl = document.getElementById('recipes-content');
        if (!contentEl) return;

        // Obtener inventario actual
        let inventoryHTML = '';
        if (window.productStorage) {
            const products = window.productStorage.getAllProducts();
            if (products.length > 0) {
                const productNames = products.map(p => p.name).slice(0, 10);
                inventoryHTML = `
                    <div class="inventory-summary">
                        <h4>📦 Tu despensa tiene:</h4>
                        <div class="inventory-chips">
                            ${productNames.map(name => `<span class="inventory-chip">${name}</span>`).join('')}
                            ${products.length > 10 ? `<span class="inventory-chip more">+${products.length - 10} más</span>` : ''}
                        </div>
                    </div>
                `;
            } else {
                inventoryHTML = `
                    <div class="inventory-summary empty">
                        <p>📦 Tu despensa está vacía. Añade productos para recibir mejores sugerencias.</p>
                    </div>
                `;
            }
        }

        if (!recipes || recipes.length === 0) {
            contentEl.innerHTML = `
                ${inventoryHTML}
                <div class="recipes-empty">
                    <div class="empty-icon">🍽️</div>
                    <h3>No hay recetas disponibles</h3>
                    <p>Añade productos a tu despensa para recibir sugerencias.</p>
                </div>
            `;
            return;
        }

        let html = inventoryHTML;
        html += `<div class="recipes-count">${recipes.length} recetas encontradas</div>`;
        html += `<div class="recipes-list">`;

        recipes.forEach(recipe => {
            const isFav = window.recipeSystem ? window.recipeSystem.isFavorite(recipe.id) : false;
            const matchColor = recipe.matchingPercentage >= 70 ? '#4CAF50' : 
                              recipe.matchingPercentage >= 40 ? '#FF9800' : '#9E9E9E';

            html += `
                <div class="recipe-card" onclick="window.recipesUI.showRecipeDetail('${recipe.id}')">
                    <div class="recipe-card-image">
                        <img src="${recipe.image}" alt="${recipe.title}" loading="lazy"
                             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22300%22><rect fill=%22%23f5f5f5%22 width=%22400%22 height=%22300%22/><text x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 font-size=%2250%22>🍽️</text></svg>'">
                        ${recipe.matchingPercentage > 0 ? `
                            <div class="recipe-match-badge" style="background-color: ${matchColor}">
                                ${recipe.matchingPercentage}% tienes
                            </div>
                        ` : ''}
                        <button class="recipe-fav-btn ${isFav ? 'active' : ''}" 
                                onclick="event.stopPropagation(); window.recipesUI.toggleFavorite('${recipe.id}')">
                            ${isFav ? '⭐' : '☆'}
                        </button>
                    </div>
                    <div class="recipe-card-body">
                        <h3 class="recipe-title">${recipe.title}</h3>
                        <p class="recipe-desc">${recipe.description}</p>
                        <div class="recipe-meta">
                            <span class="recipe-time">⏱️ ${recipe.readyInMinutes} min</span>
                            <span class="recipe-difficulty">📊 ${recipe.difficulty}</span>
                            <span class="recipe-servings">👥 ${recipe.servings}</span>
                        </div>
                        ${recipe.matchingIngredients && recipe.matchingIngredients.length > 0 ? `
                            <div class="recipe-matching">
                                <span class="match-label">✅ Tienes:</span>
                                ${recipe.matchingIngredients.slice(0, 3).map(i => `<span class="match-chip">${i}</span>`).join('')}
                                ${recipe.matchingIngredients.length > 3 ? `<span class="match-chip more">+${recipe.matchingIngredients.length - 3}</span>` : ''}
                            </div>
                        ` : ''}
                        <div class="recipe-tags">
                            ${recipe.vegetarian ? '<span class="recipe-tag vegetarian">🥬 Vegetariana</span>' : ''}
                            ${recipe.vegan ? '<span class="recipe-tag vegan">🌱 Vegana</span>' : ''}
                            ${recipe.glutenFree ? '<span class="recipe-tag gluten-free">🌾 Sin Gluten</span>' : ''}
                        </div>
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        contentEl.innerHTML = html;
    }

    /**
     * Renderizar lista de recetas
     */
    renderRecipesList(recipes) {
        const contentEl = document.getElementById('recipes-content');
        if (!contentEl) return;

        if (!recipes || recipes.length === 0) {
            contentEl.innerHTML = `
                <div class="recipes-empty">
                    <div class="empty-icon">🍽️</div>
                    <h3>No hay recetas disponibles</h3>
                    <p>Añade productos a tu despensa para recibir sugerencias de recetas.</p>
                </div>
            `;
            return;
        }

        let html = `<div class="recipes-list">`;

        recipes.forEach(recipe => {
            const isFav = window.recipeSystem ? window.recipeSystem.isFavorite(recipe.id) : false;
            const matchColor = recipe.matchingPercentage >= 70 ? '#4CAF50' : 
                              recipe.matchingPercentage >= 40 ? '#FF9800' : '#F44336';

            html += `
                <div class="recipe-card" onclick="window.recipesUI.showRecipeDetail('${recipe.id}')">
                    <div class="recipe-card-image">
                        <img src="${recipe.image}" alt="${recipe.title}" 
                             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22312%22 height=%22231%22><rect fill=%22%23f0f0f0%22 width=%22312%22 height=%22231%22/><text x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 font-size=%2240%22>🍽️</text></svg>'">
                        <div class="recipe-match-badge" style="background-color: ${matchColor}">
                            ${recipe.matchingPercentage || 0}% match
                        </div>
                        <button class="recipe-fav-btn ${isFav ? 'active' : ''}" 
                                onclick="event.stopPropagation(); window.recipesUI.toggleFavorite('${recipe.id}')">
                            ${isFav ? '⭐' : '☆'}
                        </button>
                    </div>
                    <div class="recipe-card-body">
                        <h3 class="recipe-title">${recipe.title}</h3>
                        <div class="recipe-meta">
                            <span class="recipe-time">⏱️ ${recipe.readyInMinutes} min</span>
                            <span class="recipe-difficulty">📊 ${recipe.difficulty}</span>
                            <span class="recipe-servings">👥 ${recipe.servings}</span>
                        </div>
                        <div class="recipe-tags">
                            ${recipe.vegetarian ? '<span class="recipe-tag vegetarian">🥬 Vegetariana</span>' : ''}
                            ${recipe.vegan ? '<span class="recipe-tag vegan">🌱 Vegana</span>' : ''}
                            ${recipe.glutenFree ? '<span class="recipe-tag gluten-free">🌾 Sin Gluten</span>' : ''}
                        </div>
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        contentEl.innerHTML = html;
    }

    /**
     * Mostrar detalle de una receta
     */
    async showRecipeDetail(recipeId) {
        const contentEl = document.getElementById('recipes-content');
        if (!contentEl) return;

        // Buscar receta
        let recipe = null;
        if (window.recipeSystem) {
            recipe = await window.recipeSystem.getRecipeDetails(recipeId);
        }

        if (!recipe) {
            contentEl.innerHTML = `
                <div class="recipes-empty">
                    <div class="empty-icon">❌</div>
                    <h3>Receta no encontrada</h3>
                    <button class="btn-primary" onclick="window.recipesUI.switchTab('suggestions')">
                        ← Volver a sugerencias
                    </button>
                </div>
            `;
            return;
        }

        this.currentRecipe = recipe;
        this.currentView = 'detail';
        const isFav = window.recipeSystem ? window.recipeSystem.isFavorite(recipe.id) : false;

        contentEl.innerHTML = `
            <div class="recipe-detail">
                <button class="btn-back" onclick="window.recipesUI.switchTab('suggestions')">
                    ← Volver a recetas
                </button>
                
                <div class="recipe-detail-header">
                    <img src="${recipe.image}" alt="${recipe.title}" class="recipe-detail-image"
                         onerror="this.style.display='none'">
                    <div class="recipe-detail-info">
                        <h2>${recipe.title}</h2>
                        <div class="recipe-meta">
                            <span>⏱️ ${recipe.readyInMinutes} min</span>
                            <span>📊 ${recipe.difficulty}</span>
                            <span>👥 ${recipe.servings} porciones</span>
                        </div>
                        <div class="recipe-actions-row">
                            <button class="btn-fav ${isFav ? 'active' : ''}" 
                                    onclick="window.recipesUI.toggleFavorite('${recipe.id}')">
                                ${isFav ? '⭐ En Favoritos' : '☆ Agregar a Favoritos'}
                            </button>
                            <button class="btn-shopping" 
                                    onclick="window.recipesUI.addToShoppingList('${recipe.id}')">
                                🛒 Lista de Compras
                            </button>
                        </div>
                    </div>
                </div>

                <div class="recipe-detail-section">
                    <h3>📝 Descripción</h3>
                    <p>${recipe.description || 'Sin descripción disponible.'}</p>
                </div>

                <div class="recipe-detail-section">
                    <h3>🥗 Ingredientes (${recipe.ingredients ? recipe.ingredients.length : 0})</h3>
                    <ul class="ingredients-list">
                        ${(recipe.ingredients || []).map(ing => {
                            const isAvailable = this.isIngredientAvailable(ing);
                            return `<li class="${isAvailable ? 'available' : 'missing'}">
                                <span class="ing-icon">${isAvailable ? '✅' : '🛒'}</span>
                                ${ing}
                            </li>`;
                        }).join('')}
                    </ul>
                </div>

                <div class="recipe-detail-section">
                    <h3>👨‍🍳 Instrucciones</h3>
                    <ol class="instructions-list">
                        ${(recipe.instructions || ['Instrucciones no disponibles']).map(step => 
                            `<li>${step}</li>`
                        ).join('')}
                    </ol>
                </div>

                ${recipe.sourceUrl ? `
                <div class="recipe-detail-section">
                    <a href="${recipe.sourceUrl}" target="_blank" rel="noopener noreferrer" class="recipe-source-link">
                        🔗 Ver receta original
                    </a>
                </div>` : ''}
            </div>
        `;
    }

    /**
     * Verificar si un ingrediente está disponible en la despensa
     */
    isIngredientAvailable(ingredient) {
        if (!window.productStorage) return false;

        const products = window.productStorage.getAllProducts();
        const ingredientLower = ingredient.toLowerCase();

        return products.some(product => {
            const productName = (product.name || '').toLowerCase();
            return ingredientLower.includes(productName) || productName.includes(ingredientLower.split(/[,\(\)]/)[0].trim());
        });
    }

    /**
     * Cambiar de pestaña
     */
    switchTab(tab) {
        this.currentView = tab;

        // Actualizar botones de pestañas
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        switch (tab) {
            case 'suggestions':
                this.loadSuggestions();
                break;
            case 'favorites':
                this.renderFavorites();
                break;
            case 'shopping':
                this.renderShoppingList();
                break;
        }
    }

    /**
     * Renderizar favoritos
     */
    renderFavorites() {
        const contentEl = document.getElementById('recipes-content');
        if (!contentEl) return;

        const favorites = window.recipeSystem ? window.recipeSystem.getFavoriteRecipes() : [];

        if (favorites.length === 0) {
            contentEl.innerHTML = `
                <div class="recipes-empty">
                    <div class="empty-icon">⭐</div>
                    <h3>Sin recetas favoritas</h3>
                    <p>Agrega recetas a tus favoritos para acceder fácilmente a ellas.</p>
                    <button class="btn-primary" onclick="window.recipesUI.switchTab('suggestions')">
                        💡 Ver sugerencias
                    </button>
                </div>
            `;
            return;
        }

        this.renderRecipesList(favorites);
    }

    /**
     * Renderizar lista de compras
     */
    renderShoppingList() {
        const contentEl = document.getElementById('recipes-content');
        if (!contentEl) return;

        const shoppingList = window.recipeSystem ? window.recipeSystem.getShoppingList() : [];

        if (shoppingList.length === 0) {
            contentEl.innerHTML = `
                <div class="recipes-empty">
                    <div class="empty-icon">🛒</div>
                    <h3>Lista de compras vacía</h3>
                    <p>Abre una receta y genera una lista de compras con los ingredientes que te faltan.</p>
                    <button class="btn-primary" onclick="window.recipesUI.switchTab('suggestions')">
                        💡 Ver recetas
                    </button>
                </div>
            `;
            return;
        }

        // Organizar por categoría
        const organized = window.recipeSystem.getOrganizedShoppingList();
        const pendingCount = shoppingList.filter(i => !i.purchased).length;
        const completedCount = shoppingList.filter(i => i.purchased).length;

        let html = `
            <div class="shopping-list-container">
                <div class="shopping-summary">
                    <span>📋 ${pendingCount} pendientes</span>
                    <span>✅ ${completedCount} comprados</span>
                    ${completedCount > 0 ? `
                        <button class="btn-small" onclick="window.recipesUI.clearCompleted()">
                            🧹 Limpiar comprados
                        </button>
                    ` : ''}
                </div>
        `;

        Object.entries(organized).forEach(([category, items]) => {
            html += `
                <div class="shopping-category">
                    <h4>${category}</h4>
                    <ul class="shopping-items">
                        ${items.map(item => `
                            <li class="shopping-item ${item.purchased ? 'purchased' : ''}">
                                <label>
                                    <input type="checkbox" ${item.purchased ? 'checked' : ''} 
                                           onchange="window.recipesUI.toggleShoppingItem('${item.ingredient}', '${item.recipeId}')">
                                    <span class="item-name">${item.ingredient}</span>
                                </label>
                                <span class="item-recipe">${item.recipeTitle}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        });

        html += `</div>`;
        contentEl.innerHTML = html;
    }

    /**
     * Toggle favorito
     */
    toggleFavorite(recipeId) {
        if (!window.recipeSystem) return;

        const isFav = window.recipeSystem.isFavorite(recipeId);

        if (isFav) {
            window.recipeSystem.removeFromFavorites(recipeId);
        } else {
            // Buscar la receta en las actuales
            const recipe = window.recipeSystem.getCurrentRecipes().find(r => r.id == recipeId) ||
                          window.recipeSystem.getFallbackRecipes().find(r => r.id == recipeId);
            if (recipe) {
                window.recipeSystem.addToFavorites(recipe);
            }
        }

        // Refrescar vista actual
        if (this.currentView === 'detail' && this.currentRecipe) {
            this.showRecipeDetail(this.currentRecipe.id);
        } else if (this.currentView === 'favorites') {
            this.renderFavorites();
        } else {
            this.loadSuggestions();
        }
    }

    /**
     * Agregar ingredientes faltantes a lista de compras
     */
    addToShoppingList(recipeId) {
        if (!window.recipeSystem) return;

        const recipe = window.recipeSystem.getCurrentRecipes().find(r => r.id == recipeId) ||
                      window.recipeSystem.getFallbackRecipes().find(r => r.id == recipeId) ||
                      this.currentRecipe;

        if (recipe) {
            window.recipeSystem.generateShoppingList(recipe);
            this.showToast(`🛒 ${recipe.missingIngredients.length} ingredientes agregados a la lista`);
        }
    }

    /**
     * Toggle item de lista de compras
     */
    toggleShoppingItem(ingredient, recipeId) {
        if (!window.recipeSystem) return;

        const item = window.recipeSystem.getShoppingList().find(i => 
            i.ingredient === ingredient && i.recipeId === recipeId
        );

        if (item) {
            if (item.purchased) {
                item.purchased = false;
            } else {
                window.recipeSystem.markShoppingItemAsPurchased(ingredient, recipeId);
            }
            window.recipeSystem.saveToStorage();
            this.renderShoppingList();
        }
    }

    /**
     * Limpiar items comprados
     */
    clearCompleted() {
        if (!window.recipeSystem) return;
        window.recipeSystem.clearCompletedShoppingList();
        this.renderShoppingList();
        this.showToast('🧹 Items comprados eliminados');
    }

    /**
     * Cerrar sección de recetas
     */
    closeRecipes() {
        const modalsContainer = document.getElementById('modals-container');
        if (modalsContainer) {
            modalsContainer.innerHTML = '';
        }
        this.currentView = 'suggestions';
        this.currentRecipe = null;
    }

    /**
     * Mostrar toast
     */
    showToast(message) {
        if (window.despensaApp && window.despensaApp.showToast) {
            window.despensaApp.showToast(message);
        } else {
            // Fallback simple
            let toast = document.getElementById('recipe-toast');
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'recipe-toast';
                toast.style.cssText = `
                    position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
                    background: rgba(0,0,0,0.85); color: white; padding: 12px 24px;
                    border-radius: 8px; z-index: 10000; opacity: 0; transition: opacity 0.3s;
                    font-family: sans-serif; font-size: 14px;
                `;
                document.body.appendChild(toast);
            }
            toast.textContent = message;
            toast.style.opacity = '1';
            setTimeout(() => { toast.style.opacity = '0'; }, 3000);
        }
    }

    /**
     * Agregar estilos CSS para recetas
     */
    addRecipesStyles() {
        if (document.getElementById('recipes-styles')) return;

        const style = document.createElement('style');
        style.id = 'recipes-styles';
        style.textContent = `
            .recipes-modal {
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: #f5f5f5;
                z-index: 500;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }

            .recipes-header {
                background: linear-gradient(135deg, #FF9800, #F57C00);
                color: white;
                padding: 16px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-shrink: 0;
            }

            .recipes-header .modal-title {
                color: white;
                margin: 0;
                font-size: 1.3rem;
            }

            .recipes-header .modal-close {
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                font-size: 24px;
                width: 36px;
                height: 36px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .recipes-tabs {
                display: flex;
                background: white;
                border-bottom: 1px solid #e0e0e0;
                flex-shrink: 0;
            }

            .tab-btn {
                flex: 1;
                padding: 12px;
                border: none;
                background: transparent;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                color: #666;
                border-bottom: 3px solid transparent;
                transition: all 0.2s;
            }

            .tab-btn.active {
                color: #FF9800;
                border-bottom-color: #FF9800;
                background: #FFF3E0;
            }

            .recipes-content {
                flex: 1;
                overflow-y: auto;
                padding: 16px;
            }

            .recipes-loading {
                text-align: center;
                padding: 60px 20px;
            }

            .recipes-loading .loading-spinner {
                width: 40px;
                height: 40px;
                border: 4px solid #f0f0f0;
                border-top-color: #FF9800;
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
                margin: 0 auto 16px;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }

            .recipes-empty {
                text-align: center;
                padding: 60px 20px;
            }

            .recipes-empty .empty-icon {
                font-size: 48px;
                margin-bottom: 16px;
            }

            .recipes-empty h3 {
                margin-bottom: 8px;
                color: #333;
            }

            .recipes-empty p {
                color: #666;
                margin-bottom: 20px;
            }

            /* Recipe Cards */
            .recipes-list {
                display: flex;
                flex-direction: column;
                gap: 16px;
            }

            .recipe-card {
                background: white;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                cursor: pointer;
                transition: transform 0.2s, box-shadow 0.2s;
            }

            .recipe-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 16px rgba(0,0,0,0.12);
            }

            .recipe-card-image {
                position: relative;
                height: 160px;
                overflow: hidden;
            }

            .recipe-card-image img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }

            .recipe-match-badge {
                position: absolute;
                top: 10px;
                left: 10px;
                color: white;
                padding: 4px 10px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: bold;
            }

            .recipe-fav-btn {
                position: absolute;
                top: 10px;
                right: 10px;
                background: rgba(255,255,255,0.9);
                border: none;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                font-size: 18px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .recipe-fav-btn.active {
                background: #FFF3E0;
            }

            .recipe-card-body {
                padding: 14px;
            }

            .recipe-title {
                font-size: 16px;
                margin: 0 0 8px;
                color: #333;
            }

            .recipe-meta {
                display: flex;
                gap: 12px;
                font-size: 13px;
                color: #666;
                margin-bottom: 8px;
            }

            .recipe-tags {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
            }

            .recipe-tag {
                font-size: 11px;
                padding: 2px 8px;
                border-radius: 10px;
                background: #f0f0f0;
            }

            .recipe-tag.vegetarian { background: #E8F5E9; color: #2E7D32; }
            .recipe-tag.vegan { background: #F1F8E9; color: #33691E; }
            .recipe-tag.gluten-free { background: #FFF8E1; color: #F57F17; }

            /* Recipe Detail */
            .recipe-detail {
                padding-bottom: 20px;
            }

            .btn-back {
                background: none;
                border: none;
                color: #FF9800;
                font-size: 15px;
                cursor: pointer;
                padding: 8px 0;
                margin-bottom: 12px;
                font-weight: 500;
            }

            .recipe-detail-header {
                margin-bottom: 20px;
            }

            .recipe-detail-image {
                width: 100%;
                height: 200px;
                object-fit: cover;
                border-radius: 12px;
                margin-bottom: 16px;
            }

            .recipe-detail-info h2 {
                font-size: 22px;
                margin: 0 0 10px;
                color: #333;
            }

            .recipe-actions-row {
                display: flex;
                gap: 10px;
                margin-top: 12px;
                flex-wrap: wrap;
            }

            .btn-fav, .btn-shopping {
                padding: 10px 16px;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                cursor: pointer;
                font-weight: 500;
            }

            .btn-fav {
                background: #FFF3E0;
                color: #F57C00;
            }

            .btn-fav.active {
                background: #FF9800;
                color: white;
            }

            .btn-shopping {
                background: #E8F5E9;
                color: #2E7D32;
            }

            .recipe-detail-section {
                background: white;
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 12px;
            }

            .recipe-detail-section h3 {
                font-size: 16px;
                margin: 0 0 12px;
                color: #333;
            }

            .ingredients-list {
                list-style: none;
                padding: 0;
                margin: 0;
            }

            .ingredients-list li {
                padding: 8px 0;
                border-bottom: 1px solid #f0f0f0;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .ingredients-list li.available { color: #2E7D32; }
            .ingredients-list li.missing { color: #666; }

            .ing-icon { font-size: 14px; }

            .instructions-list {
                padding-left: 20px;
            }

            .instructions-list li {
                padding: 8px 0;
                line-height: 1.5;
                border-bottom: 1px solid #f0f0f0;
            }

            .recipe-source-link {
                display: inline-block;
                color: #FF9800;
                text-decoration: none;
                font-weight: 500;
            }

            /* Shopping List */
            .shopping-list-container {
                padding-bottom: 20px;
            }

            .shopping-summary {
                display: flex;
                gap: 12px;
                align-items: center;
                padding: 12px 16px;
                background: white;
                border-radius: 8px;
                margin-bottom: 16px;
                font-size: 14px;
                color: #666;
                flex-wrap: wrap;
            }

            .shopping-category {
                background: white;
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 12px;
            }

            .shopping-category h4 {
                margin: 0 0 12px;
                color: #333;
                font-size: 15px;
            }

            .shopping-items {
                list-style: none;
                padding: 0;
                margin: 0;
            }

            .shopping-item {
                padding: 10px 0;
                border-bottom: 1px solid #f0f0f0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .shopping-item.purchased .item-name {
                text-decoration: line-through;
                color: #999;
            }

            .shopping-item label {
                display: flex;
                align-items: center;
                gap: 10px;
                cursor: pointer;
            }

            .shopping-item input[type="checkbox"] {
                width: 18px;
                height: 18px;
                accent-color: #4CAF50;
            }

            .item-recipe {
                font-size: 11px;
                color: #999;
                max-width: 100px;
                text-align: right;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .btn-small {
                padding: 6px 12px;
                border: none;
                background: #f0f0f0;
                border-radius: 6px;
                font-size: 12px;
                cursor: pointer;
            }

            .btn-primary {
                padding: 12px 24px;
                border: none;
                background: #FF9800;
                color: white;
                border-radius: 8px;
                font-size: 15px;
                cursor: pointer;
                font-weight: 500;
            }

            /* Inventory Summary */
            .inventory-summary {
                background: white;
                border-radius: 12px;
                padding: 14px 16px;
                margin-bottom: 12px;
                border-left: 4px solid #4CAF50;
            }

            .inventory-summary.empty {
                border-left-color: #FF9800;
            }

            .inventory-summary h4 {
                margin: 0 0 8px;
                font-size: 14px;
                color: #333;
            }

            .inventory-chips {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
            }

            .inventory-chip {
                background: #E8F5E9;
                color: #2E7D32;
                padding: 4px 10px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 500;
            }

            .inventory-chip.more {
                background: #f0f0f0;
                color: #666;
            }

            .recipes-count {
                font-size: 13px;
                color: #666;
                margin-bottom: 12px;
                padding-left: 4px;
            }

            .recipe-desc {
                font-size: 13px;
                color: #666;
                margin: 4px 0 8px;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }

            .recipe-matching {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 4px;
                margin: 6px 0;
            }

            .match-label {
                font-size: 11px;
                color: #2E7D32;
                font-weight: 600;
            }

            .match-chip {
                background: #E8F5E9;
                color: #2E7D32;
                padding: 2px 8px;
                border-radius: 8px;
                font-size: 11px;
            }

            .match-chip.more {
                background: #f0f0f0;
                color: #666;
            }
        `;
        document.head.appendChild(style);
    }
}

// Inicializar y exportar globalmente
window.recipesUI = new RecipesUI();