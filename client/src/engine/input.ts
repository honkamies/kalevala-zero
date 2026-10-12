// Unified Input Controller with Keyboard, Mouse, and Native Xbox / Gamepad Controller Support
// Supports Hot-swappable Device Switching, Twin-Stick Analog Aiming, Isometric Stick Translation & Haptics

export enum XboxButton {
  A = 0,
  B = 1,
  X = 2,
  Y = 3,
  LB = 4,
  RB = 5,
  LT = 6,
  RT = 7,
  VIEW = 8,
  MENU = 9,
  LS = 10,
  RS = 11,
  DPAD_UP = 12,
  DPAD_DOWN = 13,
  DPAD_LEFT = 14,
  DPAD_RIGHT = 15,
  XBOX = 16
}

export type InputDeviceType = 'keyboard' | 'gamepad';

export class InputManager {
  // Keyboard State
  public keys: { [key: string]: boolean } = {};
  public justPressedKeys: Set<string> = new Set();

  // Mouse State
  public mouseScreen: { x: number; y: number } = { x: 0, y: 0 };
  public mouseWorld: { x: number; y: number } = { x: 0, y: 0 };
  public isMouseDownLeft: boolean = false;
  public isMouseDownMiddle: boolean = false;
  public isMouseDownRight: boolean = false;
  public justClickedLeft: boolean = false;
  public justClickedMiddle: boolean = false;
  public justClickedRight: boolean = false;
  public wheelDelta: number = 0;

  // Active Device Tracking
  public lastInputDevice: InputDeviceType = 'keyboard';
  public gamepadConnected: boolean = false;
  public gamepadName: string = '';

  // Gamepad State
  private prevButtonStates: boolean[] = [];
  private currentButtonStates: boolean[] = [];
  public justPressedGamepadButtons: Set<number> = new Set();
  public justReleasedGamepadButtons: Set<number> = new Set();

  public leftStick: { x: number; y: number } = { x: 0, y: 0 };
  public rightStick: { x: number; y: number } = { x: 0, y: 0 };
  public lastGamepadAimAngle: number = 0;

  // Stick Flick Tracking for Menu / Minigame Navigation (Prevent rapid fire repeat)
  private stickFlickCooldown: number = 0;

  // Callbacks
  private onActionCallbacks: Map<string, Array<() => void>> = new Map();
  private onWheelCallbacks: Array<(delta: number) => void> = [];
  private onGamepadConnectedCallbacks: Array<(gp: Gamepad) => void> = [];
  private onGamepadDisconnectedCallbacks: Array<() => void> = [];

  // Deadzones
  public static readonly STICK_DEADZONE = 0.20;
  public static readonly TRIGGER_DEADZONE = 0.15;

