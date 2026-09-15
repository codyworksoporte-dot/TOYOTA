const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

test('homepage static module graph never imports the WebGL engine', () => {
  const visited = new Set();
  function visit(relative) {
    if (visited.has(relative)) return;
    visited.add(relative);
    const source = fs.readFileSync(path.join(root, relative), 'utf8');
    for (const match of source.matchAll(/^import\s+.*?from\s+["']([^"']+)["']/gm)) {
      assert.ok(match[1].startsWith('.'), `Unexpected eager dependency: ${match[1]}`);
      const target = path.join(path.dirname(relative), match[1]);
      assert.notEqual(path.basename(target), 'vehicle.js', 'Procedural vehicle must be lazy');
      visit(target);
    }
  }
  visit('js/main.js');
  assert.ok(visited.has(path.join('js', 'vehicle-data.js')));
});

test('every catalog photograph exists and vehicle ids are unique', async () => {
  const { VEHICLE_DATA } = await import('../js/vehicle-data.js');
  assert.equal(new Set(VEHICLE_DATA.map(v => v.id)).size, VEHICLE_DATA.length);
  for (const vehicle of VEHICLE_DATA) {
    for (const image of vehicle.gallery || []) assert.ok(fs.existsSync(path.join(root, image.file)), image.file);
  }
});

test('every local HTML asset and CSS image resolves on disk', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const match of html.matchAll(/(?:src|href)="((?:css|js|img|assets)\/[^"#]+)"/g)) {
    assert.ok(fs.existsSync(path.join(root, match[1])), match[1]);
  }
  for (const file of fs.readdirSync(path.join(root, 'css'))) {
    const source = fs.readFileSync(path.join(root, 'css', file), 'utf8');
    for (const match of source.matchAll(/url\(['"]?(\.\.[^)'"\s]+)['"]?\)/g)) {
      assert.ok(fs.existsSync(path.resolve(root, 'css', match[1])), `${file}: ${match[1]}`);
    }
  }
});

function element(name) {
  const classes = new Set();
  return {
    dataset: { view: name }, style: {}, tabIndex: 0,
    classList: { toggle(k, value) { value ? classes.add(k) : classes.delete(k); }, add(k) { classes.add(k); }, remove(k) { classes.delete(k); }, contains(k) { return classes.has(k); } },
    querySelector() { return { focus() {} }; }, setAttribute() {},
    animate() { const animation = { cancelled: false, cancel() { this.cancelled = true; } }; this.lastAnimation = animation; return animation; },
  };
}

test('rapid navigation cancels stale animation and browser Back restores one view', async () => {
  const views = ['modelos', 'servicios', 'tecnologia'].map(element);
  const listeners = {};
  const states = [];
  global.document = { querySelectorAll(selector) { return selector === '.view[data-view]' ? views : []; }, createElement() { return element('progress'); }, body: { append() {} }, addEventListener() {} };
  global.window = { scrollTo() {}, addEventListener(type, handler) { listeners[type] = handler; } };
  global.location = { hash: '' };
  global.history = {
    replaceState(state, _, hash) { states[0] = state; location.hash = hash; },
    pushState(state, _, hash) { states.push(state); location.hash = hash; },
  };
  const { createRouter } = await import('../js/router.js');
  const router = createRouter();
  router.goTo('servicios');
  const staleAnimation = views[1].lastAnimation;
  router.goTo('tecnologia');
  assert.equal(staleAnimation.cancelled, true);
  staleAnimation.onfinish(); // late callback must not alter the newer navigation
  assert.equal(router.current(), 'tecnologia');
  assert.equal(views.filter(v => v.classList.contains('view--active')).length, 1);
  assert.equal(states.length, 3);
  location.hash = '#servicios';
  listeners.popstate({ state: states[1] });
  assert.equal(router.current(), 'servicios');
  assert.equal(states.length, 3, 'Back must not add a history entry');
  views[1].lastAnimation.onfinish();
  for (const key of ['document', 'window', 'location', 'history']) delete global[key];
});
