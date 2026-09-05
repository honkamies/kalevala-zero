// Cryptographic Magic Symbol Puzzle Pillar Entity with Realm-Specific Kalevala & Kanteletar Incantations
// Features Clue-Based Magic Symbol Cipher Shards (*Loitsumerkit*) dropped by marked Symbol-Carrier enemies

import { soundEngine } from '../engine/audio';
import { particleSystem } from '../engine/particles';

export interface MagicSymbolDefinition {
  glyph: string;
  name: string;
  finnishTitle: string;
  verseHint: string;
}

// Backwards compatibility alias
export type RuneDefinition = MagicSymbolDefinition;

export const KALEVALA_MAGIC_SYMBOLS_DATABASE: MagicSymbolDefinition[] = [
  { glyph: '⌘', name: 'Hannunvaakuna', finnishTitle: 'Hannunvaakuna (Protective Shield Sigil)', verseHint: '“Turvamerkki tuonelan teille, pahan vallan salpaaja, ikiaikainen käpäläristi!”' },
  { glyph: '⚡', name: 'Ukonvaaja', finnishTitle: 'Ukonvaaja (Thunderbolt of Ukko)', verseHint: '“Iske tulta ilman päältä, säihkyväinen sädekipinä, halki taivahan säröjen!”' },
  { glyph: '☼', name: 'Päivänkehrä', finnishTitle: 'Päivänkehrä (Sun Wheel of Päivätär)', verseHint: '“Päivätär kutoo kultaa taivahan kaarella, valaisee korpien salot ja synkät veet.”' },
  { glyph: '☽', name: 'Kuutar', finnishTitle: 'Kuutar (Silver Moon Maiden)', verseHint: '“Kuutar hopeata helkyttelee, kehrää säikeitä öiseen taivaankantehen.”' },
  { glyph: '★', name: 'Otava', finnishTitle: 'Otava (Great Bear Constellation)', verseHint: '“Otavaisen olkapäiltä, seitsentähden selkämyksiltä valo yöhön heijastuu.”' },
  { glyph: '᯽', name: 'Ohto', finnishTitle: 'Ohto (Sacred Bear of the Forest)', verseHint: '“Metsän ohto, mesikämmen, laskettu taivaalta kultaisessa kätkyessä!”' },
  { glyph: '✦', name: 'Sotka', finnishTitle: 'Sotka (The Cosmic Waterbird)', verseHint: '“Yksi muna rautainen, kuusi kultaista munaa… ruskiasta päivyt taivahalle!”' },
  { glyph: '⎈', name: 'Tursaansydän', finnishTitle: 'Tursaansydän (Heart of Tursas)', verseHint: '“Syvien vetten vartija, aallokon valtias, nelikärkinen turvamerkki!”' },
  { glyph: '⚒', name: 'Ilmarisen Alasin', finnishTitle: 'Ilmarinen (Master of the Forge)', verseHint: '“Ei syty paja tulitta, rauta ei taivu takomatta, kirjokansi kirkkahaksi!”' },
  { glyph: '۞', name: 'Kirjokansi', finnishTitle: 'Sampo (The Magic Mill of Plenty)', verseHint: '“Jauha Sampo jauhojasi, syötäviä, myötäviä, ikuisen onnen antajaksi!”' },
  { glyph: '𝄞', name: 'Väinämöisen Kantele', finnishTitle: 'Väinämöinen (Eternal Song & Kantele)', verseHint: '“Mieleni minun tekevi, lauloi hauen leuasta soiton, soitti puut ja kivet kyyneliin.”' },
  { glyph: '❄', name: 'Louhen Huurre', finnishTitle: 'Louhi (Mistress of North Frost)', verseHint: '“Portit vaskiset vavahti, lukot yhdeksän aukesi, kivimäen kätköistä!”' },
  { glyph: '≋', name: 'Tuonen Virta', finnishTitle: 'Tuoni (River of the Dead)', verseHint: '“Tuonen tytöt verkkoja kutoo, rautaisia rysänpohjia mustan virran uumeniin.”' },
  { glyph: '▲', name: 'Kipukivi', finnishTitle: 'Kipuvuori (Mountain of Affliction)', verseHint: '“Kivut kiven koloon, vaivat vuoren louhikkoon, rautakallion rakoihin!”' },
  { glyph: '⸙', name: 'Tapion Havu', finnishTitle: 'Tapio (King of the Pine Wilds)', verseHint: '“Metsän kultainen kuningas, havulinnan valtias, avaa aittasi hopeiset!”' },
  { glyph: '❦', name: 'Mielikin Sima', finnishTitle: 'Mielikki (Mother of the Forest)', verseHint: '“Mielikki metsän emäntä, simasuu salon emäntä, kullaista viittaa kannat.”' }
];

