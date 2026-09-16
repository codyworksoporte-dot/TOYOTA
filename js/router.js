// One active view, an interruptible transition, and normal browser history.
export function createRouter({ onEnter, reducedMotion = () => false } = {}) {
  const views = new Map([...document.querySelectorAll('.view[data-view]')].map(el => [el.dataset.view, el]));
  let current = null;
  let activeAnimation = null;
  let finishTimer = null;
  let navigationId = 0;
  let historyIndex = 0;
  const progress = document.createElement('div');
  progress.className = 'route-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.append(progress);

  function goTo(name, { instant = false, direction = 'forward', fromHistory = false } = {}) {
    const target = views.get(name);
    if (!target || name === current) return;
    const first = current === null;
    const id = ++navigationId;
    activeAnimation?.cancel();
    clearTimeout(finishTimer);
    current = name;
    if (!fromHistory) {
      const state = { view: name, index: first ? historyIndex : ++historyIndex };
      history[first ? 'replaceState' : 'pushState'](state, '', `#${name}`);
    }
    document.querySelectorAll('[data-view-link]').forEach(el => {
      if (el.tagName !== 'A') return;
      if (el.dataset.viewLink === name) el.setAttribute('aria-current', 'page');
      else el.removeAttribute('aria-current');
    });
    views.forEach(el => {
      el.classList.toggle('view--active', el === target);
      el.style.opacity = '';
      el.style.transform = '';
    });
    window.scrollTo({ top: 0, behavior: 'instant' });
    const finish = () => {
      if (id !== navigationId) return;
      clearTimeout(finishTimer);
      activeAnimation?.cancel();
      activeAnimation = null;
      progress.classList.remove('is-active');
    };
    const heading = target.querySelector('h1, h2');
    if (!first && heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
    if (!instant && !first && target.animate) {
      const reduced = reducedMotion();
      const offset = reduced ? 0 : (direction === 'back' ? -18 : 18);
      progress.classList.remove('is-active');
      void progress.offsetWidth;
      progress.classList.add('is-active');
      activeAnimation = target.animate([
        { opacity: .15, transform: `translateY(${offset}px)` },
        { opacity: 1, transform: 'translateY(0)' },
      ], { duration: reduced ? 120 : 340, easing: 'cubic-bezier(.2,.65,.25,1)' });
      activeAnimation.onfinish = finish;
      finishTimer = setTimeout(finish, 700);
    } else finish();
    onEnter?.(name);
  }

  document.addEventListener('click', event => {
    const link = event.target.closest('[data-view-link]');
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    goTo(link.dataset.viewLink, { direction: link.classList.contains('view-back') ? 'back' : 'forward' });
  });
  window.addEventListener('popstate', event => {
    const nextIndex = event.state?.index ?? historyIndex;
    const direction = nextIndex < historyIndex ? 'back' : 'forward';
    historyIndex = nextIndex;
    goTo(location.hash.slice(1), { fromHistory: true, direction });
  });
  window.addEventListener('hashchange', () => goTo(location.hash.slice(1), { fromHistory: true }));
  const initial = location.hash.slice(1);
  goTo(views.has(initial) ? initial : 'modelos', { instant: true });
  return { goTo, current: () => current };
}
