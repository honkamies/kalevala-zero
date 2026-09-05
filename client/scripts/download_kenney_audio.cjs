const fs = require('fs');
const path = require('path');
const https = require('https');

const OUT_BASE = path.join(__dirname, '../public/audio/sfx');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Node.js Kenney Audio Downloader' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Follow redirect
        return resolve(downloadFile(res.headers.location, destPath));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download ${url}: HTTP ${res.statusCode}`));
      }

      const fileStream = fs.createWriteStream(destPath);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });
      fileStream.on('error', (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

const KENNEY_DOWNLOADS = [
  // Kenney RPG Audio (Weapons & Impacts)
  {
    url: 'https://raw.githubusercontent.com/Boyquotes/kenney-rpg-audio-for-godot/main/addons/kenney%20rpg%20audio/knife_slice.ogg',
    dest: 'weapons/knife_slice_1.ogg'
  },
  {
    url: 'https://raw.githubusercontent.com/Boyquotes/kenney-rpg-audio-for-godot/main/addons/kenney%20rpg%20audio/knife_slice_2.ogg',
    dest: 'weapons/knife_slice_2.ogg'
  },
  {
    url: 'https://raw.githubusercontent.com/Boyquotes/kenney-rpg-audio-for-godot/main/addons/kenney%20rpg%20audio/chop.ogg',
    dest: 'weapons/chop_1.ogg'
  },
  {
    url: 'https://raw.githubusercontent.com/Boyquotes/kenney-rpg-audio-for-godot/main/addons/kenney%20rpg%20audio/chop_2.ogg',
    dest: 'weapons/chop_2.ogg'
  },
  {
    url: 'https://raw.githubusercontent.com/Boyquotes/kenney-rpg-audio-for-godot/main/addons/kenney%20rpg%20audio/cloth_1.ogg',
    dest: 'weapons/dodge_cloth_1.ogg'
  },
  {
    url: 'https://raw.githubusercontent.com/Boyquotes/kenney-rpg-audio-for-godot/main/addons/kenney%20rpg%20audio/cloth_2.ogg',
    dest: 'weapons/dodge_cloth_2.ogg'
  },
  {
    url: 'https://raw.githubusercontent.com/Boyquotes/kenney-rpg-audio-for-godot/main/addons/kenney%20rpg%20audio/cloth_3.ogg',
    dest: 'weapons/dodge_cloth_3.ogg'
  },
  {
    url: 'https://raw.githubusercontent.com/Boyquotes/kenney-rpg-audio-for-godot/main/addons/kenney%20rpg%20audio/metal_pot_1.ogg',
    dest: 'impacts/shield_metal_1.ogg'
  },
  {
    url: 'https://raw.githubusercontent.com/Boyquotes/kenney-rpg-audio-for-godot/main/addons/kenney%20rpg%20audio/metal_pot_2.ogg',
    dest: 'impacts/shield_metal_2.ogg'
  },
  {
    url: 'https://raw.githubusercontent.com/Boyquotes/kenney-rpg-audio-for-godot/main/addons/kenney%20rpg%20audio/metal_click.ogg',
    dest: 'impacts/metal_click.ogg'
  },
  {
    url: 'https://raw.githubusercontent.com/Boyquotes/kenney-rpg-audio-for-godot/main/addons/kenney%20rpg%20audio/coin_1.ogg',
    dest: 'ui/coin_1.ogg'
  },
  {
    url: 'https://raw.githubusercontent.com/Boyquotes/kenney-rpg-audio-for-godot/main/addons/kenney%20rpg%20audio/coin_2.ogg',
    dest: 'ui/coin_2.ogg'
  },
  {
    url: 'https://raw.githubusercontent.com/Boyquotes/kenney-rpg-audio-for-godot/main/addons/kenney%20rpg%20audio/coin_3.ogg',
    dest: 'ui/coin_3.ogg'
  },
  {
    url: 'https://raw.githubusercontent.com/Boyquotes/kenney-rpg-audio-for-godot/main/addons/kenney%20rpg%20audio/bell_small.ogg',
    dest: 'ui/bell_small.ogg'
  },
  {
    url: 'https://raw.githubusercontent.com/Boyquotes/kenney-rpg-audio-for-godot/main/addons/kenney%20rpg%20audio/bell_large.ogg',
    dest: 'ui/bell_large.ogg'
  },

  // Kenney Digital Audio (Sci-Fi Blasters, Zaps, Lasers)
  {
    url: 'https://raw.githubusercontent.com/Boyquotes/kenney-digital-audio-for-godot/main/addons/kenney%20digital%20audio/laser_1.ogg',
    dest: 'weapons/laser_1.ogg'
  },
  {
    url: 'https://raw.githubusercontent.com/Boyquotes/kenney-digital-audio-for-godot/main/addons/kenney%20digital%20audio/laser_2.ogg',
    dest: 'weapons/laser_2.ogg'
  },
  {
    url: 'https://raw.githubusercontent.com/Boyquotes/kenney-digital-audio-for-godot/main/addons/kenney%20digital%20audio/laser_3.ogg',
    dest: 'weapons/laser_3.ogg'
  },
  {
    url: 'https://raw.githubusercontent.com/Boyquotes/kenney-digital-audio-for-godot/main/addons/kenney%20digital%20audio/laser_4.ogg',
    dest: 'weapons/laser_4.ogg'
  },
  {
    url: 'https://raw.githubusercontent.com/Boyquotes/kenney-digital-audio-for-godot/main/addons/kenney%20digital%20audio/laser_5.ogg',
    dest: 'weapons/laser_5.ogg'
  },
  {
    url: 'https://raw.githubusercontent.com/Boyquotes/kenney-digital-audio-for-godot/main/addons/kenney%20digital%20audio/zap_1.ogg',
    dest: 'monsters/zap_1.ogg'
  },
  {
    url: 'https://raw.githubusercontent.com/Boyquotes/kenney-digital-audio-for-godot/main/addons/kenney%20digital%20audio/zap_2.ogg',
    dest: 'monsters/zap_2.ogg'
  },
  {
    url: 'https://raw.githubusercontent.com/Boyquotes/kenney-digital-audio-for-godot/main/addons/kenney%20digital%20audio/zap_three_tone_down.ogg',
    dest: 'monsters/zap_three_tone_down.ogg'
  },
  {
    url: 'https://raw.githubusercontent.com/Boyquotes/kenney-digital-audio-for-godot/main/addons/kenney%20digital%20audio/zap_three_tone_up.ogg',
    dest: 'monsters/zap_three_tone_up.ogg'
  },
  {
    url: 'https://raw.githubusercontent.com/Boyquotes/kenney-digital-audio-for-godot/main/addons/kenney%20digital%20audio/power_up_1.ogg',
    dest: 'ui/power_up_1.ogg'
  },
  {
    url: 'https://raw.githubusercontent.com/Boyquotes/kenney-digital-audio-for-godot/main/addons/kenney%20digital%20audio/power_up_2.ogg',
    dest: 'ui/power_up_2.ogg'
  },
  {
    url: 'https://raw.githubusercontent.com/Boyquotes/kenney-digital-audio-for-godot/main/addons/kenney%20digital%20audio/two_tone_1.ogg',
    dest: 'ui/two_tone_1.ogg'
  },
  {
    url: 'https://raw.githubusercontent.com/Boyquotes/kenney-digital-audio-for-godot/main/addons/kenney%20digital%20audio/two_tone_2.ogg',
    dest: 'ui/two_tone_2.ogg'
  },

  // Kenney UI Audio (Tactile Clicks & Switches)
  {
    url: 'https://raw.githubusercontent.com/Calinou/kenney-ui-audio/master/addons/kenney_ui_audio/click1.wav',
    dest: 'ui/kenney_click_1.wav'
  },
  {
    url: 'https://raw.githubusercontent.com/Calinou/kenney-ui-audio/master/addons/kenney_ui_audio/click2.wav',
    dest: 'ui/kenney_click_2.wav'
  },
  {
    url: 'https://raw.githubusercontent.com/Calinou/kenney-ui-audio/master/addons/kenney_ui_audio/click3.wav',
    dest: 'ui/kenney_click_3.wav'
  },
  {
    url: 'https://raw.githubusercontent.com/Calinou/kenney-ui-audio/master/addons/kenney_ui_audio/switch1.wav',
    dest: 'ui/kenney_switch_1.wav'
  },
  {
    url: 'https://raw.githubusercontent.com/Calinou/kenney-ui-audio/master/addons/kenney_ui_audio/switch2.wav',
    dest: 'ui/kenney_switch_2.wav'
  }
];

async function main() {
  console.log(`Downloading ${KENNEY_DOWNLOADS.length} Kenney CC0 sound effects from public repository...`);
  
  let successCount = 0;
  for (const item of KENNEY_DOWNLOADS) {
    const fullDest = path.join(OUT_BASE, item.dest);
    ensureDir(path.dirname(fullDest));
    try {
      await downloadFile(item.url, fullDest);
      const stats = fs.statSync(fullDest);
      console.log(`✓ Downloaded [${(stats.size / 1024).toFixed(1)} KB]: ${item.dest}`);
      successCount++;
    } catch (err) {
      console.warn(`✗ Failed to download ${item.dest}:`, err.message);
    }
  }

  console.log(`\nSuccessfully downloaded ${successCount}/${KENNEY_DOWNLOADS.length} Kenney CC0 game sound assets!`);
}

main();
