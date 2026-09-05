# 🎨 KALEVALA-ZERO: Graphics & Custom Asset Creation Guide

This guide explains how to create, edit, replace, or customize any graphic, sprite, tile, or background in **Kalevala-Zero**.

---

## 📁 1. Asset Storage & Folder Structure

All game artwork is stored in:
```
/root/sampo-zero/client/public/assets/
```
Templates and design guides are located in:
```
/root/sampo-zero/templates/
  ├── template_isometric_tile.svg       (2:1 Isometric Floor & Obstacle Grid)
  ├── template_hero_sprite.svg          (512x512 Hero Character Canvas)
  ├── template_boss_sprite.svg          (1024x1024 Boss Entity Canvas)
  └── template_realm_carousel_16x9.svg  (1280x720 16:9 Realm Cover Art)
```

Any image placed in `client/public/assets/` is immediately available in-game via `/assets/[filename]`.

---

## ⚡ 2. Built-in Automatic Chroma-Key Transparency

**You do NOT need complex Photoshop alpha masking.**

The game engine has an automatic real-time chroma-key background extractor:
- If you save a sprite as a standard `.jpg` with a **pure black `#000000` background**, the engine automatically strips the black background and softly feathers the edges into 100% transparency.
- Standard `.png` files with transparent alpha are also fully supported.

---

## 📐 3. Asset Categories & Specifications

### A. Player Heroes (`hero_[class].jpg` or `.png`)
- **Dimensions**: `512 x 512` pixels.
- **Anchor Point**: Feet centered at `(x: 256, y: 410)`.
- **Naming Conventions**:
  - `hero_soturi.jpg` — Heavy cyber-warrior with warhammer / shield.
  - `hero_tietaja.jpg` — Mystic sage with rune staff and glowing shroud.
  - `hero_runoseppa.jpg` — Nanite smith with plasma forge-hammer.
  - `hero_korvenraivaaja.jpg` — Wasteland hunter with rifle / bow.

### B. Boss Monsters (`boss_[name].jpg` or `.png`)
- **Dimensions**: `1024 x 1024` pixels (or `512 x 512`).
- **Anchor Point**: Ground contact shadow centered at `(x: 512, y: 840)`.
- **Naming Conventions**:
  - `boss_sotka.jpg` — Stage 1: Sotka Cyber-Harbinger / Golden Eggshell.
  - `boss_surma.jpg` — Stage 2: Surma Cyber-Hound Alpha.
  - `boss_louhi.jpg` — Stage 3: Louhi Matriarch of Frost.
  - `boss_tuoni.jpg` — Stage 4: Tuoni Death-Harvester & Swan.
  - `boss_ikuturso.jpg` — Stage 5: Iku-Turso Abyssal Construct.
  - `boss_ukko.jpg` — Stage 6: Ukko / Restored Cosmic Sampo.

### C. Standard Enemies (`enemy_[type].jpg` or `.png`)
- **Dimensions**: `512 x 512` pixels.
- **Naming Conventions**:
  - `enemy_marauder.jpg` — Melee infantry / raider.
  - `enemy_hound.jpg` — Quadruped stalker / wolf.
  - `enemy_wisp.jpg` — Flying drone / wisp / turret.

### D. Realm Carousel & Cover Art (`carousel_[realm].jpg` or `.png`)
- **Dimensions**: `1280 x 720` or `1920 x 1080` (16:9 Widescreen).
- **Naming Conventions**:
  - `carousel_ilman_luominen.jpg` — Stage 1 (Genesis Void / Sky)
  - `carousel_vainola.jpg` — Stage 2 (Living Forest / Spruce)
  - `carousel_pohjola.jpg` — Stage 3 (Frozen North / Ice Fortress)
  - `carousel_tuonela.jpg` — Stage 4 (Underworld / Black River & Swan)
  - `carousel_alinen.jpg` — Stage 5 (Volcanic Trench / Sea Bottom)
  - `carousel_ylinen.jpg` — Stage 6 (Celestial Forge / North Star)

### E. Tactical & UI Thumbnails (`thumb_[category]_[name].jpg` or `.png`)
- **Dimensions**: `128 x 128` pixels for heroes/bosses/enemies (`360 x 240` for biome previews).
- **Naming Conventions**:
  - `thumb_boss_[name].jpg` (e.g., `thumb_boss_louhi.jpg`, `thumb_boss_sotka.jpg`) — Used in Realm Carousel tactical briefing cards.
  - `thumb_hero_[class].jpg` (e.g., `thumb_hero_soturi.jpg`, `thumb_hero_runoseppa.jpg`) — Used in equipment paperdoll & inventory previews.
  - `thumb_enemy_[type].jpg` — Used in lore and hostile codex panels.
  - `thumb_biome_[realm].jpg` — Used in sector map selection.
- **Optimization**: Keeps file sizes ultra-light (~3-6 KB) for instant web load times.

---

## 🎨 4. AI Prompt Formula (Akseli Gallen-Kallela Cyber-Mythology)

To generate matching artwork using AI tools (Midjourney, DALL-E 3, Stable Diffusion, or Imagen), use this prompt template:

### For Realm Landscapes:
```
Akseli Gallen-Kallela Finnish National Romanticism oil painting of [REALM SCENE DESCRIPTION], 
dramatic Nordic lighting, expressive tempera and oil brushstrokes, dark Scandinavian folklore, 
subtle cyberpunk rune wires and glowing circuits, cinematic masterpiece, high resolution, 16:9 aspect ratio.
```

### For Characters & Bosses:
```
Isometric 2.5D character portrait of [CHARACTER DESCRIPTION], Akseli Gallen-Kallela dark Finnish 
mythology oil painting style with cyberpunk augmentations, full body centered on solid pure black 
background, dramatic rim lighting, high contrast, 1:1 square aspect ratio.
```

---

## 🛠️ 5. How to Edit & Test Your Graphics

1. Open any of the `.svg` templates in `/root/sampo-zero/templates/` using **Figma**, **Inkscape**, **Photoshop**, or **GIMP**.
2. Draw or paste your custom artwork into the template guides.
3. Export your image as `.jpg` (with black background) or `.png` (transparent background).
4. Save the file into `/root/sampo-zero/client/public/assets/[filename]`.
5. Run `npm run optimize-assets` in `/root/sampo-zero/client/` to automatically generate optimized 128x128 thumbnails and compress any oversized art files.
6. Run `npm run build` in `/root/sampo-zero/client/` to compile the web bundle.
7. Refresh your browser at `http://<your-ip>:5173/` to see your new graphics live in game!
