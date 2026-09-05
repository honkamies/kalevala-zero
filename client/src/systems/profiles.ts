// Profile Management & Persistent Storage System for Sampo-Zero
// Supports multiple character save slots, fresh zero-stat profile creation, per-profile reset, and total game wipe

import { CharacterAppearance, Player, PlayerStats } from '../entities/player';
import { Item, ItemSlot, getStarterWeaponForArchetype, isBaseWeaponMatchingArchetype } from './items';

export interface ProfilePlayerData {
  id: string;
  name: string;
  appearance: CharacterAppearance;
  stats: PlayerStats;
  level: number;
  xp: number;
  naniteScrap: number;
  inventory: Item[];
  equipment: Partial<Record<ItemSlot, Item>>;
  baseWeapon?: Item;
}

export interface GameProfile {
  id: string;
  name: string;
  archetype: 'soturi' | 'runoseppä' | 'tietäjä' | 'korvenraivaaja';
  createdAt: number;
  lastPlayed: number;
  playerData: ProfilePlayerData;
  clearedSectors: string[];
  sectorClears: Record<string, number>;
}

export const PROFILES_STORAGE_KEY = 'sampo_profiles_v1';
export const ACTIVE_PROFILE_KEY = 'sampo_active_profile_id';
export const LEGACY_PLAYER_KEY = 'sampo_player';
export const LEGACY_CLEARED_KEY = 'sampo_cleared_sectors';
export const LEGACY_SECTOR_CLEARS_KEY = 'sampo_sector_clears';

export function getDefaultStatsForArchetype(archetype: string): PlayerStats {
  switch (archetype) {
    case 'soturi':
      return { sisu: 16, nokkela: 7, vaki: 8, tieto: 9, statPoints: 0 };
    case 'korvenraivaaja':
      return { sisu: 7, nokkela: 16, vaki: 9, tieto: 8, statPoints: 0 };
    case 'tietäjä':
      return { sisu: 8, nokkela: 8, vaki: 16, tieto: 13, statPoints: 0 };
    case 'runoseppä':
    default:
      return { sisu: 11, nokkela: 8, vaki: 12, tieto: 15, statPoints: 0 };
  }
}

export function createDefaultPlayerData(id: string, name: string, appearance: CharacterAppearance): ProfilePlayerData {
  const starterWeapon = getStarterWeaponForArchetype(appearance.archetype);
  return {
    id,
    name,
    appearance: { ...appearance },
    stats: getDefaultStatsForArchetype(appearance.archetype),
    level: 1,
    xp: 0,
    naniteScrap: 150,
    inventory: [],
    equipment: {},
    baseWeapon: starterWeapon
  };
}

export function playerFromProfileData(data: ProfilePlayerData): Player {
  const arch = data.appearance?.archetype || 'soturi';
  const starterWeapon = getStarterWeaponForArchetype(arch);

  let baseWpn = data.baseWeapon;
  if (!baseWpn || !isBaseWeaponMatchingArchetype(baseWpn, arch)) {
    const prevUpgrade = baseWpn?.upgradeLevel || 0;
    baseWpn = { ...starterWeapon };
    if (prevUpgrade > 0) {
      baseWpn.upgradeLevel = prevUpgrade;
    }
    data.baseWeapon = baseWpn;
  }

  // Equipment slots are for mix & match extra weapons. Clean up legacy starter weapon from mainHand.
  const equipment = data.equipment ? { ...data.equipment } : {};
  if (equipment.mainHand) {
    const m = equipment.mainHand;
    if (m.id === 'starter_blade' || m.id?.startsWith('starter_') || m.name === baseWpn.name || m.id === baseWpn.id) {
      delete equipment.mainHand;
      data.equipment = equipment;
    }
  }

  const p = new Player(data.id, data.name, data.appearance, data.stats, data.inventory, equipment, baseWpn);
  p.level = data.level || 1;
  p.xp = data.xp || 0;
  p.naniteScrap = data.naniteScrap !== undefined ? data.naniteScrap : 150;
  p.recalculateDerivedStats();
  p.health = p.maxHealth;
  p.shield = p.maxShield;
  return p;
}

