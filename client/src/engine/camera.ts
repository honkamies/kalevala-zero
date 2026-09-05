// Isometric 2.5D Camera Controller with Smooth Tracking, Screen Shake, and Dynamic Zoom
import { graphicsEngine } from './graphics';

export class IsometricCamera {
  public x: number = 0;
  public y: number = 0;
  public targetX: number = 0;
  public targetY: number = 0;

  // Zoom control (Spacious field of view for natural corridor & arena navigation)
  public zoom: number = 0.85;
  public targetZoom: number = 0.85;
  public minZoom: number = 0.40;
  public maxZoom: number = 2.0;

  public tileWidth: number = 64;
  public tileHeight: number = 32;

  public viewportWidth: number = window.innerWidth;
  public viewportHeight: number = window.innerHeight;
  public pixelSnap: boolean = true;

  // Screen shake
  private shakeDuration: number = 0;
  private shakeTotalDuration: number = 0.25;
  private shakeMagnitude: number = 0;
  public shakeOffsetX: number = 0;
  public shakeOffsetY: number = 0;

  // Global shake scale dampener (reduces all shakes across the game to be calm, smooth & controlled)
  public static readonly SHAKE_DAMPENER: number = 0.45;

  constructor() {
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
  }

  handleResize(viewportW?: number, viewportH?: number) {
    this.viewportWidth = viewportW || window.innerWidth;
    this.viewportHeight = viewportH || window.innerHeight;
  }

  // Adjust zoom level smoothly
  changeZoom(delta: number) {
    this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.targetZoom + delta));
  }

  setZoom(zoomLevel: number) {
    this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoomLevel));
  }

  setTarget(worldX: number, worldY: number, mouseOffsetX: number = 0, mouseOffsetY: number = 0) {
    // Dynamic look-ahead framing biased in the direction the hero is watching
    const dist = Math.sqrt(mouseOffsetX * mouseOffsetX + mouseOffsetY * mouseOffsetY);
    const maxLookAhead = 5.0;
    const factor = 0.25;
    const clampedDist = Math.min(dist * factor, maxLookAhead);
    const angle = Math.atan2(mouseOffsetY, mouseOffsetX);

    this.targetX = worldX + (dist > 0.01 ? Math.cos(angle) * clampedDist : 0);
    this.targetY = worldY + (dist > 0.01 ? Math.sin(angle) * clampedDist : 0);
  }

  snapTo(worldX: number, worldY: number) {
    this.x = worldX;
    this.y = worldY;
    this.targetX = worldX;
    this.targetY = worldY;
  }

  addShake(magnitude: number = 3, duration: number = 0.2) {
    if (!graphicsEngine.isScreenShakeEnabled()) {
      this.shakeMagnitude = 0;
      this.shakeDuration = 0;
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
      return;
    }
    const dampedMag = magnitude * IsometricCamera.SHAKE_DAMPENER;
    this.shakeMagnitude = Math.max(this.shakeMagnitude, dampedMag);
    this.shakeDuration = Math.max(this.shakeDuration, duration);
    this.shakeTotalDuration = Math.max(this.shakeDuration, 0.05);
  }

  update(dt: number) {
    // Smooth Camera Lerp
    const lerpSpeed = 7.0 * dt;
    this.x += (this.targetX - this.x) * Math.min(lerpSpeed, 1.0);
    this.y += (this.targetY - this.y) * Math.min(lerpSpeed, 1.0);

    // Smooth Zoom Lerp
    const zoomLerpSpeed = 9.0 * dt;
    this.zoom += (this.targetZoom - this.zoom) * Math.min(zoomLerpSpeed, 1.0);

    // Screen Shake update
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

  worldToScreen(wx: number, wy: number, wz: number = 0): { x: number; y: number } {
    const relX = wx - this.x;
    const relY = wy - this.y;

    const isoX = (relX - relY) * (this.tileWidth / 2);
    const isoY = (relX + relY) * (this.tileHeight / 2) - wz;

    let sx = this.viewportWidth / 2 + isoX * this.zoom + this.shakeOffsetX;
    let sy = this.viewportHeight / 2 + isoY * this.zoom + this.shakeOffsetY;

    if (this.pixelSnap) {
      sx = Math.round(sx);
      sy = Math.round(sy);
    }

    return { x: sx, y: sy };
  }

  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    const adjX = (sx - (this.viewportWidth / 2 + this.shakeOffsetX)) / this.zoom;
    const adjY = (sy - (this.viewportHeight / 2 + this.shakeOffsetY)) / this.zoom;

    const halfW = this.tileWidth / 2;
    const halfH = this.tileHeight / 2;

    const relX = (adjX / halfW + adjY / halfH) / 2;
    const relY = (adjY / halfH - adjX / halfW) / 2;

    return {
      x: this.x + relX,
      y: this.y + relY
    };
  }

  // Fast Frustum Bounding Box in Tile Coordinates
  getVisibleTileBounds(worldWidth: number, worldHeight: number, pad: number = 3): { minX: number; maxX: number; minY: number; maxY: number } {
    const halfW = (this.tileWidth / 2) * this.zoom;
    const halfH = (this.tileHeight / 2) * this.zoom;

    // Viewport corners with obstacle height padding
    const p1 = this.screenToWorld(-halfW * 2, -halfH * 4);
    const p2 = this.screenToWorld(this.viewportWidth + halfW * 2, -halfH * 4);
    const p3 = this.screenToWorld(this.viewportWidth + halfW * 2, this.viewportHeight + halfH * 4);
    const p4 = this.screenToWorld(-halfW * 2, this.viewportHeight + halfH * 4);

    const minX = Math.max(0, Math.floor(Math.min(p1.x, p2.x, p3.x, p4.x)) - pad);
    const maxX = Math.min(worldWidth - 1, Math.ceil(Math.max(p1.x, p2.x, p3.x, p4.x)) + pad);
    const minY = Math.max(0, Math.floor(Math.min(p1.y, p2.y, p3.y, p4.y)) - pad);
    const maxY = Math.min(worldHeight - 1, Math.ceil(Math.max(p1.y, p2.y, p3.y, p4.y)) + pad);

    return { minX, maxX, minY, maxY };
  }
}
