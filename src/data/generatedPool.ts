import type { Element, ElementCategory, Recipe, WorldEffectMap } from '../types';

interface AspectDef {
  id: string;
  label: string;
  catalyst: string;
  category: ElementCategory;
  emoji: string;
  worldEffects?: WorldEffectMap;
}

const GENERATED_ANCHOR_IDS = [
  'fire', 'water', 'earth', 'air', 'mud', 'steam', 'lava', 'rain', 'plant', 'tree',
  'forest', 'grass', 'seed', 'flower', 'ocean', 'cloud', 'stone', 'metal', 'sand', 'ice',
  'storm', 'lightning', 'life', 'animal', 'human', 'village', 'city', 'tool', 'engine', 'factory',
  'computer', 'internet', 'robot', 'knowledge', 'magic', 'sun', 'moon', 'star', 'galaxy', 'pollution',
] as const;

const ASPECTS: AspectDef[] = [
  { id: 'ember', label: 'Emberforged', catalyst: 'fire', category: 'Nature', emoji: '🔥', worldEffects: { heat: 1 } },
  { id: 'tidal', label: 'Tidal', catalyst: 'water', category: 'Nature', emoji: '🌊', worldEffects: { water: 1 } },
  { id: 'terran', label: 'Terran', catalyst: 'earth', category: 'Materials', emoji: '🪨', worldEffects: { vegetation: 1 } },
  { id: 'aerial', label: 'Aerial', catalyst: 'air', category: 'Weather', emoji: '💨', worldEffects: { atmosphere: 1 } },
  { id: 'vital', label: 'Vital', catalyst: 'life', category: 'Life', emoji: '✨', worldEffects: { life: 1 } },
  { id: 'ancient', label: 'Ancient', catalyst: 'time', category: 'Abstract', emoji: '⌛' },
  { id: 'arcane', label: 'Arcane', catalyst: 'magic', category: 'Abstract', emoji: '🔮', worldEffects: { magic: 1 } },
  { id: 'metallic', label: 'Metallic', catalyst: 'metal', category: 'Materials', emoji: '⚙️', worldEffects: { technology: 1 } },
  { id: 'storm', label: 'Stormborn', catalyst: 'lightning', category: 'Weather', emoji: '⚡', worldEffects: { atmosphere: 1 } },
  { id: 'urban', label: 'Urban', catalyst: 'city', category: 'Civilization', emoji: '🏙️', worldEffects: { civilization: 1 } },
  { id: 'cosmic', label: 'Cosmic', catalyst: 'star', category: 'Cosmic', emoji: '⭐', worldEffects: { magic: 1 } },
  { id: 'frozen', label: 'Frozen', catalyst: 'cold', category: 'Nature', emoji: '❄️', worldEffects: { cold: 1 } },
];

const GENERATED_CATEGORY_EFFECTS: Partial<Record<ElementCategory, WorldEffectMap>> = {
  Nature: { vegetation: 1 },
  Materials: { technology: 1 },
  Weather: { atmosphere: 1 },
  Life: { life: 1 },
  Civilization: { civilization: 1 },
  Technology: { technology: 1 },
  Abstract: { magic: 1 },
  Cosmic: { magic: 1 },
  Weird: { pollution: 1 },
};

function buildGeneratedId(anchorId: string, aspectId: string): string {
  return `${anchorId}_${aspectId}`;
}

export function createGeneratedElements(coreElements: Element[]): Element[] {
  const byId = new Map(coreElements.map((element) => [element.id, element]));
  const generated: Element[] = [];

  for (const anchorId of GENERATED_ANCHOR_IDS) {
    const anchor = byId.get(anchorId);
    if (!anchor) continue;

    for (const aspect of ASPECTS) {
      const id = buildGeneratedId(anchor.id, aspect.id);
      const baseEffects = GENERATED_CATEGORY_EFFECTS[aspect.category] ?? {};
      generated.push({
        id,
        name: `${aspect.label} ${anchor.name}`,
        category: aspect.category,
        emoji: aspect.emoji,
        description: `${anchor.name} reshaped through ${aspect.label.toLowerCase()} influence.`,
        tags: ['fusion', anchor.id, aspect.id, ...anchor.tags.slice(0, 2)],
        discovered: false,
        worldEffects: { ...baseEffects, ...(aspect.worldEffects ?? {}) },
      });
    }
  }

  return generated;
}

export function createGeneratedRecipes(_coreElements?: Element[]): Recipe[] {
  const generated: Recipe[] = [];
  let idx = 1;

  for (const anchorId of GENERATED_ANCHOR_IDS) {
    for (const aspect of ASPECTS) {
      generated.push({
        id: `g${idx++}`,
        inputA: anchorId,
        inputB: aspect.catalyst,
        output: buildGeneratedId(anchorId, aspect.id),
      });
    }
  }

  return generated;
}
