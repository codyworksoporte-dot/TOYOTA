// ==========================================================================
// animations.js — part-opening timelines + scroll storytelling
// ==========================================================================

/** Opens/closes the hood with a physically plausible hinge rotation. */
export function animateHood(vehicleRig, open, duration = 1.1) {
  const pivot = vehicleRig.parts.hoodPivot;
  const engineGroup = vehicleRig.parts.engineGroup;
  if (open && engineGroup) engineGroup.visible = true;
  return gsap.to(pivot.rotation, {
    z: open ? -1.05 : 0,
    duration,
    ease: open ? "back.out(1.4)" : "power2.inOut",
    onComplete: () => { if (!open && engineGroup) engineGroup.visible = false; },
  });
}

export function animateTrunk(vehicleRig, open, duration = 1.1) {
  const pivot = vehicleRig.parts.trunkPivot;
  const cargoGroup = vehicleRig.parts.cargoGroup;
  if (open && cargoGroup) cargoGroup.visible = true;
  return gsap.to(pivot.rotation, {
    z: open ? 1.0 : 0,
    duration,
    ease: open ? "back.out(1.4)" : "power2.inOut",
    onComplete: () => { if (!open && cargoGroup) cargoGroup.visible = false; },
  });
}

export function animateDoor(vehicleRig, doorId, open, duration = 1.0) {
  const door = vehicleRig.parts.doors[doorId];
  if (!door) return null;
  const targetAngle = open ? door.side * -1.0 : 0;
  return gsap.to(door.pivot.rotation, {
    y: targetAngle,
    duration,
    ease: open ? "power3.out" : "power2.inOut",
  });
}

export function animateWheelSpin(vehicleRig, wheelId, on) {
  const wheel = vehicleRig.parts.wheels[wheelId];
  if (!wheel) return null;
  gsap.killTweensOf(wheel.group.rotation);
  if (on) {
    return gsap.to(wheel.group.rotation, {
      x: "+=6.28",
      duration: 2.4,
      repeat: -1,
      ease: "none",
    });
  }
}

/**
 * Sets up Lenis smooth scrolling + GSAP ScrollTrigger driven camera moves
 * through the narrative sections (exterior -> tech -> interior -> ...).
 * Returns a teardown function.
 */
export function setupScrollStory({ cameraRig, cameraStates, onSectionChange, reducedMotion }) {
  const sections = Array.from(document.querySelectorAll(".story[data-story]"));
  const triggers = [];

  const sectionCameraMap = {
    exterior: "side",
    tecnologia: "front",
    interior: "interior",
    seguridad: "front",
    rendimiento: "rear",
  };

  sections.forEach((section) => {
    const key = section.dataset.story;
    const targetStateName = sectionCameraMap[key] || "exterior";

    const trigger = ScrollTrigger.create({
      trigger: section,
      start: "top center",
      end: "bottom center",
      onEnter: () => {
        section.classList.add("is-active");
        onSectionChange(key);
        if (!reducedMotion()) {
          cameraRig.goTo({ ...cameraStates[targetStateName], name: targetStateName }, { duration: 1.4 });
        }
      },
      onEnterBack: () => {
        section.classList.add("is-active");
        onSectionChange(key);
        if (!reducedMotion()) {
          cameraRig.goTo({ ...cameraStates[targetStateName], name: targetStateName }, { duration: 1.4 });
        }
      },
      onLeave: () => section.classList.remove("is-active"),
      onLeaveBack: () => section.classList.remove("is-active"),
    });
    triggers.push(trigger);
  });

  return () => triggers.forEach((t) => t.kill());
}

/** IntersectionObserver-based reveal for elements with .reveal (used outside the scroll-story sections). */
export function setupRevealObserver() {
  const els = document.querySelectorAll(".reveal");
  if (!els.length) return () => {};
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("is-visible");
      });
    },
    { threshold: 0.2 }
  );
  els.forEach((el) => io.observe(el));
  return () => io.disconnect();
}
