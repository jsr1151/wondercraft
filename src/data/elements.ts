import type { Element } from '../types';

export const ELEMENTS: Element[] = [
  // PRIMORDIAL (unlocked after Big Bang)
  { id: 'fire', name: 'Fire', category: 'Primordial', emoji: '🔥', description: 'The primal flame', tags: ['hot', 'light', 'energy'], discovered: false, worldEffects: { heat: 2 } },
  { id: 'water', name: 'Water', category: 'Primordial', emoji: '💧', description: 'The source of life', tags: ['wet', 'flow', 'life'], discovered: false, worldEffects: { water: 2 } },
  { id: 'earth', name: 'Earth', category: 'Primordial', emoji: '🌍', description: 'Solid ground', tags: ['solid', 'ground', 'material'], discovered: false, worldEffects: { vegetation: 1 } },
  { id: 'air', name: 'Air', category: 'Primordial', emoji: '💨', description: 'The breath of the world', tags: ['gas', 'wind', 'sky'], discovered: false, worldEffects: { atmosphere: 1 } },

  // NATURE
  { id: 'mud', name: 'Mud', category: 'Nature', emoji: '🟫', description: 'Wet earth, base of creation', tags: ['wet', 'earth', 'sticky'], discovered: false },
  { id: 'steam', name: 'Steam', category: 'Nature', emoji: '♨️', description: 'Water transformed by fire', tags: ['hot', 'gas', 'water'], discovered: false, worldEffects: { atmosphere: 1 } },
  { id: 'lava', name: 'Lava', category: 'Nature', emoji: '🌋', description: 'Molten rock from below', tags: ['hot', 'rock', 'molten'], discovered: false, worldEffects: { heat: 3 } },
  { id: 'rain', name: 'Rain', category: 'Nature', emoji: '🌧️', description: 'Water falling from the sky', tags: ['water', 'sky', 'wet'], discovered: false, worldEffects: { water: 1 } },
  { id: 'plant', name: 'Plant', category: 'Nature', emoji: '🌿', description: 'The first green life', tags: ['green', 'life', 'grow'], discovered: false, worldEffects: { vegetation: 2 } },
  { id: 'tree', name: 'Tree', category: 'Nature', emoji: '🌳', description: 'Ancient pillar of the forest', tags: ['wood', 'life', 'grow'], discovered: false, worldEffects: { vegetation: 3 } },
  { id: 'flower', name: 'Flower', category: 'Nature', emoji: '🌸', description: 'Beauty blooming from the earth', tags: ['beauty', 'life', 'grow'], discovered: false, worldEffects: { vegetation: 1 } },
  { id: 'swamp', name: 'Swamp', category: 'Nature', emoji: '🌾', description: 'Murky wetlands teeming with life', tags: ['wet', 'life', 'murky'], discovered: false, worldEffects: { water: 1, vegetation: 1 } },
  { id: 'forest', name: 'Forest', category: 'Nature', emoji: '🌲', description: 'A vast expanse of trees', tags: ['trees', 'life', 'wild'], discovered: false, worldEffects: { vegetation: 4 } },
  { id: 'grass', name: 'Grass', category: 'Nature', emoji: '🌱', description: 'Carpet of green life', tags: ['green', 'life', 'ground'], discovered: false, worldEffects: { vegetation: 2 } },
  { id: 'seed', name: 'Seed', category: 'Nature', emoji: '🌰', description: 'Potential waiting to grow', tags: ['life', 'small', 'grow'], discovered: false },
  { id: 'fruit', name: 'Fruit', category: 'Nature', emoji: '🍎', description: "Nature's sweet reward", tags: ['food', 'life', 'grow'], discovered: false },
  { id: 'mushroom', name: 'Mushroom', category: 'Nature', emoji: '🍄', description: 'Strange growth in the dark', tags: ['fungi', 'life', 'weird'], discovered: false, worldEffects: { vegetation: 1 } },
  { id: 'ocean', name: 'Ocean', category: 'Nature', emoji: '🌊', description: 'Vast body of water', tags: ['water', 'vast', 'deep'], discovered: false, worldEffects: { water: 5 } },
  { id: 'cloud', name: 'Cloud', category: 'Nature', emoji: '☁️', description: 'Water vapor floating above', tags: ['sky', 'water', 'weather'], discovered: false, worldEffects: { atmosphere: 1 } },

  // MATERIALS
  { id: 'stone', name: 'Stone', category: 'Materials', emoji: '🪨', description: 'Solid and enduring', tags: ['solid', 'hard', 'mineral'], discovered: false },
  { id: 'metal', name: 'Metal', category: 'Materials', emoji: '⚙️', description: 'Refined from stone by fire', tags: ['solid', 'conduct', 'craft'], discovered: false },
  { id: 'glass', name: 'Glass', category: 'Materials', emoji: '🪟', description: 'Sand transformed by heat', tags: ['clear', 'brittle', 'craft'], discovered: false },
  { id: 'sand', name: 'Sand', category: 'Materials', emoji: '🏖️', description: 'Tiny fragments of stone', tags: ['dry', 'small', 'mineral'], discovered: false },
  { id: 'dust', name: 'Dust', category: 'Materials', emoji: '🌫️', description: 'Fine particles of earth', tags: ['dry', 'small', 'airborne'], discovered: false },
  { id: 'ash', name: 'Ash', category: 'Materials', emoji: '🌑', description: 'What remains after fire', tags: ['residue', 'black', 'powder'], discovered: false },
  { id: 'ice', name: 'Ice', category: 'Materials', emoji: '🧊', description: 'Water frozen solid', tags: ['cold', 'water', 'crystal'], discovered: false, worldEffects: { cold: 2 } },
  { id: 'snow', name: 'Snow', category: 'Materials', emoji: '❄️', description: 'Crystals of frozen water', tags: ['cold', 'water', 'white'], discovered: false, worldEffects: { cold: 3 } },
  { id: 'clay', name: 'Clay', category: 'Materials', emoji: '🧱', description: 'Malleable earth for shaping', tags: ['soft', 'earth', 'craft'], discovered: false },
  { id: 'brick', name: 'Brick', category: 'Materials', emoji: '🧱', description: 'Baked clay for building', tags: ['hard', 'build', 'craft'], discovered: false },
  { id: 'coal', name: 'Coal', category: 'Materials', emoji: '⬛', description: 'Ancient compressed organic matter', tags: ['black', 'fuel', 'fossil'], discovered: false, worldEffects: { pollution: 1 } },
  { id: 'iron', name: 'Iron', category: 'Materials', emoji: '🔩', description: 'Foundational metal of civilization', tags: ['hard', 'heavy', 'metal'], discovered: false },
  { id: 'steel', name: 'Steel', category: 'Materials', emoji: '🗡️', description: 'Iron strengthened with carbon', tags: ['strong', 'metal', 'alloy'], discovered: false },
  { id: 'salt', name: 'Salt', category: 'Materials', emoji: '🧂', description: 'Crystals of the sea', tags: ['mineral', 'white', 'preserve'], discovered: false },

  // WEATHER
  { id: 'storm', name: 'Storm', category: 'Weather', emoji: '⛈️', description: 'Electricity and fury', tags: ['violent', 'electric', 'weather'], discovered: false },
  { id: 'lightning', name: 'Lightning', category: 'Weather', emoji: '⚡', description: 'Raw electrical power', tags: ['electric', 'fast', 'power'], discovered: false },
  { id: 'fog', name: 'Fog', category: 'Weather', emoji: '🌫️', description: 'Mist that obscures vision', tags: ['water', 'air', 'obscure'], discovered: false, worldEffects: { atmosphere: 1 } },
  { id: 'tornado', name: 'Tornado', category: 'Weather', emoji: '🌪️', description: 'Spinning column of air', tags: ['violent', 'air', 'spin'], discovered: false },
  { id: 'blizzard', name: 'Blizzard', category: 'Weather', emoji: '🌨️', description: 'Frozen storm of fury', tags: ['cold', 'violent', 'snow'], discovered: false, worldEffects: { cold: 4 } },
  { id: 'drought', name: 'Drought', category: 'Weather', emoji: '☀️', description: 'Prolonged absence of rain', tags: ['dry', 'hot', 'barren'], discovered: false, worldEffects: { heat: 2, water: -2 } },

  // LIFE
  { id: 'life', name: 'Life', category: 'Life', emoji: '✨', description: 'The spark of existence', tags: ['vital', 'energy', 'exist'], discovered: false, worldEffects: { life: 5 } },
  { id: 'bacteria', name: 'Bacteria', category: 'Life', emoji: '🦠', description: 'Microscopic life forms', tags: ['micro', 'life', 'tiny'], discovered: false },
  { id: 'fish', name: 'Fish', category: 'Life', emoji: '🐟', description: 'Creatures of the water', tags: ['water', 'life', 'animal'], discovered: false, worldEffects: { life: 1 } },
  { id: 'animal', name: 'Animal', category: 'Life', emoji: '🐾', description: 'Complex multicellular life', tags: ['life', 'move', 'feel'], discovered: false, worldEffects: { life: 2 } },
  { id: 'human', name: 'Human', category: 'Life', emoji: '👤', description: 'Thinking, crafting beings', tags: ['life', 'think', 'build'], discovered: false, worldEffects: { life: 2, civilization: 2 } },
  { id: 'bird', name: 'Bird', category: 'Life', emoji: '🐦', description: 'Feathered flyers of the sky', tags: ['life', 'fly', 'air'], discovered: false },

  // CIVILIZATION
  { id: 'tool', name: 'Tool', category: 'Civilization', emoji: '🔧', description: 'An instrument of creation', tags: ['craft', 'human', 'make'], discovered: false },
  { id: 'village', name: 'Village', category: 'Civilization', emoji: '🏘️', description: 'A small gathering of people', tags: ['people', 'build', 'community'], discovered: false, worldEffects: { civilization: 2 } },
  { id: 'city', name: 'City', category: 'Civilization', emoji: '🏙️', description: 'A hub of civilization', tags: ['people', 'build', 'urban'], discovered: false, worldEffects: { civilization: 5 } },
  { id: 'fire_pit', name: 'Fire Pit', category: 'Civilization', emoji: '🪵', description: 'Controlled flame for warmth', tags: ['fire', 'human', 'warm'], discovered: false },
  { id: 'shelter', name: 'Shelter', category: 'Civilization', emoji: '🏠', description: 'Protection from the elements', tags: ['build', 'human', 'safe'], discovered: false },
  { id: 'farm', name: 'Farm', category: 'Civilization', emoji: '🌾', description: 'Cultivated land for food', tags: ['food', 'earth', 'grow'], discovered: false, worldEffects: { vegetation: 1, civilization: 1 } },
  { id: 'road', name: 'Road', category: 'Civilization', emoji: '🛣️', description: 'Paths connecting places', tags: ['connect', 'travel', 'build'], discovered: false },
  { id: 'wheel', name: 'Wheel', category: 'Civilization', emoji: '⭕', description: 'Round and revolutionary', tags: ['round', 'roll', 'invent'], discovered: false },

  // TECHNOLOGY
  { id: 'electricity', name: 'Electricity', category: 'Technology', emoji: '⚡', description: 'Harnessed lightning', tags: ['power', 'conduct', 'energy'], discovered: false, worldEffects: { technology: 2 } },
  { id: 'computer', name: 'Computer', category: 'Technology', emoji: '💻', description: 'A thinking machine', tags: ['digital', 'think', 'tech'], discovered: false, worldEffects: { technology: 5 } },
  { id: 'internet', name: 'Internet', category: 'Technology', emoji: '🌐', description: 'The global mind', tags: ['connect', 'info', 'global'], discovered: false, worldEffects: { technology: 8 } },
  { id: 'engine', name: 'Engine', category: 'Technology', emoji: '🔄', description: 'Mechanical power', tags: ['power', 'machine', 'move'], discovered: false, worldEffects: { technology: 2, pollution: 1 } },
  { id: 'factory', name: 'Factory', category: 'Technology', emoji: '🏭', description: 'Mass production hub', tags: ['produce', 'machine', 'industry'], discovered: false, worldEffects: { technology: 3, pollution: 3, civilization: 2 } },
  { id: 'robot', name: 'Robot', category: 'Technology', emoji: '🤖', description: 'A mechanical worker', tags: ['machine', 'work', 'ai'], discovered: false, worldEffects: { technology: 3 } },

  // ABSTRACT
  { id: 'time', name: 'Time', category: 'Abstract', emoji: '⌛', description: 'The great equalizer', tags: ['flow', 'change', 'eternal'], discovered: false },
  { id: 'energy', name: 'Energy', category: 'Abstract', emoji: '⚡', description: 'The capacity for work', tags: ['power', 'force', 'transform'], discovered: false },
  { id: 'void', name: 'Void', category: 'Abstract', emoji: '🌑', description: 'The absence of everything', tags: ['empty', 'dark', 'nothing'], discovered: false },
  { id: 'chaos', name: 'Chaos', category: 'Abstract', emoji: '🌀', description: 'Pure disorder', tags: ['disorder', 'random', 'wild'], discovered: false },
  { id: 'order', name: 'Order', category: 'Abstract', emoji: '📐', description: 'Structure from chaos', tags: ['structure', 'rule', 'pattern'], discovered: false },
  { id: 'knowledge', name: 'Knowledge', category: 'Abstract', emoji: '📚', description: 'Accumulated understanding', tags: ['learn', 'know', 'wisdom'], discovered: false },
  { id: 'magic', name: 'Magic', category: 'Abstract', emoji: '✨', description: 'Forces beyond understanding', tags: ['mystical', 'power', 'unknown'], discovered: false, worldEffects: { magic: 5 } },
  { id: 'myth', name: 'Myth', category: 'Abstract', emoji: '📖', description: 'Stories that define reality', tags: ['story', 'legend', 'believe'], discovered: false },
  { id: 'philosophy', name: 'Philosophy', category: 'Abstract', emoji: '🤔', description: 'The love of wisdom', tags: ['think', 'wisdom', 'question'], discovered: false },
  { id: 'dream', name: 'Dream', category: 'Abstract', emoji: '💭', description: 'Visions beyond waking', tags: ['vision', 'sleep', 'mind'], discovered: false, worldEffects: { magic: 2 } },
  { id: 'cold', name: 'Cold', category: 'Abstract', emoji: '🥶', description: 'Low thermal energy', tags: ['cold', 'freeze', 'temperature'], discovered: false, worldEffects: { cold: 3 } },

  // COSMIC
  { id: 'sun', name: 'Sun', category: 'Cosmic', emoji: '☀️', description: 'The star that gives life', tags: ['star', 'hot', 'light'], discovered: false, worldEffects: { heat: 3, life: 2 } },
  { id: 'moon', name: 'Moon', category: 'Cosmic', emoji: '🌙', description: 'The watcher in the dark', tags: ['night', 'reflect', 'tide'], discovered: false },
  { id: 'star', name: 'Star', category: 'Cosmic', emoji: '⭐', description: 'A distant sun', tags: ['light', 'far', 'cosmic'], discovered: false },
  { id: 'galaxy', name: 'Galaxy', category: 'Cosmic', emoji: '🌌', description: 'A vast collection of stars', tags: ['cosmic', 'vast', 'spin'], discovered: false },
  { id: 'cosmos', name: 'Cosmos', category: 'Cosmic', emoji: '🔮', description: 'Everything that exists', tags: ['all', 'universe', 'infinite'], discovered: false },

  // WEIRD
  { id: 'pollution', name: 'Pollution', category: 'Weird', emoji: '💀', description: 'Harmful contamination', tags: ['harm', 'dirty', 'toxic'], discovered: false, worldEffects: { pollution: 4, life: -2 } },
  { id: 'smog', name: 'Smog', category: 'Weird', emoji: '🌫️', description: 'Thick atmospheric pollution', tags: ['dirty', 'air', 'toxic'], discovered: false, worldEffects: { pollution: 3, atmosphere: -1 } },
  { id: 'haze', name: 'Haze', category: 'Weird', emoji: '😶‍🌫️', description: 'A dull atmospheric obscuration', tags: ['obscure', 'air', 'dirty'], discovered: false, worldEffects: { pollution: 2 } },
  { id: 'ruin', name: 'Ruin', category: 'Weird', emoji: '🏚️', description: 'What civilization leaves behind', tags: ['decay', 'old', 'broken'], discovered: false, worldEffects: { ruin: 3, civilization: -1 } },
  { id: 'singularity', name: 'Singularity', category: 'Weird', emoji: '🌀', description: 'A point beyond comprehension', tags: ['tech', 'infinite', 'beyond'], discovered: false, worldEffects: { technology: 10 } },
  { id: 'meme', name: 'Meme', category: 'Weird', emoji: '😂', description: 'A self-replicating idea', tags: ['culture', 'spread', 'funny'], discovered: false, worldEffects: { civilization: 1 } },
  { id: 'void_life', name: 'Void Life', category: 'Weird', emoji: '👁️', description: 'Life that should not exist', tags: ['weird', 'life', 'void'], discovered: false, worldEffects: { life: 1, magic: 3, ruin: 2 } },
  { id: 'sunlight', name: 'Sunlight', category: 'Weird', emoji: '☀️', description: 'Pure rays from above', tags: ['light', 'clean', 'bright'], discovered: false, worldEffects: { heat: 1, pollution: -2 } },
  { id: 'air_purifier', name: 'Air Purifier', category: 'Weird', emoji: '🌬️', description: 'Device that cleans the air', tags: ['clean', 'tech', 'air'], discovered: false, worldEffects: { pollution: -3 } },
];
