import type { Recipe } from '../types';
import { createGeneratedRecipes } from './generatedPool';

const CORE_RECIPES: Recipe[] = [
  // PRIMORDIAL BASICS
  { id: 'r1', inputA: 'water', inputB: 'earth', output: 'mud' },
  { id: 'r2', inputA: 'fire', inputB: 'water', output: 'steam' },
  { id: 'r3', inputA: 'earth', inputB: 'fire', output: 'lava' },
  { id: 'r4', inputA: 'air', inputB: 'water', output: 'rain' },
  { id: 'r5', inputA: 'air', inputB: 'fire', output: 'energy' },
  { id: 'r6', inputA: 'earth', inputB: 'air', output: 'dust' },
  { id: 'r7', inputA: 'fire', inputB: 'air', output: 'ash' },
  { id: 'r8', inputA: 'water', inputB: 'water', output: 'ocean' },
  { id: 'r9', inputA: 'fire', inputB: 'fire', output: 'sun' },
  { id: 'r10', inputA: 'air', inputB: 'air', output: 'storm' },

  // NATURE
  { id: 'r11', inputA: 'earth', inputB: 'rain', output: 'plant' },
  { id: 'r12', inputA: 'mud', inputB: 'water', output: 'swamp' },
  { id: 'r13', inputA: 'plant', inputB: 'water', output: 'swamp' },
  { id: 'r14', inputA: 'plant', inputB: 'earth', output: 'seed' },
  { id: 'r15', inputA: 'seed', inputB: 'rain', output: 'tree' },
  { id: 'r16', inputA: 'tree', inputB: 'tree', output: 'forest' },
  { id: 'r17', inputA: 'plant', inputB: 'plant', output: 'grass' },
  { id: 'r18', inputA: 'grass', inputB: 'earth', output: 'flower' },
  { id: 'r19', inputA: 'flower', inputB: 'plant', output: 'fruit' },
  { id: 'r20', inputA: 'plant', inputB: 'life', output: 'tree' },
  { id: 'r21', inputA: 'earth', inputB: 'life', output: 'animal' },
  { id: 'r22', inputA: 'life', inputB: 'air', output: 'bird' },
  { id: 'r23', inputA: 'fish', inputB: 'earth', output: 'animal' },
  { id: 'r24', inputA: 'animal', inputB: 'time', output: 'human' },
  { id: 'r25', inputA: 'ocean', inputB: 'life', output: 'fish' },

  // MATERIALS
  { id: 'r26', inputA: 'lava', inputB: 'air', output: 'stone' },
  { id: 'r27', inputA: 'stone', inputB: 'fire', output: 'metal' },
  { id: 'r28', inputA: 'stone', inputB: 'air', output: 'sand' },
  { id: 'r29', inputA: 'sand', inputB: 'fire', output: 'glass' },
  { id: 'r30', inputA: 'stone', inputB: 'water', output: 'clay' },
  { id: 'r31', inputA: 'clay', inputB: 'fire', output: 'brick' },
  { id: 'r32', inputA: 'water', inputB: 'cold', output: 'ice' },
  { id: 'r33', inputA: 'plant', inputB: 'time', output: 'coal' },
  { id: 'r34', inputA: 'metal', inputB: 'metal', output: 'iron' },
  { id: 'r35', inputA: 'iron', inputB: 'fire', output: 'steel' },
  { id: 'r36', inputA: 'ash', inputB: 'water', output: 'mud' },
  { id: 'r38', inputA: 'water', inputB: 'air', output: 'cloud' },

  // WEATHER
  { id: 'r39', inputA: 'cloud', inputB: 'water', output: 'rain' },
  { id: 'r40', inputA: 'cloud', inputB: 'fire', output: 'lightning' },
  { id: 'r41', inputA: 'lightning', inputB: 'air', output: 'storm' },
  { id: 'r42', inputA: 'rain', inputB: 'cold', output: 'snow' },
  { id: 'r43', inputA: 'snow', inputB: 'cold', output: 'blizzard' },
  { id: 'r44', inputA: 'air', inputB: 'cold', output: 'fog' },
  { id: 'r45', inputA: 'storm', inputB: 'air', output: 'tornado' },
  { id: 'r46', inputA: 'sun', inputB: 'earth', output: 'drought' },
  { id: 'r47', inputA: 'water', inputB: 'cold', output: 'ice' },
  { id: 'r48', inputA: 'ice', inputB: 'air', output: 'snow' },

  // LIFE
  { id: 'r49', inputA: 'steam', inputB: 'mud', output: 'life' },
  { id: 'r50', inputA: 'bacteria', inputB: 'water', output: 'fish' },
  { id: 'r51', inputA: 'life', inputB: 'water', output: 'bacteria' },

  // CIVILIZATION
  { id: 'r52', inputA: 'human', inputB: 'earth', output: 'tool' },
  { id: 'r53', inputA: 'human', inputB: 'tool', output: 'shelter' },
  { id: 'r54', inputA: 'human', inputB: 'shelter', output: 'village' },
  { id: 'r55', inputA: 'village', inputB: 'village', output: 'city' },
  { id: 'r56', inputA: 'human', inputB: 'fire', output: 'fire_pit' },
  { id: 'r57', inputA: 'fire_pit', inputB: 'earth', output: 'farm' },
  { id: 'r58', inputA: 'farm', inputB: 'village', output: 'road' },
  { id: 'r59', inputA: 'human', inputB: 'stone', output: 'wheel' },
  { id: 'r60', inputA: 'wheel', inputB: 'metal', output: 'engine' },
  { id: 'r61', inputA: 'engine', inputB: 'city', output: 'factory' },
  { id: 'r62', inputA: 'city', inputB: 'pollution', output: 'ruin' },

  // TECHNOLOGY
  { id: 'r63', inputA: 'lightning', inputB: 'metal', output: 'electricity' },
  { id: 'r64', inputA: 'electricity', inputB: 'metal', output: 'computer' },
  { id: 'r65', inputA: 'computer', inputB: 'human', output: 'internet' },
  { id: 'r66', inputA: 'computer', inputB: 'electricity', output: 'robot' },
  { id: 'r67', inputA: 'robot', inputB: 'factory', output: 'singularity' },
  { id: 'r68', inputA: 'internet', inputB: 'human', output: 'meme' },
  { id: 'r69', inputA: 'electricity', inputB: 'human', output: 'knowledge' },
  { id: 'r70', inputA: 'knowledge', inputB: 'human', output: 'philosophy' },

  // ABSTRACT
  { id: 'r71', inputA: 'fire', inputB: 'void', output: 'chaos' },
  { id: 'r72', inputA: 'chaos', inputB: 'time', output: 'order' },
  { id: 'r73', inputA: 'knowledge', inputB: 'magic', output: 'myth' },
  { id: 'r74', inputA: 'human', inputB: 'dream', output: 'myth' },
  { id: 'r75', inputA: 'life', inputB: 'magic', output: 'dream' },
  { id: 'r76', inputA: 'philosophy', inputB: 'magic', output: 'myth' },
  { id: 'r77', inputA: 'energy', inputB: 'chaos', output: 'void' },
  { id: 'r78', inputA: 'air', inputB: 'time', output: 'void' },

  // COSMIC
  { id: 'r79', inputA: 'sun', inputB: 'void', output: 'star' },
  { id: 'r80', inputA: 'star', inputB: 'star', output: 'galaxy' },
  { id: 'r81', inputA: 'galaxy', inputB: 'galaxy', output: 'cosmos' },
  { id: 'r82', inputA: 'void', inputB: 'void', output: 'cosmos' },

  // WEIRD
  { id: 'r83', inputA: 'factory', inputB: 'city', output: 'pollution' },
  { id: 'r84', inputA: 'pollution', inputB: 'air', output: 'smog' },
  { id: 'r85', inputA: 'smog', inputB: 'air', output: 'haze' },
  { id: 'r86', inputA: 'smog', inputB: 'smog', output: 'ruin' },
  { id: 'r87', inputA: 'sun', inputB: 'air', output: 'sunlight' },
  { id: 'r88', inputA: 'electricity', inputB: 'air', output: 'air_purifier' },
  { id: 'r89', inputA: 'air_purifier', inputB: 'pollution', output: 'air' },
  { id: 'r90', inputA: 'magic', inputB: 'life', output: 'void_life' },
  { id: 'r91', inputA: 'void', inputB: 'life', output: 'void_life' },
  { id: 'r92', inputA: 'galaxy', inputB: 'life', output: 'cosmos' },
  { id: 'r93', inputA: 'sun', inputB: 'star', output: 'galaxy' },
  { id: 'r94', inputA: 'cold', inputB: 'fire', output: 'steam' },
  { id: 'r95', inputA: 'stone', inputB: 'stone', output: 'earth' },
  { id: 'r96', inputA: 'salt', inputB: 'water', output: 'ocean' },
  { id: 'r97', inputA: 'ocean', inputB: 'earth', output: 'salt' },
  { id: 'r98', inputA: 'mushroom', inputB: 'earth', output: 'forest' },
  { id: 'r99', inputA: 'life', inputB: 'earth', output: 'mushroom' },
  { id: 'r100', inputA: 'tree', inputB: 'fire', output: 'ash' },
  { id: 'r101', inputA: 'ice', inputB: 'ice', output: 'cold' },
  { id: 'r102', inputA: 'air', inputB: 'ice', output: 'cold' },
  { id: 'r103', inputA: 'snow', inputB: 'earth', output: 'cold' },
  { id: 'r104', inputA: 'sun', inputB: 'moon', output: 'time' },
  { id: 'r105', inputA: 'star', inputB: 'life', output: 'time' },
  { id: 'r106', inputA: 'sun', inputB: 'water', output: 'moon' },
  { id: 'r107', inputA: 'star', inputB: 'void', output: 'moon' },
  { id: 'r108', inputA: 'ocean', inputB: 'sun', output: 'salt' },

  // EXPANDED NATURE
  { id: 'r109', inputA: 'rain', inputB: 'earth', output: 'river' },
  { id: 'r110', inputA: 'river', inputB: 'water', output: 'lake' },
  { id: 'r111', inputA: 'earth', inputB: 'stone', output: 'mountain' },
  { id: 'r112', inputA: 'lava', inputB: 'mountain', output: 'volcano' },
  { id: 'r113', inputA: 'sand', inputB: 'sun', output: 'desert' },
  { id: 'r114', inputA: 'forest', inputB: 'rain', output: 'jungle' },
  { id: 'r115', inputA: 'ocean', inputB: 'plant', output: 'coral' },
  { id: 'r116', inputA: 'ocean', inputB: 'earth', output: 'island' },
  { id: 'r117', inputA: 'stone', inputB: 'plant', output: 'moss' },
  { id: 'r118', inputA: 'farm', inputB: 'plant', output: 'wheat' },
  { id: 'r119', inputA: 'mountain', inputB: 'water', output: 'river' },
  { id: 'r120', inputA: 'desert', inputB: 'rain', output: 'grass' },

  // EXPANDED MATERIALS
  { id: 'r121', inputA: 'lava', inputB: 'water', output: 'obsidian' },
  { id: 'r122', inputA: 'metal', inputB: 'earth', output: 'copper' },
  { id: 'r123', inputA: 'copper', inputB: 'iron', output: 'bronze' },
  { id: 'r124', inputA: 'swamp', inputB: 'time', output: 'oil' },
  { id: 'r125', inputA: 'oil', inputB: 'tool', output: 'plastic' },
  { id: 'r126', inputA: 'clay', inputB: 'stone', output: 'concrete' },
  { id: 'r127', inputA: 'stone', inputB: 'magic', output: 'crystal' },

  // EXPANDED WEATHER
  { id: 'r128', inputA: 'air', inputB: 'energy', output: 'wind' },
  { id: 'r129', inputA: 'storm', inputB: 'ocean', output: 'hurricane' },
  { id: 'r130', inputA: 'rain', inputB: 'sunlight', output: 'rainbow' },
  { id: 'r131', inputA: 'air', inputB: 'time', output: 'climate' },
  { id: 'r132', inputA: 'hurricane', inputB: 'cold', output: 'blizzard' },

  // EXPANDED LIFE
  { id: 'r133', inputA: 'grass', inputB: 'life', output: 'insect' },
  { id: 'r134', inputA: 'animal', inputB: 'rain', output: 'reptile' },
  { id: 'r135', inputA: 'animal', inputB: 'animal', output: 'mammal' },
  { id: 'r136', inputA: 'fish', inputB: 'ocean', output: 'whale' },
  { id: 'r137', inputA: 'reptile', inputB: 'time', output: 'dinosaur' },
  { id: 'r138', inputA: 'life', inputB: 'time', output: 'evolution' },

  // EXPANDED CIVILIZATION
  { id: 'r139', inputA: 'human', inputB: 'water', output: 'boat' },
  { id: 'r140', inputA: 'boat', inputB: 'stone', output: 'bridge' },
  { id: 'r141', inputA: 'village', inputB: 'stone', output: 'castle' },
  { id: 'r142', inputA: 'castle', inputB: 'city', output: 'kingdom' },
  { id: 'r143', inputA: 'village', inputB: 'road', output: 'market' },
  { id: 'r144', inputA: 'knowledge', inputB: 'city', output: 'library' },

  // EXPANDED TECHNOLOGY
  { id: 'r145', inputA: 'human', inputB: 'plant', output: 'medicine' },
  { id: 'r146', inputA: 'medicine', inputB: 'life', output: 'vaccine' },
  { id: 'r147', inputA: 'energy', inputB: 'metal', output: 'battery' },
  { id: 'r148', inputA: 'battery', inputB: 'sunlight', output: 'solar_panel' },
  { id: 'r149', inputA: 'engine', inputB: 'air', output: 'airplane' },
  { id: 'r150', inputA: 'engine', inputB: 'fire', output: 'rocket' },
  { id: 'r151', inputA: 'rocket', inputB: 'computer', output: 'satellite' },
  { id: 'r152', inputA: 'computer', inputB: 'robot', output: 'ai' },

  // EXPANDED ABSTRACT + COSMIC
  { id: 'r153', inputA: 'order', inputB: 'chaos', output: 'balance' },
  { id: 'r154', inputA: 'stone', inputB: 'void', output: 'asteroid' },
  { id: 'r155', inputA: 'ice', inputB: 'void', output: 'comet' },
  { id: 'r156', inputA: 'star', inputB: 'dust', output: 'nebula' },
  { id: 'r157', inputA: 'earth', inputB: 'cosmos', output: 'planet' },
  { id: 'r158', inputA: 'planet', inputB: 'rocket', output: 'satellite' },

  // EXPANDED WEIRD
  { id: 'r159', inputA: 'pollution', inputB: 'time', output: 'climate_change' },
  { id: 'r160', inputA: 'plastic', inputB: 'ocean', output: 'microplastic' },
  { id: 'r161', inputA: 'microplastic', inputB: 'fish', output: 'pollution' },
  { id: 'r162', inputA: 'climate_change', inputB: 'ice', output: 'water' },
  { id: 'r163', inputA: 'climate_change', inputB: 'forest', output: 'drought' },

  // LOGIC PATCHES
  { id: 'r164', inputA: 'air', inputB: 'moon', output: 'atmosphere' },
  { id: 'r165', inputA: 'steam', inputB: 'fire', output: 'energy' },
  { id: 'r166', inputA: 'steam', inputB: 'water', output: 'cloud' },
  { id: 'r167', inputA: 'steam', inputB: 'earth', output: 'geyser' },
];

export const RECIPES: Recipe[] = [
  ...CORE_RECIPES,
  ...createGeneratedRecipes(),
];
