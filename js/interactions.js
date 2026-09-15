// ==========================================================================
// interactions.js — pointer tracking, custom cursor, keyboard support
// ==========================================================================

const isTouchDevice = window.matchMedia("(hover: none) and (pointer: coarse)").matches;

export class CustomCursor {
  constructor(el) {
    this.el = el;
    this.labelEl = el.querySelector(".cursor__label");
    this.enabled = !isTouchDevice;
    this.x = window.innerWidth / 2;
    this.y = window.innerHeight / 2;
    this.tx = this.x;
    this.ty = this.y;

    if (!this.enabled) {
      this.el.classList.add("is-hidden");
      return;
    }

    window.addEventListener("mousemove", (e) => {
      this.tx = e.clientX;
      this.ty = e.clientY;
    });
    window.addEventListener("mouseleave", () => this.el.classList.add("is-hidden"));
    window.addEventListener("mouseenter", () => this.el.classList.remove("is-hidden"));

    this._raf();
  }

  _raf = () => {
    if (!this.enabled) return;
    // Snappy, near-1:1 follow — just enough smoothing (0.6) to take the edge
    // off raw mousemove jitter without feeling laggy behind the real pointer.
    this.x += (this.tx - this.x) * 0.6;
    this.y += (this.ty - this.y) * 0.6;
    this.el.style.transform = `translate(${this.x}px, ${this.y}px)`;
    requestAnimationFrame(this._raf);
  };

  setHover(isHover, label = "") {
    if (!this.enabled) return;
    this.el.classList.toggle("is-hover", isHover);
    if (this.labelEl) this.labelEl.textContent = label;
  }
}

/**
 * Normalizes pointer position within an element to [-1, 1] on both axes,
 * used both for camera parallax and raycasting.
 */
export function attachPointerTracking(targetEl, { onMove } = {}) {
  function toNDC(clientX, clientY) {
    const rect = targetEl.getBoundingClientRect();
    const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -(((clientY - rect.top) / rect.height) * 2 - 1);
    return { nx, ny, rect };
  }

  function handleMove(e) {
    const point = e.touches ? e.touches[0] : e;
    const { nx, ny } = toNDC(point.clientX, point.clientY);
    onMove && onMove(nx, ny, point.clientX, point.clientY);
  }

  targetEl.addEventListener("mousemove", handleMove);
  targetEl.addEventListener("touchmove", handleMove, { passive: true });

  return () => {
    targetEl.removeEventListener("mousemove", handleMove);
    targetEl.removeEventListener("touchmove", handleMove);
  };
}

/** Pinch-to-zoom + swipe support for touch devices (adjusts a distance factor callback). */
export function attachTouchGestures(targetEl, { onPinch, onSwipe } = {}) {
  let startDist = 0;
  let startX = 0;

  function dist(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  targetEl.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length === 2) startDist = dist(e.touches);
      else if (e.touches.length === 1) startX = e.touches[0].clientX;
    },
    { passive: true }
  );

  targetEl.addEventListener(
    "touchmove",
    (e) => {
      if (e.touches.length === 2 && startDist) {
        const newDist = dist(e.touches);
        onPinch && onPinch(newDist / startDist);
        startDist = newDist;
      } else if (e.touches.length === 1 && onSwipe) {
        const dx = e.touches[0].clientX - startX;
        if (Math.abs(dx) > 40) {
          onSwipe(dx > 0 ? "right" : "left");
          startX = e.touches[0].clientX;
        }
      }
    },
    { passive: true }
  );
}

/** Keyboard navigation: Escape returns to the vehicle overview, Tab cycles hotspots natively via DOM order. */
export function attachKeyboardNav({ onEscape } = {}) {
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") onEscape && onEscape();
  });
}

export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
