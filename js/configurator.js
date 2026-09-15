// ==========================================================================
// configurator.js — color / wheel / interior selection
// ==========================================================================
import { setVehicleColor } from "./vehicle.js";

export const COLOR_OPTIONS = [
  { id: "black", label: "Negro Ébano", hex: "#111214" },
  { id: "white", label: "Blanco Perla", hex: "#eef0f2" },
  { id: "red", label: "Rojo Toyota", hex: "#c8102e" },
  { id: "silver", label: "Plata Metálico", hex: "#9a9ca2" },
  { id: "grey", label: "Gris Grafito", hex: "#4a4c52" },
];

export const WHEEL_OPTIONS = [
  { id: "standard", label: "Aro estándar", hex: "#bfc1c5" },
  { id: "sport", label: "Aro deportivo", hex: "#1c1d20" },
  { id: "chrome", label: "Aro cromado", hex: "#e8e9ec" },
];

export const INTERIOR_OPTIONS = [
  { id: "black", label: "Interior negro", hex: "#1a1b1e" },
  { id: "beige", label: "Interior beige", hex: "#cbb98f" },
  { id: "red", label: "Interior rojo", hex: "#5c1319" },
];

function buildSwatchGroup(container, options, selectedId, onSelect) {
  container.innerHTML = "";
  options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "swatch";
    btn.style.background = opt.hex;
    btn.setAttribute("role", "radio");
    btn.setAttribute("aria-checked", String(opt.id === selectedId));
    btn.setAttribute("aria-label", opt.label);
    btn.title = opt.label;
    btn.addEventListener("click", () => {
      container.querySelectorAll(".swatch").forEach((s) => s.setAttribute("aria-checked", "false"));
      btn.setAttribute("aria-checked", "true");
      onSelect(opt);
    });
    container.appendChild(btn);
  });
}

/**
 * @param {object} deps
 * @param {{current: object|null}} deps.vehicleRigRef - mutable ref, set once the 3D engine builds a vehicle
 * @param {() => Promise<void>} deps.ensureEngine - lazily boots the Three.js engine on first real use
 *   (the 3D stack isn't loaded until the user actually needs it — see main.js)
 */
export function setupConfigurator({ vehicleRigRef, ensureEngine }) {
  const colorContainer = document.getElementById("color-swatches");
  const wheelContainer = document.getElementById("wheel-swatches");
  const interiorContainer = document.getElementById("interior-swatches");

  buildSwatchGroup(colorContainer, COLOR_OPTIONS, "black", async (opt) => {
    await ensureEngine();
    const rig = vehicleRigRef.current;
    if (rig) setVehicleColor(rig, opt.hex);
  });

  buildSwatchGroup(wheelContainer, WHEEL_OPTIONS, "standard", async (opt) => {
    await ensureEngine();
    const rig = vehicleRigRef.current;
    if (!rig) return;
    Object.values(rig.parts.wheels).forEach((w) => w.rimMat.color.set(opt.hex));
  });

  buildSwatchGroup(interiorContainer, INTERIOR_OPTIONS, "black", async (opt) => {
    await ensureEngine();
    const rig = vehicleRigRef.current;
    if (!rig) return;
    rig.parts.interiorGroup.traverse((obj) => {
      if (obj.isMesh && obj.material && obj.material.color) {
        // Only recolor seat-like elements (skip dash/screen which stay dark)
        if (obj.geometry.type === "BoxGeometry" && obj !== rig.parts.dashScreen) {
          obj.material.color.set(opt.hex);
        }
      }
    });
  });
}
