#!/usr/bin/env python3
import os
import math
import random
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

BACKUP_DIR = "/root/sampo-zero/client/public/assets_original_backup"
ASSETS_DIR = "/root/sampo-zero/client/public/assets"
os.makedirs(BACKUP_DIR, exist_ok=True)
os.makedirs(ASSETS_DIR, exist_ok=True)

# Helper: Draw isometric diamond mask on image
def create_isometric_base(w=256, h=128):
    return Image.new("RGBA", (w, h), (0, 0, 0, 0))

def apply_isometric_diamond(draw, w, h, fill_color, outline_color=None, outline_w=2):
    half_w = w / 2
    half_h = h / 2
    pts = [
        (half_w, 2),
        (w - 3, half_h),
        (half_w, h - 3),
        (2, half_h)
    ]
    draw.polygon(pts, fill=fill_color)
    if outline_color:
        draw.line(pts + [pts[0]], fill=outline_color, width=outline_w)

# ----------------------------------------------------
# 1. GROUND TILE GENERATORS (256x128 Isometric Diamonds)
# ----------------------------------------------------

def generate_tile_floor_vainola():
    w, h = 256, 128
    img = create_isometric_base(w, h)
    draw = ImageDraw.Draw(img)
    apply_isometric_diamond(draw, w, h, fill_color=(18, 48, 28, 255), outline_color=(8, 26, 14, 255))
    
    for _ in range(120):
        px = random.randint(30, w - 30)
        py = random.randint(20, h - 20)
        dx = abs(px - w/2) / (w/2)
        dy = abs(py - h/2) / (h/2)
        if dx + dy < 0.85:
            if random.random() > 0.4:
                col = (random.randint(25, 55), random.randint(80, 140), random.randint(40, 70), 230)
                draw.ellipse([px, py, px + random.randint(4, 12), py + random.randint(2, 6)], fill=col)
            else:
                col = (random.randint(140, 190), random.randint(80, 110), random.randint(25, 45), 240)
                draw.line([(px, py), (px + random.randint(-6, 6), py + random.randint(-3, 3))], fill=col, width=2)
    return img

def generate_tile_floor_pohjola():
    w, h = 256, 128
    img = create_isometric_base(w, h)
    draw = ImageDraw.Draw(img)
    apply_isometric_diamond(draw, w, h, fill_color=(20, 32, 50, 255), outline_color=(10, 18, 30, 255))
    
    for _ in range(80):
        px = random.randint(30, w - 30)
        py = random.randint(20, h - 20)
        dx = abs(px - w/2) / (w/2)
        dy = abs(py - h/2) / (h/2)
        if dx + dy < 0.85:
            col = (random.randint(90, 180), random.randint(180, 230), random.randint(230, 255), 200)
            draw.ellipse([px, py, px + random.randint(6, 16), py + random.randint(3, 8)], fill=col)
            draw.line([(px, py), (px + random.randint(10, 24), py + random.randint(-6, 6))], fill=(220, 240, 255, 230), width=1)
    return img

def generate_tile_floor_tuonela():
    w, h = 256, 128
    img = create_isometric_base(w, h)
    draw = ImageDraw.Draw(img)
    apply_isometric_diamond(draw, w, h, fill_color=(14, 11, 20, 255), outline_color=(6, 4, 10, 255))
    
    for _ in range(70):
        px = random.randint(30, w - 30)
        py = random.randint(20, h - 20)
        dx = abs(px - w/2) / (w/2)
        dy = abs(py - h/2) / (h/2)
        if dx + dy < 0.85:
            draw.ellipse([px, py, px + random.randint(8, 18), py + random.randint(4, 9)], fill=(28, 22, 38, 220))
            if random.random() > 0.6:
                draw.arc([px, py, px + 8, py + 5], 0, 180, fill=(34, 211, 238, 210), width=2)
    return img

