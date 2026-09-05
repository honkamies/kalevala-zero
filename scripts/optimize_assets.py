#!/usr/bin/env python3
import os
import shutil
from PIL import Image

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..'))
ASSETS_DIR = os.path.join(REPO_ROOT, 'client', 'public', 'assets')
BACKUP_DIR = os.path.join(REPO_ROOT, 'client', 'public', 'assets_backup')

def main():
    if not os.path.exists(BACKUP_DIR):
        print(f"Creating backup in {BACKUP_DIR}...")
        shutil.copytree(ASSETS_DIR, BACKUP_DIR)
    else:
        print(f"Backup directory exists at {BACKUP_DIR}")

    # 1. Generate Small Boss Thumbnails (128x128)
    boss_mappings = {
        'thumb_boss_sotka.jpg': 'boss_sotka.jpg',
        'thumb_boss_surma.jpg': 'boss_surma.jpg',
        'thumb_boss_louhi.jpg': 'louhi_boss.jpg',
        'thumb_louhi_frost_boss_1787042560950.jpg': 'louhi_boss.jpg',
        'thumb_boss_tuoni.png': 'boss_tuoni.png',
        'thumb_boss_tuoni.jpg': 'boss_tuoni.png',
        'thumb_boss_ikuturso.jpg': 'boss_ikuturso.jpg',
        'thumb_boss_ukko.jpg': 'boss_ukko.jpg',
    }

    for thumb_name, src_name in boss_mappings.items():
        src_path = os.path.join(ASSETS_DIR, src_name)
        dst_path = os.path.join(ASSETS_DIR, thumb_name)
        if os.path.exists(src_path):
            with Image.open(src_path) as img:
                thumb = img.resize((128, 128), Image.Resampling.LANCZOS)
                if thumb_name.endswith('.png'):
                    thumb.save(dst_path, format='PNG', optimize=True)
                else:
                    rgb = thumb.convert('RGB')
                    rgb.save(dst_path, format='JPEG', quality=85, progressive=True)
                print(f"Created {thumb_name:42s} ({os.path.getsize(dst_path)/1024:.1f} KB)")

    # 2. Generate Small Hero Thumbnails (128x128)
    hero_mappings = {
        'thumb_hero_soturi.jpg': 'hero_soturi.jpg',
        'thumb_hero_runoseppa.jpg': 'hero_runoseppa.jpg',
        'thumb_hero_tietaja.jpg': 'hero_tietaja.jpg',
        'thumb_hero_korvenraivaaja.jpg': 'hero_korvenraivaaja.jpg',
    }

    for thumb_name, src_name in hero_mappings.items():
        src_path = os.path.join(ASSETS_DIR, src_name)
        dst_path = os.path.join(ASSETS_DIR, thumb_name)
        if os.path.exists(src_path):
            with Image.open(src_path) as img:
                rgb = img.convert('RGB')
                thumb = rgb.resize((128, 128), Image.Resampling.LANCZOS)
                thumb.save(dst_path, format='JPEG', quality=85, progressive=True)
                print(f"Created {thumb_name:42s} ({os.path.getsize(dst_path)/1024:.1f} KB)")

    # 3. Generate Small Enemy Thumbnails (128x128)
    enemy_mappings = {
        'thumb_enemy_hound.jpg': 'enemy_hound.jpg',
        'thumb_enemy_marauder.jpg': 'enemy_marauder.jpg',
        'thumb_enemy_wisp.jpg': 'enemy_wisp.jpg',
        'thumb_void_portal_rift.jpg': 'void_portal_rift.jpg',
    }

    for thumb_name, src_name in enemy_mappings.items():
        src_path = os.path.join(ASSETS_DIR, src_name)
        dst_path = os.path.join(ASSETS_DIR, thumb_name)
        if os.path.exists(src_path):
            with Image.open(src_path) as img:
                rgb = img.convert('RGB')
                thumb = rgb.resize((128, 128), Image.Resampling.LANCZOS)
                thumb.save(dst_path, format='JPEG', quality=85, progressive=True)
                print(f"Created {thumb_name:42s} ({os.path.getsize(dst_path)/1024:.1f} KB)")

    # 4. Fix Tuonela Biome Thumbnail (360x240)
    tuonela_thumb = os.path.join(ASSETS_DIR, 'thumb_biome_tuonela.jpg')
    if os.path.exists(tuonela_thumb):
        with Image.open(tuonela_thumb) as img:
            if img.size != (360, 240):
                rgb = img.convert('RGB')
                resized = rgb.resize((360, 240), Image.Resampling.LANCZOS)
                resized.save(tuonela_thumb, format='JPEG', quality=85, progressive=True)
                print(f"Fixed thumb_biome_tuonela.jpg ({os.path.getsize(tuonela_thumb)/1024:.1f} KB)")

    # 5. Fix Tuonela Carousel Card (920x520)
    tuonela_carousel = os.path.join(ASSETS_DIR, 'carousel_tuonela.jpg')
    if os.path.exists(tuonela_carousel):
        with Image.open(tuonela_carousel) as img:
            if img.size != (920, 520):
                rgb = img.convert('RGB')
                resized = rgb.resize((920, 520), Image.Resampling.LANCZOS)
                resized.save(tuonela_carousel, format='JPEG', quality=85, progressive=True)
                print(f"Fixed carousel_tuonela.jpg ({os.path.getsize(tuonela_carousel)/1024:.1f} KB)")

    # 6. Optimize Character/Boss Sprites (512x512 with Chroma-Key Preservation)
    sprites_to_optimize = [
        ('hero_runoseppa.jpg', 512, 512),
        ('louhi_frost_boss_1787042560950.jpg', 512, 512),
        ('surma_boss.jpg', 512, 512),
        ('surma_cyber_hound_1787042573355.jpg', 512, 512),
        ('cyber_hero_soturi_1787042548788.jpg', 512, 512),
    ]

    for fname, target_w, target_h in sprites_to_optimize:
        fpath = os.path.join(ASSETS_DIR, fname)
        if os.path.exists(fpath):
            with Image.open(fpath) as img:
                if img.size != (target_w, target_h) or os.path.getsize(fpath) > 100 * 1024:
                    rgb = img.convert('RGB')
                    resized = rgb.resize((target_w, target_h), Image.Resampling.LANCZOS)
                    res_data = [(0,0,0) if max(r,g,b) < 22 else (r,g,b) for r,g,b in resized.getdata()]
                    cleaned = Image.new('RGB', (target_w, target_h))
                    cleaned.putdata(res_data)
                    cleaned.save(fpath, format='JPEG', quality=90, progressive=True)
                    print(f"Optimized sprite {fname:42s} ({os.path.getsize(fpath)/1024:.1f} KB)")

    # 7. Optimize Heavy 1376x768 Wallpapers
    large_arts = [
        'biome_alinen.jpg', 'biome_ilmarinen.jpg', 'biome_ilmatar.jpg', 'biome_pohjola.jpg',
        'biome_tuonela.jpg', 'biome_vainola.jpg', 'biome_ylinen.jpg', 'gallen_ilmarinen.jpg',
        'gallen_pohjola.jpg', 'gallen_tuonela.jpg', 'gallen_vainola.jpg',
        'ilmarinen_forge_art_1787042631210.jpg', 'pohjola_biome_art_1787042586631.jpg',
        'tuonela_abyss_art_1787042601167.jpg', 'vainola_forest_art_1787042617855.jpg'
    ]

    for fname in large_arts:
        fpath = os.path.join(ASSETS_DIR, fname)
        if os.path.exists(fpath):
            if os.path.getsize(fpath) > 400 * 1024:
                with Image.open(fpath) as img:
                    rgb = img.convert('RGB')
                    rgb.save(fpath, format='JPEG', quality=82, progressive=True)
                    print(f"Optimized large art {fname:42s} ({os.path.getsize(fpath)/1024:.1f} KB)")

    # 8. Optimize PNGs
    for fname in ['boss_tuoni.png', 'skeleton_king_boss.png']:
        fpath = os.path.join(ASSETS_DIR, fname)
        if os.path.exists(fpath):
            with Image.open(fpath) as img:
                img.save(fpath, format='PNG', optimize=True)

    print("\n--- Asset Optimization Complete ---")
    total_sz = sum(os.path.getsize(os.path.join(ASSETS_DIR, f)) for f in os.listdir(ASSETS_DIR) if os.path.isfile(os.path.join(ASSETS_DIR, f)))
    print(f"Total asset directory size: {total_sz/1024/1024:.2f} MB\n")

if __name__ == '__main__':
    main()
