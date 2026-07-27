import React, { useState } from 'react';
import { Search, Sparkles, Clock, CheckCircle2, ShoppingCart, AlertTriangle, ChefHat, X, Loader2 } from 'lucide-react';
import { InventoryItem, Recipe } from '@/types';
import { createLocalRecipe } from './localRecipeGenerator';
import { normalizeRecipe } from './recipeNormalizer';
import { RecipeDetailModal } from './RecipeDetailModal';

interface RecipesScreenProps {
  recipes: Recipe[];
  inventoryItems: InventoryItem[];
  onCookRecipe: (recipe: Recipe) => void;
  onGeneratedRecipe: (recipe: Recipe) => void;
}

export const RecipesScreen: React.FC<RecipesScreenProps> = ({
  recipes,
  inventoryItems,
  onCookRecipe,
  onGeneratedRecipe,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const filteredRecipes = recipes.filter(
    (r) =>
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.allIngredients.some((ing) => ing.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const urgentRecipes = filteredRecipes.filter((r) => r.isUrgent || r.category === 'Sugerencias Urgentes');
  const fastRecipes = filteredRecipes.filter((r) => r.category === 'Comidas rápidas');
  const dinnerRecipes = filteredRecipes.filter((r) => r.category === 'Cena ligera');
  const otherRecipes = filteredRecipes.filter((r) => !urgentRecipes.includes(r) && !fastRecipes.includes(r) && !dinnerRecipes.includes(r));

  // Solicita una receta completa a Gemini y usa un generador local variado si la API no está disponible.
  const handleGenerateAiRecipe = async () => {
    if (inventoryItems.length === 0) {
      setSelectedRecipe(normalizeRecipe({
        id: `empty-${Date.now()}`,
        title: 'Añade productos primero',
        prepTime: 0,
        cookTime: 0,
        totalTime: 0,
        servings: 1,
        urgencyNote: 'Necesitamos conocer tu inventario para proponerte una receta completa.',
        availableStatus: 'FALTA 1',
        usedExpiringIngredients: [],
        ingredientSections: [{ title: 'Antes de comenzar', ingredients: ['Añade al menos un producto a tu inventario'] }],
        detailedSteps: [{ instruction: 'Escanea o registra un alimento y vuelve a intentarlo.' }],
        utensils: [],
        techniques: [],
        category: 'Residuo Cero',
        imageUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=600',
      }));
      return;
    }

    setIsGeneratingAi(true);
    const priorityItems = inventoryItems.filter((item) => item.status === 'urgente' || item.status === 'pronto');
    const itemsToUse = priorityItems.length ? priorityItems : inventoryItems;
    const recentRecipes = recipes
      .filter((recipe) => recipe.source === 'ai' || recipe.source === 'local' || /^(ai|local)-/.test(recipe.id))
      .slice(0, 8);

    try {
      const response = await fetch('/api/recipes/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: itemsToUse,
          recentRecipes: recentRecipes.map((recipe) => ({
            title: recipe.title,
            category: recipe.category,
            techniques: recipe.techniques || [],
          })),
        }),
      });
      if (!response.ok) throw new Error('El servicio de recetas no está disponible');
      const data = await response.json();
      if (!data.recipe) throw new Error('La respuesta no contenía una receta');

      const generated = normalizeRecipe({
        ...data.recipe,
        id: `ai-${Date.now()}`,
        imageUrl: data.recipe.imageUrl || 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=600',
        isUrgent: priorityItems.length > 0,
        source: 'ai',
        generatedAt: new Date().toISOString(),
      });
      onGeneratedRecipe(generated);
      setSelectedRecipe(generated);
    } catch (error) {
      console.warn('Usando generador culinario local:', error);
      const fallback = createLocalRecipe(itemsToUse, recentRecipes);
      onGeneratedRecipe(fallback);
      setSelectedRecipe(fallback);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  return (
    <main className="pt-20 pb-28 px-4 max-w-[800px] mx-auto min-h-screen">
      {/* Search Bar */}
      <section className="mb-6">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[#6f7a6b] dark:text-[#a0aca0]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por ingrediente o plato..."
            className="w-full h-12 pl-12 pr-4 bg-white dark:bg-[#232623] text-[#1a1c1c] dark:text-[#faf9f9] border border-[#becab9]/40 dark:border-[#3f4a3c] rounded-xl focus:ring-2 focus:ring-[#006e1c] focus:border-transparent outline-none transition-all shadow-sm text-sm"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6f7a6b] hover:text-[#1a1c1c] dark:hover:text-[#faf9f9]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </section>

      {/* CTA Section: Salva mi comida! */}
      <section className="mb-8">
        <div className="relative overflow-hidden rounded-2xl bg-[#006e1c] text-white p-6 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative z-10 flex-1">
            <h2 className="font-heading font-bold text-2xl mb-1 flex items-center gap-2">
              <span>¡Salva mi comida!</span>
            </h2>
            <p className="opacity-90 mb-4 text-sm leading-relaxed max-w-md">
              Genera una receta inteligente usando solo lo que tienes a punto de vencer.
            </p>

            <button
              onClick={handleGenerateAiRecipe}
              disabled={isGeneratingAi}
              className="bg-white text-[#006e1c] hover:bg-[#faf9f9] px-6 py-3 rounded-full font-heading font-bold text-xs uppercase tracking-wider flex items-center gap-2 active:scale-95 transition-all shadow-md"
            >
              {isGeneratingAi ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#006e1c]" />
                  <span>Creando receta con IA...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#006e1c]" />
                  <span>COCINAR AHORA</span>
                </>
              )}
            </button>
          </div>

          <div className="hidden md:block opacity-20 pr-4">
            <ChefHat className="w-28 h-28 text-white" />
          </div>
        </div>
      </section>

      {/* Sugerencias Urgentes (Horizontal Scroll) */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading font-bold text-lg text-[#1a1c1c] dark:text-[#faf9f9] flex items-center gap-1.5">
            <AlertTriangle className="w-5 h-5 text-[#ba1a1a] dark:text-[#ff8a80]" />
            <span>Sugerencias Urgentes</span>
          </h3>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar -mx-4 px-4">
          {urgentRecipes.map((recipe) => (
            <div
              key={recipe.id}
              onClick={() => setSelectedRecipe(recipe)}
              className="min-w-[280px] w-[280px] bg-white dark:bg-[#232623] rounded-xl shadow-md border-l-4 border-[#ba1a1a] overflow-hidden group cursor-pointer hover:shadow-lg transition-all border-t border-r border-b border-[#becab9]/20 dark:border-[#2f3131]"
            >
              <div className="h-40 bg-cover bg-center relative">
                <img
                  src={recipe.imageUrl}
                  alt={recipe.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2 right-2 bg-[#ba1a1a] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Urgente
                </div>
              </div>

              <div className="p-3.5">
                <h4 className="font-heading font-bold text-base text-[#1a1c1c] dark:text-[#faf9f9] mb-1 group-hover:text-[#006e1c] dark:group-hover:text-[#4caf50] transition-colors truncate">
                  {recipe.title}
                </h4>

                <div className="flex items-center gap-3 text-xs text-[#3f4a3c] dark:text-[#becab9] mb-2">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {recipe.prepTime} min
                  </span>
                  <span className="flex items-center gap-1 text-[#006e1c] dark:text-[#4caf50] font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {recipe.availableStatus}
                  </span>
                </div>

                <p className="text-[11px] text-[#ba1a1a] dark:text-[#ff8a80] font-medium truncate">
                  {recipe.urgencyNote}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Comidas Rápidas */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading font-bold text-lg text-[#1a1c1c] dark:text-[#faf9f9]">Comidas rápidas</h3>
        </div>

        <div className="space-y-3">
          {fastRecipes.map((recipe) => (
            <div
              key={recipe.id}
              onClick={() => setSelectedRecipe(recipe)}
              className="flex items-center gap-3 bg-white dark:bg-[#232623] p-2.5 rounded-xl shadow-sm border border-[#becab9]/30 dark:border-[#2f3131] hover:shadow-md transition-all cursor-pointer group"
            >
              <img
                src={recipe.imageUrl}
                alt={recipe.title}
                className="w-20 h-20 rounded-lg object-cover shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-heading font-bold text-base text-[#1a1c1c] dark:text-[#faf9f9] group-hover:text-[#006e1c] dark:group-hover:text-[#4caf50] transition-colors truncate">
                  {recipe.title}
                </h4>

                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-[#3f4a3c] dark:text-[#becab9] flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {recipe.prepTime} min
                  </span>

                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      recipe.availableStatus === 'DISPONIBLE'
                        ? 'bg-[#4caf50]/20 text-[#003c0b] dark:text-[#81c784]'
                        : 'bg-[#ffdcbe] text-[#653900]'
                    }`}
                  >
                    {recipe.availableStatus}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Cena Ligera */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading font-bold text-lg text-[#1a1c1c] dark:text-[#faf9f9]">Cena ligera</h3>
        </div>

        <div className="space-y-3">
          {dinnerRecipes.map((recipe) => (
            <div
              key={recipe.id}
              onClick={() => setSelectedRecipe(recipe)}
              className="flex items-center gap-3 bg-white dark:bg-[#232623] p-2.5 rounded-xl shadow-sm border border-[#becab9]/30 dark:border-[#2f3131] hover:shadow-md transition-all cursor-pointer group"
            >
              <img
                src={recipe.imageUrl}
                alt={recipe.title}
                className="w-20 h-20 rounded-lg object-cover shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-heading font-bold text-base text-[#1a1c1c] dark:text-[#faf9f9] group-hover:text-[#006e1c] dark:group-hover:text-[#4caf50] transition-colors truncate">
                  {recipe.title}
                </h4>

                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-[#3f4a3c] dark:text-[#becab9] flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {recipe.prepTime} min
                  </span>

                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      recipe.availableStatus === 'DISPONIBLE'
                        ? 'bg-[#4caf50]/20 text-[#003c0b] dark:text-[#81c784]'
                        : 'bg-[#ffdcbe] text-[#653900]'
                    }`}
                  >
                    {recipe.availableStatus}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recetas importadas, favoritas y otras categorías */}
      {otherRecipes.length > 0 && (
        <section className="mb-8">
          <h3 className="font-heading font-bold text-lg text-[#1a1c1c] dark:text-[#faf9f9] mb-3">Más recetas</h3>
          <div className="space-y-3">
            {otherRecipes.map((recipe) => (
              <button key={recipe.id} onClick={() => setSelectedRecipe(recipe)} className="w-full flex items-center gap-3 bg-white dark:bg-[#232623] p-2.5 rounded-xl shadow-sm border border-[#becab9]/30 dark:border-[#2f3131] hover:shadow-md transition-all text-left group">
                <img src={recipe.imageUrl} alt={recipe.title} className="w-20 h-20 rounded-lg object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-heading font-bold text-base text-[#1a1c1c] dark:text-[#faf9f9] group-hover:text-[#006e1c] dark:group-hover:text-[#4caf50] truncate">{recipe.title}</h4>
                  <p className="text-xs text-[#3f4a3c] dark:text-[#becab9] mt-1">{recipe.category} · {recipe.prepTime} min</p>
                  <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#4caf50]/20 text-[#003c0b] dark:text-[#81c784]">{recipe.availableStatus}</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Recipe Details Modal */}
      <RecipeDetailModal
        recipe={selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
        onCookRecipe={onCookRecipe}
      />
    </main>
  );
};