def generate_tile_floor_alinen():
    w, h = 256, 128
    img = create_isometric_base(w, h)
    draw = ImageDraw.Draw(img)
    apply_isometric_diamond(draw, w, h, fill_color=(32, 12, 8, 255), outline_color=(16, 6, 4, 255))
    
    for _ in range(60):
        px = random.randint(30, w - 30)
        py = random.randint(20, h - 20)
        dx = abs(px - w/2) / (w/2)
        dy = abs(py - h/2) / (h/2)
        if dx + dy < 0.85:
            draw.line([(px, py), (px + random.randint(12, 28), py + random.randint(-8, 8))], fill=(234, 88, 12, 240), width=2)
            draw.line([(px + 2, py), (px + random.randint(6, 14), py + random.randint(-4, 4))], fill=(254, 240, 138, 255), width=1)
    return img

def generate_tile_floor_ilman_luominen():
    w, h = 256, 128
    img = create_isometric_base(w, h)
    draw = ImageDraw.Draw(img)
    apply_isometric_diamond(draw, w, h, fill_color=(16, 38, 74, 255), outline_color=(8, 20, 44, 255))
    
    for _ in range(80):
        px = random.randint(30, w - 30)
        py = random.randint(20, h - 20)
        dx = abs(px - w/2) / (w/2)
        dy = abs(py - h/2) / (h/2)
        if dx + dy < 0.85:
            draw.ellipse([px, py, px + random.randint(10, 22), py + random.randint(5, 11)], fill=(56, 189, 248, 160))
            if random.random() > 0.7:
                draw.ellipse([px + 2, py + 2, px + 6, py + 4], fill=(250, 204, 21, 230))
    return img

def generate_tile_floor_ylinen():
    w, h = 256, 128
    img = create_isometric_base(w, h)
    draw = ImageDraw.Draw(img)
    apply_isometric_diamond(draw, w, h, fill_color=(28, 18, 54, 255), outline_color=(14, 8, 30, 255))
    
    for _ in range(50):
        px = random.randint(30, w - 30)
        py = random.randint(20, h - 20)
        dx = abs(px - w/2) / (w/2)
        dy = abs(py - h/2) / (h/2)
        if dx + dy < 0.85:
            draw.line([(px, py), (px + random.randint(14, 30), py)], fill=(245, 158, 11, 220), width=2)
            draw.ellipse([px, py, px + 5, py + 3], fill=(253, 230, 138, 255))
    return img

def generate_tile_floor_void():
    w, h = 256, 128
    img = create_isometric_base(w, h)
    draw = ImageDraw.Draw(img)
    apply_isometric_diamond(draw, w, h, fill_color=(12, 4, 24, 255), outline_color=(4, 1, 10, 255))
    
    for _ in range(60):
        px = random.randint(30, w - 30)
        py = random.randint(20, h - 20)
        dx = abs(px - w/2) / (w/2)
        dy = abs(py - h/2) / (h/2)
        if dx + dy < 0.85:
            col = (192, 132, 252, 180) if random.random() > 0.5 else (56, 189, 248, 180)
            draw.ellipse([px, py, px + random.randint(8, 18), py + random.randint(4, 9)], fill=col)
    return img

# ----------------------------------------------------
# 2. HAZARD TILES (256x128 Isometric Diamonds)
# ----------------------------------------------------

def generate_tile_hazard_vainola():
    w, h = 256, 128
    img = create_isometric_base(w, h)
    draw = ImageDraw.Draw(img)
    apply_isometric_diamond(draw, w, h, fill_color=(14, 30, 18, 255), outline_color=(6, 14, 8, 255))
    draw.ellipse([40, 25, w - 40, h - 25], fill=(35, 75, 25, 230), outline=(20, 50, 15, 255), width=2)
    draw.ellipse([70, 40, w - 70, h - 40], fill=(80, 160, 45, 200))
    return img

def generate_tile_hazard_pohjola():
    w, h = 256, 128
    img = create_isometric_base(w, h)
    draw = ImageDraw.Draw(img)
    apply_isometric_diamond(draw, w, h, fill_color=(10, 24, 42, 255), outline_color=(4, 10, 20, 255))
    draw.ellipse([40, 25, w - 40, h - 25], fill=(2, 132, 199, 230), outline=(224, 242, 254, 240), width=2)
    draw.ellipse([65, 38, w - 65, h - 38], fill=(56, 189, 248, 240))
    return img

