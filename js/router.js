// ==========================================================================
// router.js — lightweight view switcher
//
// Turns the single scrolling page into distinct "screens": only one
// `.view[data-view]` section is visible at a time, and switching between
// them (via nav clicks, or programmatically) plays a short cross-fade so it
// reads as a real screen change rather than an instant cut — the same
// feeling as navigating between separate pages on a traditional site,
// without the cost of a full reload.
// ==========================================================================

export function createRouter({ onEnter, reducedMotion } = {}) {
  const views = new Map();
  document.querySelectorAll(".view[data-view]").forEach((el) => {
    views.set(el.dataset.view, el);
  });

  let current = null;
  let activeTimeline = null;

  function setNavState(name) {
    document.querySelectorAll("[data-view-link]").forEach((el) => {
      const isMatch = el.dataset.viewLink === name;
      if (el.tagName === "A") {
        if (isMatch) el.setAttribute("aria-current", "page");
        else el.removeAttribute("aria-current");
      }
    });
  }

  function goTo(name, { instant = false, direction = "forward" } = {}) {
    const target = views.get(name);
    if (!target || name === current) return;

    const previous = current ? views.get(current) : null;
    current = name;
    setNavState(name);
    history.replaceState(null, "", `#${name}`);

    // A new navigation can arrive while the last one is still mid-fade
    // (fast double-clicks, or a click right after the initial load). Kill
    // whatever's in flight and snap every view but the one we're about to
    // animate out to a clean, consistent state first — otherwise two views
    // can end up racing each other and BOTH land inactive.
    if (activeTimeline) {
      activeTimeline.kill();
      activeTimeline = null;
    }
    views.forEach((el) => {
      if (el !== previous) {
        el.classList.remove("view--active");
        el.style.opacity = "";
        el.style.transform = "";
      }
    });
    if (previous) {
      previous.style.opacity = "";
      previous.style.transform = "";
    }

    if (!previous) {
      target.classList.add("view--active");
      target.scrollTop = 0;
      window.scrollTo(0, 0);
      onEnter && onEnter(name);
      return;
    }

    if (instant) {
      // Only the very first view on page load skips animation entirely —
      // there's nothing to cross-fade FROM yet, so a transition would just
      // be a fade-in from nothing.
      previous.classList.remove("view--active");
      target.classList.add("view--active");
      target.scrollTop = 0;
      window.scrollTo(0, 0);
      onEnter && onEnter(name);
      return;
    }

    // Reduced motion still gets a transition — just a quick opacity
    // cross-fade with no motion (no slide/translate), rather than either a
    // full animated trip or a jarring instant cut. See apple-design skill,
    // §14: reduced motion means gentler feedback, not none.
    const isReduced = reducedMotion();
    const outDuration = isReduced ? 0.12 : 0.32;
    const inDuration = isReduced ? 0.15 : 0.45;
    // Spatial consistency (apple-design skill, §7): a "volver" should
    // retrace the same path in reverse, not repeat the forward motion —
    // otherwise back navigation feels disconnected from what it's undoing.
    const sign = direction === "back" ? -1 : 1;
    const travel = isReduced ? 0 : 16 * sign;

    // `settled` guards against the GSAP timeline and the safety-net timer
    // both trying to finish this same transition (whichever gets there
    // first wins; the other becomes a no-op).
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      if (activeTimeline) { activeTimeline.kill(); activeTimeline = null; }
      previous.classList.remove("view--active");
      previous.style.opacity = "";
      previous.style.transform = "";
      target.classList.add("view--active");
      target.style.opacity = "";
      target.style.transform = "";
      target.scrollTop = 0;
      window.scrollTo(0, 0);
      onEnter && onEnter(name);
    };

    activeTimeline = gsap.timeline({
      onComplete: () => { activeTimeline = null; },
    })
      .to(previous, {
        opacity: 0,
        y: -travel,
        duration: outDuration,
        ease: "power2.in",
        onComplete: () => {
          previous.classList.remove("view--active");
          previous.style.opacity = "";
          previous.style.transform = "";
        },
      })
      .add(() => {
        if (settled) return; // the safety net already forced this through
        settled = true;
        target.classList.add("view--active");
        target.scrollTop = 0;
        window.scrollTo(0, 0);
        gsap.fromTo(
          target,
          { opacity: 0, y: travel },
          { opacity: 1, y: 0, duration: inDuration, ease: "power2.out" }
        );
        onEnter && onEnter(name);
      });

    // Safety net: fully independent of the GSAP/rAF-driven timeline above,
    // which can stall if the tab gets backgrounded mid-transition (browsers
    // throttle or fully suspend rAF then, but NOT plain timers). This
    // guarantees the view switch actually completes — visibly, not just in
    // `current`/the URL hash — no matter what.
    setTimeout(finish, (outDuration + inDuration) * 1000 + 400);
  }

  // Intercept clicks on any [data-view-link] element so navigation feels
  // instant and never triggers a native anchor jump/scroll.
  document.addEventListener("click", (e) => {
    const link = e.target.closest("[data-view-link]");
    if (!link) return;
    e.preventDefault();
    const direction = link.closest(".view-back") ? "back" : "forward";
    goTo(link.dataset.viewLink, { direction });
  });

  // Support the browser back/forward buttons via the URL hash.
  window.addEventListener("hashchange", () => {
    const name = location.hash.slice(1);
    if (views.has(name)) goTo(name);
  });

  const initial = location.hash.slice(1);
  goTo(views.has(initial) ? initial : "modelos", { instant: true });

  return { goTo, current: () => current };
}
