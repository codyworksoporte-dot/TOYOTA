// ==========================================================================
// main.js — application entry point / orchestrator
//
// Architecture: the site is a set of distinct "views" (js/router.js) —
// Modelos, Ficha, Explorador 3D, Exterior, Interior, Tecnología, Servicios,
// Configurador, Reseñas — switched with a cross-fade instead of living in
// one continuous scroll. The heavy Three.js stack (scene, vehicle geometry,
// camera rig, hotspots) is NOT loaded on page load: it's dynamically
// imported the first time the user actually needs it (opens "Explorar en
// 3D" or touches the Configurador), so the default Modelos/Ficha views are
// cheap, ordinary HTML+CSS with no WebGL cost at all.
// ==========================================================================
import { VEHICLE_DATA } from "./vehicle-data.js";
import { CustomCursor, attachKeyboardNav, prefersReducedMotion } from "./interactions.js";
import {
  detectWebGL,
  showFallback,
  setLoadingProgress,
  showContinueButton,
  buildVehicleSelector,
  buildFicha,
  showInfoPanel,
  hideInfoPanel,
  buildReviews,
} from "./ui.js";
import { setupConfigurator } from "./configurator.js";
import { createRouter } from "./router.js";

const reducedMotion = prefersReducedMotion();
document.body.dataset.reducedMotion = String(reducedMotion);

// Absolute safety net for the loading screen: if anything below throws
// (e.g. a stale cached script referencing an element that no longer
// exists after an update) the user must never be stuck staring at
// "Preparando el showroom…" forever. This guarantees the gate opens
// within 4s no matter what else happens on the page.
let continueRevealed = false;
function revealContinueOnce() {
  if (continueRevealed) return;
  continueRevealed = true;
  showContinueButton(() => {});
}
setTimeout(revealContinueOnce, 4000);

const webglOK = detectWebGL();
const vehicleRigRef = { current: null };
let currentVehicleData = VEHICLE_DATA[0];

// --------------------------------------------------------------------
// Cursor + keyboard work regardless of the 3D stack.
// --------------------------------------------------------------------
const cursor = new CustomCursor(document.getElementById("custom-cursor"));

// --------------------------------------------------------------------
// View router — wires nav clicks to view switches immediately.
// --------------------------------------------------------------------
const router = createRouter({
  reducedMotion: () => reducedMotion,
  onEnter: (name) => {
    if (name === "explorador" && !webglOK) {
      // Nothing to show without WebGL — bounce back to the ficha, which
      // already has real photos + specs as a full alternative.
      queueMicrotask(() => router.goTo("ficha"));
      return;
    }
    if (name === "explorador") {
      queueMicrotask(async () => {
        try { await ensureVehicleLoaded(); }
        catch {
          showFallback();
          const message = document.querySelector(".scene-fallback__plate p:last-child");
          message.textContent = "No pudimos cargar el explorador. Vuelve a la ficha para ver fotos y especificaciones.";
        }
      });
    }
    // Story-text stagger reveal (see animations.css) — re-triggered every
    // time one of these brand views is entered, since they're no longer
    // scroll-revealed (there's nothing to scroll past anymore).
    const story = document.querySelector(`#view-${name} .story`);
    if (story) {
      story.classList.remove("is-active");
      void story.offsetWidth; // restart the CSS animation on repeat visits
      story.classList.add("is-active");
      // Safety net (see router.js): guarantee visibility even if the CSS
      // animation never gets to run (e.g. a stalled/backgrounded tab).
      setTimeout(() => {
        story.querySelectorAll(".story__text > *").forEach((el) => {
          el.style.opacity = "1";
          el.style.transform = "none";
        });
      }, 1000);
    }
  },
});

// --------------------------------------------------------------------
// Native scrolling within a view; no continuously running smooth-scroll loop.
// --------------------------------------------------------------------
document.querySelectorAll("[data-scroll-to]").forEach((el) => {
  el.addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById(el.dataset.scrollTo).scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
  });
});

// --------------------------------------------------------------------
// Vehicle selector -> ficha view (no 3D needed just to browse models).
// --------------------------------------------------------------------
buildVehicleSelector((data) => {
  currentVehicleData = data;
  buildFicha(data);
  router.goTo("ficha");
});