def generate_tile_hazard_tuonela():
    w, h = 256, 128
    img = create_isometric_base(w, h)
    draw = ImageDraw.Draw(img)
    apply_isometric_diamond(draw, w, h, fill_color=(8, 4, 12, 255), outline_color=(3, 1, 6, 255))
    draw.ellipse([40, 25, w - 40, h - 25], fill=(2, 1, 4, 250), outline=(34, 211, 238, 220), width=2)
    draw.arc([60, 32, w - 60, h - 32], 45, 270, fill=(34, 211, 238, 250), width=3)
    return img

def generate_tile_hazard_alinen():
    w, h = 256, 128
    img = create_isometric_base(w, h)
    draw = ImageDraw.Draw(img)
    apply_isometric_diamond(draw, w, h, fill_color=(28, 8, 4, 255), outline_color=(12, 3, 2, 255))
    draw.ellipse([40, 25, w - 40, h - 25], fill=(185, 28, 28, 255), outline=(234, 88, 12, 255), width=3)
    draw.ellipse([65, 36, w - 65, h - 36], fill=(234, 88, 12, 255))
    draw.ellipse([90, 48, w - 90, h - 48], fill=(254, 240, 138, 255))
    return img

def generate_tile_hazard_ilman_luominen():
    w, h = 256, 128
    img = create_isometric_base(w, h)
    draw = ImageDraw.Draw(img)
    apply_isometric_diamond(draw, w, h, fill_color=(10, 22, 45, 255), outline_color=(4, 9, 20, 255))
    draw.ellipse([40, 25, w - 40, h - 25], fill=(14, 50, 95, 220), outline=(56, 189, 248, 220), width=2)
    draw.ellipse([70, 40, w - 70, h - 40], fill=(2, 6, 23, 250))
    return img

def generate_tile_hazard_ylinen():
    w, h = 256, 128
    img = create_isometric_base(w, h)
    draw = ImageDraw.Draw(img)
    apply_isometric_diamond(draw, w, h, fill_color=(20, 10, 36, 255), outline_color=(8, 4, 16, 255))
    draw.ellipse([40, 25, w - 40, h - 25], fill=(217, 119, 6, 230), outline=(253, 230, 138, 255), width=2)
    draw.ellipse([70, 40, w - 70, h - 40], fill=(251, 191, 36, 255))
    return img

# ----------------------------------------------------
# 3. SPECIAL TILES (Conduit, Shrine, Gate)
# ----------------------------------------------------

def generate_tile_conduit():
    w, h = 256, 128
    img = create_isometric_base(w, h)
    draw = ImageDraw.Draw(img)
    apply_isometric_diamond(draw, w, h, fill_color=(24, 24, 32, 255), outline_color=(10, 10, 14, 255))
    draw.line([(20, h/2), (w - 20, h/2)], fill=(56, 189, 248, 255), width=6)
    draw.line([(20, h/2), (w - 20, h/2)], fill=(255, 255, 255, 255), width=2)
    draw.ellipse([w/2 - 14, h/2 - 10, w/2 + 14, h/2 + 10], fill=(14, 165, 233, 255), outline=(224, 242, 254, 255), width=2)
    return img

def generate_tile_shrine():
    w, h = 256, 128
    img = create_isometric_base(w, h)
    draw = ImageDraw.Draw(img)
    apply_isometric_diamond(draw, w, h, fill_color=(28, 25, 38, 255), outline_color=(12, 10, 18, 255))
    draw.ellipse([45, 26, w - 45, h - 26], fill=(40, 35, 55, 255), outline=(245, 158, 11, 240), width=3)
    draw.ellipse([75, 42, w - 75, h - 42], fill=(20, 16, 30, 255), outline=(251, 191, 36, 255), width=2)
    return img

def generate_tile_gate():
    w, h = 256, 128
    img = create_isometric_base(w, h)
    draw = ImageDraw.Draw(img)
    apply_isometric_diamond(draw, w, h, fill_color=(16, 12, 30, 255), outline_color=(6, 4, 14, 255))
    draw.ellipse([40, 22, w - 40, h - 22], fill=(2, 6, 23, 255), outline=(99, 102, 241, 240), width=4)
    draw.ellipse([65, 36, w - 65, h - 36], fill=(56, 189, 248, 180), outline=(224, 242, 254, 255), width=2)
    return img

