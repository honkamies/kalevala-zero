// Smooth 2D Side-Scroller Camera with Look-Ahead, Screen Shake, and Multi-Layer Parallax Support
import { graphicsEngine } from '../engine/graphics';

export class PlatformerCamera {
  public x: number = 0;
  public y: number = 0;
  public targetX: number = 0;
  public targetY: number = 0;

  // Zoom control (Spacious default field of view for generous platforming awareness)
  public zoom: number = 0.75;
  public targetZoom: number = 0.75;
  public minZoom: number = 0.50;
  public maxZoom: number = 1.30;

  public viewportWidth: number = 480;
  public viewportHeight: number = 270;
  public tileSize: number = 48; // Standard pixel width/height per tile

  // Soft camera deadzone (leash window in pixels): player can move slightly around center
  // without the camera being rigidly glued to them.
  public deadZoneX: number = 72; // ~1.5 tiles horizontal freedom
  public deadZoneY: number = 44; // ~0.9 tiles vertical freedom

  // Screen shake
  private shakeDuration: number = 0;
  private shakeTotalDuration: number = 0.25;
  private shakeMagnitude: number = 0;
  public shakeOffsetX: number = 0;
  public shakeOffsetY: number = 0;

  // Global shake scale dampener (reduces all shakes across the game to be calm, smooth & controlled)
  public static readonly SHAKE_DAMPENER: number = 0.45;

  // Bounds clamping
  public minX: number = 0;
  public maxX: number = 10000;
  public minY: number = 0;
  public maxY: number = 2000;

  public canvas?: HTMLCanvasElement;

  constructor(canvas?: HTMLCanvasElement) {
    this.canvas = canvas;
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
    graphicsEngine.onSettingsChange(() => this.handleResize());
  }

  handleResize(viewportW?: number, viewportH?: number) {
    if (viewportW !== undefined && viewportH !== undefined && viewportW > 0 && viewportH > 0) {
      this.viewportWidth = viewportW;
      this.viewportHeight = viewportH;
      return;
    }
    if (this.canvas && this.canvas.width > 0 && this.canvas.height > 0) {
      this.viewportWidth = this.canvas.width;
      this.viewportHeight = this.canvas.height;
      return;
    }
    const dims = graphicsEngine.getVirtualDimensions(window.innerWidth, window.innerHeight);
    this.viewportWidth = dims.width;
    this.viewportHeight = dims.height;
  }

