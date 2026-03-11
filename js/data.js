/**
 * 🦁 Word Safari - Game Data Module
 * Provides: ANIMALS, vocabularyClues, spellingWords, getAnimalsByAttribute,
 * getRandomAnimals, getRandomDailyQuestions
 * Ensures all named exports required by game.js exist.
 */

/* =======================================================
   UTIL
   ======================================================= */
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

/* =======================================================
   ANIMALS (42)  - minimal SVG placeholders (replace with detailed later)
   Each animal: id, name, biome, attributes[], size (small|medium|large),
   svg, facts
   ======================================================= */
const svgWrap = (body, color = '#FF8C42') =>
  `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
   <circle cx="50" cy="50" r="48" fill="${color}" opacity="0.08"/>
   ${body}
  </svg>`;

export const ANIMALS = [
  // Savanna
  {
    id: 'lion', name: 'Lion', biome: 'savanna', size: 'large', attributes: ['brave', 'strong', 'predator', 'mane', 'roar', 'fast'],
    svg: svgWrap(`<path d="M50 15a25 25 0 1 0 0 50 25 25 0 0 0 0-50z" fill="#b06d1a"/><circle cx="50" cy="40" r="18" fill="#d89c3d"/><circle cx="42" cy="38" r="3" fill="#333"/><circle cx="58" cy="38" r="3" fill="#333"/><path d="M50 45 Q45 50 50 55 Q55 50 50 45" fill="#333"/>`, '#d89c3d'),
    facts: { habitat: 'Savanna', diet: 'Carnivore', status: 'Vulnerable', description: 'Lions live in groups called prides and are powerful hunters.' }
  },
  {
    id: 'elephant', name: 'Elephant', biome: 'savanna', size: 'large', attributes: ['gray', 'big', 'trunk', 'herbivore', 'gentle', 'intelligent'],
    svg: svgWrap(`<ellipse cx="30" cy="40" rx="15" ry="25" fill="#999"/><ellipse cx="70" cy="40" rx="15" ry="25" fill="#999"/><ellipse cx="50" cy="45" rx="22" ry="20" fill="#b6b6b6"/><rect x="44" y="55" width="12" height="30" rx="6" fill="#b6b6b6"/><circle cx="42" cy="40" r="2" fill="#333"/><circle cx="58" cy="40" r="2" fill="#333"/>`, '#b6b6b6'),
    facts: { habitat: 'Savanna', diet: 'Herbivore', status: 'Endangered', description: 'Largest land mammal with a trunk used for grasping.' }
  },
  {
    id: 'giraffe', name: 'Giraffe', biome: 'savanna', size: 'large', attributes: ['tall', 'spotted', 'long-neck', 'herbivore', 'gentle'],
    svg: svgWrap(`<rect x="42" y="20" width="16" height="50" fill="#d9b36c" rx="8"/><circle cx="50" cy="20" r="14" fill="#d9b36c"/><circle cx="46" cy="18" r="2" fill="#333"/><circle cx="54" cy="18" r="2" fill="#333"/><circle cx="46" cy="35" r="4" fill="#a07a48"/><circle cx="54" cy="50" r="5" fill="#a07a48"/>`, '#d9b36c'),
    facts: { habitat: 'Savanna', diet: 'Herbivore', status: 'Vulnerable', description: 'Tallest animal, uses long neck to reach leaves.' }
  },
  {
    id: 'zebra', name: 'Zebra', biome: 'savanna', size: 'medium', attributes: ['striped', 'herd', 'fast', 'herbivore'],
    svg: svgWrap(`<rect x="30" y="40" width="40" height="25" fill="#fff" stroke="#000" stroke-width="4"/>`, '#ffffff'),
    facts: { habitat: 'Savanna', diet: 'Herbivore', status: 'Least Concern', description: 'Striped equid; stripes confuse predators.' }
  },
  {
    id: 'cheetah', name: 'Cheetah', biome: 'savanna', size: 'medium', attributes: ['fast', 'spotted', 'predator', 'slim'],
    svg: svgWrap(`<ellipse cx="50" cy="55" rx="30" ry="18" fill="#e3b04b"/>`, '#e3b04b'),
    facts: { habitat: 'Savanna', diet: 'Carnivore', status: 'Vulnerable', description: 'Fastest land animal; built for speed.' }
  },
  {
    id: 'rhino', name: 'Rhinoceros', biome: 'savanna', size: 'large', attributes: ['horn', 'gray', 'strong', 'thick-skin'],
    svg: svgWrap(`<ellipse cx="55" cy="55" rx="30" ry="20" fill="#8e8e8e"/><path d="M30 50l10-10v20z" fill="#8e8e8e"/>`, '#8e8e8e'),
    facts: { habitat: 'Savanna', diet: 'Herbivore', status: 'Endangered', description: 'Heavy herbivore with protective horn.' }
  },
  {
    id: 'warthog', name: 'Warthog', biome: 'savanna', size: 'small', attributes: ['tusks', 'fast', 'brown'],
    svg: svgWrap(`<ellipse cx="50" cy="55" rx="24" ry="16" fill="#8d5d3a"/>`, '#8d5d3a'),
    facts: { habitat: 'Savanna', diet: 'Omnivore', status: 'Least Concern', description: 'Wild pig with tusks and facial warts.' }
  },
  // Forest
  {
    id: 'bear', name: 'Bear', biome: 'forest', size: 'large', attributes: ['strong', 'brown', 'omnivore', 'thick-fur'],
    svg: svgWrap(`<circle cx="50" cy="55" r="28" fill="#5b3a21"/>`, '#5b3a21'),
    facts: { habitat: 'Forest', diet: 'Omnivore', status: 'Varies', description: 'Large omnivore with powerful build.' }
  },
  {
    id: 'wolf', name: 'Wolf', biome: 'forest', size: 'medium', attributes: ['gray', 'pack', 'howl', 'predator', 'fast'],
    svg: svgWrap(`<ellipse cx="50" cy="55" rx="26" ry="18" fill="#999"/>`, '#999'),
    facts: { habitat: 'Forest', diet: 'Carnivore', status: 'Least Concern', description: 'Social canid living in packs.' }
  },
  {
    id: 'deer', name: 'Deer', biome: 'forest', size: 'medium', attributes: ['antlers', 'fast', 'herbivore', 'brown'],
    svg: svgWrap(`<ellipse cx="50" cy="55" rx="24" ry="18" fill="#b88752"/>`, '#b88752'),
    facts: { habitat: 'Forest', diet: 'Herbivore', status: 'Least Concern', description: 'Graceful herbivore with antlers (males).' }
  },
  {
    id: 'owl', name: 'Owl', biome: 'forest', size: 'small', attributes: ['nocturnal', 'feathered', 'silent', 'eyes'],
    svg: svgWrap(`<circle cx="50" cy="50" r="20" fill="#c9a66b"/><circle cx="44" cy="48" r="5" fill="#fff"/><circle cx="56" cy="48" r="5" fill="#fff"/>`, '#c9a66b'),
    facts: { habitat: 'Forest', diet: 'Carnivore', status: 'Least Concern', description: 'Nocturnal bird with silent flight.' }
  },
  {
    id: 'fox', name: 'Fox', biome: 'forest', size: 'small', attributes: ['orange', 'clever', 'fast', 'tail'],
    svg: svgWrap(`<ellipse cx="50" cy="55" rx="22" ry="14" fill="#e07024"/>`, '#e07024'),
    facts: { habitat: 'Forest', diet: 'Omnivore', status: 'Least Concern', description: 'Adaptable canid known for clever behavior.' }
  },
  {
    id: 'squirrel', name: 'Squirrel', biome: 'forest', size: 'small', attributes: ['tail', 'agile', 'climb', 'rodent'],
    svg: svgWrap(`<ellipse cx="50" cy="55" rx="16" ry="12" fill="#aa6c35"/>`, '#aa6c35'),
    facts: { habitat: 'Forest', diet: 'Herbivore', status: 'Least Concern', description: 'Tree-dwelling rodent storing nuts.' }
  },
  {
    id: 'woodpecker', name: 'Woodpecker', biome: 'forest', size: 'small', attributes: ['beak', 'bird', 'tree', 'peck'],
    svg: svgWrap(`<rect x="46" y="40" width="8" height="30" fill="#222"/><circle cx="50" cy="40" r="8" fill="#d11"/>`, '#222'),
    facts: { habitat: 'Forest', diet: 'Insects', status: 'Least Concern', description: 'Bird that drills into wood with reinforced skull.' }
  },
  // River
  {
    id: 'hippo', name: 'Hippo', biome: 'river', size: 'large', attributes: ['water', 'heavy', 'gray', 'big-mouth'],
    svg: svgWrap(`<ellipse cx="50" cy="55" rx="30" ry="20" fill="#777"/>`, '#777'),
    facts: { habitat: 'River', diet: 'Herbivore', status: 'Vulnerable', description: 'Semi-aquatic giant spending days in water.' }
  },
  {
    id: 'croc', name: 'Crocodile', biome: 'river', size: 'large', attributes: ['green', 'predator', 'teeth', 'reptile', 'water'],
    svg: svgWrap(`<rect x="30" y="55" width="40" height="12" fill="#3d6f3d"/>`, '#3d6f3d'),
    facts: { habitat: 'River', diet: 'Carnivore', status: 'Least Concern', description: 'Armored reptile ambush predator.' }
  },
  {
    id: 'frog', name: 'Frog', biome: 'river', size: 'small', attributes: ['green', 'amphibian', 'jump', 'small'],
    svg: svgWrap(`<circle cx="45" cy="55" r="10" fill="#46a346"/><circle cx="55" cy="55" r="10" fill="#46a346"/>`, '#46a346'),
    facts: { habitat: 'River', diet: 'Insectivore', status: 'Varies', description: 'Amphibian with jumping legs.' }
  },
  {
    id: 'otter', name: 'Otter', biome: 'river', size: 'small', attributes: ['playful', 'swim', 'brown', 'mammal'],
    svg: svgWrap(`<ellipse cx="50" cy="55" rx="22" ry="14" fill="#6d4c2f"/>`, '#6d4c2f'),
    facts: { habitat: 'River', diet: 'Carnivore', status: 'Varies', description: 'Playful swimmer using tools sometimes.' }
  },
  {
    id: 'kingfisher', name: 'Kingfisher', biome: 'river', size: 'small', attributes: ['bird', 'beak', 'blue', 'fish'],
    svg: svgWrap(`<circle cx="50" cy="50" r="16" fill="#2d84d6"/>`, '#2d84d6'),
    facts: { habitat: 'River', diet: 'Fish', status: 'Least Concern', description: 'Dives into water to catch fish.' }
  },
  {
    id: 'python', name: 'Python', biome: 'river', size: 'medium', attributes: ['snake', 'reptile', 'constrictor', 'long'],
    svg: svgWrap(`<rect x="35" y="55" width="30" height="10" rx="5" fill="#8a7a37"/>`, '#8a7a37'),
    facts: { habitat: 'River', diet: 'Carnivore', status: 'Least Concern', description: 'Non-venomous constrictor snake.' }
  },
  {
    id: 'flamingo', name: 'Flamingo', biome: 'river', size: 'medium', attributes: ['pink', 'bird', 'legs', 'wading'],
    svg: svgWrap(`<rect x="48" y="40" width="4" height="30" fill="#f9a4c4"/><circle cx="50" cy="38" r="10" fill="#f9a4c4"/>`, '#f9a4c4'),
    facts: { habitat: 'Wetlands', diet: 'Filter feeder', status: 'Least Concern', description: 'Pink from carotenoid-rich diet.' }
  },
  // Arctic
  {
    id: 'polar_bear', name: 'Polar Bear', biome: 'arctic', size: 'large', attributes: ['white', 'strong', 'cold', 'predator', 'thick-fur'],
    svg: svgWrap(`<circle cx="50" cy="55" r="28" fill="#eee"/>`, '#eee'),
    facts: { habitat: 'Arctic', diet: 'Carnivore', status: 'Vulnerable', description: 'Largest bear adapted to ice hunting.' }
  },
  {
    id: 'penguin', name: 'Penguin', biome: 'arctic', size: 'small', attributes: ['black-white', 'bird', 'swim', 'waddle', 'cold'],
    svg: svgWrap(`<ellipse cx="50" cy="55" rx="16" ry="22" fill="#111"/><ellipse cx="50" cy="60" rx="10" ry="14" fill="#fff"/>`, '#111'),
    facts: { habitat: 'Polar seas', diet: 'Fish', status: 'Varies', description: 'Flightless swimmer using flippers.' }
  },
  {
    id: 'seal', name: 'Seal', biome: 'arctic', size: 'medium', attributes: ['swim', 'blubber', 'whiskers', 'cold'],
    svg: svgWrap(`<ellipse cx="50" cy="60" rx="26" ry="16" fill="#bbb"/>`, '#bbb'),
    facts: { habitat: 'Arctic', diet: 'Carnivore', status: 'Varies', description: 'Marine mammal resting on ice.' }
  },
  {
    id: 'walrus', name: 'Walrus', biome: 'arctic', size: 'large', attributes: ['tusks', 'blubber', 'whiskers', 'cold', 'social'],
    svg: svgWrap(`<ellipse cx="50" cy="60" rx="28" ry="18" fill="#c79678"/>`, '#c79678'),
    facts: { habitat: 'Arctic', diet: 'Mollusks', status: 'Vulnerable', description: 'Tusks for hauling out and dominance.' }
  },
  {
    id: 'arctic_fox', name: 'Arctic Fox', biome: 'arctic', size: 'small', attributes: ['white', 'fur', 'cold', 'clever'],
    svg: svgWrap(`<circle cx="50" cy="55" r="18" fill="#f5f5f5"/>`, '#f5f5f5'),
    facts: { habitat: 'Arctic tundra', diet: 'Omnivore', status: 'Least Concern', description: 'Seasonal coat changes color.' }
  },
  {
    id: 'orca', name: 'Orca', biome: 'arctic', size: 'large', attributes: ['black-white', 'marine', 'predator', 'intelligent'],
    svg: svgWrap(`<ellipse cx="50" cy="55" rx="30" ry="16" fill="#111"/><ellipse cx="60" cy="55" rx="10" ry="6" fill="#fff"/>`, '#111'),
    facts: { habitat: 'Oceans', diet: 'Carnivore', status: 'Data Sufficient', description: 'Apex social marine predator.' }
  },
  {
    id: 'narwhal', name: 'Narwhal', biome: 'arctic', size: 'medium', attributes: ['tusk', 'marine', 'gray', 'cold'],
    svg: svgWrap(`<ellipse cx="50" cy="55" rx="26" ry="12" fill="#9fa7ad"/><rect x="68" y="53" width="20" height="2" fill="#ddd"/>`, '#9fa7ad'),
    facts: { habitat: 'Arctic sea', diet: 'Fish', status: 'Near Threatened', description: 'Male grows a spiral tusk tooth.' }
  },
  // Desert
  {
    id: 'camel', name: 'Camel', biome: 'desert', size: 'large', attributes: ['hump', 'brown', 'endurance', 'dry'],
    svg: svgWrap(`<ellipse cx="50" cy="55" rx="28" ry="16" fill="#caa167"/>`, '#caa167'),
    facts: { habitat: 'Desert', diet: 'Herbivore', status: 'Domesticated', description: 'Stores fat in humps for energy.' }
  },
  {
    id: 'scorpion', name: 'Scorpion', biome: 'desert', size: 'small', attributes: ['stinger', 'arachnid', 'nocturnal', 'claws'],
    svg: svgWrap(`<rect x="45" y="50" width="10" height="20" fill="#553e2d"/>`, '#553e2d'),
    facts: { habitat: 'Desert', diet: 'Carnivore', status: 'Least Concern', description: 'Venomous tail stinger arthropod.' }
  },
  {
    id: 'fennec', name: 'Fennec Fox', biome: 'desert', size: 'small', attributes: ['ears', 'small', 'fast', 'nocturnal'],
    svg: svgWrap(`<circle cx="50" cy="55" r="16" fill="#e7c59a"/>`, '#e7c59a'),
    facts: { habitat: 'Desert', diet: 'Omnivore', status: 'Least Concern', description: 'Large ears radiate heat.' }
  },
  {
    id: 'meerkat', name: 'Meerkat', biome: 'desert', size: 'small', attributes: ['group', 'watch', 'brown', 'social'],
    svg: svgWrap(`<rect x="45" y="40" width="10" height="30" fill="#cfa772"/>`, '#cfa772'),
    facts: { habitat: 'Desert', diet: 'Omnivore', status: 'Least Concern', description: 'Sentries watch for danger.' }
  },
  {
    id: 'vulture', name: 'Vulture', biome: 'desert', size: 'medium', attributes: ['scavenger', 'wings', 'bird', 'bald'],
    svg: svgWrap(`<ellipse cx="50" cy="55" rx="26" ry="14" fill="#4a2e21"/>`, '#4a2e21'),
    facts: { habitat: 'Arid plains', diet: 'Carrion', status: 'Varies', description: 'Cleans ecosystem by scavenging.' }
  },
  {
    id: 'horned_lizard', name: 'Horned Lizard', biome: 'desert', size: 'small', attributes: ['reptile', 'camouflage', 'spikes', 'brown'],
    svg: svgWrap(`<circle cx="50" cy="55" r="14" fill="#9a7d58"/>`, '#9a7d58'),
    facts: { habitat: 'Desert', diet: 'Insects', status: 'Least Concern', description: 'Can squirt blood to deter predators.' }
  },
  {
    id: 'roadrunner', name: 'Roadrunner', biome: 'desert', size: 'small', attributes: ['fast', 'bird', 'legs', 'runner'],
    svg: svgWrap(`<ellipse cx="50" cy="55" rx="20" ry="12" fill="#66513a"/>`, '#66513a'),
    facts: { habitat: 'Desert', diet: 'Omnivore', status: 'Least Concern', description: 'Ground bird capable of bursts of speed.' }
  },
  // Ocean
  {
    id: 'dolphin', name: 'Dolphin', biome: 'ocean', size: 'medium', attributes: ['intelligent', 'swim', 'gray', 'fast', 'marine'],
    svg: svgWrap(`<ellipse cx="50" cy="55" rx="28" ry="12" fill="#7aa3c7"/>`, '#7aa3c7'),
    facts: { habitat: 'Oceans', diet: 'Fish', status: 'Varies', description: 'Social, uses echolocation.' }
  },
  {
    id: 'shark', name: 'Shark', biome: 'ocean', size: 'large', attributes: ['predator', 'teeth', 'marine', 'gray', 'sleek'],
    svg: svgWrap(`<ellipse cx="50" cy="55" rx="30" ry="14" fill="#5e7484"/>`, '#5e7484'),
    facts: { habitat: 'Ocean', diet: 'Carnivore', status: 'Varies', description: 'Apex fish with multiple tooth rows.' }
  },
  {
    id: 'octopus', name: 'Octopus', biome: 'ocean', size: 'medium', attributes: ['tentacles', 'intelligent', 'soft', 'camouflage', 'ink'],
    svg: svgWrap(`<circle cx="50" cy="50" r="18" fill="#b15474"/>`, '#b15474'),
    facts: { habitat: 'Sea floor', diet: 'Carnivore', status: 'Least Concern', description: 'Eight arms and high problem solving ability.' }
  },
  {
    id: 'sea_turtle', name: 'Sea Turtle', biome: 'ocean', size: 'medium', attributes: ['shell', 'swim', 'green', 'ancient'],
    svg: svgWrap(`<ellipse cx="50" cy="55" rx="24" ry="16" fill="#3d7f52"/>`, '#3d7f52'),
    facts: { habitat: 'Tropical seas', diet: 'Omnivore', status: 'Endangered', description: 'Long-lived reptile with flippers.' }
  },
  {
    id: 'jellyfish', name: 'Jellyfish', biome: 'ocean', size: 'small', attributes: ['transparent', 'tentacles', 'drift', 'sting'],
    svg: svgWrap(`<circle cx="50" cy="48" r="14" fill="#d9a9f0" opacity=".7"/>`, '#d9a9f0'),
    facts: { habitat: 'Ocean', diet: 'Carnivore', status: 'Least Concern', description: 'Gelatinous drifter with stinging cells.' }
  },
  {
    id: 'clownfish', name: 'Clownfish', biome: 'ocean', size: 'small', attributes: ['orange', 'white', 'fish', 'reef', 'symbiosis'],
    svg: svgWrap(`<ellipse cx="50" cy="55" rx="16" ry="10" fill="#ff7e21"/><rect x="46" y="46" width="8" height="18" fill="#fff" opacity=".6"/>`, '#ff7e21'),
    facts: { habitat: 'Coral reefs', diet: 'Omnivore', status: 'Least Concern', description: 'Lives among anemone tentacles.' }
  },
  {
    id: 'manta', name: 'Manta Ray', biome: 'ocean', size: 'large', attributes: ['wings', 'filter', 'glide', 'marine'],
    svg: svgWrap(`<ellipse cx="50" cy="55" rx="34" ry="14" fill="#2d4052"/>`, '#2d4052'),
    facts: { habitat: 'Open ocean', diet: 'Plankton', status: 'Vulnerable', description: 'Graceful filter-feeding ray.' }
  },
];

