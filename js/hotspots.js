// ==========================================================================
// hotspots.js — 3D hotspot definitions + DOM marker projection
// ==========================================================================
import * as THREE from "three";

/**
 * Builds the hotspot list for a given vehicle rig. Each hotspot has:
 *  - id, label, icon-ish key
 *  - anchor: THREE.Vector3 in LOCAL vehicle space (so it moves with the car)
 *  - action: the interaction key handled by interactions.js / animations.js
 *  - availableFor: optional array of bodyTypes; omit = always available
 */
export function buildHotspots(dims, bodyType) {
  const L = dims.length;
  const W = dims.width;
  const list = [
    {
      id: "hood",
      label: "Explorar motor",
      action: "open-hood",
      anchor: new THREE.Vector3(L * 0.32, 0.72, 0),
    },
    {
      id: "trunk",
      label: "Maletero",
      action: "open-trunk",
      anchor: new THREE.Vector3(-L * 0.34, 0.72, 0),
    },
    {
      id: "interior",
      label: "Interior",
      action: "enter-interior",
      anchor: new THREE.Vector3(0, 0.85, W * 0.42),
    },
    {
      id: "headlightL",
      label: "Iluminación",
      action: "focus-headlight-L",
      anchor: new THREE.Vector3(L * 0.47, 0.56, W * 0.35),
    },
    {
      id: "wheelFL",
      label: "Llantas",
      action: "focus-wheel-FL",
      anchor: new THREE.Vector3(L * 0.3, 0.42, W * 0.5),
    },
    {
      id: "doorFL",
      label: "Puertas",
      action: "open-door-FL",
      anchor: new THREE.Vector3(L * 0.05, 0.68, W * 0.44),
    },
  ];

  if (bodyType === "pickup") {
    list.push({
      id: "cargo",
      label: "Espacio de carga",
      action: "open-trunk",
      anchor: new THREE.Vector3(-L * 0.34, 0.72, 0),
      overridesId: "trunk",
    });
  }

  return list;
}

/**
 * Manages the DOM hotspot markers and keeps them projected to screen space
 * every frame, hiding any that fall behind the camera or off-canvas.
 */
export class HotspotController {
  constructor(layerEl, onActivate) {
    this.layerEl = layerEl;
    this.onActivate = onActivate;
    this.hotspots = [];
    this.elements = new Map();
    this._raycastTargets = [];

    // PERF: canvas and hotspot-layer are both `position:absolute; inset:0`
    // inside the same parent, so their bounding rects are always identical —
    // there is no need to read either with getBoundingClientRect() on every
    // animation frame (that forces a synchronous layout reflow 60x/sec, and
    // was the main cause of the frame-rate drop). Instead we cache the size
    // once and only refresh it on an actual resize.
    this._size = { width: 1, height: 1 };
    this._resizeObserver = new ResizeObserver((entries) => {
      const box = entries[0].contentRect;
      this._size.width = box.width;
      this._size.height = box.height;
    });
    this._resizeObserver.observe(layerEl);

    // Scratch objects reused every frame instead of allocated per-hotspot,
    // to avoid garbage-collector pauses during the render loop.
    this._scratchWorldPos = new THREE.Vector3();
    this._scratchToPoint = new THREE.Vector3();
    this._scratchCamForward = new THREE.Vector3();
  }

  setHotspots(hotspots) {
    this.layerEl.innerHTML = "";
    this.elements.clear();
    this.hotspots = hotspots;

    hotspots.forEach((hs, i) => {
      const btn = document.createElement("button");
      btn.className = "hotspot";
      btn.type = "button";
      btn.style.animationDelay = `${i * 0.05}s`;
      btn.setAttribute("aria-label", hs.label);
      btn.dataset.action = hs.action;
      btn.innerHTML = `<span class="hotspot__dot" aria-hidden="true"></span><span class="hotspot__label">${hs.label}</span>`;

      btn.addEventListener("click", () => this.onActivate(hs));
      btn.addEventListener("touchend", (e) => {
        // First tap reveals label (mobile), second tap (already tapped) activates.
        if (!btn.classList.contains("is-tapped")) {
          e.preventDefault();
          this._clearTapped();
          btn.classList.add("is-tapped");
        }
      });

      this.layerEl.appendChild(btn);
      this.elements.set(hs.id, btn);
    });
  }

  _clearTapped() {
    this.elements.forEach((el) => el.classList.remove("is-tapped"));
  }

  setVisible(ids) {
    this.elements.forEach((el, id) => {
      el.hidden = ids ? !ids.includes(id) : false;
    });
  }

  hideAll() {
    this.elements.forEach((el) => { el.hidden = true; });
  }

  /** Projects each hotspot's 3D anchor (world space) onto screen space. */
  update(camera, vehicleRoot) {
    const { width, height } = this._size;
    const worldPos = this._scratchWorldPos;
    const toPoint = this._scratchToPoint;
    const camForward = this._scratchCamForward;
    camera.getWorldDirection(camForward);

    for (const hs of this.hotspots) {
      const el = this.elements.get(hs.id);
      if (!el || el.hidden) continue;

      worldPos.copy(hs.anchor).applyMatrix4(vehicleRoot.matrixWorld);
      toPoint.copy(worldPos).sub(camera.position).normalize();
      const behind = toPoint.dot(camForward) < 0.1;

      // .project() mutates worldPos in place — read screen coords from it
      // before it's needed again next iteration.
      worldPos.project(camera);
      const x = (worldPos.x * 0.5 + 0.5) * width;
      const y = (-worldPos.y * 0.5 + 0.5) * height;

      const offscreen = worldPos.z > 1 || x < -40 || x > width + 40 || y < -40 || y > height + 40;

      if (behind || offscreen) {
        el.style.opacity = "0";
        el.style.pointerEvents = "none";
      } else {
        el.style.opacity = "";
        el.style.pointerEvents = "";
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
      }
    }
  }

  dispose() {
    this._resizeObserver.disconnect();
  }
}
