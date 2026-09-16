// ==========================================================================
// vehicle.js — vehicle data + procedural vehicle builder
//
// IMPORTANT: There is no licensed Toyota 3D model in this project. Instead,
// every vehicle is built procedurally from primitives so the interaction
// system (hotspots, hood/trunk/door opening, camera framing, configurator)
// is fully real and testable today.
//
// To swap in a real, authorized GLB model later:
//   1. Drop the file into /assets/models/<vehicle-id>.glb
//   2. In VEHICLE_DATA below, set `model: "assets/models/<vehicle-id>.glb"`
//   3. loadVehicle() will prefer the GLTF path over the procedural builder
//      as soon as a `model` field is present (see the TODO marker below).
// ==========================================================================
import * as THREE from "three";

export { VEHICLE_DATA } from "./vehicle-data.js";

const BODY_DIMENSIONS = {
  sedan: { length: 4.6, width: 1.8, cabinHeight: 0.62, hoodLength: 1.35 },
  suv: { length: 4.5, width: 1.9, cabinHeight: 0.95, hoodLength: 1.15 },
  pickup: { length: 5.2, width: 1.95, cabinHeight: 0.85, hoodLength: 1.5 },
  offroad: { length: 4.95, width: 1.98, cabinHeight: 1.05, hoodLength: 1.25 },
};

/**
 * Builds a procedural vehicle rig with named, animatable part groups:
 * body, hood, trunk, doorFL/FR/RL/RR, wheelFL/FR/RL/RR, headlightL/R, interior.
 * Each openable part is a THREE.Group pivoted at its hinge so rotating the
 * group produces a physically plausible opening motion.
 */