/* =======================================================
   VOCABULARY CLUES
   attribute: matches attributes[] on animals
   difficulty: easy | medium | hard
   ======================================================= */
export const vocabularyClues = [
  { attribute: 'tall', clue: 'very tall', difficulty: 'easy' },
  { attribute: 'fast', clue: 'very fast', difficulty: 'easy' },
  { attribute: 'strong', clue: 'very strong', difficulty: 'easy' },
  { attribute: 'spotted', clue: 'has spots', difficulty: 'easy' },
  { attribute: 'striped', clue: 'has stripes', difficulty: 'easy' },
  { attribute: 'mane', clue: 'has a mane', difficulty: 'medium' },
  { attribute: 'trunk', clue: 'has a trunk', difficulty: 'easy' },
  { attribute: 'horn', clue: 'has a horn', difficulty: 'medium' },
  { attribute: 'antlers', clue: 'grows antlers', difficulty: 'medium' },
  { attribute: 'nocturnal', clue: 'active at night (nocturnal)', difficulty: 'hard' },
  { attribute: 'camouflage', clue: 'blends in (camouflage)', difficulty: 'hard' },
  { attribute: 'predator', clue: 'a predator', difficulty: 'medium' },
  { attribute: 'herbivore', clue: 'a plant eater (herbivore)', difficulty: 'medium' },
  { attribute: 'omnivore', clue: 'eats plants and meat (omnivore)', difficulty: 'hard' },
  { attribute: 'marine', clue: 'lives in the sea', difficulty: 'easy' },
  { attribute: 'wings', clue: 'has wings', difficulty: 'medium' },
  { attribute: 'intelligent', clue: 'highly intelligent', difficulty: 'hard' },
  { attribute: 'tentacles', clue: 'has tentacles', difficulty: 'hard' },
  { attribute: 'hump', clue: 'has a hump', difficulty: 'hard' },
  { attribute: 'ears', clue: 'has large ears', difficulty: 'easy' },
  { attribute: 'water', clue: 'spends time in water', difficulty: 'medium' },
  { attribute: 'bird', clue: 'a feathered bird', difficulty: 'easy' },
  { attribute: 'reptile', clue: 'a scaly reptile', difficulty: 'medium' },
  { attribute: 'cold', clue: 'lives in freezing cold', difficulty: 'easy' },
  { attribute: 'clever', clue: 'very clever', difficulty: 'medium' }
];

