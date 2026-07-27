import { InventoryItem, Recipe, RecipeStep } from '@/types';
import { normalizeRecipe } from './recipeNormalizer';

type ItemPredicate = (item: InventoryItem) => boolean;

type RecipeStrategy = {
  key: string;
  category: string;
  technique: string;
  imageUrl: string;
  prepTime: number;
  cookTime: number;
  spiceLevel: number;
  utensils: string[];
  matches: (items: InventoryItem[]) => number;
  select: (items: InventoryItem[]) => InventoryItem[];
  title: (items: InventoryItem[]) => string;
  pantry: string[];
  garnish: string[];
  steps: (names: string[]) => RecipeStep[];
  tip: string;
};

const contains = (pattern: RegExp): ItemPredicate => (item) => pattern.test(`${item.name} ${item.category}`.toLowerCase());
const isBread = contains(/pan|tortilla|bolillo|baguette/);
const isFruit = contains(/fruta|manzana|pl[aá]tano|banana|pera|fresa|mango|durazno|melocot[oó]n|uva|naranja|lim[oó]n/);
const isVegetable = contains(/verdura|tomate|cebolla|papa|patata|zanahoria|calabac|espinaca|champi|esp[aá]rrago|br[oó]coli|pimiento/);
const isDairy = contains(/l[aá]cteo|leche|ques|yogur|crema|mantequilla/);
const isCheese = contains(/queso|quesillo|reques[oó]n|ricotta/);
const isEgg = contains(/huevo/);
const isProtein = contains(/carne|pollo|jam[oó]n|chorizo|at[uú]n|pescado|cerdo|pavo|tofu|legumbre|frijol|garbanzo|lenteja/);
const isGrain = contains(/arroz|pasta|quinoa|avena|cusc[uú]s/);
const isSavory = (item: InventoryItem) => !isFruit(item) && !/leche|yogur/i.test(item.name);

function prioritize(items: InventoryItem[]): InventoryItem[] {
  const priority = { caducado: 3, urgente: 0, pronto: 1, seguro: 2 } as const;
  return [...items]
    .filter((item) => item.status !== 'caducado' && item.quantity > 0)
    .sort((a, b) => priority[a.status] - priority[b.status]);
}

function takeMatching(items: InventoryItem[], predicate: ItemPredicate, maximum = 4): InventoryItem[] {
  const matched = items.filter(predicate).slice(0, maximum);
  return matched.length ? matched : items.slice(0, Math.min(maximum, items.length));
}

function formatAmount(item: InventoryItem): string {
  return `${item.quantity} ${item.unit} de ${item.name}`;
}

function namesOf(items: InventoryItem[]): string[] {
  return items.map((item) => item.name);
}

