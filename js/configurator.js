// ==========================================================================
// configurator.js — color / wheel / interior selection
// ==========================================================================

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
  container.setAttribute("role", "radiogroup");
  container.setAttribute("aria-label", container.closest(".config-group").querySelector("h3").textContent);
  const value = document.createElement("p");
  value.className = "config-value";
  value.textContent = options.find((opt) => opt.id === selectedId).label;
  container.after(value);
  options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "swatch";
    btn.style.background = opt.hex;
    btn.setAttribute("role", "radio");
    btn.setAttribute("aria-checked", String(opt.id === selectedId));
    btn.setAttribute("aria-label", opt.label);
    btn.title = opt.label;
    btn.tabIndex = opt.id === selectedId ? 0 : -1;
    btn.addEventListener("keydown", (event) => {
      if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const items = [...container.children];
      let next = (items.indexOf(btn) + (["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 1) + items.length) % items.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = items.length - 1;
      items[next].focus();
      items[next].click();
    });
    btn.addEventListener("click", async () => {
      const previous = container.querySelector('[aria-checked="true"]');
      container.querySelectorAll(".swatch").forEach((s) => s.setAttribute("aria-checked", "false"));
      btn.setAttribute("aria-checked", "true");
      container.querySelectorAll(".swatch").forEach((s) => { s.tabIndex = s === btn ? 0 : -1; });
      value.textContent = opt.label;
      const status = document.getElementById("config-status");
      status.textContent = "Aplicando tu combinación…";
      try {
        await onSelect(opt);
        status.textContent = "Combinación aplicada. Abre la vista 3D para explorar el resultado.";
      } catch {
        // Restore the previous choice when the optional 3D runtime fails.
        btn.setAttribute("aria-checked", "false");
        btn.tabIndex = -1;
        if (previous) { previous.setAttribute("aria-checked", "true"); previous.tabIndex = 0; value.textContent = previous.title; }
        status.textContent = "No se pudo iniciar la vista 3D. Puedes volver a intentarlo o consultar las fotos del modelo.";
      }
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
  // Keep a chosen combination when another vehicle is loaded.
  const selection = { color: COLOR_OPTIONS[0], wheel: WHEEL_OPTIONS[0], interior: INTERIOR_OPTIONS[0] };
  function apply(rig) {
    rig.parts.paintMat.color.set(selection.color.hex);
    Object.values(rig.parts.wheels).forEach((wheel) => wheel.rimMat.color.set(selection.wheel.hex));
    rig.parts.interiorGroup.traverse((obj) => {
      if (obj.isMesh && obj.material?.color && obj.geometry.type === "BoxGeometry" && obj !== rig.parts.dashScreen) {
        obj.material.color.set(selection.interior.hex);
      }
    });
  }

  buildSwatchGroup(colorContainer, COLOR_OPTIONS, "black", async (opt) => {
    await ensureEngine();
    const rig = vehicleRigRef.current;
    if (!rig) throw new Error("3D unavailable");
    selection.color = opt;
    apply(rig);
  });

  buildSwatchGroup(wheelContainer, WHEEL_OPTIONS, "standard", async (opt) => {
    await ensureEngine();
    const rig = vehicleRigRef.current;
    if (!rig) throw new Error("3D unavailable");
    selection.wheel = opt;
    apply(rig);
  });

  buildSwatchGroup(interiorContainer, INTERIOR_OPTIONS, "black", async (opt) => {
    await ensureEngine();
    const rig = vehicleRigRef.current;
    if (!rig) throw new Error("3D unavailable");
    selection.interior = opt;
    apply(rig);
  });
  return { apply };
}