/* =======================================================
   SPELLING WORDS
   ======================================================= */
export const spellingWords = {
  easy: [
    { word: 'lion', hint: 'King of the savanna' },
    { word: 'frog', hint: 'Green jumper' },
    { word: 'bear', hint: 'Large forest mammal' },
    { word: 'fish', hint: 'Lives in water' },
    { word: 'fox', hint: 'Clever orange animal' },
    { word: 'wolf', hint: 'Howls at the moon' },
    { word: 'seal', hint: 'Swims in cold water' }
  ],
  medium: [
    { word: 'giraffe', hint: 'Tallest land animal' },
    { word: 'penguin', hint: 'Flightless swimmer' },
    { word: 'octopus', hint: 'Eight-armed marine animal' },
    { word: 'dolphin', hint: 'Smart swimmer' },
    { word: 'cheetah', hint: 'Fastest land animal' },
    { word: 'monkey', hint: 'Swings in trees' },
    { word: 'walrus', hint: 'Has large tusks' }
  ],
  hard: [
    { word: 'rhinoceros', hint: 'Gray animal with a horn' },
    { word: 'hippopotamus', hint: 'Heavy river mammal' },
    { word: 'camouflage', hint: 'Blends with surroundings' },
    { word: 'arachnid', hint: 'Group including scorpions' },
    { word: 'carnivore', hint: 'Meat eater' },
    { word: 'nocturnal', hint: 'Awake at night' },
    { word: 'amphibian', hint: 'Lives in water and land' }
  ]
};

