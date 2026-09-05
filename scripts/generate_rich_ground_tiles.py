#!/usr/bin/env python3
"""
High-Fidelity Seamless Ground Tile & Hazard Generator for Sampo-Zero.
Generates 512x256 large, rich, multi-variant isometric terrain tiles with zero
flickering borders and rich organic folklore details.
"""

import os
import math
import random
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

OUTPUT_DIR = "/root/sampo-zero/client/public/assets"
BACKUP_DIR = "/root/sampo-zero/client/public/assets_original_backup"
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(BACKUP_DIR, exist_ok=True)

W, H = 512, 256
HALF_W, HALF_H = W / 2.0, H / 2.0

def create_diamond_mask(w=W, h=H):
    """Creates a smooth, anti-aliased isometric diamond mask."""
    mask = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(mask)
    pts = [
        (w / 2.0, 0),
        (w - 1, h / 2.0),
        (w / 2.0, h - 1),
        (0, h / 2.0)
    ]
    draw.polygon(pts, fill=255)
    return mask

def is_inside_diamond(x, y, w=W, h=H, margin=0):
    dx = abs(x - w / 2.0) / (w / 2.0)
    dy = abs(y - h / 2.0) / (h / 2.0)
    return (dx + dy) <= (1.0 - margin)

def draw_organic_noise(draw, base_color, noise_colors, count=400, max_size=16):
    for _ in range(count):
        px = random.randint(20, W - 20)
        py = random.randint(10, H - 10)
        if is_inside_diamond(px, py, margin=0.08):
            color = random.choice(noise_colors)
            sw = random.randint(4, max_size)
            sh = max(2, int(sw * 0.5))
            draw.ellipse([px - sw//2, py - sh//2, px + sw//2, py + sh//2], fill=color)

# ==============================================================================
# BIOME 1: VÄINÖLÄ (Lush Boreal Forest, Moss Carpets, Roots, Granite Bedrock)
# ==============================================================================

def generate_vainola_tiles():
    tiles = []
    base_bg = (14, 38, 22, 255)
    mask = create_diamond_mask()

    # --- Variant 0: Lush Dense Emerald Moss Carpet ---
    img0 = Image.new("RGBA", (W, H), base_bg)
    draw0 = ImageDraw.Draw(img0)
    # Moss texture patches
    moss_colors = [
        (22, 58, 34, 230), (32, 78, 44, 220), (18, 46, 28, 240),
        (45, 105, 58, 180), (10, 28, 16, 240), (75, 135, 65, 160)
    ]
    draw_organic_noise(draw0, base_bg, moss_colors, count=600, max_size=24)
    # Scattered pine needles
    for _ in range(180):
        px = random.randint(30, W - 30)
        py = random.randint(20, H - 20)
        if is_inside_diamond(px, py, margin=0.1):
            angle = random.uniform(0, math.pi)
            length = random.randint(8, 18)
            dx = math.cos(angle) * length
            dy = math.sin(angle) * length * 0.5
            col = random.choice([(140, 80, 25, 230), (180, 110, 35, 220), (100, 55, 18, 240)])
            draw0.line([(px, py), (px + dx, py + dy)], fill=col, width=2)
    img0.putalpha(mask)
    tiles.append(img0)

    # --- Variant 1: Ancient Granite Bedrock Slab with Moss Fissures ---
    img1 = Image.new("RGBA", (W, H), base_bg)
    draw1 = ImageDraw.Draw(img1)
    draw_organic_noise(draw1, base_bg, moss_colors, count=300, max_size=18)
    # Granite bedrock slab
    rock_color = (48, 56, 52, 240)
    rock_highlight = (72, 84, 78, 220)
    rock_shadow = (28, 32, 30, 250)
    bx, by = W // 2, H // 2
    pts = [
        (bx - 120, by - 20), (bx - 40, by - 60), (bx + 80, by - 40),
        (bx + 130, by + 10), (bx + 50, by + 55), (bx - 70, by + 40)
    ]
    draw1.polygon(pts, fill=rock_color)
    draw1.line(pts + [pts[0]], fill=rock_highlight, width=3)
    # Crack through rock with moss
    draw1.line([(bx - 80, by - 10), (bx - 20, by + 15), (bx + 60, by)], fill=rock_shadow, width=3)
    draw1.line([(bx - 20, by + 15), (bx + 20, by + 45)], fill=(20, 50, 28, 255), width=4)
    img1.putalpha(mask)
    tiles.append(img1)

    # --- Variant 2: Twisted Ancient Tree Root Network ---
    img2 = Image.new("RGBA", (W, H), base_bg)
    draw2 = ImageDraw.Draw(img2)
    draw_organic_noise(draw2, base_bg, moss_colors, count=450, max_size=20)
    # Gnarled roots
    root_color = (95, 52, 24, 255)
    root_dark = (55, 28, 12, 255)
    root_light = (130, 75, 35, 255)
    
    def draw_root_segment(p1, p2, width):
        draw2.line([p1, p2], fill=root_dark, width=width + 2)
        draw2.line([p1, p2], fill=root_color, width=width)
        draw2.line([(p1[0], p1[1] - 1), (p2[0], p2[1] - 1)], fill=root_light, width=max(1, width // 2))

    draw_root_segment((W//2 - 140, H//2 - 30), (W//2 - 40, H//2), 8)
    draw_root_segment((W//2 - 40, H//2), (W//2 + 60, H//2 - 20), 7)
    draw_root_segment((W//2 + 60, H//2 - 20), (W//2 + 150, H//2 + 10), 5)
    draw_root_segment((W//2 - 40, H//2), (W//2 - 10, H//2 + 45), 5)
    draw_root_segment((W//2 + 60, H//2 - 20), (W//2 + 90, H//2 - 50), 4)
    img2.putalpha(mask)
    tiles.append(img2)

    # --- Variant 3: Bioluminescent Spores & Clover Clusters ---
    img3 = Image.new("RGBA", (W, H), base_bg)
    draw3 = ImageDraw.Draw(img3)
    draw_organic_noise(draw3, base_bg, moss_colors, count=500, max_size=22)
    # Bioluminescent neon spores
    for _ in range(35):
        px = random.randint(40, W - 40)
        py = random.randint(25, H - 25)
        if is_inside_diamond(px, py, margin=0.15):
            glow_col = random.choice([(34, 197, 94, 180), (52, 211, 153, 200), (167, 243, 208, 240)])
            draw3.ellipse([px - 5, py - 3, px + 5, py + 3], fill=glow_col)
            draw3.ellipse([px - 2, py - 1, px + 2, py + 1], fill=(255, 255, 255, 255))
    img3.putalpha(mask)
    tiles.append(img3)

    return tiles

# ==============================================================================
# BIOME 2: POHJOLA (Glacial Permafrost, Frost Fissures, Blue Rime Ice)
# ==============================================================================

def generate_pohjola_tiles():
    tiles = []
    base_bg = (16, 26, 42, 255)
    mask = create_diamond_mask()
    frost_noise = [
        (24, 40, 64, 230), (32, 54, 86, 220), (14, 22, 36, 240),
        (56, 92, 138, 180), (84, 138, 196, 150), (12, 18, 30, 255)
    ]

    # --- Variant 0: Solid Permafrost Slate & Ice Crystals ---
    img0 = Image.new("RGBA", (W, H), base_bg)
    draw0 = ImageDraw.Draw(img0)
    draw_organic_noise(draw0, base_bg, frost_noise, count=550, max_size=24)
    # Ice crystals
    for _ in range(80):
        px = random.randint(40, W - 40)
        py = random.randint(20, H - 20)
        if is_inside_diamond(px, py, margin=0.1):
            draw0.line([(px - 6, py), (px + 6, py)], fill=(200, 235, 255, 220), width=1)
            draw0.line([(px, py - 3), (px, py + 3)], fill=(200, 235, 255, 220), width=1)
            draw0.ellipse([px - 2, py - 1, px + 2, py + 1], fill=(255, 255, 255, 255))
    img0.putalpha(mask)
    tiles.append(img0)

    # --- Variant 1: Sub-Surface Glowing Cyan Glacial Fissure ---
    img1 = Image.new("RGBA", (W, H), base_bg)
    draw1 = ImageDraw.Draw(img1)
    draw_organic_noise(draw1, base_bg, frost_noise, count=400, max_size=20)
    # Cyan ice fissure
    fissure_pts = [
        (W//2 - 130, H//2 - 25), (W//2 - 60, H//2 - 5), (W//2, H//2 - 20),
        (W//2 + 70, H//2 + 15), (W//2 + 140, H//2 - 10)
    ]
    for i in range(len(fissure_pts) - 1):
        p1, p2 = fissure_pts[i], fissure_pts[i+1]
        draw1.line([p1, p2], fill=(2, 132, 199, 160), width=12)
        draw1.line([p1, p2], fill=(56, 189, 248, 220), width=6)
        draw1.line([p1, p2], fill=(224, 242, 254, 255), width=2)
    img1.putalpha(mask)
    tiles.append(img1)

    # --- Variant 2: Windblown Arctic Rime Frost Drifts ---
    img2 = Image.new("RGBA", (W, H), base_bg)
    draw2 = ImageDraw.Draw(img2)
    draw_organic_noise(draw2, base_bg, frost_noise, count=450, max_size=20)
    for _ in range(50):
        px = random.randint(40, W - 40)
        py = random.randint(20, H - 20)
        if is_inside_diamond(px, py, margin=0.12):
            sw = random.randint(20, 50)
            draw2.ellipse([px - sw//2, py - 4, px + sw//2, py + 4], fill=(186, 230, 253, 130))
            draw2.ellipse([px - sw//4, py - 2, px + sw//4, py + 2], fill=(240, 249, 255, 180))
    img2.putalpha(mask)
    tiles.append(img2)

    # --- Variant 3: Ancient North Frost Runes ---
    img3 = Image.new("RGBA", (W, H), base_bg)
    draw3 = ImageDraw.Draw(img3)
    draw_organic_noise(draw3, base_bg, frost_noise, count=450, max_size=20)
    # Runic frost sigil
    cx, cy = W // 2, H // 2
    draw3.line([(cx - 35, cy - 20), (cx + 35, cy + 20)], fill=(56, 189, 248, 230), width=3)
    draw3.line([(cx + 35, cy - 20), (cx - 35, cy + 20)], fill=(56, 189, 248, 230), width=3)
    draw3.line([(cx, cy - 30), (cx, cy + 30)], fill=(186, 230, 253, 240), width=3)
    draw3.ellipse([cx - 8, cy - 4, cx + 8, cy + 4], fill=(255, 255, 255, 255))
    img3.putalpha(mask)
    tiles.append(img3)

    return tiles

# ==============================================================================
# BIOME 3: TUONELA (Ash-Strewn Basalt, Soul Embers, Bones, Grave Flagstones)
# ==============================================================================

def generate_tuonela_tiles():
    tiles = []
    base_bg = (12, 9, 18, 255)
    mask = create_diamond_mask()
    tuonela_noise = [
        (18, 14, 28, 240), (26, 20, 38, 220), (8, 6, 12, 255),
        (35, 28, 52, 180), (10, 8, 15, 255), (42, 34, 62, 150)
    ]

    # --- Variant 0: Dark Basalt Flagstone & Stygian Ash ---
    img0 = Image.new("RGBA", (W, H), base_bg)
    draw0 = ImageDraw.Draw(img0)
    draw_organic_noise(draw0, base_bg, tuonela_noise, count=550, max_size=24)
    # Flagstone cracks
    draw0.line([(W//2 - 80, H//2 - 30), (W//2 - 10, H//2), (W//2 + 70, H//2 - 25)], fill=(6, 4, 10, 255), width=3)
    draw0.line([(W//2 - 10, H//2), (W//2 + 20, H//2 + 45)], fill=(6, 4, 10, 255), width=3)
    img0.putalpha(mask)
    tiles.append(img0)

    # --- Variant 1: Petrified Bone Fragments & Iron Chain Link ---
    img1 = Image.new("RGBA", (W, H), base_bg)
    draw1 = ImageDraw.Draw(img1)
    draw_organic_noise(draw1, base_bg, tuonela_noise, count=450, max_size=20)
    # Embedded bone fragments
    bone_col = (190, 195, 205, 240)
    bone_dark = (120, 125, 135, 255)
    for _ in range(6):
        bx = random.randint(W//2 - 100, W//2 + 100)
        by = random.randint(H//2 - 40, H//2 + 40)
        draw1.ellipse([bx - 8, by - 4, bx + 8, by + 4], fill=bone_col, outline=bone_dark, width=1)
    # Iron chain link
    cx, cy = W // 2, H // 2
    draw1.ellipse([cx - 20, cy - 10, cx + 20, cy + 10], outline=(154, 52, 18, 240), width=4)
    img1.putalpha(mask)
    tiles.append(img1)

    # --- Variant 2: Glowing Cyan Soul-Fire Veins ---
    img2 = Image.new("RGBA", (W, H), base_bg)
    draw2 = ImageDraw.Draw(img2)
    draw_organic_noise(draw2, base_bg, tuonela_noise, count=450, max_size=20)
    # Soul fire crack
    soul_pts = [(W//2 - 110, H//2 - 20), (W//2 - 30, H//2 + 10), (W//2 + 50, H//2 - 15), (W//2 + 120, H//2 + 20)]
    for i in range(len(soul_pts) - 1):
        p1, p2 = soul_pts[i], soul_pts[i+1]
        draw2.line([p1, p2], fill=(6, 182, 212, 140), width=8)
        draw2.line([p1, p2], fill=(34, 211, 238, 220), width=4)
        draw2.line([p1, p2], fill=(224, 242, 254, 255), width=1)
    # Soul wisp embers
    for _ in range(15):
        wx = random.randint(W//2 - 80, W//2 + 80)
        wy = random.randint(H//2 - 30, H//2 + 30)
        draw2.ellipse([wx - 4, wy - 2, wx + 4, wy + 2], fill=(34, 211, 238, 200))
        draw2.ellipse([wx - 1, wy - 1, wx + 1, wy + 1], fill=(255, 255, 255, 255))
    img2.putalpha(mask)
    tiles.append(img2)

    # --- Variant 3: Underworld Death Runes ---
    img3 = Image.new("RGBA", (W, H), base_bg)
    draw3 = ImageDraw.Draw(img3)
    draw_organic_noise(draw3, base_bg, tuonela_noise, count=450, max_size=20)
    cx, cy = W // 2, H // 2
    # Death rune inlay
    draw3.line([(cx - 30, cy - 15), (cx + 30, cy - 15)], fill=(34, 211, 238, 180), width=2)
    draw3.line([(cx, cy - 25), (cx, cy + 25)], fill=(34, 211, 238, 180), width=2)
    draw3.line([(cx - 20, cy + 15), (cx + 20, cy + 15)], fill=(34, 211, 238, 180), width=2)
    img3.putalpha(mask)
    tiles.append(img3)

    return tiles

# ==============================================================================
# BIOME 4: ALINEN (Volcanic Obsidian, Glowing Magma Veins, Smoldering Ash)
# ==============================================================================

def generate_alinen_tiles():
    tiles = []
    base_bg = (24, 8, 5, 255)
    mask = create_diamond_mask()
    magma_noise = [
        (38, 12, 8, 240), (52, 18, 10, 220), (14, 4, 3, 255),
        (68, 24, 12, 180), (18, 6, 4, 255), (85, 30, 15, 150)
    ]

    # --- Variant 0: Dark Obsidian Crust ---
    img0 = Image.new("RGBA", (W, H), base_bg)
    draw0 = ImageDraw.Draw(img0)
    draw_organic_noise(draw0, base_bg, magma_noise, count=550, max_size=24)
    # Obsidian plate seams
    draw0.line([(W//2 - 90, H//2 - 20), (W//2, H//2 + 10), (W//2 + 90, H//2 - 30)], fill=(12, 3, 2, 255), width=4)
    img0.putalpha(mask)
    tiles.append(img0)

    # --- Variant 1: Active Glowing Magma Fissure ---
    img1 = Image.new("RGBA", (W, H), base_bg)
    draw1 = ImageDraw.Draw(img1)
    draw_organic_noise(draw1, base_bg, magma_noise, count=400, max_size=20)
    magma_pts = [(W//2 - 120, H//2 - 15), (W//2 - 40, H//2 + 10), (W//2 + 30, H//2 - 10), (W//2 + 130, H//2 + 25)]
    for i in range(len(magma_pts) - 1):
        p1, p2 = magma_pts[i], magma_pts[i+1]
        draw1.line([p1, p2], fill=(185, 28, 28, 180), width=12)
        draw1.line([p1, p2], fill=(234, 88, 12, 240), width=6)
        draw1.line([p1, p2], fill=(254, 240, 138, 255), width=2)
    img1.putalpha(mask)
    tiles.append(img1)

    # --- Variant 2: Smoldering Sulfur Vents & Embers ---
    img2 = Image.new("RGBA", (W, H), base_bg)
    draw2 = ImageDraw.Draw(img2)
    draw_organic_noise(draw2, base_bg, magma_noise, count=450, max_size=20)
    for _ in range(25):
        ex = random.randint(W//2 - 100, W//2 + 100)
        ey = random.randint(H//2 - 40, H//2 + 40)
        if is_inside_diamond(ex, ey, margin=0.15):
            draw2.ellipse([ex - 6, ey - 3, ex + 6, ey + 3], fill=(234, 88, 12, 220))
            draw2.ellipse([ex - 2, ey - 1, ex + 2, ey + 1], fill=(253, 224, 71, 255))
    img2.putalpha(mask)
    tiles.append(img2)

    # --- Variant 3: Blackened Industrial Grating / Rune Plate ---
    img3 = Image.new("RGBA", (W, H), base_bg)
    draw3 = ImageDraw.Draw(img3)
    draw_organic_noise(draw3, base_bg, magma_noise, count=450, max_size=20)
    cx, cy = W // 2, H // 2
    draw3.rectangle([cx - 40, cy - 20, cx + 40, cy + 20], fill=(18, 6, 4, 255), outline=(234, 88, 12, 200), width=2)
    for off in range(-30, 31, 15):
        draw3.line([(cx + off, cy - 20), (cx + off, cy + 20)], fill=(234, 88, 12, 160), width=2)
    img3.putalpha(mask)
    tiles.append(img3)

    return tiles

# ==============================================================================
# BIOME 5: ILMAN LUOMINEN (Primordial Genesis, Cosmic Cloudstone, Golden Eggshell)
# ==============================================================================

def generate_ilman_luominen_tiles():
    tiles = []
    base_bg = (12, 24, 52, 255)
    mask = create_diamond_mask()
    sky_noise = [
        (18, 36, 78, 230), (28, 56, 112, 210), (8, 16, 38, 250),
        (45, 85, 160, 170), (70, 130, 220, 140), (6, 12, 28, 255)
    ]

    # --- Variant 0: Swirling Cosmic Cloudstone ---
    img0 = Image.new("RGBA", (W, H), base_bg)
    draw0 = ImageDraw.Draw(img0)
    draw_organic_noise(draw0, base_bg, sky_noise, count=600, max_size=26)
    # Cloud swirls
    for _ in range(12):
        cx = random.randint(W//2 - 100, W//2 + 100)
        cy = random.randint(H//2 - 40, H//2 + 40)
        draw0.ellipse([cx - 25, cy - 12, cx + 25, cy + 12], fill=(56, 189, 248, 120))
    img0.putalpha(mask)
    tiles.append(img0)

    # --- Variant 1: Shattered Golden Eggshell Shards ---
    img1 = Image.new("RGBA", (W, H), base_bg)
    draw1 = ImageDraw.Draw(img1)
    draw_organic_noise(draw1, base_bg, sky_noise, count=450, max_size=20)
    # Golden eggshell pieces
    for _ in range(8):
        ex = random.randint(W//2 - 90, W//2 + 90)
        ey = random.randint(H//2 - 35, H//2 + 35)
        pts = [(ex, ey - 8), (ex + 12, ey - 2), (ex + 6, ey + 8), (ex - 8, ey + 4)]
        draw1.polygon(pts, fill=(234, 179, 8, 240))
        draw1.line(pts + [pts[0]], fill=(254, 240, 138, 255), width=2)
    img1.putalpha(mask)
    tiles.append(img1)

    # --- Variant 2: Genesis Crystal Dust & Starlight ---
    img2 = Image.new("RGBA", (W, H), base_bg)
    draw2 = ImageDraw.Draw(img2)
    draw_organic_noise(draw2, base_bg, sky_noise, count=450, max_size=20)
    for _ in range(40):
        sx = random.randint(W//2 - 110, W//2 + 110)
        sy = random.randint(H//2 - 45, H//2 + 45)
        if is_inside_diamond(sx, sy, margin=0.12):
            draw2.ellipse([sx - 4, sy - 2, sx + 4, sy + 2], fill=(56, 189, 248, 220))
            draw2.ellipse([sx - 1, sy - 1, sx + 1, sy + 1], fill=(255, 255, 255, 255))
    img2.putalpha(mask)
    tiles.append(img2)

    # --- Variant 3: Golden Cosmic Code Runes ---
    img3 = Image.new("RGBA", (W, H), base_bg)
    draw3 = ImageDraw.Draw(img3)
    draw_organic_noise(draw3, base_bg, sky_noise, count=450, max_size=20)
    cx, cy = W // 2, H // 2
    draw3.line([(cx - 40, cy), (cx + 40, cy)], fill=(250, 204, 21, 230), width=2)
    draw3.line([(cx - 20, cy - 15), (cx + 20, cy + 15)], fill=(250, 204, 21, 230), width=2)
    draw3.line([(cx + 20, cy - 15), (cx - 20, cy + 15)], fill=(250, 204, 21, 230), width=2)
    img3.putalpha(mask)
    tiles.append(img3)

    return tiles

# ==============================================================================
# BIOME 6: YLINEN (Celestial Space Forge, Astral Gold Circuitry, Kirjokansi)
# ==============================================================================

def generate_ylinen_tiles():
    tiles = []
    base_bg = (24, 16, 48, 255)
    mask = create_diamond_mask()
    celestial_noise = [
        (38, 25, 72, 230), (52, 34, 98, 210), (16, 10, 32, 250),
        (75, 48, 135, 170), (110, 72, 190, 140), (10, 6, 20, 255)
    ]

    # --- Variant 0: Astral Star-Plated Obsidian ---
    img0 = Image.new("RGBA", (W, H), base_bg)
    draw0 = ImageDraw.Draw(img0)
    draw_organic_noise(draw0, base_bg, celestial_noise, count=600, max_size=24)
    # Starlight flecks
    for _ in range(50):
        sx = random.randint(40, W - 40)
        sy = random.randint(20, H - 20)
        if is_inside_diamond(sx, sy, margin=0.1):
            draw0.ellipse([sx - 2, sy - 1, sx + 2, sy + 1], fill=(253, 230, 138, 255))
    img0.putalpha(mask)
    tiles.append(img0)

    # --- Variant 1: Radiant Solar Circuit Traces ---
    img1 = Image.new("RGBA", (W, H), base_bg)
    draw1 = ImageDraw.Draw(img1)
    draw_organic_noise(draw1, base_bg, celestial_noise, count=450, max_size=20)
    cx, cy = W // 2, H // 2
    # Hexagonal gold circuitry
    draw1.line([(cx - 50, cy), (cx - 25, cy - 25), (cx + 25, cy - 25), (cx + 50, cy), (cx + 25, cy + 25), (cx - 25, cy + 25), (cx - 50, cy)], fill=(245, 158, 11, 240), width=3)
    draw1.ellipse([cx - 6, cy - 3, cx + 6, cy + 3], fill=(253, 224, 71, 255))
    img1.putalpha(mask)
    tiles.append(img1)

    # --- Variant 2: Prismatic Kirjokansi Crystal Reflections ---
    img2 = Image.new("RGBA", (W, H), base_bg)
    draw2 = ImageDraw.Draw(img2)
    draw_organic_noise(draw2, base_bg, celestial_noise, count=450, max_size=20)
    for _ in range(8):
        fx = random.randint(W//2 - 90, W//2 + 90)
        fy = random.randint(H//2 - 35, H//2 + 35)
        draw2.polygon([(fx, fy - 12), (fx + 16, fy), (fx, fy + 12), (fx - 16, fy)], fill=(147, 51, 234, 160), outline=(245, 158, 11, 220), width=2)
    img2.putalpha(mask)
    tiles.append(img2)

    # --- Variant 3: Celestial Starlight Constellation Glyphs ---
    img3 = Image.new("RGBA", (W, H), base_bg)
    draw3 = ImageDraw.Draw(img3)
    draw_organic_noise(draw3, base_bg, celestial_noise, count=450, max_size=20)
    cx, cy = W // 2, H // 2
    pts = [(cx - 40, cy - 10), (cx - 15, cy - 25), (cx + 20, cy - 15), (cx + 45, cy + 10), (cx + 10, cy + 25), (cx - 25, cy + 15)]
    for p in pts:
        draw3.ellipse([p[0] - 4, p[1] - 2, p[0] + 4, p[1] + 2], fill=(255, 255, 255, 255))
    for i in range(len(pts) - 1):
        draw3.line([pts[i], pts[i+1]], fill=(56, 189, 248, 180), width=2)
    img3.putalpha(mask)
    tiles.append(img3)

    return tiles

# ==============================================================================
# BIOME 7: VOID (Cosmic Warp, Dimensional Rifts, Stardust)
# ==============================================================================

def generate_void_tiles():
    tiles = []
    base_bg = (10, 3, 20, 255)
    mask = create_diamond_mask()
    void_noise = [
        (18, 6, 36, 240), (28, 10, 52, 220), (6, 2, 12, 255),
        (45, 16, 80, 180), (70, 25, 120, 150), (4, 1, 8, 255)
    ]

    for v in range(4):
        img = Image.new("RGBA", (W, H), base_bg)
        draw = ImageDraw.Draw(img)
        draw_organic_noise(draw, base_bg, void_noise, count=550, max_size=24)
        if v == 1:
            # Warp fissure
            draw.line([(W//2 - 90, H//2 - 15), (W//2, H//2 + 5), (W//2 + 90, H//2 - 20)], fill=(168, 85, 247, 220), width=4)
        elif v == 2:
            # Starlight cluster
            for _ in range(40):
                sx = random.randint(40, W - 40)
                sy = random.randint(20, H - 20)
                if is_inside_diamond(sx, sy, margin=0.1):
                    draw.ellipse([sx - 2, sy - 1, sx + 2, sy + 1], fill=(192, 132, 252, 240))
        elif v == 3:
            # Cosmic lattice
            cx, cy = W // 2, H // 2
            draw.ellipse([cx - 40, cy - 20, cx + 40, cy + 20], outline=(56, 189, 248, 160), width=2)
        img.putalpha(mask)
        tiles.append(img)

    return tiles

# ==============================================================================
# SPECIAL & HAZARD TILES (Seamless, High Fidelity 512x256)
# ==============================================================================

def generate_special_tiles():
    mask = create_diamond_mask()
    specials = {}

    # Conduit
    img_conduit = Image.new("RGBA", (W, H), (22, 24, 32, 255))
    draw = ImageDraw.Draw(img_conduit)
    draw.line([(30, H//2), (W - 30, H//2)], fill=(56, 189, 248, 255), width=10)
    draw.line([(30, H//2), (W - 30, H//2)], fill=(255, 255, 255, 255), width=4)
    draw.ellipse([W//2 - 28, H//2 - 18, W//2 + 28, H//2 + 18], fill=(14, 165, 233, 255), outline=(224, 242, 254, 255), width=4)
    img_conduit.putalpha(mask)
    specials["tile_conduit.png"] = img_conduit

    # Shrine
    img_shrine = Image.new("RGBA", (W, H), (26, 22, 36, 255))
    draw = ImageDraw.Draw(img_shrine)
    draw.ellipse([80, 45, W - 80, H - 45], fill=(42, 34, 58, 255), outline=(245, 158, 11, 240), width=5)
    draw.ellipse([140, 75, W - 140, H - 75], fill=(18, 14, 26, 255), outline=(251, 191, 36, 255), width=3)
    img_shrine.putalpha(mask)
    specials["tile_shrine.png"] = img_shrine

    # Gate
    img_gate = Image.new("RGBA", (W, H), (14, 10, 28, 255))
    draw = ImageDraw.Draw(img_gate)
    draw.ellipse([70, 38, W - 70, H - 38], fill=(2, 6, 23, 255), outline=(99, 102, 241, 240), width=6)
    draw.ellipse([120, 65, W - 120, H - 65], fill=(56, 189, 248, 200), outline=(224, 242, 254, 255), width=3)
    img_gate.putalpha(mask)
    specials["tile_gate.png"] = img_gate

    # Hazards
    # Väinölä Poison Spore Pool
    h_vai = Image.new("RGBA", (W, H), (12, 28, 16, 255))
    d = ImageDraw.Draw(h_vai)
    d.ellipse([70, 40, W - 70, H - 40], fill=(35, 85, 25, 230), outline=(52, 211, 153, 255), width=4)
    d.ellipse([120, 70, W - 120, H - 70], fill=(74, 222, 128, 220))
    h_vai.putalpha(mask)
    specials["tile_hazard_vainola.png"] = h_vai

    # Pohjola Deep Ice Void
    h_poh = Image.new("RGBA", (W, H), (10, 20, 36, 255))
    d = ImageDraw.Draw(h_poh)
    d.ellipse([70, 40, W - 70, H - 40], fill=(2, 132, 199, 230), outline=(224, 242, 254, 255), width=4)
    d.ellipse([110, 65, W - 110, H - 65], fill=(56, 189, 248, 255))
    h_poh.putalpha(mask)
    specials["tile_hazard_pohjola.png"] = h_poh

    # Tuonela Necrotic Abyss
    h_tuo = Image.new("RGBA", (W, H), (8, 4, 12, 255))
    d = ImageDraw.Draw(h_tuo)
    d.ellipse([70, 40, W - 70, H - 40], fill=(2, 1, 4, 255), outline=(34, 211, 238, 240), width=4)
    d.arc([100, 55, W - 100, H - 55], 30, 280, fill=(34, 211, 238, 255), width=5)
    h_tuo.putalpha(mask)
    specials["tile_hazard_tuonela.png"] = h_tuo

    # Alinen Lava Pool
    h_ali = Image.new("RGBA", (W, H), (26, 6, 4, 255))
    d = ImageDraw.Draw(h_ali)
    d.ellipse([70, 40, W - 70, H - 40], fill=(185, 28, 28, 255), outline=(234, 88, 12, 255), width=5)
    d.ellipse([110, 60, W - 110, H - 60], fill=(234, 88, 12, 255))
    d.ellipse([150, 85, W - 150, H - 85], fill=(254, 240, 138, 255))
    h_ali.putalpha(mask)
    specials["tile_hazard_alinen.png"] = h_ali

    # Ilman Luominen Plasma Vortex
    h_ilm = Image.new("RGBA", (W, H), (10, 20, 42, 255))
    d = ImageDraw.Draw(h_ilm)
    d.ellipse([70, 40, W - 70, H - 40], fill=(14, 50, 95, 230), outline=(56, 189, 248, 240), width=4)
    d.ellipse([120, 70, W - 120, H - 70], fill=(2, 6, 23, 255))
    h_ilm.putalpha(mask)
    specials["tile_hazard_ilman_luominen.png"] = h_ilm

    # Ylinen Solar Flare Vent
    h_yli = Image.new("RGBA", (W, H), (18, 10, 32, 255))
    d = ImageDraw.Draw(h_yli)
    d.ellipse([70, 40, W - 70, H - 40], fill=(217, 119, 6, 230), outline=(253, 230, 138, 255), width=4)
    d.ellipse([120, 70, W - 120, H - 70], fill=(251, 191, 36, 255))
    h_yli.putalpha(mask)
    specials["tile_hazard_ylinen.png"] = h_yli

    return specials

def save_tile(img, filename):
    out_path = os.path.join(OUTPUT_DIR, filename)
    bak_path = os.path.join(BACKUP_DIR, filename)
    img.save(out_path, format="PNG", optimize=True)
    img.save(bak_path, format="PNG", optimize=True)
    print(f"✓ Created rich seamless tile: {filename} (512x256 RGBA)")

def main():
    print("=== Generating High-Detail Seamless Ground & Special Tiles (512x256) ===")
    
    biomes = {
        "vainola": generate_vainola_tiles(),
        "pohjola": generate_pohjola_tiles(),
        "tuonela": generate_tuonela_tiles(),
        "alinen": generate_alinen_tiles(),
        "ilman_luominen": generate_ilman_luominen_tiles(),
        "ylinen": generate_ylinen_tiles(),
        "void": generate_void_tiles(),
    }

    for bname, variants in biomes.items():
        # Save master fallback
        save_tile(variants[0], f"tile_floor_{bname}.png")
        # Save multi-variants
        for i, var_img in enumerate(variants):
            save_tile(var_img, f"tile_floor_{bname}_{i}.png")

    specials = generate_special_tiles()
    for sname, simg in specials.items():
        save_tile(simg, sname)

    print("\n🎉 High-detail ground tiles generated successfully!")

if __name__ == "__main__":
    main()