// Backwards compatibility export
export const KALEVALA_RUNES_DATABASE = KALEVALA_MAGIC_SYMBOLS_DATABASE;

export interface MagicSymbolCipherShard {
  id: string;
  positionIndex: number; // 0, 1, 2, 3 (Position I, II, III, IV)
  glyph: string;         // '⌘'
  name: string;          // 'Hannunvaakuna'
  finnishTitle: string;  // 'Hannunvaakuna (Protective Shield Sigil)'
  verseHint: string;     // Kalevala lore hint
  isCollected: boolean;  // whether acquired by the player
  carrierName?: string;  // Name of the enemy holding it
}

export type RuneCipherShard = MagicSymbolCipherShard;

export interface MagicSymbolPuzzleData {
  verseTitle: string;
  versePoem: string;
  solutionSequence: string[];
  gridGlyphs: string[];
  shards: MagicSymbolCipherShard[];
}

export type RunicPuzzleData = MagicSymbolPuzzleData;

export const REALM_MAGIC_VERSES: Record<string, { title: string; poem: string }> = {
  ilman_luominen: {
    title: 'Sotkan Munan Syntysanat (Genesis of the World)',
    poem: '“Yksi muna rautainen, kuusi kultaista munaa… Alainen puoli maaksi, yläinen puoli taivahaksi, ruskiasta päivyt taivahalle!”\nDecode the primordial creation frequencies to stabilize the cosmic egg.'
  },
  vainola: {
    title: 'Väinämöisen Laulun Mahti (Väinämöinen\'s Song of Power)',
    poem: '“Mieleni minun tekevi, aivoni ajattelevi, lähteäni laulamahan, saa\'ani sanelemahan… Lauloi Joukahaisen suohon, Hiiden nuolten tielle.”\nSynchronize the sacred incantations of the ancient grove.'
  },
  pohjola: {
    title: 'Pohjolan Yhdeksän Lukkoa (The Nine Locks of Pohjola)',
    poem: '“Portit vaskiset vavahti, lukot yhdeksän aukesi, kivimäen kätköistä, rautavuoren rintehestä.”\nDisengage Louhi\'s cryptographic cold vault lock.'
  },
  tuonela: {
    title: 'Tuonen Tyttären Rautasäännöt (Tuoni\'s Iron Net Protocol)',
    poem: '“Tuonen tytöt verkkoja kutoo, rautaisia rysänpohjia, jottei sielu pääsisi pois mustan virran pyörtehistä.”\nOverclock the sacred sigils to breach the coolant river.'
  },
  alinen: {
    title: 'Iku-Turson Syvyyden Loitsu (Incantation of the Abyssal Beast)',
    poem: '“Nousi Iku-Turso äijä, meren mustasta mudasta, parta vaahdossa vellova, syvyyksien syvimmistä uumenista.”\nCalibrate magma pressure charms to unseal the abyssal trench.'
  },
  ylinen: {
    title: 'Ilmarisen Kirjokannen Takominen (Forging the Bright Celestial Lid)',
    poem: '“Tule Ukko, ota säde, iske tulta ilman päältä! Taohan seppo Sampo uusi, kirjokansi kalkuttele!”\nAlign celestial forge coils to restore the supreme Sampo.'
  }
};

