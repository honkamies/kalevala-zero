// Server authoritative world generation & seed helpers
// Spans the 6 Cosmological Realms of the Kalevala Saga

export function generateSeed(sectorName: string, characterId: string): number {
  let hash = 0;
  const str = `${sectorName}:${characterId}:${Date.now()}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

export interface SectorConfig {
  order: number;
  name: string;
  displayName: string;
  finnishTitle: string;
  theme: string;
  hazard: string;
  recommendedLevel: number;
  bossName: string;
  bossTitle: string;
  ambientColor: string;
}

export const SECTOR_CONFIGS: Record<string, SectorConfig> = {
  ilman_luominen: {
    order: 1,
    name: 'ilman_luominen',
    displayName: 'Ilman Luominen',
    finnishTitle: 'Ilmattaren Aallot & Sotkan Muna',
    theme: 'Primordial Cosmic Void & The Shattered Goldeneye Egg',
    hazard: 'Quantum Vacuum Turbulence & Proto-Plasma Vortices',
    recommendedLevel: 1,
    bossName: 'Sotka Cyber-Harbinger',
    bossTitle: 'Genesis Drone of the Golden Shells',
    ambientColor: '#60a5fa'
  },
  vainola: {
    order: 2,
    name: 'vainola',
    displayName: 'Väinölä Wastes',
    finnishTitle: 'Elävien Maa & Kalevalan Tantereet',
    theme: 'Twisted Neon Boreal Forest & Radio Monoliths',
    hazard: 'Hallucinogenic Spores & Cyber-Predators',
    recommendedLevel: 3,
    bossName: 'Surma Cyber-Hound Alpha',
    bossTitle: 'Apex Flesh-Metal Stalker of the Sacred Grove',
    ambientColor: '#10b981'
  },
  pohjola: {
    order: 3,
    name: 'pohjola',
    displayName: 'Pohjola Expanse',
    finnishTitle: 'Pimentola & Sariolan Kivimäki',
    theme: 'Cryogenic Brutalist Megaliths & The Nine-Locked Vault',
    hazard: 'Cryogenic Storms & Sensory Blizzards',
    recommendedLevel: 6,
    bossName: "Louhi's Frost Guardian Unit 0-Zero",
    bossTitle: 'Matriarch War Drone of the Copper Mountain',
    ambientColor: '#38bdf8'
  },
  tuonela: {
    order: 4,
    name: 'tuonela',
    displayName: 'Tuonela Sub-Levels',
    finnishTitle: 'Tuonen Musta Joki & Manala',
    theme: 'Radiated Coolant River & Spectral Graves',
    hazard: 'Radiation Decay & Void Coolant Pulses',
    recommendedLevel: 9,
    bossName: 'Tuoni Death-Harvester & Tuonen Joutsen',
    bossTitle: 'Warden of the Black Coolant Abyss',
    ambientColor: '#c084fc'
  },
  alinen: {
    order: 5,
    name: 'alinen',
    displayName: 'Alinen Abyss',
    finnishTitle: 'Syvyyksien Pohja & Iku-Turson Kita',
    theme: 'Geothermal Magma Trenches & Primordial Deep Ocean',
    hazard: 'Thermal Magma Overload & Volcanic Slag Vents',
    recommendedLevel: 12,
    bossName: 'Iku-Turso Abyssal Construct',
    bossTitle: 'Primordial Leviathan of the Deep Trenches',
    ambientColor: '#ef4444'
  },
  ylinen: {
    order: 6,
    name: 'ylinen',
    displayName: 'Ylinen Celestial Forge',
    finnishTitle: 'Ukon Taivas & Ilmarisen Kirjokansi',
    theme: 'Celestial Stratosphere & The Restored Cosmic Sampo',
    hazard: 'High-Voltage Celestial Arc Storms & Gravity Shifts',
    recommendedLevel: 15,
    bossName: 'The Restored Cosmic Sampo & Ilmarinen Construct',
    bossTitle: 'Supreme Autonomous Forge of Universal Abundance',
    ambientColor: '#fbbf24'
  }
};
