// ==========================================================================
// camera.js — named camera states + cinematic GSAP transitions
// ==========================================================================
import * as THREE from "three";

/**
 * Camera states are defined as { position: Vector3-like, target: Vector3-like, fov }.
 * All are expressed in world space relative to the vehicle root at origin.
 */
export function getCameraStates(dims) {
  const L = dims.length;
  return {
    exterior: {
      position: { x: 0, y: 1.9, z: 7.6 },
      target: { x: 0, y: 0.6, z: 0 },
      fov: 38,
    },
    front: {
      position: { x: L * 0.75, y: 1.2, z: 2.4 },
      target: { x: L * 0.3, y: 0.6, z: 0 },
      fov: 34,
    },
    side: {
      position: { x: 0.4, y: 1.1, z: 6.4 },
      target: { x: 0, y: 0.55, z: 0 },
      fov: 30,
    },
    rear: {
      position: { x: -L * 0.7, y: 1.3, z: 2.6 },
      target: { x: -L * 0.35, y: 0.65, z: 0 },
      fov: 34,
    },
    engine: {
      position: { x: L * 0.42, y: 1.35, z: 1.15 },
      target: { x: L * 0.34, y: 0.55, z: 0 },
      fov: 26,
    },
    trunk: {
      position: { x: -L * 0.42, y: 1.35, z: 1.15 },
      target: { x: -L * 0.32, y: 0.55, z: 0 },
      fov: 26,
    },
    interior: {
      position: { x: L * 0.05, y: 0.75, z: 0.55 },
      target: { x: L * 0.2, y: 0.5, z: 0 },
      fov: 42,
    },
    wheelFL: { position: { x: L * 0.3, y: 0.65, z: 1.55 }, target: { x: L * 0.3, y: 0.42, z: (dims.width || 1.8) / 2 }, fov: 24 },
    wheelFR: { position: { x: L * 0.3, y: 0.65, z: -1.55 }, target: { x: L * 0.3, y: 0.42, z: -(dims.width || 1.8) / 2 }, fov: 24 },
    wheelRL: { position: { x: -L * 0.3, y: 0.65, z: 1.55 }, target: { x: -L * 0.3, y: 0.42, z: (dims.width || 1.8) / 2 }, fov: 24 },
    wheelRR: { position: { x: -L * 0.3, y: 0.65, z: -1.55 }, target: { x: -L * 0.3, y: 0.42, z: -(dims.width || 1.8) / 2 }, fov: 24 },
    headlightL: { position: { x: L * 0.62, y: 0.75, z: 1.1 }, target: { x: L * 0.47, y: 0.56, z: (dims.width || 1.8) * 0.35 }, fov: 22 },
    headlightR: { position: { x: L * 0.62, y: 0.75, z: -1.1 }, target: { x: L * 0.47, y: 0.56, z: -(dims.width || 1.8) * 0.35 }, fov: 22 },
  };
}

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.currentTarget = new THREE.Vector3(0, 0.6, 0);
    this.desiredTarget = new THREE.Vector3(0, 0.6, 0);
    this.currentState = "exterior";
    this._tween = null;

    // Idle parallax offsets, driven by pointer position (interactions.js writes to these)
    this.pointerInfluence = new THREE.Vector2(0, 0);
    this.autoRotate = true;
    this._autoAngle = 0;
  }

  /** Smoothly animates the camera to a named/custom state using GSAP. */
  goTo(state, { duration = 1.6, ease = "power3.inOut", onComplete } = {}) {
    if (this._tween) this._tween.kill();
    this.autoRotate = false;
    const camPos = this.camera.position;
    const tmp = { ...camPos, tx: this.currentTarget.x, ty: this.currentTarget.y, tz: this.currentTarget.z, fov: this.camera.fov };

    this._tween = gsap.timeline({
      onComplete: () => {
        this.currentState = state.name || this.currentState;
        if (onComplete) onComplete();
      },
    });

    this._tween.to(tmp, {
      x: state.position.x,
      y: state.position.y,
      z: state.position.z,
      tx: state.target.x,
      ty: state.target.y,
      tz: state.target.z,
      fov: state.fov,
      duration,
      ease,
      onUpdate: () => {
        this.camera.position.set(tmp.x, tmp.y, tmp.z);
        this.currentTarget.set(tmp.tx, tmp.ty, tmp.tz);
        this.camera.fov = tmp.fov;
        this.camera.updateProjectionMatrix();
        this.camera.lookAt(this.currentTarget);
      },
    }, 0);

    return this._tween;
  }

  /** Per-frame idle motion: gentle auto-orbit + subtle pointer-driven parallax. */
  update(dt) {
    if (this.autoRotate) {
      this._autoAngle += dt * 0.05;
    }
    const parallaxX = this.pointerInfluence.x * 0.6;
    const parallaxY = this.pointerInfluence.y * 0.25;
    // Applied as a small offset added on top of the tween-driven base position
    // via a lightweight lookAt nudge, so it never fights the GSAP timeline.
    const look = this.currentTarget.clone();
    look.x += parallaxX * 0.3;
    look.y += parallaxY * 0.15;
    this.camera.lookAt(look);
  }

  setPointerInfluence(nx, ny) {
    this.pointerInfluence.set(nx, ny);
  }
}
