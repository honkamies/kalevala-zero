// Dynamic 2.5D Lighting & Ambient Darkness Engine with Smooth Organic Vision Masking

export interface LightSource {
  x: number;
  y: number;
  z?: number;
  radius: number;
  color: string;
  intensity: number;
  flicker?: boolean;
}

export class LightingEngine {
  public lights: LightSource[] = [];
  public ambientColor: string = 'rgba(8, 14, 26, 0.88)';

  setBiomeAmbient(biome: string) {
    switch (biome) {
      case 'ilman_luominen':
        // Deep cosmic void blue with starry undertone
        this.ambientColor = 'rgba(6, 11, 24, 0.86)';
        break;
      case 'vainola':
        // Dark pine forest green & misty glow
        this.ambientColor = 'rgba(4, 18, 14, 0.85)';
        break;
      case 'pohjola':
        // Crisp sub-zero ice blue & dark steel
        this.ambientColor = 'rgba(7, 14, 26, 0.88)';
        break;
      case 'tuonela':
        // Pitch stygian darkness & oppressive despair of Manala (tuned for clear visibility near walls)
        this.ambientColor = 'rgba(4, 4, 10, 0.86)';
        break;
      case 'alinen':
        // Dark volcanic obsidian with glowing magma embers
        this.ambientColor = 'rgba(22, 6, 4, 0.88)';
        break;
      case 'ylinen':
        // High celestial dark violet & golden solar arc radiance
        this.ambientColor = 'rgba(16, 12, 32, 0.84)';
        break;
      case 'void_dimension':
        // Deep cosmic void astral darkness & glowing nebula aura
        this.ambientColor = 'rgba(8, 2, 18, 0.86)';
        break;
      default:
        this.ambientColor = 'rgba(8, 14, 26, 0.88)';
    }
  }

  addLight(light: LightSource) {
    this.lights.push(light);
  }

  clearTransientLights() {
    this.lights.length = 0;
  }

  render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    worldToScreen: (wx: number, wy: number, wz?: number) => { x: number; y: number },
    zoom: number,
    visionPolygon?: { x: number; y: number }[],
    playerPos?: { x: number; y: number }
  ) {
    ctx.clearRect(0, 0, width, height);

    // 1. Fill entire screen with realm darkness & mist
    ctx.fillStyle = this.ambientColor;
    ctx.fillRect(0, 0, width, height);

    // 2. Punch out the darkness using destination-out
    ctx.globalCompositeOperation = 'destination-out';

    const now = performance.now() * 0.003;

    // A. HERO SIGHT & 2.5D ISOMETRIC WALL ILLUMINATION
    if (playerPos) {
      const heroScreen = worldToScreen(playerPos.x, playerPos.y, 0);
      const maxDistPixels = 30.0 * 32 * zoom;

      // 1. Guaranteed Hero Self-Illumination Core (Prevents hero sprite, head, and wall above from ever being shadowed)
      const heroCoreRadius = 4.8 * 32 * zoom;
      const heroCoreGrad = ctx.createRadialGradient(
        heroScreen.x, heroScreen.y - 20 * zoom, 4 * zoom,
        heroScreen.x, heroScreen.y - 20 * zoom, heroCoreRadius
      );
      heroCoreGrad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
      heroCoreGrad.addColorStop(0.55, 'rgba(0, 0, 0, 0.98)');
      heroCoreGrad.addColorStop(0.80, 'rgba(0, 0, 0, 0.70)');
      heroCoreGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

      ctx.save();
      ctx.fillStyle = heroCoreGrad;
      ctx.beginPath();
      ctx.arc(heroScreen.x, heroScreen.y - 20 * zoom, heroCoreRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 2. Wide Directional Sight Vision Envelope with 2.5D Vertical Wall Height Offset
      const sightGrad = ctx.createRadialGradient(
        heroScreen.x, heroScreen.y, 0,
        heroScreen.x, heroScreen.y, maxDistPixels
      );
      sightGrad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
      sightGrad.addColorStop(0.70, 'rgba(0, 0, 0, 0.98)');
      sightGrad.addColorStop(0.88, 'rgba(0, 0, 0, 0.80)');
      sightGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

      ctx.save();
      // Polished soft edge blur (6px) for smooth organic revealed area borders
      ctx.filter = 'blur(6px)';
      ctx.fillStyle = sightGrad;

      if (visionPolygon && visionPolygon.length > 2) {
        // Base ground polygon
        const pts: { x: number; y: number }[] = [];
        for (let i = 0; i < visionPolygon.length; i++) {
          pts.push(worldToScreen(visionPolygon[i].x, visionPolygon[i].y, 0));
        }

        ctx.beginPath();
        const len = pts.length;
        const firstMidX = (pts[len - 1].x + pts[0].x) / 2;
        const firstMidY = (pts[len - 1].y + pts[0].y) / 2;
        ctx.moveTo(firstMidX, firstMidY);

        for (let i = 0; i < len; i++) {
          const next = pts[(i + 1) % len];
          const midX = (pts[i].x + next.x) / 2;
          const midY = (pts[i].y + next.y) / 2;
          ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
        }
        ctx.closePath();
        ctx.fill();

        // Upward-extended polygon pass: lifts vision envelope vertically to fully illuminate standing 2.5D wall structures
        ctx.beginPath();
        const heightLift = 22 * zoom;
        ctx.moveTo(firstMidX, firstMidY - heightLift);
        for (let i = 0; i < len; i++) {
          const next = pts[(i + 1) % len];
          const midX = (pts[i].x + next.x) / 2;
          const midY = ((pts[i].y + next.y) / 2) - heightLift;
          ctx.quadraticCurveTo(pts[i].x, pts[i].y - heightLift, midX, midY);
        }
        ctx.closePath();
        ctx.fill();
      } else {
        // Fallback immediate vision circle around player
        ctx.beginPath();
        ctx.arc(heroScreen.x, heroScreen.y - 15 * zoom, 16.0 * 32 * zoom, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }


    // B. TRANSIENT LIGHT SOURCES (Portals, Projectiles, Boss Auras, Explosions)
    for (const light of this.lights) {
      const screenPos = worldToScreen(light.x, light.y, light.z || 0);

      let radius = light.radius * zoom * 32;
      if (light.flicker) {
        radius *= 0.92 + Math.sin(now + light.x * 10) * 0.08;
      }

      if (screenPos.x + radius < 0 || screenPos.x - radius > width ||
          screenPos.y + radius < 0 || screenPos.y - radius > height) {
        continue;
      }

      const grad = ctx.createRadialGradient(
        screenPos.x, screenPos.y, 0,
        screenPos.x, screenPos.y, radius
      );

      grad.addColorStop(0, `rgba(0, 0, 0, ${light.intensity})`);
      grad.addColorStop(0.5, `rgba(0, 0, 0, ${light.intensity * 0.5})`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
  }
}

export const lightingEngine = new LightingEngine();