export function profileDataFromPlayer(player: Player): ProfilePlayerData {
  return {
    id: player.id,
    name: player.name,
    appearance: { ...player.appearance },
    stats: { ...player.stats },
    level: player.level,
    xp: player.xp,
    naniteScrap: player.naniteScrap,
    inventory: player.inventory ? JSON.parse(JSON.stringify(player.inventory)) : [],
    equipment: player.equipment ? JSON.parse(JSON.stringify(player.equipment)) : {},
    baseWeapon: player.baseWeapon ? JSON.parse(JSON.stringify(player.baseWeapon)) : undefined
  };
}

export class ProfileManager {
  private profiles: GameProfile[] = [];
  private activeProfileId: string | null = null;

  constructor() {
    this.loadFromStorage();
  }

  // Load or migrate existing profiles from localStorage
  loadFromStorage(): void {
    this.migrateLegacyDataIfNeeded();

    const storedProfiles = localStorage.getItem(PROFILES_STORAGE_KEY);
    if (storedProfiles) {
      try {
        this.profiles = JSON.parse(storedProfiles);
      } catch (e) {
        console.warn('Failed to parse profiles from localStorage:', e);
        this.profiles = [];
      }
    } else {
      this.profiles = [];
    }

    const storedActiveId = localStorage.getItem(ACTIVE_PROFILE_KEY);
    if (storedActiveId && this.profiles.some(p => p.id === storedActiveId)) {
      this.activeProfileId = storedActiveId;
    } else if (this.profiles.length > 0) {
      this.activeProfileId = this.profiles[0].id;
      localStorage.setItem(ACTIVE_PROFILE_KEY, this.activeProfileId);
    } else {
      this.activeProfileId = null;
    }

    // Sanitize and validate every loaded profile to ensure signature base weapons are equipped
    this.profiles.forEach(prof => {
      const arch = prof.archetype || prof.playerData?.appearance?.archetype || 'soturi';
      prof.archetype = arch;
      if (prof.playerData) {
        if (!prof.playerData.appearance) {
          prof.playerData.appearance = {
            phenotype: 'cyber_runic',
            hairStyle: 'cyber_braids',
            hairColor: '#38bdf8',
            skinTone: '#94a3b8',
            warPaint: 'ukko_spark',
            implant: 'neural_loom',
            archetype: arch
          };
        } else {
          prof.playerData.appearance.archetype = arch;
        }

        if (!prof.playerData.baseWeapon || !isBaseWeaponMatchingArchetype(prof.playerData.baseWeapon, arch)) {
          const prevUpgrade = prof.playerData.baseWeapon?.upgradeLevel || 0;
          const starterWpn = getStarterWeaponForArchetype(arch);
          if (prevUpgrade > 0) {
            starterWpn.upgradeLevel = prevUpgrade;
          }
          prof.playerData.baseWeapon = starterWpn;
        }

        if (prof.playerData.equipment?.mainHand) {
          const m = prof.playerData.equipment.mainHand;
          if (m.id === 'starter_blade' || m.id?.startsWith('starter_') || m.name === prof.playerData.baseWeapon.name || m.id === prof.playerData.baseWeapon.id) {
            delete prof.playerData.equipment.mainHand;
          }
        }
      }
    });
    this.saveToStorage();
  }

