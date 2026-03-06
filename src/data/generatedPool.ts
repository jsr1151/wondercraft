import type { Element, Recipe, WorldInfluence } from '../types';

interface GeneratedRule {
  id: string;
  catalyst: string;
  emoji: string;
  effects: Partial<WorldInfluence>;
  applies: (anchor: Element) => boolean;
  nameFor: (anchor: Element) => string;
}

const GENERATED_ANCHOR_IDS = [
  'fire', 'water', 'earth', 'air', 'mud', 'steam', 'lava', 'rain', 'plant', 'tree',
  'forest', 'grass', 'seed', 'flower', 'ocean', 'cloud', 'river', 'lake', 'desert', 'mountain',
  'volcano', 'coral', 'island', 'moss', 'wheat', 'stone', 'metal', 'sand', 'ice', 'snow',
  'clay', 'brick', 'coal', 'iron', 'steel', 'salt', 'obsidian', 'copper', 'bronze', 'oil',
  'plastic', 'concrete', 'crystal', 'storm', 'lightning', 'fog', 'tornado', 'blizzard', 'wind', 'hurricane',
  'life', 'bacteria', 'fish', 'animal', 'human', 'bird', 'insect', 'reptile', 'mammal', 'whale',
  'tool', 'village', 'city', 'farm', 'road', 'wheel', 'boat', 'bridge', 'castle', 'kingdom',
  'market', 'library', 'electricity', 'computer', 'internet', 'engine', 'factory', 'robot', 'medicine', 'vaccine',
  'solar_panel', 'battery', 'satellite', 'airplane', 'rocket', 'asteroid', 'comet', 'planet', 'pollution', 'smog',
  'haze',
] as const;

const hasTag = (anchor: Element, tag: string) => anchor.tags.includes(tag);
const hasAnyTag = (anchor: Element, tags: string[]) => tags.some((tag) => hasTag(anchor, tag));
const isCategory = (anchor: Element, category: Element['category']) => anchor.category === category;

const GENERATED_RULES: GeneratedRule[] = [
  {
    id: 'thermal',
    catalyst: 'fire',
    emoji: '🔥',
    effects: { heat: 1 },
    applies: (anchor) => !['fire', 'lava', 'sun', 'lightning'].includes(anchor.id),
    nameFor: (anchor) => {
      if (hasAnyTag(anchor, ['water', 'wet', 'ocean', 'rain', 'cloud'])) return `Vaporized ${anchor.name}`;
      if (hasAnyTag(anchor, ['stone', 'metal', 'mineral', 'earth', 'solid', 'sand', 'clay'])) return `Molten ${anchor.name}`;
      if (hasAnyTag(anchor, ['plant', 'wood', 'animal', 'life'])) return `Charred ${anchor.name}`;
      return `Heated ${anchor.name}`;
    },
  },
  {
    id: 'cryo',
    catalyst: 'cold',
    emoji: '❄️',
    effects: { cold: 1 },
    applies: (anchor) => !['cold', 'ice', 'snow', 'blizzard'].includes(anchor.id),
    nameFor: (anchor) => {
      if (hasAnyTag(anchor, ['fire', 'hot', 'molten'])) return `Tempered ${anchor.name}`;
      return `Frozen ${anchor.name}`;
    },
  },
  {
    id: 'charged',
    catalyst: 'electricity',
    emoji: '⚡',
    effects: { atmosphere: 1, technology: 1 },
    applies: (anchor) => !['electricity', 'lightning'].includes(anchor.id),
    nameFor: (anchor) => `Charged ${anchor.name}`,
  },
  {
    id: 'biotic',
    catalyst: 'life',
    emoji: '🧬',
    effects: { life: 1, vegetation: 1 },
    applies: (anchor) => !isCategory(anchor, 'Life'),
    nameFor: (anchor) => `Living ${anchor.name}`,
  },
  {
    id: 'ancient',
    catalyst: 'time',
    emoji: '⌛',
    effects: { civilization: 1 },
    applies: (anchor) => !['time'].includes(anchor.id),
    nameFor: (anchor) => `Ancient ${anchor.name}`,
  },
  {
    id: 'arcane',
    catalyst: 'magic',
    emoji: '🔮',
    effects: { magic: 1 },
    applies: (anchor) => !['magic'].includes(anchor.id),
    nameFor: (anchor) => `Enchanted ${anchor.name}`,
  },
  {
    id: 'refined',
    catalyst: 'tool',
    emoji: '🛠️',
    effects: { civilization: 1, technology: 1 },
    applies: (anchor) => !isCategory(anchor, 'Abstract') && !isCategory(anchor, 'Cosmic'),
    nameFor: (anchor) => `Refined ${anchor.name}`,
  },
  {
    id: 'industrial',
    catalyst: 'engine',
    emoji: '🏭',
    effects: { technology: 1, pollution: 1 },
    applies: (anchor) => !isCategory(anchor, 'Abstract') && !isCategory(anchor, 'Cosmic'),
    nameFor: (anchor) => `Industrial ${anchor.name}`,
  },
  {
    id: 'polluted',
    catalyst: 'pollution',
    emoji: '☣️',
    effects: { pollution: 2, life: -1 },
    applies: (anchor) => anchor.id !== 'pollution',
    nameFor: (anchor) => `Contaminated ${anchor.name}`,
  },
];

function buildGeneratedId(anchorId: string, ruleId: string): string {
  return `${anchorId}_${ruleId}`;
}

export function createGeneratedElements(coreElements: Element[]): Element[] {
  const anchorLookup = new Map(coreElements.map((element) => [element.id, element]));
  const generated: Element[] = [];

  for (const anchorId of GENERATED_ANCHOR_IDS) {
    const anchor = anchorLookup.get(anchorId);
    if (!anchor) continue;

    for (const rule of GENERATED_RULES) {
      if (!rule.applies(anchor)) continue;

      generated.push({
        id: buildGeneratedId(anchor.id, rule.id),
        name: rule.nameFor(anchor),
        category: anchor.category,
        emoji: rule.emoji,
        description: `${anchor.name} transformed through a ${rule.id} process.`,
        tags: ['generated', rule.id, anchor.id, ...anchor.tags.slice(0, 2)],
        discovered: false,
        worldEffects: { ...(anchor.worldEffects ?? {}), ...rule.effects },
      });
    }
  }

  return generated;
}

export function createGeneratedRecipes(coreElements: Element[]): Recipe[] {
  const anchorLookup = new Map(coreElements.map((element) => [element.id, element]));
  const generated: Recipe[] = [];
  let idx = 1;

  for (const anchorId of GENERATED_ANCHOR_IDS) {
    const anchor = anchorLookup.get(anchorId);
    if (!anchor) continue;

    for (const rule of GENERATED_RULES) {
      if (!rule.applies(anchor)) continue;

      generated.push({
        id: `g${idx++}`,
        inputA: anchorId,
        inputB: rule.catalyst,
        output: buildGeneratedId(anchorId, rule.id),
      });
    }
  }

  return generated;
}