export const REALM_RUNIC_VERSES = REALM_MAGIC_VERSES;

export class MagicSymbolPuzzlePillar {
  public id: string;
  public x: number;
  public y: number;
  public verseTitle: string;
  public isSolved: boolean = false;
  public puzzleData: MagicSymbolPuzzleData;

  constructor(x: number, y: number, sectorId: string = 'ilman_luominen') {
    this.id = 'puzzle_' + Math.random().toString(36).substring(2, 8);
    this.x = x;
    this.y = y;

    const verseInfo = REALM_MAGIC_VERSES[sectorId] || REALM_MAGIC_VERSES['ilman_luominen'];
    this.verseTitle = verseInfo.title;

    // Pick 4 unique magic symbols from the database for the solution
    const shuffledSymbols = [...KALEVALA_MAGIC_SYMBOLS_DATABASE].sort(() => Math.random() - 0.5);
    const solutionSymbols = shuffledSymbols.slice(0, 4);

    const shards: MagicSymbolCipherShard[] = solutionSymbols.map((r, idx) => ({
      id: `shard_${idx}_` + Math.random().toString(36).substring(2, 6),
      positionIndex: idx,
      glyph: r.glyph,
      name: r.name,
      finnishTitle: r.finnishTitle,
      verseHint: r.verseHint,
      isCollected: false
    }));

    // Pick 12 total glyphs for the 2x6 decoding matrix (including the 4 solution symbols + 8 distractors)
    const distractorSymbols = shuffledSymbols.slice(4, 12);
    const matrixSymbols = [...solutionSymbols, ...distractorSymbols].sort(() => Math.random() - 0.5);

    this.puzzleData = {
      verseTitle: verseInfo.title,
      versePoem: verseInfo.poem,
      solutionSequence: solutionSymbols.map(r => r.glyph),
      gridGlyphs: matrixSymbols.map(r => r.glyph),
      shards: shards
    };
  }

  // Get total collected shards count (0-4)
  getCollectedShardsCount(): number {
    return this.puzzleData.shards.filter(s => s.isCollected).length;
  }

  // Check if all 4 shards are gathered
  isAllShardsCollected(): boolean {
    return this.puzzleData.shards.every(s => s.isCollected);
  }

  // Collect a shard by position index (0-3)
  collectShard(positionIndex: number): MagicSymbolCipherShard | undefined {
    const shard = this.puzzleData.shards.find(s => s.positionIndex === positionIndex);
    if (shard) {
      shard.isCollected = true;
    }
    return shard;
  }

  // Collect a shard by its glyph
  collectShardByGlyph(glyph: string): MagicSymbolCipherShard | undefined {
    const shard = this.puzzleData.shards.find(s => s.glyph === glyph);
    if (shard) {
      shard.isCollected = true;
    }
    return shard;
  }

  // Check if a specific glyph is known / collected
  isGlyphCollected(glyph: string): boolean {
    const shard = this.puzzleData.shards.find(s => s.glyph === glyph);
    return shard ? shard.isCollected : false;
  }

  solve(): boolean {
    if (this.isSolved) return false;
    this.isSolved = true;

    // Mark all shards collected on solve
    this.puzzleData.shards.forEach(s => s.isCollected = true);

    soundEngine.playLevelUp();
    particleSystem.emitShockwave(this.x, this.y, 4.5, '#f59e0b');
    particleSystem.emitShockwave(this.x, this.y, 6.0, '#38bdf8');
    for (let i = 0; i < 24; i++) {
      particleSystem.emitRunicGlyph(this.x, this.y, '#38bdf8');
      particleSystem.emitRunicGlyph(this.x, this.y, '#f59e0b');
    }

    return true;
  }
}

// Backwards compatibility export
export const RunicPuzzlePillar = MagicSymbolPuzzlePillar;
export type RunicPuzzlePillar = MagicSymbolPuzzlePillar;