  // Auto-migrate old single-slot save data to the new multi-profile system
  private migrateLegacyDataIfNeeded(): void {
    const hasNewProfiles = localStorage.getItem(PROFILES_STORAGE_KEY);
    if (hasNewProfiles) return;

    const legacyPlayerStr = localStorage.getItem(LEGACY_PLAYER_KEY);
    if (!legacyPlayerStr) return;

    try {
      const legacyPlayer = JSON.parse(legacyPlayerStr);
      const legacyClearedStr = localStorage.getItem(LEGACY_CLEARED_KEY);
      const legacySectorClearsStr = localStorage.getItem(LEGACY_SECTOR_CLEARS_KEY);

      const clearedSectors: string[] = legacyClearedStr ? JSON.parse(legacyClearedStr) : [];
      const sectorClears: Record<string, number> = legacySectorClearsStr ? JSON.parse(legacySectorClearsStr) : {};

      const archetype = legacyPlayer.appearance?.archetype || 'soturi';
      const profileId = 'prof_' + (legacyPlayer.id || 'legacy_' + Date.now().toString(36));

      const legacyProfile: GameProfile = {
        id: profileId,
        name: legacyPlayer.name || 'Wanderer-Zero',
        archetype,
        createdAt: Date.now() - 86400000,
        lastPlayed: Date.now(),
        playerData: {
          id: legacyPlayer.id || ('chr_' + Math.random().toString(36).substring(2, 9)),
          name: legacyPlayer.name || 'Wanderer-Zero',
          appearance: legacyPlayer.appearance || {
            phenotype: 'cyber_runic',
            hairStyle: 'cyber_braids',
            hairColor: '#38bdf8',
            skinTone: '#94a3b8',
            warPaint: 'ukko_spark',
            implant: 'neural_loom',
            archetype: 'soturi'
          },
          stats: legacyPlayer.stats || getDefaultStatsForArchetype(archetype),
          level: legacyPlayer.level || 1,
          xp: legacyPlayer.xp || 0,
          naniteScrap: legacyPlayer.naniteScrap !== undefined ? legacyPlayer.naniteScrap : 150,
          inventory: legacyPlayer.inventory || [],
          equipment: legacyPlayer.equipment || {}
        },
        clearedSectors,
        sectorClears
      };

      this.profiles = [legacyProfile];
      this.activeProfileId = profileId;
      this.saveToStorage();
      console.log('Successfully migrated legacy save data into profile:', profileId);
    } catch (e) {
      console.warn('Could not migrate legacy save data:', e);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(this.profiles));
      if (this.activeProfileId) {
        localStorage.setItem(ACTIVE_PROFILE_KEY, this.activeProfileId);
      } else {
        localStorage.removeItem(ACTIVE_PROFILE_KEY);
      }
    } catch (e) {
      console.error('Failed to save profiles to localStorage:', e);
    }
  }

  // Get list of all profiles
  getAllProfiles(): GameProfile[] {
    return [...this.profiles];
  }

  // Get currently active profile
  getActiveProfile(): GameProfile | null {
    if (!this.activeProfileId) return null;
    return this.profiles.find(p => p.id === this.activeProfileId) || null;
  }

  // Get profile by ID
  getProfileById(id: string): GameProfile | null {
    return this.profiles.find(p => p.id === id) || null;
  }

  // Set active profile
  setActiveProfileId(id: string): boolean {
    const target = this.profiles.find(p => p.id === id);
    if (!target) return false;
    this.activeProfileId = id;
    target.lastPlayed = Date.now();
    this.saveToStorage();
    return true;
  }

  // Create a brand-new profile with zero stats
  createProfile(name: string, appearance: CharacterAppearance): GameProfile {
    const charId = 'chr_' + Math.random().toString(36).substring(2, 9);
    const profileId = 'prof_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    
    const playerData = createDefaultPlayerData(charId, name.trim() || 'Wanderer-Zero', appearance);

    const newProfile: GameProfile = {
      id: profileId,
      name: name.trim() || 'Wanderer-Zero',
      archetype: appearance.archetype || 'soturi',
      createdAt: Date.now(),
      lastPlayed: Date.now(),
      playerData,
      clearedSectors: [],
      sectorClears: {}
    };

    this.profiles.unshift(newProfile);
    this.activeProfileId = profileId;
    this.saveToStorage();

    // Mirror to legacy keys for external compatibility
    this.mirrorActiveProfileToLegacy(newProfile);

    return newProfile;
  }

  // Save active player runtime state to active profile
  saveActiveProfileState(player: Player, clearedSectors: string[], sectorClears: Record<string, number>): void {
    if (!this.activeProfileId) {
      // If no active profile, create one
      this.createProfile(player.name, player.appearance);
    }

    const activeProf = this.profiles.find(p => p.id === this.activeProfileId);
    if (!activeProf) return;

    activeProf.name = player.name;
    activeProf.archetype = player.appearance.archetype;
    activeProf.lastPlayed = Date.now();
    activeProf.playerData = profileDataFromPlayer(player);
    activeProf.clearedSectors = [...clearedSectors];
    activeProf.sectorClears = { ...sectorClears };

    this.saveToStorage();
    this.mirrorActiveProfileToLegacy(activeProf);
  }

  // Update existing profile's appearance/callsign; if archetype changes, sync base weapon & stats
  updateProfileAppearance(profileId: string, name: string, appearance: CharacterAppearance): GameProfile | null {
    const prof = this.profiles.find(p => p.id === profileId);
    if (!prof) return null;

    const oldArch = prof.archetype;
    prof.name = name.trim() || prof.name;
    prof.archetype = appearance.archetype;
    prof.playerData.name = prof.name;
    prof.playerData.appearance = { ...appearance };
    prof.lastPlayed = Date.now();

    // If archetype changed or base weapon is mismatched, update base weapon and base stats
    if (oldArch !== appearance.archetype || !prof.playerData.baseWeapon || !isBaseWeaponMatchingArchetype(prof.playerData.baseWeapon, appearance.archetype)) {
      prof.playerData.baseWeapon = getStarterWeaponForArchetype(appearance.archetype);
      prof.playerData.stats = getDefaultStatsForArchetype(appearance.archetype);
      if (prof.playerData.equipment?.mainHand) {
        const m = prof.playerData.equipment.mainHand;
        if (m.id === 'starter_blade' || m.id?.startsWith('starter_') || m.name === prof.playerData.baseWeapon.name || m.id === prof.playerData.baseWeapon.id) {
          delete prof.playerData.equipment.mainHand;
        }
      }
    }

    this.saveToStorage();
    if (this.activeProfileId === profileId) {
      this.mirrorActiveProfileToLegacy(prof);
    }
    return prof;
  }

  // Reset a specific profile back to ZERO stats and clean saga progression
  resetProfile(profileId: string): GameProfile | null {
    const prof = this.profiles.find(p => p.id === profileId);
    if (!prof) return null;

    const charId = 'chr_' + Math.random().toString(36).substring(2, 9);
    prof.playerData = createDefaultPlayerData(charId, prof.name, prof.playerData.appearance);
    prof.clearedSectors = [];
    prof.sectorClears = {};
    prof.lastPlayed = Date.now();

    this.saveToStorage();
    if (this.activeProfileId === profileId) {
      this.mirrorActiveProfileToLegacy(prof);
    }
    return prof;
  }

  // Delete a profile
  deleteProfile(profileId: string): boolean {
    const index = this.profiles.findIndex(p => p.id === profileId);
    if (index === -1) return false;

    this.profiles.splice(index, 1);

    if (this.activeProfileId === profileId) {
      this.activeProfileId = this.profiles.length > 0 ? this.profiles[0].id : null;
    }

    this.saveToStorage();

    const active = this.getActiveProfile();
    if (active) {
      this.mirrorActiveProfileToLegacy(active);
    } else {
      localStorage.removeItem(LEGACY_PLAYER_KEY);
      localStorage.removeItem(LEGACY_CLEARED_KEY);
      localStorage.removeItem(LEGACY_SECTOR_CLEARS_KEY);
    }

    return true;
  }

  // Total Factory Reset: Purge ALL game data, all profiles, and all progression
  totalFactoryReset(): void {
    this.profiles = [];
    this.activeProfileId = null;

    localStorage.removeItem(PROFILES_STORAGE_KEY);
    localStorage.removeItem(ACTIVE_PROFILE_KEY);
    localStorage.removeItem(LEGACY_PLAYER_KEY);
    localStorage.removeItem(LEGACY_CLEARED_KEY);
    localStorage.removeItem(LEGACY_SECTOR_CLEARS_KEY);
  }

  // Mirror to legacy localStorage keys for backwards compatibility
  private mirrorActiveProfileToLegacy(profile: GameProfile): void {
    try {
      localStorage.setItem(LEGACY_PLAYER_KEY, JSON.stringify(profile.playerData));
      localStorage.setItem(LEGACY_CLEARED_KEY, JSON.stringify(profile.clearedSectors));
      localStorage.setItem(LEGACY_SECTOR_CLEARS_KEY, JSON.stringify(profile.sectorClears));
    } catch (e) {}
  }
}

export const profileManager = new ProfileManager();