const strategies: RecipeStrategy[] = [
  {
    key: 'savory-gratin', category: 'Horno', technique: 'Gratinado', prepTime: 15, cookTime: 25, spiceLevel: 1,
    imageUrl: 'https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&q=80&w=600',
    utensils: ['Fuente para horno', 'Tabla de cortar', 'Cuchillo', 'Tazón'],
    matches: (items) => items.filter(isSavory).length + items.filter(isDairy).length * 2,
    select: (items) => takeMatching(items, isSavory, 4),
    title: (items) => `Gratín dorado de ${items[0]?.name || 'verduras'}${items[1] ? ` y ${items[1].name}` : ''}`,
    pantry: ['1 cucharada de aceite de oliva', '1 cucharada de harina o pan molido', 'Sal y pimienta al gusto'],
    garnish: ['Hierbas secas o frescas al gusto'],
    steps: (names) => [
      { title: 'Preparar', instruction: `Corta ${names.join(' y ')} en piezas uniformes para que se cocinen al mismo tiempo.`, durationMinutes: 8 },
      { title: 'Precalentar', instruction: 'Precalienta el horno y engrasa ligeramente la fuente.', durationMinutes: 5, temperature: '190 °C' } as RecipeStep,
      { title: 'Montar', instruction: 'Distribuye los ingredientes por capas, sazona cada una y añade un poco de líquido si la mezcla se ve seca.', durationMinutes: 5 },
      { title: 'Cubrir', instruction: 'Termina con el elemento cremoso disponible y una capa fina de harina o pan molido para formar costra.' },
      { title: 'Hornear', instruction: 'Hornea hasta que el centro esté caliente y los bordes burbujeen.', durationMinutes: 20, heat: 'Horno medio-alto', cue: 'Superficie dorada y centro burbujeante' },
      { title: 'Reposar', instruction: 'Deja reposar antes de servir para que el gratín conserve su forma.', durationMinutes: 5 },
    ],
    tip: 'Divide en porciones antes de refrigerar; se conserva hasta 3 días bien tapado.',
  },
  {
    key: 'rustic-soup', category: 'Sopas y cremas', technique: 'Cocción y triturado', prepTime: 15, cookTime: 30, spiceLevel: 1,
    imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&q=80&w=600',
    utensils: ['Olla grande', 'Cuchillo', 'Tabla de cortar', 'Licuadora o batidora', 'Cucharón'],
    matches: (items) => {
      const soupBase = items.filter((item) => isVegetable(item) || /frijol|garbanzo|lenteja|legumbre/i.test(`${item.name} ${item.category}`));
      return soupBase.length ? soupBase.length * 3 + items.filter(isProtein).length : -1;
    },
    select: (items) => takeMatching(items, (item) => isVegetable(item) || /frijol|garbanzo|lenteja|legumbre|carne|pollo|jam[oó]n|chorizo/i.test(`${item.name} ${item.category}`), 4),
    title: (items) => `Sopa casera de ${items[0]?.name || 'temporada'}${items[1] ? ` con ${items[1].name}` : ''}`,
    pantry: ['750 ml de agua o caldo', '1 cucharada de aceite', '1 diente de ajo', 'Sal, pimienta y comino al gusto'],
    garnish: ['Hierbas frescas, semillas o pan tostado para servir'],
    steps: (names) => [
      { title: 'Mise en place', instruction: `Lava y corta ${names.join(', ')}; reserva por separado los ingredientes que necesiten menos cocción.`, durationMinutes: 10 },
      { title: 'Sofrito', instruction: 'Calienta el aceite y cocina ajo y aromáticos hasta que desprendan aroma sin quemarse.', durationMinutes: 4, heat: 'Fuego medio', cue: 'Aromáticos transparentes y fragantes' },
      { title: 'Cocer', instruction: 'Añade los ingredientes firmes, cubre con caldo y lleva a hervor suave.', durationMinutes: 20, heat: 'Fuego medio-bajo', cue: 'Los ingredientes se atraviesan fácilmente con un cuchillo' },
      { title: 'Terminar', instruction: 'Incorpora los ingredientes delicados durante los últimos minutos y rectifica de sal.' },
      { title: 'Textura', instruction: 'Tritura toda la sopa para una crema o solo una parte para conservar trozos.', durationMinutes: 3 },
      { title: 'Servir', instruction: 'Calienta nuevamente sin hervir fuerte y sirve con la guarnición crujiente.' },
    ],
    tip: 'Enfría rápidamente la sopa sobrante y congélala en recipientes individuales.',
  },
  {
    key: 'stuffed-toast', category: 'Comidas rápidas', technique: 'Tostado y gratinado', prepTime: 10, cookTime: 12, spiceLevel: 1,
    imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&q=80&w=600',
    utensils: ['Sartén o bandeja de horno', 'Cuchillo', 'Tabla de cortar', 'Espátula'],
    matches: (items) => items.some(isBread) ? 10 + items.filter((item) => isDairy(item) || isProtein(item)).length : -1,
    select: (items) => takeMatching(items, (item) => isBread(item) || isCheese(item) || isProtein(item) || isVegetable(item), 4),
    title: (items) => `Tostadas crujientes de ${items.find((item) => !isBread(item))?.name || items[0]?.name || 'aprovechamiento'}`,
    pantry: ['1 cucharadita de aceite o mantequilla', 'Mostaza o salsa al gusto', 'Pimienta negra'],
    garnish: ['Hojas verdes o tomate para acompañar'],
    steps: (names) => [
      { title: 'Preparar relleno', instruction: `Corta finamente ${names.filter((name) => !/pan/i.test(name)).join(', ')} y mezcla los ingredientes compatibles.`, durationMinutes: 5 },
      { title: 'Tostar base', instruction: 'Dora ligeramente el pan por una cara para evitar que se humedezca.', durationMinutes: 3, heat: 'Fuego medio', cue: 'Base firme y apenas dorada' },
      { title: 'Montar', instruction: 'Unta la salsa, reparte el relleno y termina con el ingrediente que mejor funda.' },
      { title: 'Gratinar', instruction: 'Cocina tapado en sartén o bajo el gratinador hasta fundir y dorar.', durationMinutes: 6, heat: 'Fuego bajo o gratinador', cue: 'Pan crujiente y cobertura fundida' },
      { title: 'Servir', instruction: 'Corta en mitades y acompaña con la guarnición fresca para equilibrar.' },
    ],
    tip: 'Tuesta el pan que esté perdiendo frescura; quedará crujiente y evitarás desecharlo.',
  },
  {
    key: 'bread-pudding', category: 'Desayunos y postres', technique: 'Horneado dulce', prepTime: 15, cookTime: 35, spiceLevel: 0,
    imageUrl: 'https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?auto=format&fit=crop&q=80&w=600',
    utensils: ['Fuente para horno', 'Tazón grande', 'Batidor', 'Cuchillo'],
    matches: (items) => (items.some(isBread) ? 5 : 0) + items.filter((item) => isFruit(item) || /leche|huevo/i.test(item.name)).length * 3,
    select: (items) => takeMatching(items, (item) => isBread(item) || isFruit(item) || /leche|huevo|yogur/i.test(item.name), 4),
    title: (items) => `Pudín horneado de ${items.find(isFruit)?.name || items.find(isBread)?.name || 'fruta'}`,
    pantry: ['2 cucharadas de azúcar o miel', '1 cucharadita de canela', '1 pizca de sal', '1 cucharadita de vainilla'],
    garnish: ['Fruta fresca o yogur para servir'],
    steps: (names) => [
      { title: 'Preparar', instruction: `Trocea ${names.join(', ')}; corta el pan en cubos y la fruta en láminas.`, durationMinutes: 8 },
      { title: 'Mezcla líquida', instruction: 'Bate la leche o yogur disponible con huevo si lo tienes, endulzante, vainilla, canela y sal.', durationMinutes: 3 },
      { title: 'Remojar', instruction: 'Mezcla el pan con el líquido y deja que lo absorba antes de añadir la fruta.', durationMinutes: 10, cue: 'Pan húmedo pero aún con estructura' },
      { title: 'Hornear', instruction: 'Pasa a una fuente engrasada y hornea hasta que el centro esté cuajado.', durationMinutes: 30, heat: '180 °C', cue: 'Bordes dorados y centro firme al mover la fuente' },
      { title: 'Reposar', instruction: 'Espera antes de cortar y sirve tibio con la guarnición.', durationMinutes: 10 },
    ],
    tip: 'Es ideal para pan de uno o dos días y fruta muy madura; congela porciones ya horneadas.',
  },
  {
    key: 'seasonal-salad', category: 'Ensaladas completas', technique: 'Marinado y montaje', prepTime: 20, cookTime: 5, spiceLevel: 0,
    imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=600',
    utensils: ['Ensaladera', 'Cuchillo', 'Tabla de cortar', 'Frasco con tapa'],
    matches: (items) => items.filter((item) => isFruit(item) || isVegetable(item) || isProtein(item)).length * 2,
    select: (items) => {
      const hasVegetables = items.some(isVegetable);
      return takeMatching(
        items,
        hasVegetables
          ? (item) => isVegetable(item) || isProtein(item) || isCheese(item)
          : (item) => isFruit(item) || isCheese(item),
        4,
      );
    },
    title: (items) => `Ensalada completa de ${items[0]?.name || 'temporada'}${items[1] ? ` y ${items[1].name}` : ''}`,
    pantry: ['2 cucharadas de aceite de oliva', '1 cucharada de vinagre o jugo de limón', 'Sal y pimienta', '1 cucharadita de mostaza'],
    garnish: ['Semillas, frutos secos o pan tostado'],
    steps: (names) => [
      { title: 'Lavar y secar', instruction: `Lava, seca y corta ${names.join(', ')} de acuerdo con su textura.`, durationMinutes: 10 },
      { title: 'Cocinar lo necesario', instruction: 'Dora brevemente los ingredientes que no deban consumirse crudos y déjalos entibiar.', durationMinutes: 5, heat: 'Fuego medio-alto' },
      { title: 'Vinagreta', instruction: 'Agita aceite, ácido, mostaza, sal y pimienta en un frasco hasta emulsionar.', durationMinutes: 2, cue: 'Aderezo uniforme y ligeramente espeso' },
      { title: 'Montar', instruction: 'Combina primero los ingredientes firmes y añade al final los más delicados.' },
      { title: 'Aliñar', instruction: 'Añade la vinagreta justo antes de servir y termina con la guarnición crujiente.' },
    ],
    tip: 'Guarda el aderezo por separado para que las sobras mantengan buena textura.',
  },
  {
    key: 'homestyle-stew', category: 'Plato fuerte', technique: 'Guisado lento', prepTime: 20, cookTime: 40, spiceLevel: 2,
    imageUrl: 'https://images.unsplash.com/photo-1608500218890-c4f9d7f44384?auto=format&fit=crop&q=80&w=600',
    utensils: ['Olla de fondo grueso', 'Cuchillo', 'Tabla de cortar', 'Cuchara de madera'],
    matches: (items) => {
      const stewBase = items.filter((item) => isVegetable(item) || isGrain(item) || /frijol|garbanzo|lenteja|legumbre/i.test(`${item.name} ${item.category}`));
      return stewBase.length ? stewBase.length * 3 + items.filter(isProtein).length * 2 : -1;
    },
    select: (items) => takeMatching(items, (item) => isProtein(item) || isVegetable(item) || isGrain(item), 4),
    title: (items) => `Guiso reconfortante de ${items[0]?.name || 'despensa'}${items[1] ? ` con ${items[1].name}` : ''}`,
    pantry: ['500 ml de caldo o agua', '1 cucharada de aceite', '1 cucharadita de pimentón', 'Sal, pimienta y laurel'],
    garnish: ['Hierbas frescas y unas gotas de limón'],
    steps: (names) => [
      { title: 'Preparar', instruction: `Corta ${names.join(', ')} en piezas regulares y seca los ingredientes antes de dorarlos.`, durationMinutes: 12 },
      { title: 'Dorar', instruction: 'Calienta el aceite y dora primero proteínas o ingredientes firmes en tandas.', durationMinutes: 8, heat: 'Fuego medio-alto', cue: 'Superficie dorada sin líquido acumulado' },
      { title: 'Sofrito', instruction: 'Baja el fuego, incorpora aromáticos y especias, y remueve hasta liberar sus aromas.', durationMinutes: 5, heat: 'Fuego medio' },
      { title: 'Guisar', instruction: 'Agrega el caldo, raspa el fondo y cocina tapado a hervor muy suave.', durationMinutes: 25, heat: 'Fuego bajo', cue: 'Ingredientes tiernos y salsa ligeramente espesa' },
      { title: 'Ajustar', instruction: 'Destapa los últimos minutos si necesita reducir; rectifica sal, acidez y picante.' },
      { title: 'Reposar', instruction: 'Retira del fuego, deja reposar y termina con hierbas frescas.', durationMinutes: 5 },
    ],
    tip: 'Los guisos mejoran al reposar; enfría las sobras antes de guardarlas hasta 3 días.',
  },
  {
    key: 'savory-cakes', category: 'Aperitivos', technique: 'Mezclado y dorado', prepTime: 18, cookTime: 15, spiceLevel: 1,
    imageUrl: 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?auto=format&fit=crop&q=80&w=600',
    utensils: ['Tazón', 'Rallador o cuchillo', 'Sartén', 'Espátula'],
    matches: (items) => items.filter(isSavory).length,
    select: (items) => takeMatching(items, isSavory, 3),
    title: (items) => `Tortitas doradas de ${items.find((item) => !isBread(item))?.name || items[0]?.name || 'aprovechamiento'}`,
    pantry: ['1 huevo o 2 cucharadas de harina con agua', '3 cucharadas de harina o pan molido', '1 cucharada de aceite', 'Sal y especias'],
    garnish: ['Yogur sazonado, salsa de tomate o ensalada'],
    steps: (names) => [
      { title: 'Preparar base', instruction: `Pica o ralla finamente ${names.join(', ')} y elimina el exceso de humedad.`, durationMinutes: 10 },
      { title: 'Mezclar', instruction: 'Combina con el aglutinante, harina, sal y especias hasta obtener una masa moldeable.', durationMinutes: 4, cue: 'La mezcla conserva su forma al presionarla' },
      { title: 'Formar', instruction: 'Divide en porciones iguales y forma tortitas de aproximadamente un centímetro de grosor.' },
      { title: 'Dorar', instruction: 'Cocina por tandas sin amontonar, volteando una sola vez.', durationMinutes: 10, heat: 'Fuego medio', cue: 'Ambos lados dorados y centro caliente' },
      { title: 'Escurrir y servir', instruction: 'Deja reposar sobre una rejilla o papel y sirve con la guarnición.' },
    ],
    tip: 'Congela las tortitas separadas por papel y caliéntalas directamente en sartén u horno.',
  },
  {
    key: 'fruit-smoothie', category: 'Bebidas y desayunos', technique: 'Triturado en frío', prepTime: 10, cookTime: 0, spiceLevel: 0,
    imageUrl: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&q=80&w=600',
    utensils: ['Licuadora', 'Cuchillo', 'Tabla de cortar', 'Vasos'],
    matches: (items) => items.filter(isFruit).length * 3 + items.filter((item) => /leche|yogur/i.test(item.name)).length * 2,
    select: (items) => takeMatching(items, (item) => isFruit(item) || /leche|yogur|avena/i.test(item.name), 4),
    title: (items) => `Batido cremoso de ${items.find(isFruit)?.name || items[0]?.name || 'fruta madura'}`,
    pantry: ['Hielo al gusto', 'Canela o vainilla', 'Miel opcional'],
    garnish: ['Fruta picada o avena para terminar'],
    steps: (names) => [
      { title: 'Preparar', instruction: `Lava, pela si es necesario y trocea ${names.join(', ')}.`, durationMinutes: 5 },
      { title: 'Enfriar', instruction: 'Usa la fruta fría o añade hielo para obtener mejor textura.' },
      { title: 'Triturar', instruction: 'Licúa primero el líquido con los ingredientes blandos y agrega después los más firmes.', durationMinutes: 2, cue: 'Textura uniforme y sin trozos grandes' },
      { title: 'Ajustar', instruction: 'Prueba antes de endulzar; ajusta espesor con más líquido o hielo.' },
      { title: 'Servir', instruction: 'Sirve inmediatamente y termina con la guarnición.' },
    ],
    tip: 'Congela fruta muy madura en trozos para futuros batidos sin necesidad de añadir azúcar.',
  },
];

