// ==========================================================================
// ui.js — vehicle selector, info panel, loading screen, fallback detection
// ==========================================================================
import { VEHICLE_DATA } from "./vehicle.js";

const CATEGORY_ICONS = {
  "SEDÁN HÍBRIDO": `<svg viewBox="0 0 48 24" fill="none"><path d="M4 17h40M8 17c0-5 4-9 8-9h16c4 0 8 4 8 9" stroke="currentColor" stroke-width="2"/><circle cx="14" cy="18" r="3" stroke="currentColor" stroke-width="2"/><circle cx="34" cy="18" r="3" stroke="currentColor" stroke-width="2"/><path d="M22 8l-3 5h4l-3 5" stroke="#eb0a1e" stroke-width="1.6"/></svg>`,
  "CROSSOVER HÍBRIDO": `<svg viewBox="0 0 48 24" fill="none"><path d="M4 17h40M6 17V10c0-1 1-2 2-2h28c2 0 3 1 4 3l2 6" stroke="currentColor" stroke-width="2"/><circle cx="14" cy="18" r="3.2" stroke="currentColor" stroke-width="2"/><circle cx="34" cy="18" r="3.2" stroke="currentColor" stroke-width="2"/><path d="M22 8l-3 5h4l-3 5" stroke="#eb0a1e" stroke-width="1.6"/></svg>`,
  "SUV HÍBRIDA": `<svg viewBox="0 0 48 24" fill="none"><path d="M4 17h40M6 17V9c0-1 1-2 2-2h30c2 0 3 1 4 3l3 6" stroke="currentColor" stroke-width="2"/><circle cx="14" cy="18" r="3.4" stroke="currentColor" stroke-width="2"/><circle cx="34" cy="18" r="3.4" stroke="currentColor" stroke-width="2"/><path d="M23 6l-3 6h4l-3 6" stroke="#eb0a1e" stroke-width="1.6"/></svg>`,
  PICKUP: `<svg viewBox="0 0 48 24" fill="none"><path d="M2 17h44M6 17V8h14l6 5h12c2 0 4 2 4 4" stroke="currentColor" stroke-width="2"/><circle cx="14" cy="18" r="3.2" stroke="currentColor" stroke-width="2"/><circle cx="36" cy="18" r="3.2" stroke="currentColor" stroke-width="2"/></svg>`,
  "TODOTERRENO PREMIUM": `<svg viewBox="0 0 48 24" fill="none"><path d="M2 18h44M4 18V8c0-1 1-2 2-2h34c2 0 3 1 4 3l2 9" stroke="currentColor" stroke-width="2"/><circle cx="14" cy="19" r="3.4" stroke="currentColor" stroke-width="2"/><circle cx="36" cy="19" r="3.4" stroke="currentColor" stroke-width="2"/></svg>`,
};

export function detectWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (canvas.getContext("webgl2") || canvas.getContext("webgl")));
  } catch (e) {
    return false;
  }
}

export function showFallback() {
  document.getElementById("scene-canvas").hidden = true;
  const fb = document.getElementById("scene-fallback");
  fb.hidden = false;
}

export function setLoadingProgress(pct, label) {
  const fill = document.getElementById("loading-bar-fill");
  const labelEl = document.getElementById("loading-label");
  if (fill) fill.style.width = `${Math.min(100, pct)}%`;
  if (labelEl && label) labelEl.textContent = label;
}

export function hideLoadingScreen() {
  const el = document.getElementById("loading-screen");
  if (!el) return;
  el.classList.add("is-hidden");
  setTimeout(() => el.remove(), 700);
}

/**
 * Reveals the "Continuar" button once the experience is ready, and gates
 * entry behind an explicit click — the loading screen (black bg, swinging
 * red logo, smoke) stays up until the user chooses to proceed, rather than
 * auto-dismissing on a timer.
 */
export function showContinueButton(onContinue) {
  const btn = document.getElementById("loading-continue");
  const label = document.getElementById("loading-label");
  if (!btn) { onContinue(); return; }
  if (label) label.textContent = "Todo listo";
  btn.hidden = false;
  btn.addEventListener(
    "click",
    () => {
      hideLoadingScreen();
      onContinue();
    },
    { once: true }
  );
  btn.focus();
}