# ----------------------------------------------------
# 4. WALL & OBSTACLE SPRITES (256x256 Transparent PNGs)
# ----------------------------------------------------

def generate_obstacle_vainola_pine(size_variant="medium"):
    w, h = 256, 256
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx, cy = w // 2, h - 24
    
    scale = 1.0 if size_variant == "giant" else (0.65 if size_variant == "small" else 0.85)
    trunk_h = int(140 * scale)
    trunk_w = int(16 * scale)
    
    draw.ellipse([cx - int(45 * scale), cy - int(12 * scale), cx + int(45 * scale), cy + int(12 * scale)], fill=(0, 0, 0, 150))
    
    trunk_top_y = cy - trunk_h
    draw.polygon([
        (cx - trunk_w // 2, cy),
        (cx + trunk_w // 2, cy),
        (cx + trunk_w // 3, trunk_top_y),
        (cx - trunk_w // 3, trunk_top_y)
    ], fill=(120, 53, 15, 255), outline=(69, 26, 3, 255))
    
    for seg in range(6):
        sy = cy - int(seg * trunk_h / 6)
        draw.line([(cx - trunk_w // 3, sy), (cx + trunk_w // 3, sy - 4)], fill=(154, 52, 18, 255), width=2)
    
    crown_defs = [
        (cx - int(25 * scale), cy - int(trunk_h * 0.6), int(36 * scale), int(24 * scale)),
        (cx + int(28 * scale), cy - int(trunk_h * 0.75), int(40 * scale), int(26 * scale)),
        (cx - int(15 * scale), cy - int(trunk_h * 0.9), int(48 * scale), int(30 * scale)),
        (cx + int(12 * scale), cy - int(trunk_h * 0.95), int(50 * scale), int(32 * scale)),
        (cx, cy - int(trunk_h * 1.12), int(56 * scale), int(36 * scale))
    ]
    
    for px, py, rw, rh in crown_defs:
        draw.ellipse([px - rw, py - rh, px + rw, py + rh], fill=(2, 44, 34, 255), outline=(1, 28, 21, 255), width=2)
        draw.ellipse([px - rw + 4, py - rh + 4, px + rw - 4, py + rh - 4], fill=(6, 78, 59, 255))
        draw.ellipse([px - rw // 2, py - rh + 3, px + rw // 2, py], fill=(16, 185, 129, 255))
        
    return img

def generate_obstacle_vainola_spruce():
    w, h = 256, 256
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx, cy = w // 2, h - 24
    
    draw.ellipse([cx - 50, cy - 14, cx + 50, cy + 14], fill=(0, 0, 0, 150))
    draw.rectangle([cx - 8, cy - 35, cx + 8, cy], fill=(39, 27, 20, 255), outline=(20, 12, 8, 255), width=2)
    
    tiers = [
        (cy - 40, 75, 30, (6, 78, 59)),
        (cy - 85, 60, 28, (4, 120, 87)),
        (cy - 128, 48, 26, (5, 150, 105)),
        (cy - 168, 35, 24, (16, 185, 129)),
        (cy - 205, 20, 20, (52, 211, 153))
    ]
    for y_pos, span, depth, col in tiers:
        pts = [
            (cx, y_pos - depth),
            (cx + span, y_pos),
            (cx + span // 2, y_pos + 6),
            (cx, y_pos + 8),
            (cx - span // 2, y_pos + 6),
            (cx - span, y_pos)
        ]
        draw.polygon(pts, fill=col + (255,), outline=(1, 28, 21, 255))
    return img

def generate_obstacle_vainola_boulder():
    w, h = 256, 256
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx, cy = w // 2, h - 30
    
    draw.ellipse([cx - 60, cy - 18, cx + 60, cy + 18], fill=(0, 0, 0, 160))
    pts = [
        (cx - 55, cy),
        (cx - 50, cy - 45),
        (cx - 20, cy - 85),
        (cx + 25, cy - 90),
        (cx + 55, cy - 50),
        (cx + 50, cy)
    ]
    draw.polygon(pts, fill=(55, 65, 81, 255), outline=(31, 41, 55, 255), width=3)
    draw.ellipse([cx - 30, cy - 88, cx + 30, cy - 65], fill=(22, 101, 52, 255))
    draw.line([(cx - 20, cy - 40), (cx + 35, cy - 35)], fill=(75, 85, 99, 255), width=3)
    return img

def generate_obstacle_pohjola_spruce():
    w, h = 256, 256
    img = generate_obstacle_vainola_spruce()
    draw = ImageDraw.Draw(img)
    cx, cy = w // 2, h - 24
    snow_tiers = [cy - 45, cy - 90, cy - 133, cy - 173, cy - 210]
    for y_pos in snow_tiers:
        draw.ellipse([cx - 30, y_pos - 8, cx + 30, y_pos + 6], fill=(224, 242, 254, 230))
        draw.ellipse([cx - 15, y_pos - 6, cx + 15, y_pos + 4], fill=(255, 255, 255, 255))
    return img

def generate_obstacle_pohjola_spire():
    w, h = 256, 256
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx, cy = w // 2, h - 24
    
    draw.ellipse([cx - 45, cy - 14, cx + 45, cy + 14], fill=(0, 0, 0, 150))
    pts = [
        (cx - 35, cy),
        (cx - 25, cy - 120),
        (cx, cy - 210),
        (cx + 25, cy - 110),
        (cx + 35, cy)
    ]
    draw.polygon(pts, fill=(3, 105, 161, 255), outline=(125, 211, 252, 255), width=2)
    facet = [(cx - 10, cy - 120), (cx, cy - 210), (cx + 20, cy - 110), (cx + 5, cy)]
    draw.polygon(facet, fill=(186, 230, 253, 220))
    return img

def generate_obstacle_tuonela_kelo_tree():
    w, h = 256, 256
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx, cy = w // 2, h - 24
    
    draw.ellipse([cx - 45, cy - 12, cx + 45, cy + 12], fill=(0, 0, 0, 170))
    draw.polygon([
        (cx - 16, cy),
        (cx + 14, cy),
        (cx + 8, cy - 130),
        (cx - 8, cy - 130)
    ], fill=(30, 24, 38, 255), outline=(12, 8, 16, 255), width=2)
    
    draw.line([(cx, cy - 100), (cx - 55, cy - 150)], fill=(30, 24, 38, 255), width=6)
    draw.line([(cx - 55, cy - 150), (cx - 75, cy - 190)], fill=(45, 36, 56, 255), width=4)
    draw.line([(cx, cy - 115), (cx + 50, cy - 160)], fill=(30, 24, 38, 255), width=6)
    draw.line([(cx + 50, cy - 160), (cx + 70, cy - 200)], fill=(45, 36, 56, 255), width=4)
    
    draw.ellipse([cx - 40, cy - 165, cx - 32, cy - 157], fill=(34, 211, 238, 240))
    draw.ellipse([cx + 35, cy - 175, cx + 43, cy - 167], fill=(34, 211, 238, 240))
    return img

def generate_obstacle_tuonela_skull_cairn():
    w, h = 256, 256
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx, cy = w // 2, h - 30
    
    draw.ellipse([cx - 50, cy - 15, cx + 50, cy + 15], fill=(0, 0, 0, 180))
    draw.polygon([(cx - 45, cy), (cx - 35, cy - 40), (cx + 35, cy - 40), (cx + 45, cy)], fill=(24, 18, 30, 255), outline=(10, 6, 14, 255), width=2)
    
    skulls = [(cx - 20, cy - 48), (cx + 20, cy - 48), (cx, cy - 65), (cx - 10, cy - 82), (cx + 10, cy - 82), (cx, cy - 100)]
    for sx, sy in skulls:
        draw.ellipse([sx - 12, sy - 12, sx + 12, sy + 12], fill=(203, 213, 225, 255), outline=(15, 23, 42, 255), width=2)
        draw.ellipse([sx - 6, sy - 4, sx - 2, sy + 2], fill=(15, 23, 42, 255))
        draw.ellipse([sx + 2, sy - 4, sx + 6, sy + 2], fill=(15, 23, 42, 255))
    return img

def generate_obstacle_tuonela_monolith():
    w, h = 256, 256
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx, cy = w // 2, h - 24
    
    draw.ellipse([cx - 45, cy - 14, cx + 45, cy + 14], fill=(0, 0, 0, 180))
    pts = [
        (cx - 30, cy),
        (cx - 25, cy - 180),
        (cx, cy - 215),
        (cx + 25, cy - 180),
        (cx + 30, cy)
    ]
    draw.polygon(pts, fill=(18, 14, 24, 255), outline=(6, 3, 10, 255), width=3)
    draw.line([(cx, cy - 30), (cx, cy - 170)], fill=(34, 211, 238, 255), width=3)
    draw.line([(cx - 10, cy - 70), (cx + 10, cy - 70)], fill=(34, 211, 238, 255), width=3)
    draw.line([(cx - 8, cy - 120), (cx + 8, cy - 120)], fill=(34, 211, 238, 255), width=3)
    return img

def generate_obstacle_alinen_rock():
    w, h = 256, 256
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx, cy = w // 2, h - 28
    
    draw.ellipse([cx - 55, cy - 16, cx + 55, cy + 16], fill=(0, 0, 0, 180))
    pts = [
        (cx - 50, cy),
        (cx - 40, cy - 75),
        (cx - 10, cy - 170),
        (cx + 30, cy - 130),
        (cx + 50, cy)
    ]
    draw.polygon(pts, fill=(38, 14, 10, 255), outline=(18, 6, 4, 255), width=3)
    draw.line([(cx - 30, cy - 20), (cx, cy - 90), (cx - 5, cy - 150)], fill=(234, 88, 12, 255), width=3)
    draw.line([(cx, cy - 90), (cx + 25, cy - 60)], fill=(254, 240, 138, 255), width=2)
    return img

def generate_obstacle_alinen_magma_vent():
    w, h = 256, 256
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx, cy = w // 2, h - 30
    
    draw.ellipse([cx - 60, cy - 20, cx + 60, cy + 20], fill=(0, 0, 0, 180))
    draw.polygon([(cx - 55, cy), (cx - 35, cy - 60), (cx + 35, cy - 60), (cx + 55, cy)], fill=(45, 18, 12, 255), outline=(20, 8, 5, 255), width=3)
    draw.ellipse([cx - 32, cy - 70, cx + 32, cy - 50], fill=(234, 88, 12, 255), outline=(254, 240, 138, 255), width=3)
    draw.ellipse([cx - 18, cy - 66, cx + 18, cy - 54], fill=(255, 255, 255, 255))
    return img

def generate_obstacle_ilmatar_mountain():
    w, h = 256, 256
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx, cy = w // 2, h - 24
    
    draw.ellipse([cx - 55, cy - 14, cx + 55, cy + 14], fill=(0, 0, 0, 160))
    pts = [
        (cx - 50, cy),
        (cx - 35, cy - 80),
        (cx - 10, cy - 160),
        (cx, cy - 215),
        (cx + 25, cy - 140),
        (cx + 50, cy)
    ]
    draw.polygon(pts, fill=(15, 23, 42, 255), outline=(30, 58, 138, 255), width=3)
    snow = [(cx - 12, cy - 160), (cx, cy - 215), (cx + 20, cy - 145), (cx + 2, cy - 130)]
    draw.polygon(snow, fill=(224, 242, 254, 255))
    draw.ellipse([cx - 45, cy - 25, cx + 45, cy - 5], fill=(224, 242, 254, 180))
    return img

def generate_obstacle_ilmatar_eggshell():
    w, h = 256, 256
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx, cy = w // 2, h - 24
    
    draw.ellipse([cx - 45, cy - 12, cx + 45, cy + 12], fill=(0, 0, 0, 150))
    pts = [
        (cx - 35, cy),
        (cx - 45, cy - 100),
        (cx, cy - 190),
        (cx + 40, cy - 90),
        (cx + 35, cy)
    ]
    draw.polygon(pts, fill=(15, 23, 42, 255), outline=(56, 189, 248, 255), width=3)
    draw.line([(cx - 20, cy - 20), (cx - 25, cy - 90), (cx, cy - 160)], fill=(250, 204, 21, 255), width=4)
    draw.line([(cx - 25, cy - 90), (cx + 15, cy - 80)], fill=(253, 230, 138, 255), width=3)
    return img

def generate_obstacle_ylinen_obelisk():
    w, h = 256, 256
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx, cy = w // 2, h - 24
    
    draw.ellipse([cx - 45, cy - 14, cx + 45, cy + 14], fill=(56, 189, 248, 80))
    pts = [
        (cx - 26, cy),
        (cx - 18, cy - 180),
        (cx, cy - 220),
        (cx + 18, cy - 180),
        (cx + 26, cy)
    ]
    draw.polygon(pts, fill=(39, 31, 69, 255), outline=(245, 158, 11, 255), width=3)
    draw.line([(cx, cy - 15), (cx, cy - 200)], fill=(251, 191, 36, 255), width=4)
    draw.line([(cx, cy - 30), (cx, cy - 190)], fill=(255, 255, 255, 255), width=2)
    return img

def generate_obstacle_ylinen_crystal_spire():
    w, h = 256, 256
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx, cy = w // 2, h - 24
    
    draw.ellipse([cx - 50, cy - 15, cx + 50, cy + 15], fill=(192, 132, 252, 90))
    spires = [
        (cx - 25, cy, 18, 110, (147, 51, 234)),
        (cx + 25, cy, 16, 120, (192, 132, 252)),
        (cx, cy, 24, 190, (234, 179, 8))
    ]
    for px, py, sw, sh, col in spires:
        pts = [
            (px - sw, py),
            (px - sw // 2, py - sh + 20),
            (px, py - sh),
            (px + sw // 2, py - sh + 20),
            (px + sw, py)
        ]
        draw.polygon(pts, fill=col + (255,), outline=(255, 255, 255, 255), width=2)
    return img

# ----------------------------------------------------
# MAIN GENERATION & PIXEL ART PIPELINE
# ----------------------------------------------------

def process_and_save(img: Image.Image, filename: str, pixel_target_w: int, num_colors: int):
    backup_path = os.path.join(BACKUP_DIR, filename)
    img.save(backup_path, format="PNG", optimize=True)
    
    orig_w, orig_h = img.size
    aspect_ratio = orig_h / orig_w
    target_pixel_h = max(16, int(pixel_target_w * aspect_ratio))
    
    has_alpha = img.mode == "RGBA"
    alpha_channel = img.split()[3] if has_alpha else None
    
    rgb_img = img.convert("RGB")
    rgb_img = rgb_img.filter(ImageFilter.UnsharpMask(radius=2, percent=140, threshold=3))
    
    enhancer = ImageEnhance.Color(rgb_img)
    rgb_img = enhancer.enhance(1.25)
    enhancer = ImageEnhance.Contrast(rgb_img)
    rgb_img = enhancer.enhance(1.3)
    
    small_img = rgb_img.resize((pixel_target_w, target_pixel_h), resample=Image.Resampling.BILINEAR)
    quantized = small_img.quantize(colors=num_colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG)
    quantized_rgb = quantized.convert("RGB")
    
    pixelated = quantized_rgb.resize((orig_w, orig_h), resample=Image.Resampling.NEAREST)
    
    if has_alpha and alpha_channel:
        small_alpha = alpha_channel.resize((pixel_target_w, target_pixel_h), resample=Image.Resampling.BOX)
        small_alpha = small_alpha.point(lambda p: 255 if p > 60 else 0)
        pixel_alpha = small_alpha.resize((orig_w, orig_h), resample=Image.Resampling.NEAREST)
        
        pixelated_rgba = pixelated.convert("RGBA")
        pixelated_rgba.putalpha(pixel_alpha)
        out_path = os.path.join(ASSETS_DIR, filename)
        pixelated_rgba.save(out_path, format="PNG", optimize=True)
    else:
        out_path = os.path.join(ASSETS_DIR, filename)
        pixelated.save(out_path, format="PNG", optimize=True)
        
    print(f"Generated asset: {filename} ({pixel_target_w}px grid, {num_colors} colors)")

def main():
    print("Generating comprehensive Finnish Folklore ground & obstacle PNG assets...")
    
    # Floors
    process_and_save(generate_tile_floor_vainola(), "tile_floor_vainola.png", 128, 24)
    process_and_save(generate_tile_floor_pohjola(), "tile_floor_pohjola.png", 128, 24)
    process_and_save(generate_tile_floor_tuonela(), "tile_floor_tuonela.png", 128, 24)
    process_and_save(generate_tile_floor_alinen(), "tile_floor_alinen.png", 128, 24)
    process_and_save(generate_tile_floor_ilman_luominen(), "tile_floor_ilman_luominen.png", 128, 24)
    process_and_save(generate_tile_floor_ylinen(), "tile_floor_ylinen.png", 128, 24)
    process_and_save(generate_tile_floor_void(), "tile_floor_void.png", 128, 24)
    
    # Hazards
    process_and_save(generate_tile_hazard_vainola(), "tile_hazard_vainola.png", 128, 22)
    process_and_save(generate_tile_hazard_pohjola(), "tile_hazard_pohjola.png", 128, 22)
    process_and_save(generate_tile_hazard_tuonela(), "tile_hazard_tuonela.png", 128, 22)
    process_and_save(generate_tile_hazard_alinen(), "tile_hazard_alinen.png", 128, 22)
    process_and_save(generate_tile_hazard_ilman_luominen(), "tile_hazard_ilman_luominen.png", 128, 22)
    process_and_save(generate_tile_hazard_ylinen(), "tile_hazard_ylinen.png", 128, 22)
    
    # Specials
    process_and_save(generate_tile_conduit(), "tile_conduit.png", 128, 20)
    process_and_save(generate_tile_shrine(), "tile_shrine.png", 128, 20)
    process_and_save(generate_tile_gate(), "tile_gate.png", 128, 20)
    
    # Obstacles & Walls
    process_and_save(generate_obstacle_vainola_pine("giant"), "obstacle_vainola_pine_giant.png", 96, 24)
    process_and_save(generate_obstacle_vainola_pine("medium"), "obstacle_vainola_pine_medium.png", 88, 24)
    process_and_save(generate_obstacle_vainola_pine("small"), "obstacle_vainola_pine_small.png", 80, 20)
    process_and_save(generate_obstacle_vainola_spruce(), "obstacle_vainola_spruce.png", 88, 24)
    process_and_save(generate_obstacle_vainola_boulder(), "obstacle_vainola_boulder.png", 88, 20)
    
    process_and_save(generate_obstacle_pohjola_spruce(), "obstacle_pohjola_spruce.png", 88, 24)
    process_and_save(generate_obstacle_pohjola_spire(), "obstacle_pohjola_spire.png", 88, 22)
    
    process_and_save(generate_obstacle_tuonela_kelo_tree(), "obstacle_tuonela_kelo_tree.png", 88, 20)
    process_and_save(generate_obstacle_tuonela_skull_cairn(), "obstacle_tuonela_skull_cairn.png", 88, 22)
    process_and_save(generate_obstacle_tuonela_monolith(), "obstacle_tuonela_monolith.png", 88, 22)
    
    process_and_save(generate_obstacle_alinen_rock(), "obstacle_alinen_rock.png", 88, 22)
    process_and_save(generate_obstacle_alinen_magma_vent(), "obstacle_alinen_magma_vent.png", 88, 24)
    
    process_and_save(generate_obstacle_ilmatar_mountain(), "obstacle_ilmatar_mountain.png", 88, 22)
    process_and_save(generate_obstacle_ilmatar_eggshell(), "obstacle_ilmatar_eggshell.png", 88, 22)
    
    process_and_save(generate_obstacle_ylinen_obelisk(), "obstacle_ylinen_obelisk.png", 88, 24)
    process_and_save(generate_obstacle_ylinen_crystal_spire(), "obstacle_ylinen_crystal_spire.png", 88, 24)
    
    print("\nAll 32 ground and wall/obstacle assets generated and saved successfully!")

if __name__ == "__main__":
    main()