buildReviews();

// Show something reasonable in the ficha view even before the user has
// clicked a selector card (e.g. arriving via a direct nav click).
buildFicha(currentVehicleData);

if (!webglOK) {
  document.getElementById("btn-explore-3d").disabled = true;
  document.getElementById("btn-explore-3d").title = "Tu navegador no admite WebGL — la exploración 3D no está disponible.";
}

// --------------------------------------------------------------------
// Lazy 3D engine — built once, on first real need.
// --------------------------------------------------------------------
let engine = null;
let engineReadyPromise = null;

function ensureEngine() {
  if (!webglOK) return Promise.resolve();
  if (engineReadyPromise) return engineReadyPromise;
  engineReadyPromise = boot3DEngine().catch((error) => {
    engineReadyPromise = null;
    throw error;
  });
  return engineReadyPromise;
}

async function boot3DEngine() {
  const [THREE, { createScene }, { buildProceduralVehicle, disposeVehicle, setHeadlightsOn }, { CameraRig, getCameraStates }, { buildHotspots, HotspotController }, { animateHood, animateTrunk, animateDoor, animateWheelSpin }, { attachPointerTracking, attachTouchGestures }] =
    await Promise.all([
      import("three"),
      import("./scene.js"),
      import("./vehicle.js"),
      import("./camera.js"),
      import("./hotspots.js"),
      import("./animations.js"),
      import("./interactions.js"),
    ]);

  const canvas = document.getElementById("scene-canvas");
  const stage = document.getElementById("scene-stage");
  const hotspotLayer = document.getElementById("hotspot-layer");
  const backBtn = document.getElementById("btn-back-to-vehicle");
  const infoPanelCloseBtn = document.getElementById("info-panel-close");

  const { renderer, scene, camera, dispose } = createScene(canvas);
  const cameraRig = new CameraRig(camera);
  let hotspots = [];
  let cameraStates = {};
  let focusedAction = null;

  const hotspotController = new HotspotController(hotspotLayer, handleHotspotActivate);

  function loadVehicle(data, isInitial = false) {
    const previousRig = vehicleRigRef.current;

    const spawn = () => {
      focusedAction = null;
      backBtn.hidden = true;
      hideInfoPanel();
      const rig = buildProceduralVehicle(data);
      scene.add(rig.root);
      vehicleRigRef.current = rig;
      configuration.apply(rig);

      cameraStates = getCameraStates(rig.root.userData.dims);
      hotspots = buildHotspots(rig.root.userData.dims, data.bodyType);
      hotspotController.setHotspots(hotspots);
      attachHotspotCursorEvents();

      if (isInitial || reducedMotion) {
        const s = cameraStates.exterior;
        camera.position.set(s.position.x, s.position.y, s.position.z);
        camera.fov = s.fov;
        camera.updateProjectionMatrix();
        cameraRig.currentTarget.set(s.target.x, s.target.y, s.target.z);
        camera.lookAt(cameraRig.currentTarget);
        cameraRig.autoRotate = true;
        rig.root.scale.setScalar(1);
        rig.root.traverse((o) => { if (o.material) setOpacity(o.material, 1); });
      } else {
        rig.root.scale.setScalar(0.92);
        rig.root.traverse((o) => { if (o.material) setOpacity(o.material, 0); });
        gsap.to(rig.root.scale, { x: 1, y: 1, z: 1, duration: 1.1, ease: "power3.out" });
        rig.root.traverse((o) => {
          if (o.material) {
            const mats = Array.isArray(o.material) ? o.material : [o.material];
            mats.forEach((m) => {
              m.transparent = true;
              gsap.to(m, { opacity: 1, duration: 1.0, delay: 0.15, ease: "power2.out" });
            });
          }
        });
        cameraRig.goTo({ ...cameraStates.exterior, name: "exterior" }, { duration: 1.3 });
        cameraRig.autoRotate = true;
      }
    };

    if (previousRig && !isInitial) {
      cameraRig.autoRotate = false;
      gsap.to(camera.position, { z: camera.position.z + 1.2, duration: 0.5, ease: "power2.in" });
      gsap.to(previousRig.root.scale, { x: 0.85, y: 0.85, z: 0.85, duration: 0.5, ease: "power2.in" });
      previousRig.root.traverse((o) => {
        if (o.material) {
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m) => {
            m.transparent = true;
            gsap.to(m, { opacity: 0, duration: 0.45, ease: "power2.in" });
          });
        }
      });
      setTimeout(() => {
        scene.remove(previousRig.root);
        disposeVehicle(previousRig);
        spawn();
      }, 480);
    } else {
      if (previousRig) {
        scene.remove(previousRig.root);
        disposeVehicle(previousRig);
      }
      spawn();
    }
  }

  function setOpacity(mat, v) {
    const mats = Array.isArray(mat) ? mat : [mat];
    mats.forEach((m) => { m.transparent = v < 1; m.opacity = v; });
  }

  function attachHotspotCursorEvents() {
    hotspotLayer.querySelectorAll(".hotspot").forEach((btn) => {
      btn.addEventListener("mouseenter", () => cursor.setHover(true, "Explorar"));
      btn.addEventListener("mouseleave", () => cursor.setHover(false));
    });
  }

  function handleHotspotActivate(hs) {
    focusedAction = hs.action;
    backBtn.hidden = false;
    hideInfoPanel();

    const rig = vehicleRigRef.current;
    switch (hs.action) {
      case "open-hood":
        cameraRig.goTo({ ...cameraStates.engine, name: "engine" }, { duration: 1.3 });
        animateHood(rig, true);
        setTimeout(() => showInfoPanel("hood", currentVehicleData), 400);
        hotspotController.setVisible([]);
        break;
      case "open-trunk":
        cameraRig.goTo({ ...cameraStates.trunk, name: "trunk" }, { duration: 1.3 });
        animateTrunk(rig, true);
        setTimeout(() => showInfoPanel("trunk", currentVehicleData), 400);
        hotspotController.setVisible([]);
        break;
      case "enter-interior":
        cameraRig.goTo({ ...cameraStates.interior, name: "interior" }, { duration: 1.5 });
        setTimeout(() => showInfoPanel("interior", currentVehicleData), 500);
        hotspotController.setVisible([]);
        break;
      case "focus-headlight-L":
        cameraRig.goTo({ ...cameraStates.headlightL, name: "headlightL" }, { duration: 1.1 });
        setHeadlightsOn(rig, true);
        setTimeout(() => showInfoPanel("headlightL", currentVehicleData), 350);
        hotspotController.setVisible([]);
        break;
      case "focus-wheel-FL":
        cameraRig.goTo({ ...cameraStates.wheelFL, name: "wheelFL" }, { duration: 1.1 });
        animateWheelSpin(rig, "FL", true);
        setTimeout(() => showInfoPanel("wheelFL", currentVehicleData), 350);
        hotspotController.setVisible([]);
        break;
      case "open-door-FL":
        cameraRig.goTo({ ...cameraStates.front, name: "front" }, { duration: 1.2 });
        animateDoor(rig, "FL", true);
        setTimeout(() => showInfoPanel("doorFL", currentVehicleData), 400);
        hotspotController.setVisible([]);
        break;
    }
  }

  function resetToVehicle() {
    const rig = vehicleRigRef.current;
    if (!rig) return;
    backBtn.hidden = true;
    hideInfoPanel();

    switch (focusedAction) {
      case "open-hood": animateHood(rig, false); break;
      case "open-trunk": animateTrunk(rig, false); break;
      case "focus-headlight-L": setHeadlightsOn(rig, false); break;
      case "focus-wheel-FL": animateWheelSpin(rig, "FL", false); break;
      case "open-door-FL": animateDoor(rig, "FL", false); break;
    }
    focusedAction = null;

    cameraRig.goTo({ ...cameraStates.exterior, name: "exterior" }, {
      duration: 1.3,
      onComplete: () => { cameraRig.autoRotate = true; },
    });
    hotspotController.setVisible(null);
  }

  backBtn.addEventListener("click", resetToVehicle);
  infoPanelCloseBtn.addEventListener("click", hideInfoPanel);
  attachKeyboardNav({ onEscape: resetToVehicle });

  attachPointerTracking(stage, {
    onMove: (nx, ny) => cameraRig.setPointerInfluence(nx, ny),
  });

  attachTouchGestures(stage, {
    onPinch: (factor) => {
      camera.fov = THREE.MathUtils.clamp(camera.fov / factor, 20, 46);
      camera.updateProjectionMatrix();
    },
    onSwipe: (dir) => { cameraRig._autoAngle += dir === "left" ? 0.3 : -0.3; },
  });

  // Render loop, paused via IntersectionObserver whenever the "explorador"
  // view (and therefore the canvas) isn't the one on screen — the view
  // router's display:none on inactive views makes this trivial and cheap.
  const clock = new THREE.Clock();
  let rafId = null;
  let sceneVisible = false;

  function tick() {
    const dt = Math.min(clock.getDelta(), 0.05);

    if (cameraRig.autoRotate && vehicleRigRef.current) {
      const angle = cameraRig._autoAngle;
      const r = 7.6;
      camera.position.x = Math.sin(angle) * r * 0.15;
      camera.position.z = 7.6 - Math.abs(Math.sin(angle)) * 0.3;
    }
    cameraRig.update(dt);

    if (vehicleRigRef.current) {
      vehicleRigRef.current.root.updateMatrixWorld();
      hotspotController.update(camera, vehicleRigRef.current.root);
    }

    renderer.render(scene, camera);
    rafId = sceneVisible ? requestAnimationFrame(tick) : null;
  }

  const sceneVisibilityObserver = new IntersectionObserver(
    (entries) => {
      sceneVisible = entries[0].isIntersecting;
      if (sceneVisible && rafId === null) {
        clock.getDelta();
        rafId = requestAnimationFrame(tick);
      }
    },
    { threshold: 0 }
  );
  sceneVisibilityObserver.observe(stage);

  window.addEventListener("pagehide", () => {
    if (rafId !== null) cancelAnimationFrame(rafId);
    sceneVisibilityObserver.disconnect();
    hotspotController.dispose();
    if (vehicleRigRef.current) disposeVehicle(vehicleRigRef.current);
    dispose();
  });

  engine = { loadVehicle };
  return engine;
}

