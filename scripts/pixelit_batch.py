#!/usr/bin/env python3
"""
PixelIt Batch Processor for Game Assets
Implements the PixelIt algorithm (https://github.com/giventofly/pixelit)
with alpha transparency preservation and isometric tile alignment.
"""

import os
import sys
import argparse
from PIL import Image

def pixelit_image(img, scale_factor=0.16, alpha_threshold=20, palette=None):
    """
    Applies the PixelIt downscale + nearest neighbor upscale algorithm.
    :param img: PIL Image (RGBA or RGB)
    :param scale_factor: float scale factor (e.g. 0.16 for UI scale 16, or 1.0/16 for 16px blocks)
    :param alpha_threshold: minimum alpha value to keep (below this is clamped to 0)
    :param palette: optional list of [R, G, B] colors for palette quantization
    """
    orig_w, orig_h = img.size
    scaled_w = max(1, int(round(orig_w * scale_factor)))
    scaled_h = max(1, int(round(orig_h * scale_factor)))

    # PixelIt downscale using bilinear filtering (matching HTML5 Canvas drawImage)
    small = img.resize((scaled_w, scaled_h), Image.Resampling.BILINEAR)
    # PixelIt upscale with nearest-neighbor interpolation
    pixelated = small.resize((orig_w, orig_h), Image.Resampling.NEAREST)

    if palette is not None:
        px = pixelated.load()
        for y in range(orig_h):
            for x in range(orig_w):
                p = px[x, y]
                if len(p) == 4:
                    r, g, b, a = p
                    if a < alpha_threshold:
                        px[x, y] = (0, 0, 0, 0)
                        continue
                else:
                    r, g, b = p
                    a = 255

                best_col = palette[0]
                best_dist = float('inf')
                for col in palette:
                    d = (r - col[0])**2 + (g - col[1])**2 + (b - col[2])**2
                    if d < best_dist:
                        best_dist = d
                        best_col = col

                if len(p) == 4:
                    px[x, y] = (best_col[0], best_col[1], best_col[2], a)
                else:
                    px[x, y] = (best_col[0], best_col[1], best_col[2])
    else:
        if pixelated.mode == 'RGBA':
            px = pixelated.load()
            for y in range(orig_h):
                for x in range(orig_w):
                    r, g, b, a = px[x, y]
                    if a < alpha_threshold:
                        px[x, y] = (0, 0, 0, 0)

    return pixelated

def main():
    parser = argparse.ArgumentParser(description="PixelIt Batch Processor")
    parser.add_argument("--src-dir", default="/root/sampo-zero/client/public/assets_original_backup", help="Source directory containing original assets")
    parser.add_argument("--dst-dir", default="/root/sampo-zero/client/public/assets", help="Destination directory for pixelated assets")
    parser.add_argument("--scale", type=float, default=16.0, help="Scale factor (16 means 0.16x / pixelit slider 16, or use --block-size)")
    parser.add_argument("--block-size", type=int, default=None, help="Explicit block size in pixels (e.g. 16 for 16px blocks)")
    parser.add_argument("--alpha-threshold", type=int, default=20, help="Alpha threshold for transparent borders")
    
    args = parser.parse_args()

    if args.block_size is not None and args.block_size > 0:
        scale_factor = 1.0 / float(args.block_size)
        mode_desc = f"{args.block_size}px block size (scale {scale_factor:.4f})"
    else:
        scale_factor = args.scale / 100.0 if args.scale > 1.0 else args.scale
        mode_desc = f"scale {scale_factor:.2f} ({args.scale}%)"

    print(f"=== Running PixelIt Batch Processor ({mode_desc}) ===")
    print(f"Source: {args.src_dir}")
    print(f"Destination: {args.dst_dir}")

    target_files = [
        # Floor & Tile Assets
        'tile_floor_vainola.png', 'tile_floor_pohjola.png', 'tile_floor_tuonela.png',
        'tile_floor_alinen.png', 'tile_floor_ilman_luominen.png', 'tile_floor_ylinen.png', 'tile_floor_void.png',
        'tile_hazard_vainola.png', 'tile_hazard_pohjola.png', 'tile_hazard_tuonela.png',
        'tile_hazard_alinen.png', 'tile_hazard_ilman_luominen.png', 'tile_hazard_ylinen.png',
        'tile_conduit.png', 'tile_shrine.png', 'tile_gate.png',
        # Wall / Obstacle Sprites
        'obstacle_vainola_pine_giant.png', 'obstacle_vainola_pine_medium.png', 'obstacle_vainola_pine_small.png',
        'obstacle_vainola_spruce.png', 'obstacle_vainola_boulder.png',
        'obstacle_pohjola_spruce.png', 'obstacle_pohjola_spire.png',
        'obstacle_tuonela_kelo_tree.png', 'obstacle_tuonela_skull_cairn.png', 'obstacle_tuonela_monolith.png',
        'obstacle_alinen_rock.png', 'obstacle_alinen_magma_vent.png',
        'obstacle_ilmatar_mountain.png', 'obstacle_ilmatar_eggshell.png',
        'obstacle_ylinen_obelisk.png', 'obstacle_ylinen_crystal_spire.png'
    ]

    os.makedirs(args.dst_dir, exist_ok=True)

    processed_count = 0
    for filename in target_files:
        src_path = os.path.join(args.src_dir, filename)
        if not os.path.exists(src_path):
            print(f"⚠️ Warning: {filename} not found in {args.src_dir}")
            continue

        dst_path = os.path.join(args.dst_dir, filename)
        img = Image.open(src_path)
        pixelated = pixelit_image(img, scale_factor=scale_factor, alpha_threshold=args.alpha_threshold)
        pixelated.save(dst_path, format="PNG")
        processed_count += 1
        print(f"✓ Pixelated {filename} ({img.size[0]}x{img.size[1]} -> scale {scale_factor:.4f})")

    print(f"\n🎉 Successfully processed {processed_count} assets with PixelIt.")

if __name__ == '__main__':
    main()
