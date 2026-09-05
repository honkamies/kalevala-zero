// Unified Input Controller with Mouse Wheel Zoom & Case-Insensitive Action Keybindings

export class InputManager {
  public keys: { [key: string]: boolean } = {};
  public mouseScreen: { x: number; y: number } = { x: 0, y: 0 };
  public mouseWorld: { x: number; y: number } = { x: 0, y: 0 };
  
  public isMouseDownLeft: boolean = false;
  public isMouseDownMiddle: boolean = false;
  public isMouseDownRight: boolean = false;
  
  public justPressedKeys: Set<string> = new Set();
  public justClickedLeft: boolean = false;
  public justClickedMiddle: boolean = false;
  public justClickedRight: boolean = false;
  public wheelDelta: number = 0;

  private onActionCallbacks: Map<string, Array<() => void>> = new Map();
  private onWheelCallbacks: Array<(delta: number) => void> = [];

  init(canvas: HTMLCanvasElement) {
    // Keyboard listeners (Window-level for global reliability)
    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = e.key.toLowerCase();
      if (!this.keys[key]) {
        this.justPressedKeys.add(key);
        this.triggerAction(key);
      }
      this.keys[key] = true;

      // Prevent default page scroll on game control keys
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'tab'].includes(key)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      this.keys[key] = false;
    });

    // Mouse listeners (Window-level for continuous aim and combat click registration)
    window.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / (rect.width || 1);
      const scaleY = canvas.height / (rect.height || 1);
      this.mouseScreen.x = (e.clientX - rect.left) * scaleX;
      this.mouseScreen.y = (e.clientY - rect.top) * scaleY;
    });

    window.addEventListener('mousedown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      const targetEl = e.target as HTMLElement;
      // Do not trigger attack if clicking inside an interactive modal or HUD control button
      if (targetEl && targetEl.closest('.hud-icon-btn, .modal-backdrop, .menu-panel, .inventory-container, .crafting-container, #character-sheet-modal, #sound-settings-modal, #graphics-settings-modal, #pause-menu, #main-menu, #creation-modal, #profile-modal')) {
        return;
      }

      if (e.button === 0) {
        this.isMouseDownLeft = true;
        this.justClickedLeft = true;
        this.triggerAction('mouse_left');
      } else if (e.button === 1) {
        this.isMouseDownMiddle = true;
        this.justClickedMiddle = true;
        this.triggerAction('mouse_middle');
        e.preventDefault();
      } else if (e.button === 2) {
        this.isMouseDownRight = true;
        this.justClickedRight = true;
        this.triggerAction('mouse_right');
      }
    });

    canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.isMouseDownLeft = false;
      if (e.button === 1) this.isMouseDownMiddle = false;
      if (e.button === 2) this.isMouseDownRight = false;
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.isMouseDownLeft = false;
      if (e.button === 1) this.isMouseDownMiddle = false;
      if (e.button === 2) this.isMouseDownRight = false;
    });

    canvas.addEventListener('auxclick', (e) => {
      if (e.button === 1) e.preventDefault();
    });

    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    // Mouse Wheel for Camera Zoom
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.15 : -0.15;
      this.wheelDelta = delta;
      this.onWheelCallbacks.forEach(cb => cb(delta));
    }, { passive: false });
  }

  onAction(action: string, callback: () => void) {
    const key = action.toLowerCase();
    if (!this.onActionCallbacks.has(key)) {
      this.onActionCallbacks.set(key, []);
    }
    this.onActionCallbacks.get(key)!.push(callback);
  }

  onWheel(callback: (delta: number) => void) {
    this.onWheelCallbacks.push(callback);
  }

  private triggerAction(key: string) {
    const normKey = key.toLowerCase();
    const callbacks = this.onActionCallbacks.get(normKey);
    if (callbacks) {
      callbacks.forEach(cb => cb());
    }
  }

  getMovementVector(): { dx: number; dy: number } {
    let dx = 0;
    let dy = 0;

    // In 2:1 Isometric coordinates:
    // W / Up: dx = -1, dy = -1 (moves visually UP on screen)
    // S / Down: dx = +1, dy = +1 (moves visually DOWN on screen)
    // A / Left: dx = -1, dy = +1 (moves visually LEFT on screen)
    // D / Right: dx = +1, dy = -1 (moves visually RIGHT on screen)

    if (this.keys['w'] || this.keys['arrowup']) {
      dx -= 1;
      dy -= 1;
    }
    if (this.keys['s'] || this.keys['arrowdown']) {
      dx += 1;
      dy += 1;
    }
    if (this.keys['a'] || this.keys['arrowleft']) {
      dx -= 1;
      dy += 1;
    }
    if (this.keys['d'] || this.keys['arrowright']) {
      dx += 1;
      dy -= 1;
    }

    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0) {
        dx /= len;
        dy /= len;
      }
    }

    return { dx, dy };
  }

  postUpdate() {
    this.justPressedKeys.clear();
    this.justClickedLeft = false;
    this.justClickedMiddle = false;
    this.justClickedRight = false;
    this.wheelDelta = 0;
  }
}

export const inputManager = new InputManager();
