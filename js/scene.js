// ==========================================================================
// scene.js — renderer, scene graph, lighting, environment, resize handling
// ==========================================================================
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  // PERF: capping at 1.5 instead of 2 roughly halves fragment-shader cost on
  // common 2x/3x-DPR laptop and phone screens, with a difference in sharpness
  // that's hard to notice against a large 4/3-visible-body vehicle scene.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0a0a0c, 14, 34);

  // Environment lighting (studio-style HDRI substitute, generated procedurally
  // so the project needs no external HDR file to look believable).
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRT.texture;

  // --- Showroom floor: dark reflective disc ---
  const floorGeo = new THREE.CircleGeometry(18, 64);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x0c0c0e,
    roughness: 0.28,
    metalness: 0.55,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Subtle concentric ring accents on the floor (showroom marking)
  const ringGeo = new THREE.RingGeometry(4.6, 4.66, 128);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x2a2a2e, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.001;
  scene.add(ring);

  // --- Lighting ---
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(6, 9, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); // PERF: 2048 was overkill for a single car-sized shadow caster
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 30;
  key.shadow.camera.left = -10;
  key.shadow.camera.right = 10;
  key.shadow.camera.top = 10;
  key.shadow.camera.bottom = -10;
  key.shadow.bias = -0.0015;
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xeb0a1e, 1.1);
  rim.position.set(-6, 4, -8);
  scene.add(rim);

  const fill = new THREE.HemisphereLight(0x3a3a40, 0x080809, 0.6);
  scene.add(fill);

  const ambient = new THREE.AmbientLight(0xffffff, 0.15);
  scene.add(ambient);

  // Spotlight following the "hero" mood — cone of light above the car
  const spot = new THREE.SpotLight(0xffffff, 3.2, 22, Math.PI / 6, 0.4, 1.2);
  spot.position.set(0, 10, 2);
  spot.target.position.set(0, 0, 0);
  spot.castShadow = false;
  scene.add(spot);
  scene.add(spot.target);

  const camera = new THREE.PerspectiveCamera(
    38,
    canvas.clientWidth / canvas.clientHeight || 1,
    0.1,
    100
  );
  camera.position.set(0, 1.8, 7.5);

  function resize() {
    const parent = canvas.parentElement;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    // The renderer can be initialized from the configurator while hidden.
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Keep the complete vehicle in frame on portrait phones.
    camera.zoom = Math.min(1, Math.max(0.3, camera.aspect / 1.5));
    camera.updateProjectionMatrix();
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas.parentElement);
  resize();

  function dispose() {
    resizeObserver.disconnect();
    envRT.texture.dispose();
    pmrem.dispose();
    floorGeo.dispose();
    floorMat.dispose();
    ringGeo.dispose();
    ringMat.dispose();
    renderer.dispose();
  }

  return { renderer, scene, camera, resize, dispose };
}