export function buildVehicleSelector(onSelect) {
  const grid = document.getElementById("selector-grid");
  grid.innerHTML = "";
  VEHICLE_DATA.forEach((v, i) => {
    const wrap = document.createElement("div");
    wrap.className = "selector__item-wrap";

    const item = document.createElement("button");
    item.type = "button";
    item.className = "selector__item";
    item.setAttribute("role", "option");
    item.setAttribute("aria-selected", i === 0 ? "true" : "false");
    item.dataset.id = v.id;
    item.innerHTML = `
      <span class="selector__item-icon">${CATEGORY_ICONS[v.category] || ""}</span>
      <span class="selector__item-name">${v.category}</span>
      <span class="selector__item-model">${v.name}</span>
      <span class="selector__item-price">Desde ${v.price}</span>
    `;
    item.addEventListener("click", () => {
      grid.querySelectorAll(".selector__item").forEach((el) => el.setAttribute("aria-selected", "false"));
      item.setAttribute("aria-selected", "true");
      onSelect(v);
    });
    wrap.appendChild(item);

    if (v.url) {
      const link = document.createElement("a");
      link.className = "selector__item-link";
      link.href = v.url;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = "Ver ficha ↗";
      wrap.appendChild(link);
    }

    grid.appendChild(wrap);
  });
}

/**
 * Builds the "ficha de vehículo" view: real photos when we have them
 * (currently only the Corolla Cross Híbrida, supplied directly by the
 * project owner — see vehicle.js), a labeled placeholder otherwise, plus
 * the full real spec sheet and a link to the official page.
 */
export function buildFicha(vehicleData) {
  const galleryEl = document.getElementById("ficha-gallery");
  const specsEl = document.getElementById("ficha-specs");
  const officialLink = document.getElementById("ficha-official-link");

  document.getElementById("ficha-category").textContent = vehicleData.category;
  document.getElementById("ficha-tagline").textContent = vehicleData.tagline || "";
  document.getElementById("stat-price").textContent = vehicleData.price || "[DATOS]";
  document.querySelectorAll("[data-vehicle-name]").forEach((el) => { el.textContent = vehicleData.name; });

  if (officialLink) {
    if (vehicleData.url) { officialLink.href = vehicleData.url; officialLink.hidden = false; }
    else officialLink.hidden = true;
  }

  if (galleryEl) {
    if (vehicleData.gallery && vehicleData.gallery.length) {
      galleryEl.innerHTML = vehicleData.gallery
        .map(
          (g, i) => `
          <div class="ficha__gallery-item">
            <img src="${g.file}" alt="${vehicleData.name} — ${g.label}" loading="${i === 0 ? "eager" : "lazy"}">
            <span>${g.label}</span>
          </div>`
        )
        .join("");
    } else {
      galleryEl.innerHTML = `
        <div class="ficha__gallery-item ficha__gallery-placeholder">
          <span>[FOTOGRAFÍA OFICIAL PENDIENTE]<br>${vehicleData.name}</span>
        </div>`;
    }
  }

  if (specsEl) {
    const specs = vehicleData.specs || {};
    const labels = {
      engine: "Motor", power: "Potencia", torque: "Torque", transmission: "Transmisión",
      driveModes: "Modos de conducción", suspension: "Suspensión", tires: "Llantas",
      battery: "Batería", connectivity: "Conectividad", airbags: "Airbags", brakes: "Frenos",
      stability: "Estabilidad", lights: "Iluminación", consumption: "Consumo", trunk: "Maletero",
      seats: "Asientos",
    };
    const wide = new Set(["engine", "connectivity", "stability", "driveModes"]);
    specsEl.innerHTML = Object.entries(specs)
      .filter(([, v]) => v)
      .map(([key, value]) => `<div class="${wide.has(key) ? "span-2" : ""}"><dt>${labels[key] || key}</dt><dd>${value}</dd></div>`)
      .join("");
  }
}

function dl(pairs) {
  const rows = pairs.filter(([, v]) => v).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("");
  return `<dl>${rows}</dl>`;
}

/**
 * Builds hotspot info content from the CURRENTLY SELECTED vehicle's real
 * specs (sourced from toyota.com.sv — see the note atop vehicle.js), so the
 * info panel always reflects the model actually on screen instead of a
 * generic placeholder.
 */