  init(canvas: HTMLCanvasElement) {
    // 1. Keyboard Listeners
    window.addEventListener('keydown', (e) => {
      this.lastInputDevice = 'keyboard';

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

    // 2. Mouse Listeners
    window.addEventListener('mousemove', (e) => {
      // Small delta check to avoid phantom mousemove from gamepad cursor repositioning
      if (e.movementX !== 0 || e.movementY !== 0) {
        this.lastInputDevice = 'keyboard';
      }

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / (rect.width || 1);
      const scaleY = canvas.height / (rect.height || 1);
      this.mouseScreen.x = (e.clientX - rect.left) * scaleX;
      this.mouseScreen.y = (e.clientY - rect.top) * scaleY;
    });

    window.addEventListener('mousedown', (e) => {
      this.lastInputDevice = 'keyboard';

      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      const targetEl = e.target as HTMLElement;
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

    const clearMouseButtons = (e: MouseEvent) => {
      if (e.button === 0) this.isMouseDownLeft = false;
      if (e.button === 1) this.isMouseDownMiddle = false;
      if (e.button === 2) this.isMouseDownRight = false;
    };

    canvas.addEventListener('mouseup', clearMouseButtons);
    window.addEventListener('mouseup', clearMouseButtons);

    canvas.addEventListener('auxclick', (e) => {
      if (e.button === 1) e.preventDefault();
    });

    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    canvas.addEventListener('wheel', (e) => {
      this.lastInputDevice = 'keyboard';
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.15 : -0.15;
      this.wheelDelta = delta;
      this.onWheelCallbacks.forEach(cb => cb(delta));
    }, { passive: false });

    // 3. Native Gamepad Connection Listeners
    window.addEventListener('gamepadconnected', (e: GamepadEvent) => {
      this.gamepadConnected = true;
      this.gamepadName = e.gamepad.id;
      this.lastInputDevice = 'gamepad';
      this.onGamepadConnectedCallbacks.forEach(cb => cb(e.gamepad));
    });

    window.addEventListener('gamepaddisconnected', () => {
      const remainingGamepads = this.getConnectedGamepads();
      if (remainingGamepads.length > 0) {
        this.gamepadConnected = true;
        this.gamepadName = remainingGamepads[0].id;
      } else {
        this.gamepadConnected = false;
        this.gamepadName = '';
        this.lastInputDevice = 'keyboard';
      }
      this.onGamepadDisconnectedCallbacks.forEach(cb => cb());
    });
  }

  // --- GAMEPAD POLLING & DISPATCH ---

  public getConnectedGamepads(): Gamepad[] {
    if (typeof navigator.getGamepads !== 'function') return [];
    const pads = navigator.getGamepads();
    const result: Gamepad[] = [];
    for (let i = 0; i < pads.length; i++) {
      if (pads[i]) result.push(pads[i]!);
    }
    return result;
  }

  public getActiveGamepad(): Gamepad | null {
    const pads = this.getConnectedGamepads();
    if (pads.length === 0) return null;
    // Prefer the first connected gamepad (standard Player 1 slot)
    return pads[0];
  }

  /**
   * Polls gamepad state. Must be called once per frame in the main game loop before entity updates.
   */
  public updateGamepads() {
    const gp = this.getActiveGamepad();
    if (!gp) {
      if (this.gamepadConnected) {
        this.gamepadConnected = false;
        this.gamepadName = '';
      }
      return;
    }

    if (!this.gamepadConnected) {
      this.gamepadConnected = true;
      this.gamepadName = gp.id;
    }

    // 1. Process Axes with Circular Deadzones
    this.leftStick = this.filterRadialDeadzone(gp.axes[0] || 0, gp.axes[1] || 0, InputManager.STICK_DEADZONE);
    this.rightStick = this.filterRadialDeadzone(gp.axes[2] || 0, gp.axes[3] || 0, InputManager.STICK_DEADZONE);

    // 2. Read All Buttons (Supporting analog triggers on buttons[6] & buttons[7])
    const btnCount = Math.max(16, gp.buttons.length);
    if (this.currentButtonStates.length < btnCount) {
      this.currentButtonStates = new Array(btnCount).fill(false);
      this.prevButtonStates = new Array(btnCount).fill(false);
    }

    let anyInputActive = false;
    if (Math.hypot(this.leftStick.x, this.leftStick.y) > 0.05 || Math.hypot(this.rightStick.x, this.rightStick.y) > 0.05) {
      anyInputActive = true;
    }

    for (let i = 0; i < btnCount; i++) {
      const b = gp.buttons[i];
      let pressed = false;
      if (b) {
        if (i === XboxButton.LT || i === XboxButton.RT) {
          pressed = b.pressed || b.value > InputManager.TRIGGER_DEADZONE;
        } else {
          pressed = b.pressed || b.value > 0.5;
        }
      }

      const wasPressed = !!this.prevButtonStates[i];
      this.currentButtonStates[i] = pressed;

      if (pressed && !wasPressed) {
        this.justPressedGamepadButtons.add(i);
        anyInputActive = true;
      } else if (!pressed && wasPressed) {
        this.justReleasedGamepadButtons.add(i);
      }
    }

    if (anyInputActive) {
      this.lastInputDevice = 'gamepad';
    }

    // 3. Map Triggers to Left / Right Mouse Click states (Hold & Tap)
    const isRTPressed = this.currentButtonStates[XboxButton.RT];
    const wasRTPressed = this.prevButtonStates[XboxButton.RT];
    if (isRTPressed) {
      this.isMouseDownLeft = true;
      if (!wasRTPressed) {
        this.justClickedLeft = true;
        this.triggerAction('mouse_left');
      }
    } else if (wasRTPressed && this.lastInputDevice === 'gamepad') {
      this.isMouseDownLeft = false;
    }

    const isLTPressed = this.currentButtonStates[XboxButton.LT];
    const wasLTPressed = this.prevButtonStates[XboxButton.LT];
    if (isLTPressed) {
      this.isMouseDownRight = true;
      if (!wasLTPressed) {
        this.justClickedRight = true;
        this.triggerAction('mouse_right');
      }
    } else if (wasLTPressed && this.lastInputDevice === 'gamepad') {
      this.isMouseDownRight = false;
    }

    // 4. Dispatch Action Mappings for newly pressed buttons
    for (const btn of this.justPressedGamepadButtons) {
      switch (btn) {
        case XboxButton.A:
          // A: Environmental Interaction (E) / Platformer Jump (Space)
          this.justPressedKeys.add(' ');
          this.justPressedKeys.add('e');
          this.triggerAction('e');
          break;

        case XboxButton.B:
          // B: Active Dodge Roll (Space) / Cancel Modal
          this.justPressedKeys.add(' ');
          this.triggerAction(' ');
          // If a modal or menu is open, B also cancels / closes it
          if (this.isAnyModalDomOpen()) {
            this.dispatchSyntheticEscape();
          }
          break;

        case XboxButton.X:
          // X: Ability 1 (Ukonvasara EMP Slam) or Face-Button Attack
          this.justPressedKeys.add('1');
          this.triggerAction('1');
          break;

        case XboxButton.Y:
          // Y: Ability 4 (Overclock Frenzy)
          this.justPressedKeys.add('4');
          this.justPressedKeys.add('r');
          this.triggerAction('4');
          this.triggerAction('r');
          break;

        case XboxButton.LB:
          // LB: Ability 3 (Tuoni Siphon Void Barrier)
          this.justPressedKeys.add('3');
          this.triggerAction('3');
          break;

        case XboxButton.RB:
          // RB: Ability 2 (Kipinä Plasma Jet Dash)
          this.justPressedKeys.add('2');
          this.triggerAction('2');
          break;

        case XboxButton.VIEW:
          // View / Back: Inventory Toggle
          this.justPressedKeys.add('tab');
          this.justPressedKeys.add('i');
          this.triggerAction('tab');
          this.triggerAction('i');
          break;

        case XboxButton.MENU:
          // Menu / Start: Global Tactical Pause / Back (ESC)
          this.dispatchSyntheticEscape();
          break;

        case XboxButton.LS:
          // Left Stick Click: Instant Nano-Repair Potion Injection
          this.justPressedKeys.add('q');
          this.justPressedKeys.add('5');
          this.triggerAction('q');
          this.triggerAction('5');
          break;

        case XboxButton.RS:
          // Right Stick Click: Camera Zoom Toggle
          this.onWheelCallbacks.forEach(cb => cb(0.20));
          break;

        case XboxButton.DPAD_UP:
          // D-Pad Up: Nano-Repair Potion
          this.justPressedKeys.add('q');
          this.justPressedKeys.add('5');
          this.triggerAction('q');
          this.triggerAction('5');
          break;

        case XboxButton.DPAD_DOWN:
          // D-Pad Down: Master Audio Mute Toggle
          this.justPressedKeys.add('m');
          this.triggerAction('m');
          break;

        case XboxButton.DPAD_LEFT:
          // D-Pad Left: Character Sheet Toggle
          this.justPressedKeys.add('c');
          this.triggerAction('c');
          break;

        case XboxButton.DPAD_RIGHT:
          // D-Pad Right: Nanite Forge / Crafting Toggle
          this.justPressedKeys.add('f');
          this.triggerAction('f');
          break;
      }
    }

    // 5. Special Support for Active Chest Cipher Decryption Minigame
    this.handleChestLockMinigameInput();

    // Store state for transition diff next frame
    this.prevButtonStates = [...this.currentButtonStates];
  }

  /**
   * Dispatches directional inputs to the active chest decryption modal if open.
   */
  private handleChestLockMinigameInput() {
    const chestModal = document.getElementById('chest-lock-modal');
    if (!chestModal) return;

    if (this.stickFlickCooldown > 0) {
      this.stickFlickCooldown--;
      return;
    }

    let simulatedKey: string | null = null;
    const dpad = this.getDpad();

    if (dpad.up || this.leftStick.y < -0.55) simulatedKey = 'w';
    else if (dpad.left || this.leftStick.x < -0.55) simulatedKey = 'a';
    else if (dpad.down || this.leftStick.y > 0.55) simulatedKey = 's';
    else if (dpad.right || this.leftStick.x > 0.55) simulatedKey = 'd';

    if (simulatedKey) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: simulatedKey, bubbles: true }));
      this.stickFlickCooldown = 14; // ~230ms debounce
    }

    if (this.justPressedGamepadButtons.has(XboxButton.A)) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
    }
  }

  private dispatchSyntheticEscape() {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
  }

  private isAnyModalDomOpen(): boolean {
    return !!document.querySelector('#esc-pause-menu, #chest-lock-modal, .sampo-modal, #inventory-modal, #character-sheet-modal, #crafting-modal');
  }

  // Radial deadzone filter for precision analog sticks
  private filterRadialDeadzone(x: number, y: number, deadzone: number): { x: number; y: number } {
    const mag = Math.hypot(x, y);
    if (mag < deadzone) return { x: 0, y: 0 };
    const normalizedMag = Math.min(1.0, (mag - deadzone) / (1.0 - deadzone));
    return {
      x: (x / mag) * normalizedMag,
      y: (y / mag) * normalizedMag
    };
  }

  // --- QUERY HELPERS ---

  public isGamepadButtonPressed(buttonIndex: number): boolean {
    return !!this.currentButtonStates[buttonIndex];
  }

  public isGamepadButtonJustPressed(buttonIndex: number): boolean {
    return this.justPressedGamepadButtons.has(buttonIndex);
  }

  public getLeftStick(): { x: number; y: number } {
    return this.leftStick;
  }

  public getRightStick(): { x: number; y: number } {
    return this.rightStick;
  }

  public isRightStickAiming(): boolean {
    return Math.hypot(this.rightStick.x, this.rightStick.y) > 0.22;
  }

  public getDpad(): { up: boolean; down: boolean; left: boolean; right: boolean } {
    return {
      up: !!this.currentButtonStates[XboxButton.DPAD_UP],
      down: !!this.currentButtonStates[XboxButton.DPAD_DOWN],
      left: !!this.currentButtonStates[XboxButton.DPAD_LEFT],
      right: !!this.currentButtonStates[XboxButton.DPAD_RIGHT]
    };
  }

  // --- HAPTIC FEEDBACK / RUMBLE ---

  public vibrate(durationMs: number = 150, weak: number = 0.4, strong: number = 0.4) {
    try {
      const gp = this.getActiveGamepad();
      if (gp && (gp as any).vibrationActuator && typeof (gp as any).vibrationActuator.playEffect === 'function') {
        (gp as any).vibrationActuator.playEffect('dual-rumble', {
          startDelay: 0,
          duration: Math.max(30, durationMs),
          weakMagnitude: Math.min(1.0, Math.max(0, weak)),
          strongMagnitude: Math.min(1.0, Math.max(0, strong))
        }).catch(() => {});
      }
    } catch {
      // Ignore vibration error on unsupported platforms
    }
  }

  // --- HOTKEY & ACTION DISPATCH ---

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

  onGamepadConnected(callback: (gp: Gamepad) => void) {
    this.onGamepadConnectedCallbacks.push(callback);
  }

  onGamepadDisconnected(callback: () => void) {
    this.onGamepadDisconnectedCallbacks.push(callback);
  }

  private triggerAction(key: string) {
    const normKey = key.toLowerCase();
    const callbacks = this.onActionCallbacks.get(normKey);
    if (callbacks) {
      callbacks.forEach(cb => cb());
    }
  }

  /**
   * Computes normalized world movement vector in 2:1 isometric projection.
   * Seamlessly blends keyboard WASD / Arrow keys and gamepad Left Stick / D-Pad.
   */
  getMovementVector(): { dx: number; dy: number } {
    let dx = 0;
    let dy = 0;

    // 1. Keyboard WASD / Arrow Keys
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
      return { dx, dy };
    }

    // 2. Gamepad Left Stick & D-Pad in 2:1 Isometric Coordinates
    const dpad = this.getDpad();
    let lx = this.leftStick.x;
    let ly = this.leftStick.y;

    if (dpad.left) lx = -1;
    else if (dpad.right) lx = 1;
    if (dpad.up) ly = -1;
    else if (dpad.down) ly = 1;

    const stickMag = Math.hypot(lx, ly);
    if (stickMag > 0.05) {
      // Map screen direction (lx: right, ly: down) to 2:1 isometric coordinates:
      // Screen Up (ly < 0): dx < 0, dy < 0
      // Screen Down (ly > 0): dx > 0, dy > 0
      // Screen Left (lx < 0): dx < 0, dy > 0
      // Screen Right (lx > 0): dx > 0, dy < 0
      const isoDx = ly + lx;
      const isoDy = ly - lx;
      const isoLen = Math.hypot(isoDx, isoDy);
      if (isoLen > 0) {
        const factor = Math.min(1.0, stickMag);
        return {
          dx: (isoDx / isoLen) * factor,
          dy: (isoDy / isoLen) * factor
        };
      }
    }

    return { dx: 0, dy: 0 };
  }

  postUpdate() {
    this.justPressedKeys.clear();
    this.justPressedGamepadButtons.clear();
    this.justReleasedGamepadButtons.clear();
    this.justClickedLeft = false;
    this.justClickedMiddle = false;
    this.justClickedRight = false;
    this.wheelDelta = 0;
  }
}

export const inputManager = new InputManager();