function recentTechniqueSet(recipes: Recipe[]): Set<string> {
  return new Set(recipes.slice(0, 7).flatMap((recipe) => recipe.techniques || []).map((value) => value.toLowerCase()));
}

function rotationIndex(recipes: Recipe[], length: number): number {
  const signature = recipes.slice(0, 8).map((recipe) => recipe.title).join('|');
  return [...signature].reduce((total, character) => total + character.charCodeAt(0), recipes.length) % length;
}

export function createLocalRecipe(items: InventoryItem[], recentRecipes: Recipe[]): Recipe {
  const usableItems = prioritize(items);
  const usedTechniques = recentTechniqueSet(recentRecipes);
  const ranked = strategies
    .map((strategy) => ({ strategy, score: strategy.matches(usableItems) }))
    .filter(({ score }) => score >= 0)
    .sort((a, b) => b.score - a.score);
  const fresh = ranked.filter(({ strategy }) => !usedTechniques.has(strategy.technique.toLowerCase()));
  const options = fresh.length ? fresh : ranked;
  const strategy = options[rotationIndex(recentRecipes, options.length)]?.strategy || strategies[0];
  const selected = strategy.select(usableItems);
  const selectedNames = namesOf(selected);
  const urgentNames = selected.filter((item) => item.status === 'urgente' || item.status === 'pronto').map((item) => item.name);
  const ingredientSections = [
    { title: 'Ingredientes del inventario', ingredients: selected.map(formatAmount) },
    { title: 'Ingredientes básicos', ingredients: strategy.pantry },
    { title: 'Para servir', ingredients: strategy.garnish },
  ];
  const detailedSteps = strategy.steps(selectedNames);

  return normalizeRecipe({
    id: `local-${Date.now()}-${strategy.key}`,
    title: strategy.title(selected),
    prepTime: strategy.prepTime,
    cookTime: strategy.cookTime,
    totalTime: strategy.prepTime + strategy.cookTime,
    servings: Math.max(2, Math.min(6, selected.length + 1)),
    spiceLevel: strategy.spiceLevel,
    urgencyNote: urgentNames.length
      ? `Prioriza hoy: ${urgentNames.join(', ')}.`
      : `Aprovecha de forma diferente: ${selectedNames.join(', ')}.`,
    availableStatus: 'DISPONIBLE',
    usedExpiringIngredients: urgentNames.length ? urgentNames : selectedNames,
    ingredientSections,
    detailedSteps,
    utensils: strategy.utensils,
    techniques: [strategy.technique],
    category: strategy.category,
    imageUrl: strategy.imageUrl,
    isUrgent: urgentNames.length > 0,
    tips: strategy.tip,
    source: 'local',
    generatedAt: new Date().toISOString(),
  });
}
