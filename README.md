# KALEVALA-ZERO: Cyber-Kalevala Isometric ARPG

> *"Centuries after the catastrophic meltdown and shattering of the Sampo—a mythic autonomous fusion-forge and matter synthesizer—the Northern wasteland lies fractured. Runic verses (*runolaulut*) are discovered to be corrupted low-level machine execution protocols, while mythical beasts roam as rogue biomechanical monstrosities."*

**Kalevala-Zero** is a dark isometric Action RPG / Dungeon Crawler combining Finnish mythic folklore (*Kalevala* & *Kanteletar*) with post-apocalyptic sci-fi wasteland aesthetics.

---

## 🌌 The Cosmological Saga Adventure Path

Players must ascend sequentially along the ancient Finnish World Axis (*Maailmanpuu / Pohjantähti*). Each cosmological realm is locked until the previous realm's guardian is conquered:

```
[1. ILMAN LUOMINEN] ➔ [2. VÄINÖLÄ] ➔ [3. POHJOLA] ➔ [4. TUONELA] ➔ [5. ALINEN] ➔ [6. YLISMAA / SAMPO FORGE]
```

1. **Stage 01 — Ilman Luominen (*Ilmattaren Aallot & Sotkan Muna*)**:
   - *Theme*: The primordial cosmic void before earth or sky took form.
   - *Boss*: **Sotka Cyber-Harbinger** (*Genesis Drone of the Golden Shells*).
   - *Verse*: *“Ei ollut maata, ei taivasta, ei merta eikä mannerta. Vain vesi vilisi aava, ilman impi ajelehti…”*

2. **Stage 02 — Väinölä Wastes (*Elävien Maa & Kalevalan Tantereet*)**:
   - *Theme*: The middle realm of mortals, glowing spruce forests around radio monoliths.
   - *Boss*: **Surma Cyber-Hound Alpha** (*Apex Flesh-Metal Stalker*).
   - *Verse*: *“Mieleni minun tekevi, aivoni ajattelevi, lähteäni laulamahan, saa'ani sanelemahan…”*

3. **Stage 03 — Pohjola Expanse (*Pimentola & Sariolan Kivimäki*)**:
   - *Theme*: Cryogenic frost fortresses shielding Louhi's Nine-Locked Copper Mountain.
   - *Boss*: **Louhi's Frost Guardian Unit 0-Zero** (*Matriarch War Drone*).
   - *Verse*: *“Pois on Pohjolan pimeys, kylmä kylän hallitseva, portit vaskiset vavahti, lukot yhdeksän aukesi…”*

4. **Stage 04 — Tuonela Sub-Levels (*Tuonen Musta Joki & Manala*)**:
   - *Theme*: The black coolant river where necrotic servitors drift in iron nets.
   - *Boss*: **Tuoni Death-Harvester & Tuonen Joutsen** (*Warden of the Coolant Abyss*).
   - *Verse*: *“Ei Tuonelta tulla vasta, Manalalta matkataan; Tuonen tytöt verkkoja kutoo, rautaisia rysänpohjia…”*

5. **Stage 05 — Alinen Abyss (*Syvyyksien Pohja & Iku-Turson Kita*)**:
   - *Theme*: Deep volcanic magma trenches and primordial sea bottom beneath creation.
   - *Boss*: **Iku-Turso Abyssal Construct** (*Leviathan of the Black Deep Trenches*).
   - *Verse*: *“Nousi Iku-Turso äijä, meren mustasta mudasta, parta vaahdossa vellova, syvyyksien valtias…”*

6. **Stage 06 — Ylinen Celestial Forge (*Ukon Taivas & Ilmarisen Kirjokansi*)**:
   - *Theme*: The high celestial stratosphere and rotating Sky-Forge at the North Star.
   - *Final Boss*: **The Restored Cosmic Sampo & Ilmarinen Construct** (*Supreme Forge of Abundance*).
   - *Verse*: *“Tule Ukko, ota säde, iske tulta ilman päältä! Taohan seppo Sampo uusi, kirjokansi kalkuttele!”*

---

## 🎮 Tactical Controls

| Action | Control |
| :--- | :--- |
| **Move / Navigate** | `W`, `A`, `S`, `D` or `Middle Mouse Button (Hold)` |
| **Aim & Attack** | `Mouse Pointer` + `Left Click` |
| **Active Dodge Roll** | `Spacebar` |
| **Ability 1 (Ukonvasara - Lightning Slam)** | `1` |
| **Ability 2 (Kipinä Dash - Plasma Jet)** | `2` |
| **Ability 3 (Tuoni Siphon - Shield Barrier)**| `3` |
| **Ability 4 (Sampo Overclock - Ultimate)** | `4` or `R` |
| **Nano-Repair Injector (Heal)** | `Q` or `5` |
| **Kalevala Saga Map** | `ESC` or `Saga Icon in HUD` |
| **Inventory & Gear Paperdoll** | `I` or `Tab` |
| **Character Sheet & Stat Allocator** | `C` |
| **Nanite Forge & Socketing** | `F` |
| **Mute / Unmute Audio** | `M` |

---

## 👤 Operative Profiles & Total Reset System

- **Multi-Profile Management**: Create and switch between multiple distinct operative vessels (`GameProfile`).
- **Fresh Zero-Stat Character Creation**: Synthesize brand-new characters with Level 1, 0 XP, base archetype attributes, empty backpacks, and independent realm progression.
- **Per-Operative Reset**: Reset any existing operative back to Level 1 and 0 stats while preserving callsign/phenotype.
- **Total Factory Reset**: One-click complete simulation purge that wipes all profiles and local data, rebooting Kalevala Zero to a pristine installation state.
- **Attribute Respec**: Instant refund of spent attribute points in the Character Sheet (`C`).

---

## 🚀 Running & Deployment

### Local Development Server
```bash
# 1. Start backend server
cd /root/sampo-zero/server
npm run build && npm start

# 2. Start client web app
cd /root/sampo-zero/client
npm run build
npm run preview
```
Accessible at `http://<your-ip>:5173`.