export function buildProceduralVehicle(vehicleData) {
  const dims = BODY_DIMENSIONS[vehicleData.bodyType] || BODY_DIMENSIONS.sedan;
  const root = new THREE.Group();
  root.name = `vehicle-${vehicleData.id}`;
  const parts = {};

  const paintMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(vehicleData.color),
    metalness: 0.6,
    roughness: 0.32,
    clearcoat: 1,
    clearcoatRoughness: 0.15,
  });
  parts.paintMat = paintMat;

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0d1013,
    metalness: 0.1,
    roughness: 0.05,
    transmission: 0.65,
    transparent: true,
    opacity: 0.9,
  });

  const trimMat = new THREE.MeshStandardMaterial({ color: 0x121316, metalness: 0.4, roughness: 0.5 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd8d9dc, metalness: 1, roughness: 0.2 });

  // ---------- Fixed vertical reference frame ----------
  // Every part is authored against these three shared heights so the parts
  // always meet cleanly regardless of vehicle length/width variation.
  const wheelRadius = dims.cabinHeight * 0.42 + 0.18;
  const CHASSIS_BOTTOM = wheelRadius * 0.55; // ground clearance
  const BODY_TOP = CHASSIS_BOTTOM + dims.cabinHeight * 0.72; // beltline / hood height
  const BODY_H = BODY_TOP - CHASSIS_BOTTOM;
  const cabinLength = dims.length * 0.5;
  const cabinFrontX = cabinLength / 2 - dims.length * 0.04;
  const cabinRearX = cabinFrontX - cabinLength;

  // ---------- Main lower body: ONE continuous box spanning the full length ----------
  // Hood/trunk lids and doors are layered on top of / into this shell, so
  // nothing can visually "float" disconnected from the rest of the car.
  const bodyGeo = new THREE.BoxGeometry(dims.length * 0.92, BODY_H, dims.width * 0.9);
  const body = new THREE.Mesh(bodyGeo, paintMat);
  body.position.set(0, CHASSIS_BOTTOM + BODY_H / 2, 0);
  body.castShadow = true;
  body.receiveShadow = true;
  root.add(body);
  parts.body = body;

  // Cabin roof / greenhouse — sits on top of the body, only over the cabin span.
  const roofH = dims.cabinHeight * 0.7;
  const roofGeo = new THREE.BoxGeometry(cabinLength * 0.92, roofH, dims.width * 0.76);
  const roof = new THREE.Mesh(roofGeo, glassMat);
  roof.position.set((cabinFrontX + cabinRearX) / 2, BODY_TOP + roofH / 2, 0);
  roof.castShadow = true;
  root.add(roof);
  parts.roof = roof;

  // ---------- Hood lid (hinged at windshield edge, flips up) ----------
  // Rests flush on top of the main body — same top height, no gap.
  const hoodPivot = new THREE.Group();
  hoodPivot.position.set(cabinFrontX, BODY_TOP, 0);
  root.add(hoodPivot);

  const hoodLidH = 0.09;
  const hoodGeo = new THREE.BoxGeometry(dims.hoodLength, hoodLidH, dims.width * 0.86);
  const hood = new THREE.Mesh(hoodGeo, paintMat);
  hood.position.set(dims.hoodLength / 2, hoodLidH / 2, 0);
  hood.castShadow = true;
  hoodPivot.add(hood);
  parts.hoodPivot = hoodPivot;
  parts.hood = hood;

  // Engine bay content — sits on the body's top surface, directly under the
  // lid's footprint. Hidden by default and revealed on open (rather than
  // physically boxed in) so nothing clips through the lid while closed.
  const engineGroup = new THREE.Group();
  engineGroup.position.set(cabinFrontX + dims.hoodLength * 0.42, BODY_TOP, 0);
  engineGroup.visible = false;
  const engineBlockH = BODY_H * 0.55;
  const engineBlockGeo = new THREE.BoxGeometry(dims.hoodLength * 0.5, engineBlockH, dims.width * 0.5);
  const engineBlockMat = new THREE.MeshStandardMaterial({ color: 0x2b2d31, metalness: 0.7, roughness: 0.4 });
  const engineBlock = new THREE.Mesh(engineBlockGeo, engineBlockMat);
  engineBlock.position.y = engineBlockH / 2;
  engineGroup.add(engineBlock);
  const capMat = new THREE.MeshStandardMaterial({ color: 0xeb0a1e, metalness: 0.3, roughness: 0.35 });
  const capGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.05, 24);
  for (const [dx, dz] of [[-0.25, -0.15], [0.05, -0.15], [-0.25, 0.15], [0.05, 0.15]]) {
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.set(dx, engineBlockH + 0.03, dz);
    engineGroup.add(cap);
  }
  root.add(engineGroup);
  parts.engineGroup = engineGroup;

  // ---------- Trunk lid (hinged at rear roofline, flips up) ----------
  const trunkPivot = new THREE.Group();
  trunkPivot.position.set(cabinRearX, BODY_TOP, 0);
  root.add(trunkPivot);

  const trunkLength = Math.max(dims.length * 0.92 * 0.5 - cabinLength * 0.5, 0.6);
  const trunkGeo = new THREE.BoxGeometry(trunkLength, hoodLidH, dims.width * 0.86);
  const trunk = new THREE.Mesh(trunkGeo, paintMat);
  trunk.position.set(-trunkLength / 2, hoodLidH / 2, 0);
  trunk.castShadow = true;
  trunkPivot.add(trunk);
  parts.trunkPivot = trunkPivot;
  parts.trunk = trunk;

  const cargoGroup = new THREE.Group();
  cargoGroup.position.set(cabinRearX - trunkLength * 0.45, BODY_TOP, 0);
  cargoGroup.visible = false;
  const cargoFloorGeo = new THREE.BoxGeometry(trunkLength * 0.75, 0.05, dims.width * 0.78);
  const cargoFloorMat = new THREE.MeshStandardMaterial({ color: 0x1a1b1e, roughness: 0.8 });
  const cargoFloor = new THREE.Mesh(cargoFloorGeo, cargoFloorMat);
  cargoGroup.add(cargoFloor);
  root.add(cargoGroup);
  parts.cargoGroup = cargoGroup;

  // ---------- Doors (hinged at front edge, swing outward) ----------
  // Sit directly on the body side face, same vertical span as the body box.
  parts.doors = {};
  const doorWidth = cabinLength * 0.52;
  const doorHeight = BODY_H * 0.96;
  const doorConfigs = [
    { id: "FL", side: 1, xOffset: cabinFrontX - 0.05 },
    { id: "RL", side: 1, xOffset: cabinFrontX - 0.05 - doorWidth },
    { id: "FR", side: -1, xOffset: cabinFrontX - 0.05 },
    { id: "RR", side: -1, xOffset: cabinFrontX - 0.05 - doorWidth },
  ];
  for (const cfg of doorConfigs) {
    const pivot = new THREE.Group();
    pivot.position.set(cfg.xOffset, CHASSIS_BOTTOM + doorHeight / 2, (cfg.side * dims.width * 0.9) / 2);
    root.add(pivot);
    const doorGeo = new THREE.BoxGeometry(doorWidth, doorHeight, 0.05);
    const door = new THREE.Mesh(doorGeo, paintMat);
    door.position.set(-doorWidth / 2, 0, 0);
    door.castShadow = true;
    pivot.add(door);
    parts.doors[cfg.id] = { pivot, mesh: door, side: cfg.side };
  }

  // ---------- Wheels ----------
  parts.wheels = {};
  const wheelConfigs = [
    { id: "FL", x: dims.length * 0.3, z: 1 },
    { id: "FR", x: dims.length * 0.3, z: -1 },
    { id: "RL", x: -dims.length * 0.3, z: 1 },
    { id: "RR", x: -dims.length * 0.3, z: -1 },
  ];
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x0c0c0d, roughness: 0.9 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xbfc1c5, metalness: 0.95, roughness: 0.25 });
  for (const cfg of wheelConfigs) {
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(cfg.x, wheelRadius, (cfg.z * dims.width * 0.98) / 2);
    const tireGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.22, 24);
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    wheelGroup.add(tire);
    const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.55, wheelRadius * 0.55, 0.24, 20);
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.z = Math.PI / 2;
    wheelGroup.add(rim);
    root.add(wheelGroup);
    parts.wheels[cfg.id] = { group: wheelGroup, tireMat, rimMat };
  }

  // ---------- Headlights ----------
  parts.headlights = {};
  const headlightGeo = new THREE.BoxGeometry(0.1, BODY_H * 0.32, dims.width * 0.28);
  const headlightMatOff = new THREE.MeshStandardMaterial({ color: 0xdadde2, emissive: 0x000000, metalness: 0.2, roughness: 0.2 });
  const frontX = dims.length * 0.92 * 0.5 - 0.06;
  for (const side of [1, -1]) {
    const hl = new THREE.Mesh(headlightGeo, headlightMatOff.clone());
    hl.position.set(frontX, BODY_TOP - BODY_H * 0.35, (side * dims.width * 0.66) / 2);
    root.add(hl);
    parts.headlights[side === 1 ? "L" : "R"] = hl;
  }

  // ---------- Simplified interior (dash, seats, wheel) ----------
  const interiorGroup = new THREE.Group();
  interiorGroup.position.set(-dims.length * 0.02, CHASSIS_BOTTOM + BODY_H * 0.35, 0);
  const dashGeo = new THREE.BoxGeometry(0.18, 0.3, dims.width * 0.78);
  const dashMat = new THREE.MeshStandardMaterial({ color: 0x1c1d20, roughness: 0.7 });
  const dash = new THREE.Mesh(dashGeo, dashMat);
  dash.position.set(dims.length * 0.16, 0.15, 0);
  interiorGroup.add(dash);

  const screenGeo = new THREE.PlaneGeometry(0.22, 0.14);
  const screenMat = new THREE.MeshBasicMaterial({ color: 0x0d1a2e });
  const screen = new THREE.Mesh(screenGeo, screenMat);
  screen.position.set(dims.length * 0.16 + 0.095, 0.24, 0);
  screen.rotation.y = Math.PI / 2;
  interiorGroup.add(screen);
  parts.dashScreen = screen;

  const wheelRingGeo = new THREE.TorusGeometry(0.14, 0.02, 12, 24);
  const steeringWheel = new THREE.Mesh(wheelRingGeo, trimMat);
  steeringWheel.position.set(dims.length * 0.08, 0.2, dims.width * 0.18);
  steeringWheel.rotation.x = Math.PI / 2.4;
  interiorGroup.add(steeringWheel);

  const seatMat = new THREE.MeshStandardMaterial({ color: 0x232427, roughness: 0.85 });
  for (const [dx, dz] of [[-0.1, 0.28], [-0.1, -0.28], [-0.75, 0.28], [-0.75, -0.28]]) {
    const seatBaseGeo = new THREE.BoxGeometry(0.32, 0.2, 0.34);
    const seatBase = new THREE.Mesh(seatBaseGeo, seatMat);
    seatBase.position.set(dx, 0.1, dz);
    interiorGroup.add(seatBase);
    const seatBackGeo = new THREE.BoxGeometry(0.06, 0.36, 0.34);
    const seatBack = new THREE.Mesh(seatBackGeo, seatMat);
    seatBack.position.set(dx - 0.13, 0.28, dz);
    interiorGroup.add(seatBack);
  }
  root.add(interiorGroup);
  parts.interiorGroup = interiorGroup;

  root.userData.dims = dims;
  return { root, parts };
}

export function disposeVehicle(vehicleRig) {
  vehicleRig.root.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((m) => m.dispose());
    }
  });
}

/** Applies a new paint color to the vehicle's body material (configurator). */
export function setVehicleColor(vehicleRig, hexColor) {
  vehicleRig.parts.paintMat.color.set(hexColor);
}

/** Toggles headlight emissive state. */
export function setHeadlightsOn(vehicleRig, on) {
  for (const key of ["L", "R"]) {
    const hl = vehicleRig.parts.headlights[key];
    hl.material.emissive.set(on ? 0xfff3d6 : 0x000000);
    hl.material.emissiveIntensity = on ? 2.5 : 0;
  }
}
