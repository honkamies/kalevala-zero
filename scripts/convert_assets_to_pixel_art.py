#!/usr/bin/env python3
import os
from PIL import Image, ImageEnhance, ImageFilter, ImageOps

BACKUP_DIR = "/root/sampo-zero/client/public/assets_original_backup"
ASSETS_DIR = "/root/sampo-zero/client/public/assets"

def make_chunky_pixel_art(input_path: str, output_path: str, target_pixel_w: int, num_colors: int = 24, contrast: float = 1.35, saturation: float = 1.25):
    with Image.open(input_path) as img:
        has_alpha = img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info)
        orig_w, orig_h = img.size
        aspect_ratio = orig_h / orig_w
        target_pixel_h = max(16, int(target_pixel_w * aspect_ratio))

        alpha_channel = None
        if has_alpha:
            img = img.convert("RGBA")
            alpha_channel = img.split()[3]
            rgb_img = img.convert("RGB")
        else:
            rgb_img = img.convert("RGB")

        # 1. Edge & Silhouette boost: slightly unsharp mask
        rgb_img = rgb_img.filter(ImageFilter.UnsharpMask(radius=2, percent=150, threshold=3))

        # 2. Color & Contrast boost so pixel clusters pop boldly
        enhancer = ImageEnhance.Color(rgb_img)
        rgb_img = enhancer.enhance(saturation)
        enhancer = ImageEnhance.Contrast(rgb_img)
        rgb_img = enhancer.enhance(contrast)

        # 3. Downscale to chunky low-res pixel grid
        # BOX / BILINEAR downscaling blends pixels cleanly before quantization
        small_img = rgb_img.resize((target_pixel_w, target_pixel_h), resample=Image.Resampling.BILINEAR)

        # 4. 24-32 Color Quantization with Floyd-Steinberg Dithering
        quantized = small_img.quantize(colors=num_colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG)
        quantized_rgb = quantized.convert("RGB")

        # 5. Nearest-Neighbor Upscale back to original full size (Chunky retro pixels!)
        pixelated = quantized_rgb.resize((orig_w, orig_h), resample=Image.Resampling.NEAREST)

        # 6. Re-apply Alpha channel if PNG
        if has_alpha and alpha_channel:
            small_alpha = alpha_channel.resize((target_pixel_w, target_pixel_h), resample=Image.Resampling.BOX)
            small_alpha = small_alpha.point(lambda p: 255 if p > 80 else 0)
            pixel_alpha = small_alpha.resize((orig_w, orig_h), resample=Image.Resampling.NEAREST)
            
            pixelated_rgba = pixelated.convert("RGBA")
            pixelated_rgba.putalpha(pixel_alpha)
            pixelated_rgba.save(output_path, "PNG", optimize=True)
        else:
            # Preserve black backgrounds for Chroma-Key
            pixelated.save(output_path, "JPEG", quality=95)

def main():
    files = [f for f in os.listdir(BACKUP_DIR) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    print(f"Converting {len(files)} original backup assets to BOLD CHUNKY pixel art...")

    count = 0
    for filename in sorted(files):
        in_path = os.path.join(BACKUP_DIR, filename)
        out_path = os.path.join(ASSETS_DIR, filename)

        if filename.startswith("carousel_") or filename.startswith("biome_") or filename.startswith("gallen_") or filename.startswith("ilmarinen_") or filename.startswith("tuonela_") or filename.startswith("vainola_") or filename.startswith("pohjola_"):
            # Landscapes / Backgrounds: 160px wide (giving ~8px chunky pixel blocks on screen!)
            target_w = 160
            colors = 28
        elif filename.startswith("boss_") or filename.startswith("skeleton_"):
            # Bosses: 96px wide
            target_w = 96
            colors = 24
        elif filename.startswith("hero_") or filename.startswith("cyber_hero_"):
            # Hero Characters: 80px wide
            target_w = 80
            colors = 20
        elif filename.startswith("enemy_"):
            # Standard Enemies: 80px wide
            target_w = 80
            colors = 18
        elif filename.startswith("tile_"):
            # Ground & Hazard Tiles: 128px wide
            target_w = 128
            colors = 24
        elif filename.startswith("obstacle_"):
            # Wall & Tree Obstacles: 88px wide
            target_w = 88
            colors = 24
        elif filename.startswith("thumb_"):
            # UI Thumbnails: 40px wide
            target_w = 40
            colors = 16
        else:
            target_w = 96
            colors = 24

        try:
            make_chunky_pixel_art(in_path, out_path, target_pixel_w=target_w, num_colors=colors)
            count += 1
            print(f"[{count}/{len(files)}] Bold Pixel Art: {filename} -> (grid {target_w}px, {colors} colors)")
        except Exception as e:
            print(f"Failed to convert {filename}: {e}")

    print(f"\nSuccessfully converted {count} assets to bold, prominent retro pixel art!")

if __name__ == "__main__":
    main()
