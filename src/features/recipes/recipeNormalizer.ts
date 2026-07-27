import { IngredientSection, Recipe, RecipeStep } from '@/types';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&q=80&w=600';
const VALID_STATUSES: Recipe['availableStatus'][] = ['DISPONIBLE', 'FALTA 1', 'FALTA 2', '¡Tienes todo!'];

function textArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
}

function normalizeSections(value: unknown): IngredientSection[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((section: any) => ({
      title: String(section?.title || 'Ingredientes').trim(),
      ingredients: textArray(section?.ingredients),
    }))
    .filter((section) => section.ingredients.length > 0);
}

function normalizeSteps(value: unknown): RecipeStep[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((step: any) => typeof step === 'string'
      ? { instruction: step.trim() }
      : {
          title: step?.title ? String(step.title).trim() : undefined,
          instruction: String(step?.instruction || step?.description || '').trim(),
          durationMinutes: Number(step?.durationMinutes) > 0 ? Number(step.durationMinutes) : undefined,
          heat: step?.heat ? String(step.heat).trim() : undefined,
          temperature: step?.temperature ? String(step.temperature).trim() : undefined,
          cue: step?.cue ? String(step.cue).trim() : undefined,
        })
    .filter((step) => step.instruction);
}

export function normalizeRecipe(raw: any, index = 0): Recipe {
  const sections = normalizeSections(raw?.ingredientSections);
  const flatIngredients = textArray(raw?.allIngredients || raw?.ingredients);
  const ingredientSections = sections.length
    ? sections
    : [{ title: 'Ingredientes', ingredients: flatIngredients }];
  const allIngredients = ingredientSections.flatMap((section) => section.ingredients);

  const detailed = normalizeSteps(raw?.detailedSteps);
  const legacyInstructions = textArray(raw?.instructions);
  const detailedSteps = detailed.length
    ? detailed
    : legacyInstructions.map((instruction) => ({ instruction }));
  const instructions = detailedSteps.map((step) => step.instruction);

  const prepTime = Math.max(0, Number(raw?.prepTime) || 15);
  const cookTime = Math.max(0, Number(raw?.cookTime) || 0);
  const totalTime = Math.max(prepTime + cookTime, Number(raw?.totalTime) || Number(raw?.readyInMinutes) || prepTime);
  const status = VALID_STATUSES.includes(raw?.availableStatus) ? raw.availableStatus : 'DISPONIBLE';
  const source: Recipe['source'] = ['ai', 'local', 'legacy'].includes(raw?.source)
    ? raw.source
    : String(raw?.id || '').startsWith('ai-')
      ? 'ai'
      : String(raw?.id || '').startsWith('local-')
        ? 'local'
        : 'legacy';

  return {
    id: String(raw?.id || `recipe-${Date.now()}-${index}`),
    title: String(raw?.title || 'Receta de aprovechamiento').trim(),
    prepTime,
    cookTime,
    totalTime,
    servings: Math.max(1, Math.round(Number(raw?.servings) || 4)),
    spiceLevel: Math.min(5, Math.max(0, Math.round(Number(raw?.spiceLevel) || 0))),
    urgencyNote: String(raw?.urgencyNote || raw?.description || 'Preparada para aprovechar tu inventario.').trim(),
    availableStatus: status,
    usedExpiringIngredients: textArray(raw?.usedExpiringIngredients || raw?.ingredientsList),
    allIngredients,
    ingredientSections,
    instructions,
    detailedSteps,
    utensils: textArray(raw?.utensils),
    techniques: textArray(raw?.techniques),
    category: String(raw?.category || 'Aprovechamiento').trim(),
    imageUrl: String(raw?.imageUrl || raw?.image || DEFAULT_IMAGE),
    isUrgent: Boolean(raw?.isUrgent),
    tips: raw?.tips ? String(raw.tips).trim() : undefined,
    source,
    generatedAt: raw?.generatedAt ? String(raw.generatedAt) : undefined,
  };
}