  setZoom(zoomLevel: number) {
    this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoomLevel));
  }

  changeZoom(delta: number) {
    this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.targetZoom + delta));
  }

  setBounds(minX: number, maxX: number, minY: number, maxY: number) {
    this.minX = minX * this.tileSize;
    this.maxX = maxX * this.tileSize;
    this.minY = minY * this.tileSize;
    this.maxY = maxY * this.tileSize;
    this.clampCamera();
  }

  setTarget(worldX: number, worldY: number, facingDir: number = 1, velX: number = 0) {
    // Dynamic look-ahead based on player movement velocity
    const lookAheadX = Math.max(-42, Math.min(42, velX * 7));
    const lookAheadY = -24;

    const playerPx = worldX * this.tileSize;
    const playerPy = worldY * this.tileSize + lookAheadY;

    // Organic soft deadzone tracking:
    // If player is within deadZoneX/deadZoneY, the camera stays stable and lets the player move.
    // As the player pushes outside the deadzone, target smoothly catches up!
    const diffX = playerPx - this.targetX;
    if (diffX > this.deadZoneX) {
      this.targetX = playerPx - this.deadZoneX + lookAheadX;
    } else if (diffX < -this.deadZoneX) {
      this.targetX = playerPx + this.deadZoneX + lookAheadX;
    } else if (Math.abs(velX) > 0.5) {
      this.targetX += lookAheadX * 0.15;
    }

    const diffY = playerPy - this.targetY;
    if (diffY > this.deadZoneY) {
      this.targetY = playerPy - this.deadZoneY;
    } else if (diffY < -this.deadZoneY) {
      this.targetY = playerPy + this.deadZoneY;
    }
  }

  snapTo(worldX: number, worldY: number) {
    this.x = worldX * this.tileSize;
    this.y = worldY * this.tileSize - 24;
    this.targetX = this.x;
    this.targetY = this.y;
    this.clampCamera();
  }

  public clampCamera() {
    const halfW = (this.viewportWidth / 2) / this.zoom;
    const halfH = (this.viewportHeight / 2) / this.zoom;

    if (this.maxX - this.minX >= halfW * 2) {
      this.x = Math.max(this.minX + halfW, Math.min(this.maxX - halfW, this.x));
      this.targetX = Math.max(this.minX + halfW, Math.min(this.maxX - halfW, this.targetX));
    } else {
      this.x = (this.minX + this.maxX) / 2;
      this.targetX = this.x;
    }

    if (this.maxY - this.minY >= halfH * 2) {
      this.y = Math.max(this.minY + halfH, Math.min(this.maxY - halfH, this.y));
      this.targetY = Math.max(this.minY + halfH, Math.min(this.maxY - halfH, this.targetY));
    } else {
      this.y = (this.minY + this.maxY) / 2;
      this.targetY = this.y;
    }
  }

  addShake(magnitude: number = 3, duration: number = 0.2) {
    if (!graphicsEngine.isScreenShakeEnabled()) {
      this.shakeMagnitude = 0;
      this.shakeDuration = 0;
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
      return;
    }
    const dampedMag = magnitude * PlatformerCamera.SHAKE_DAMPENER;
    this.shakeMagnitude = Math.max(this.shakeMagnitude, dampedMag);
    this.shakeDuration = Math.max(this.shakeDuration, duration);
    this.shakeTotalDuration = Math.max(this.shakeDuration, 0.05);
  }

  update(dt: number) {
    // Smooth camera tracking
    const lerpSpeedX = 6.5 * dt;
    const lerpSpeedY = 7.5 * dt;
    this.x += (this.targetX - this.x) * Math.min(lerpSpeedX, 1.0);
    this.y += (this.targetY - this.y) * Math.min(lerpSpeedY, 1.0);

    // Zoom lerp
    const zoomLerpSpeed = 8.0 * dt;
    this.zoom += (this.targetZoom - this.zoom) * Math.min(zoomLerpSpeed, 1.0);

    // Apply bounds clamping
    this.clampCamera();

    // Screen Shake
    if (!graphicsEngine.isScreenShakeEnabled()) {
      this.shakeMagnitude = 0;
      this.shakeDuration = 0;
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
    } else if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
      const decay = Math.max(0, this.shakeDuration) / (this.shakeTotalDuration || 0.25);
      const currentOffset = this.shakeMagnitude * decay;
      this.shakeOffsetX = (Math.random() * 2 - 1) * currentOffset;
      this.shakeOffsetY = (Math.random() * 2 - 1) * currentOffset;
      if (this.shakeDuration <= 0) {
        this.shakeMagnitude = 0;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
      }
    }
  }

  // World coordinates (in tile units) to screen pixel coordinates
  worldToScreen(wx: number, wy: number): { x: number; y: number } {
    const pixelX = wx * this.tileSize;
    const pixelY = wy * this.tileSize;

    return {
      x: this.viewportWidth / 2 + (pixelX - this.x) * this.zoom + this.shakeOffsetX,
      y: this.viewportHeight / 2 + (pixelY - this.y) * this.zoom + this.shakeOffsetY
    };
  }

  // Screen pixel coordinates to world tile coordinates
  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    const unscaledX = (sx - (this.viewportWidth / 2 + this.shakeOffsetX)) / this.zoom + this.x;
    const unscaledY = (sy - (this.viewportHeight / 2 + this.shakeOffsetY)) / this.zoom + this.y;

    return {
      x: unscaledX / this.tileSize,
      y: unscaledY / this.tileSize
    };
  }

  // Get Parallax Offset for a given depth speed multiplier
  getParallaxOffset(factor: number): { offsetX: number; offsetY: number } {
    return {
      offsetX: -this.x * factor,
      offsetY: -this.y * factor * 0.4
    };
  }

  // Get Visible Tile Bounds for Frustum Culling
  getVisibleTileBounds(levelWidth: number, levelHeight: number, pad: number = 2): { minX: number; maxX: number; minY: number; maxY: number } {
    const halfW = (this.viewportWidth / 2) / (this.tileSize * this.zoom);
    const halfH = (this.viewportHeight / 2) / (this.tileSize * this.zoom);

    const centerTileX = this.x / this.tileSize;
    const centerTileY = this.y / this.tileSize;

    const minX = Math.max(0, Math.floor(centerTileX - halfW) - pad);
    const maxX = Math.min(levelWidth - 1, Math.ceil(centerTileX + halfW) + pad);
    const minY = Math.max(0, Math.floor(centerTileY - halfH) - pad);
    const maxY = Math.min(levelHeight - 1, Math.ceil(centerTileY + halfH) + pad);

    return { minX, maxX, minY, maxY };
  }
}