/* =======================================================
   DAILY QUESTIONS (SIMPLE)
   ======================================================= */
const DAILY_QUESTIONS = [
  { question: 'Synonym of speedy?', options: ['slow', 'quick', 'late', 'dull'], correct: 1 },
  { question: 'An animal with a trunk?', options: ['Elephant', 'Lion', 'Frog', 'Shark'], correct: 0 },
  { question: 'Animal that can camouflage?', options: ['Octopus', 'Penguin', 'Bear', 'Hippo'], correct: 0 },
  { question: 'What is a predator?', options: ['Plant eater', 'Animal that hunts others', 'Sleeps all day', 'Only eats seeds'], correct: 1 },
  { question: 'Which is marine?', options: ['Camel', 'Giraffe', 'Dolphin', 'Meerkat'], correct: 2 },
  { question: 'Nocturnal means?', options: ['Active at night', 'Eats meat', 'Very tall', 'Lives in water'], correct: 0 },
  { question: 'Which has antlers?', options: ['Deer', 'Lion', 'Zebra', 'Seal'], correct: 0 },
  { question: 'Which is a reptile?', options: ['Python', 'Otter', 'Penguin', 'Fox'], correct: 0 },
  { question: 'Stores fat in hump?', options: ['Camel', 'Wolf', 'Seal', 'Owl'], correct: 0 },
  { question: 'Filter feeder?', options: ['Manta Ray', 'Lion', 'Fox', 'Wolf'], correct: 0 },
  { question: 'Which animal has a mane?', options: ['Lion', 'Cheetah', 'Rhino', 'Hippo'], correct: 0 },
  { question: 'Antonym of brave?', options: ['fearful', 'strong', 'loud', 'fast'], correct: 0 },
  { question: 'What does herbivore mean?', options: ['Eats meat', 'Eats plants', 'Eats both', 'Doesn\'t eat'], correct: 1 },
  { question: 'Which is an amphibian?', options: ['Frog', 'Shark', 'Bear', 'Owl'], correct: 0 },
  { question: 'What is an arachnid?', options: ['Scorpion', 'Dolphin', 'Fox', 'Walrus'], correct: 0 }
];

/* =======================================================
   EXPORT HELPERS
   ======================================================= */
export function getAnimalsByAttribute(attribute) {
  if (!attribute) return [];
  return ANIMALS.filter(a => a.attributes.includes(attribute));
}

export function getRandomAnimals(count = 5, biome = null) {
  const pool = biome ? ANIMALS.filter(a => a.biome === biome) : ANIMALS;
  return shuffle(pool).slice(0, count);
}

export function getRandomDailyQuestions(n = 5) {
  return shuffle(DAILY_QUESTIONS).slice(0, n);
}

/* =======================================================
   SAFETY DEFAULT (prevent import errors)
   ======================================================= */
export default {
  ANIMALS,
  vocabularyClues,
  spellingWords,
  getAnimalsByAttribute,
  getRandomAnimals,
  getRandomDailyQuestions
};