function buildHotspotInfo(hotspotId, specs) {
  switch (hotspotId) {
    case "hood":
      return {
        eyebrow: "Motor",
        title: "Compartimento del motor",
        body: dl([
          ["Motor", specs.engine],
          ["Potencia", specs.power],
          ["Torque", specs.torque],
          ["Transmisión", specs.transmission],
        ]),
      };
    case "trunk":
      return {
        eyebrow: "Almacenamiento",
        title: "Espacio de carga",
        body: dl([["Capacidad", specs.trunk || "[DATOS]"]]),
      };
    case "interior":
      return {
        eyebrow: "Habitáculo",
        title: "Interior",
        body: dl([
          ["Asientos", specs.seats],
          ["Modos de conducción", specs.driveModes || "[DATOS]"],
        ]),
      };
    case "headlightL":
      return {
        eyebrow: "Iluminación",
        title: "Sistema de faros",
        body: dl([["Tecnología", specs.lights || "[DATOS]"]]),
      };
    case "wheelFL":
      return {
        eyebrow: "Rodaje",
        title: "Llantas y neumáticos",
        body: dl([
          ["Tamaño", specs.tires || "[DATOS]"],
          ["Suspensión", specs.suspension || "[DATOS]"],
        ]),
      };
    case "doorFL":
      return {
        eyebrow: "Acceso",
        title: "Puertas",
        body: dl([["Frenos", specs.brakes || "[DATOS]"]]),
      };
    default:
      return null;
  }
}

export function showInfoPanel(hotspotId, vehicleData) {
  const info = buildHotspotInfo(hotspotId, vehicleData.specs);
  if (!info) return;
  const panel = document.getElementById("info-panel");
  document.getElementById("info-panel-eyebrow").textContent = info.eyebrow;
  document.getElementById("info-panel-title").textContent = info.title;
  document.getElementById("info-panel-body").innerHTML =
    info.body +
    (vehicleData.url
      ? `<a class="info-panel__link" href="${vehicleData.url}" target="_blank" rel="noopener">Ver ficha completa de ${vehicleData.name} en toyota.com.sv ↗</a>`
      : "");
  panel.hidden = false;
}

export function hideInfoPanel() {
  document.getElementById("info-panel").hidden = true;
}

// --------------------------------------------------------------------------
// Reviews / recognitions section.
//
// We do NOT fabricate customer testimonials attributed to real or invented
// people — that would be a deceptive fake review. The one review-like item
// below (FIPA "SUV del Año") is a real, published recognition mentioned in
// Toyota El Salvador's own newsroom. Everything else is clearly labeled as
// an illustrative placeholder for a future real integration (e.g. pulling
// live Google Reviews), matching this project's existing "[DATOS]" honesty
// convention rather than inventing quotes.
// --------------------------------------------------------------------------
const REAL_RECOGNITIONS = [
  {
    title: "SUV del Año",
    source: "FIPA",
    body: "Toyota RAV4 fue reconocida como SUV del Año según FIPA — reconocimiento citado en el newsroom oficial de Toyota.",
    url: "https://www.toyota.com.sv/toyota-rav4-es-el-vehiculo-suv-del-ano-segun-fipa/",
  },
];

const SAMPLE_REVIEW_PLACEHOLDERS = [
  { stars: 5, tag: "Reseña ilustrativa" },
  { stars: 5, tag: "Reseña ilustrativa" },
  { stars: 4, tag: "Reseña ilustrativa" },
];

export function buildReviews() {
  const container = document.getElementById("reviews-content");
  if (!container) return;

  const starsSvg = (n) =>
    Array.from({ length: 5 })
      .map(
        (_, i) =>
          `<svg viewBox="0 0 20 20" class="star ${i < n ? "is-filled" : ""}" aria-hidden="true"><path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.2 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.2 6.1-.6z" fill="currentColor"/></svg>`
      )
      .join("");

  const recognitionsHTML = REAL_RECOGNITIONS.map(
    (r) => `
      <a class="review-card review-card--real" ${r.url ? `href="${r.url}" target="_blank" rel="noopener"` : ""}>
        <p class="review-card__badge">Reconocimiento verificado — ${r.source}</p>
        <h3>${r.title}</h3>
        <p>${r.body}</p>
        ${r.url ? '<span class="review-card__cta">Leer la noticia en toyota.com.sv ↗</span>' : ""}
      </a>`
  ).join("");

  const placeholdersHTML = SAMPLE_REVIEW_PLACEHOLDERS.map(
    (r) => `
      <article class="review-card review-card--placeholder">
        <p class="review-card__badge">${r.tag} — pendiente de integración real</p>
        <div class="review-card__stars" aria-label="${r.stars} de 5 estrellas">${starsSvg(r.stars)}</div>
        <p>Este espacio está preparado para mostrar reseñas verificadas de clientes (por ejemplo, vía Google Reviews). Aún no se ha conectado una fuente real, así que no se muestra ningún testimonio inventado.</p>
      </article>`
  ).join("");

  container.innerHTML = recognitionsHTML + placeholdersHTML;
}