// Guarantees a vehicle is actually loaded into the scene — booting the
// engine alone (ensureEngine) sets up the renderer/camera/hotspots but
// loads nothing, so every consumer that needs to SEE the car goes through
// this instead, which tracks whether the first load has already happened.
let hasLoadedVehicle = false;
async function ensureVehicleLoaded() {
  const eng = await ensureEngine();
  if (!eng) return null;
  if (!hasLoadedVehicle || vehicleRigRef.current?.root.name !== `vehicle-${currentVehicleData.id}`) {
    eng.loadVehicle(currentVehicleData, true);
    hasLoadedVehicle = true;
  }
  return eng;
}

// "Explorar en 3D" — the whole point of the deferred boot.
document.getElementById("btn-explore-3d").addEventListener("click", async () => {
  const btn = document.getElementById("btn-explore-3d");
  btn.disabled = true;
  const originalLabel = btn.textContent;
  btn.textContent = "Cargando…";
  try {
    const eng = await ensureVehicleLoaded();
    if (eng) router.goTo("explorador");
  } catch {
    document.getElementById("explore-status").textContent = "No se pudo cargar el explorador. Comprueba tu conexión e inténtalo de nuevo. Las fotos y la ficha siguen disponibles.";
  } finally {
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
});

const configuration = setupConfigurator({ vehicleRigRef, ensureEngine: ensureVehicleLoaded });

// --------------------------------------------------------------------
// Loading screen: nothing heavy to prepare up front anymore (3D is
// deferred), so we just gate on an explicit "Continuar" click as requested
// — the black screen with the swinging red logo and light rays stays up
// until the user chooses to proceed.
// --------------------------------------------------------------------
if (!webglOK) showFallback();
setLoadingProgress(100, "Listo");
revealContinueOnce();
