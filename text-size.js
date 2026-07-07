// Site-wide text-size selector.
// Injects a small S/M/L/XL pill into every page's <nav> and scales
// <html> font-size accordingly. Choice persists to localStorage under
// the same key on every page so it applies consistently.
(function () {
  const KEY = 'blog-text-size';
  const SIZES = { sm: 14.5, md: 16, lg: 18.5, xl: 21 };  // px, applied to <html>
  const DEFAULT = 'md';

  function apply(size) {
    if (!(size in SIZES)) size = DEFAULT;
    document.documentElement.style.fontSize = SIZES[size] + 'px';
    Object.keys(SIZES).forEach(s => document.body.classList.remove('blog-text-' + s));
    document.body.classList.add('blog-text-' + size);
    document.querySelectorAll('.nav-size .blog-size-btns button').forEach(b => {
      b.classList.toggle('active', b.dataset.size === size);
    });
    try { localStorage.setItem(KEY, size); } catch (e) {}
  }

  // Apply the saved size as early as possible to avoid a text-size flash.
  try {
    const early = localStorage.getItem(KEY) || DEFAULT;
    if (early in SIZES) document.documentElement.style.fontSize = SIZES[early] + 'px';
  } catch (e) {}

  function inject() {
    if (document.querySelector('.nav-size')) return;   // already injected (e.g. hand-authored)
    const nav = document.querySelector('nav');
    if (!nav) return;
    const wrap = document.createElement('div');
    wrap.className = 'nav-size';
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', 'Text size');
    wrap.innerHTML =
      '<span class="label">Text</span>' +
      '<div class="blog-size-btns">' +
        '<button type="button" data-size="sm">S</button>' +
        '<button type="button" data-size="md">M</button>' +
        '<button type="button" data-size="lg">L</button>' +
        '<button type="button" data-size="xl">XL</button>' +
      '</div>';
    nav.appendChild(wrap);
  }

  function init() {
    inject();
    const saved = (() => { try { return localStorage.getItem(KEY) || DEFAULT; } catch (e) { return DEFAULT; } })();
    apply(saved);
    document.querySelectorAll('.nav-size .blog-size-btns button').forEach(b => {
      b.addEventListener('click', () => apply(b.dataset.size));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Keep pages in sync if user changes size in another tab.
  window.addEventListener('storage', e => {
    if (e.key === KEY && e.newValue) apply(e.newValue);
  });
})();
