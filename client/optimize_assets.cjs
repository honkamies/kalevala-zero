const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, 'public', 'assets');

async function run() {
  console.log('--- Optimizing Biome Thumbnails for Fast UI Loading ---');

  const biomeMaps = [
    { src: 'biome_ilmatar.jpg', thumb: 'thumb_biome_ilmatar.jpg' },
    { src: 'biome_vainola.jpg', thumb: 'thumb_biome_vainola.jpg' },
    { src: 'biome_pohjola.jpg', thumb: 'thumb_biome_pohjola.jpg' },
    { src: 'biome_tuonela.jpg', thumb: 'thumb_biome_tuonela.jpg' },
    { src: 'biome_alinen.jpg', thumb: 'thumb_biome_alinen.jpg' },
    { src: 'biome_ylinen.jpg', thumb: 'thumb_biome_ylinen.jpg' }
  ];

  for (const b of biomeMaps) {
    const srcPath = path.join(assetsDir, b.src);
    const thumbPath = path.join(assetsDir, b.thumb);

    if (fs.existsSync(srcPath)) {
      await sharp(srcPath)
        .resize(360, 240, { fit: 'cover' })
        .jpeg({ quality: 80, progressive: true })
        .toFile(thumbPath);

      const srcSize = (fs.statSync(srcPath).size / 1024).toFixed(1);
      const thumbSize = (fs.statSync(thumbPath).size / 1024).toFixed(1);
      console.log(`✓ Created ${b.thumb}: ${srcSize} KB -> ${thumbSize} KB`);
    }
  }

  console.log('\n--- Optimizing Carousel Backgrounds (920x520) ---');
  const carouselMaps = [
    { src: 'biome_ilmatar.jpg', out: 'carousel_ilman_luominen.jpg' },
    { src: 'biome_vainola.jpg', out: 'carousel_vainola.jpg' },
    { src: 'biome_pohjola.jpg', out: 'carousel_pohjola.jpg' },
    { src: 'biome_tuonela.jpg', out: 'carousel_tuonela.jpg' },
    { src: 'biome_alinen.jpg', out: 'carousel_alinen.jpg' },
    { src: 'biome_ylinen.jpg', out: 'carousel_ylinen.jpg' }
  ];

  for (const c of carouselMaps) {
    const srcPath = path.join(assetsDir, c.src);
    const outPath = path.join(assetsDir, c.out);

    if (fs.existsSync(srcPath)) {
      await sharp(srcPath)
        .resize(920, 520, { fit: 'cover', position: 'center' })
        .jpeg({ quality: 82, progressive: true, mozjpeg: true })
        .toFile(outPath);

      const outSize = (fs.statSync(outPath).size / 1024).toFixed(1);
      console.log(`✓ Created ${c.out}: ${outSize} KB`);
    }
  }

  console.log('\n--- Optimizing Sprites (512x512) for Instant Gameplay Loading ---');
  const sprites = [
    'hero_soturi.jpg',
    'void_portal_rift.jpg',
    'boss_sotka.jpg',
    'boss_surma.jpg',
    'louhi_boss.jpg',
    'boss_tuoni.jpg',
    'boss_ikuturso.jpg',
    'boss_ukko.jpg',
    'enemy_hound.jpg',
    'enemy_marauder.jpg',
    'enemy_wisp.jpg'
  ];

  for (const s of sprites) {
    const p = path.join(assetsDir, s);
    if (fs.existsSync(p)) {
      const origSize = (fs.statSync(p).size / 1024).toFixed(1);
      const buffer = await sharp(p)
        .resize(512, 512, { fit: 'inside' })
        .jpeg({ quality: 85, progressive: true })
        .toBuffer();
      fs.writeFileSync(p, buffer);
      const newSize = (fs.statSync(p).size / 1024).toFixed(1);
      console.log(`✓ Optimized ${s}: ${origSize} KB -> ${newSize} KB`);
    }
  }
}

run().catch(console.error);
