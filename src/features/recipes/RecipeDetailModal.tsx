import React from 'react';
import { AlertCircle, CheckCircle2, ChefHat, Clock, Flame, ListChecks, ShoppingCart, Sparkles, Timer, Users, Utensils, X } from 'lucide-react';
import { Recipe, RecipeStep } from '@/types';

interface RecipeDetailModalProps {
  recipe: Recipe | null;
  onClose: () => void;
  onCookRecipe: (recipe: Recipe) => void;
}

export const RecipeDetailModal: React.FC<RecipeDetailModalProps> = ({ recipe, onClose, onCookRecipe }) => {
  if (!recipe) return null;

  const ingredientSections = recipe.ingredientSections?.length
    ? recipe.ingredientSections
    : [{ title: 'Ingredientes', ingredients: recipe.allIngredients }];
  const steps: RecipeStep[] = recipe.detailedSteps?.length
    ? recipe.detailedSteps
    : recipe.instructions.map((instruction) => ({ instruction }));
  const totalTime = recipe.totalTime || recipe.prepTime + (recipe.cookTime || 0);
  const isAvailable = recipe.availableStatus === '¡Tienes todo!' || recipe.availableStatus === 'DISPONIBLE';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#faf9f9] dark:bg-[#1e211e] text-[#1a1c1c] dark:text-[#faf9f9] w-full max-w-2xl rounded-t-2xl sm:rounded-2xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 border border-transparent dark:border-[#2f3131]">
        <div className="relative h-52 w-full shrink-0 bg-black/10">
          <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <button onClick={onClose} aria-label="Cerrar receta" className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/45 text-white flex items-center justify-center backdrop-blur-md hover:bg-black/65 transition-colors">
            <X className="w-5 h-5" />
          </button>
          <div className="absolute bottom-4 left-5 right-5 text-white">
            <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#006e1c] mb-2">{recipe.category}</span>
            <h2 className="font-heading font-bold text-2xl leading-tight">{recipe.title}</h2>
          </div>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 text-sm">
          <section className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <Metadata icon={<Users className="w-4 h-4" />} label="Porciones" value={`${recipe.servings || 4}`} />
            <Metadata icon={<Clock className="w-4 h-4" />} label="Preparación" value={`${recipe.prepTime} min`} />
            <Metadata icon={<Timer className="w-4 h-4" />} label="Cocción" value={`${recipe.cookTime || 0} min`} />
            <Metadata icon={<ChefHat className="w-4 h-4" />} label="Tiempo total" value={`${totalTime} min`} />
            <Metadata icon={<Flame className="w-4 h-4" />} label="Picante" value={`${recipe.spiceLevel || 0} de 5`} />
          </section>

          <div className={`p-3 rounded-xl border flex items-center gap-2 ${isAvailable ? 'bg-[#4caf50]/10 border-[#4caf50]/30 text-[#006e1c] dark:text-[#81c784]' : 'bg-[#ffdcbe]/60 border-[#ff9800]/30 text-[#653900] dark:text-[#ffcc80]'}`}>
            {isAvailable ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <ShoppingCart className="w-5 h-5 shrink-0" />}
            <span className="font-bold text-xs">{recipe.availableStatus}</span>
          </div>

          {recipe.urgencyNote && (
            <div className="bg-[#ffdad6]/60 dark:bg-[#3e1414] border-l-4 border-[#ba1a1a] p-3 rounded-r-xl flex items-start gap-2.5 text-[#93000a] dark:text-[#ff8a80]">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div><span className="font-bold block text-xs uppercase tracking-wider">Aprovechamiento residuo cero</span><p className="text-xs font-medium mt-0.5">{recipe.urgencyNote}</p></div>
            </div>
          )}

          {recipe.tips && (
            <div className="bg-[#4caf50]/10 dark:bg-[#003c0b]/30 border-l-4 border-[#006e1c] dark:border-[#4caf50] p-3 rounded-r-xl flex items-start gap-2 text-[#003c0b] dark:text-[#a5d6a7]">
              <Sparkles className="w-4 h-4 shrink-0 mt-0.5" /><div><span className="font-bold block text-xs uppercase tracking-wider mb-0.5">Consejo de aprovechamiento</span><p className="text-xs">{recipe.tips}</p></div>
            </div>
          )}

          <section>
            <h3 className="font-heading font-bold text-lg mb-3">Ingredientes</h3>
            <div className="space-y-3">
              {ingredientSections.map((section) => (
                <div key={section.title} className="bg-white dark:bg-[#232623] p-4 rounded-xl border border-[#becab9]/30 dark:border-[#2f3131]">
                  <h4 className="font-bold text-sm text-[#006e1c] dark:text-[#81c784] mb-2">{section.title}</h4>
                  <ul className="space-y-2">
                    {section.ingredients.map((ingredient, index) => (
                      <li key={`${ingredient}-${index}`} className="flex items-start gap-2 text-xs text-[#3f4a3c] dark:text-[#becab9]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#006e1c] dark:bg-[#4caf50] mt-1.5 shrink-0" /><span>{ingredient}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <div className="grid sm:grid-cols-2 gap-3">
            <InfoList title="Utensilios" icon={<Utensils className="w-4 h-4" />} values={recipe.utensils || []} />
            <InfoList title="Técnicas requeridas" icon={<ListChecks className="w-4 h-4" />} values={recipe.techniques || []} />
          </div>

          <section>
            <h3 className="font-heading font-bold text-lg mb-3">Preparación</h3>
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div key={`${step.instruction}-${index}`} className="bg-white dark:bg-[#232623] p-4 rounded-xl border border-[#becab9]/30 dark:border-[#2f3131] flex items-start gap-3">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#006e1c] text-white font-bold text-xs shrink-0">{index + 1}</span>
                  <div className="min-w-0">
                    {step.title && <h4 className="font-bold text-sm mb-1">{step.title}</h4>}
                    <p className="text-xs leading-relaxed text-[#3f4a3c] dark:text-[#becab9]">{step.instruction}</p>
                    {(step.durationMinutes || step.heat || step.temperature || step.cue) && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {step.durationMinutes && <Tag>{step.durationMinutes} min</Tag>}
                        {step.heat && <Tag>{step.heat}</Tag>}
                        {step.temperature && <Tag>{step.temperature}</Tag>}
                        {step.cue && <Tag>Señal: {step.cue}</Tag>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="p-4 bg-white dark:bg-[#232623] border-t border-[#becab9]/30 dark:border-[#2f3131] shrink-0 flex gap-3">
          <button onClick={onClose} className="px-5 py-3 rounded-full border border-[#becab9] dark:border-[#3f4a3c] text-[#3f4a3c] dark:text-[#becab9] font-bold text-xs">Cerrar</button>
          <button onClick={() => { onCookRecipe(recipe); onClose(); }} className="flex-1 bg-[#006e1c] text-white py-3 rounded-full font-heading font-semibold text-sm flex items-center justify-center gap-2 shadow-md hover:brightness-105 active:scale-95 transition-all">
            <ChefHat className="w-4 h-4" /><span>Marcar como cocinada</span>
          </button>
        </div>
      </div>
    </div>
  );
};

function Metadata({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="bg-white dark:bg-[#232623] p-2.5 rounded-xl border border-[#becab9]/30 dark:border-[#2f3131] text-center"><div className="flex justify-center text-[#006e1c] dark:text-[#4caf50] mb-1">{icon}</div><span className="block text-[10px] uppercase tracking-wide text-[#6f7a6b] dark:text-[#a0aca0]">{label}</span><strong className="text-xs">{value}</strong></div>;
}

function InfoList({ title, icon, values }: { title: string; icon: React.ReactNode; values: string[] }) {
  return <section className="bg-white dark:bg-[#232623] p-4 rounded-xl border border-[#becab9]/30 dark:border-[#2f3131]"><h3 className="font-bold text-sm mb-2 flex items-center gap-2 text-[#006e1c] dark:text-[#81c784]">{icon}{title}</h3>{values.length ? <ul className="space-y-1.5">{values.map((value) => <li key={value} className="text-xs text-[#3f4a3c] dark:text-[#becab9]">• {value}</li>)}</ul> : <p className="text-xs text-[#6f7a6b]">No se requieren utensilios especiales.</p>}</section>;
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="px-2 py-1 rounded-full bg-[#006e1c]/10 dark:bg-[#4caf50]/15 text-[#006e1c] dark:text-[#81c784] text-[10px] font-semibold">{children}</span>;
}
