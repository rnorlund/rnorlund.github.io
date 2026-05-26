import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const CARD_W_RATIO = 488 / 680; // ≈ 0.7176

const state = {
  allCards: [],
  pool: [],
  assignments: [],
  gridCols: 2,
  gridRows: 2,
  threadColor: '#e6d2a4',
  buttonColor: '#f2e6c8',
  params: {
    amplitude: 0.12,
    frequency: 1.8,
    speed: 1.0,
    paused: false,
  },
  imageCache: new Map(),
};

const canvasEl = document.getElementById('quilt');
const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);

// --- Atlas ---
const atlasCanvas = document.createElement('canvas');
const atlasCtx = atlasCanvas.getContext('2d');
const ATLAS_MAX = Math.min(renderer.capabilities.maxTextureSize || 4096, 4096);
let atlasTexture = createAtlasTexture();

function createAtlasTexture() {
  const t = new THREE.CanvasTexture(atlasCanvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy
    ? renderer.capabilities.getMaxAnisotropy()
    : 1;
  t.minFilter = THREE.LinearMipMapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true;
  return t;
}

// --- Shader ---
const uniforms = {
  uTime: { value: 0 },
  uAmplitude: { value: state.params.amplitude },
  uFrequency: { value: state.params.frequency },
  uSpeed: { value: state.params.speed },
  uMap: { value: atlasTexture },
};

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uAmplitude;
  uniform float uFrequency;
  uniform float uSpeed;

  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    vUv = uv;
    float t = uTime * uSpeed;
    float fx = uFrequency * 4.0;
    float fy = uFrequency * 3.0;
    float a = uAmplitude;

    float x = position.x;
    float y = position.y;

    // Two crossed waves + a longer-wavelength sway gives a blanket-like ripple.
    float w1 = sin(x * fx + t) * cos(y * fy + t * 0.7);
    float w2 = sin(y * fy * 0.9 + t * 1.3) * 0.6;
    float h = (w1 + w2) * a;

    // Analytical surface normal — keeps shading crisp without a normal map.
    float dhdx = fx * cos(x * fx + t) * cos(y * fy + t * 0.7) * a;
    float dhdy = -fy * sin(x * fx + t) * sin(y * fy + t * 0.7) * a
               + fy * 0.9 * cos(y * fy * 0.9 + t * 1.3) * 0.6 * a;
    vNormal = normalize(vec3(-dhdx, -dhdy, 1.0));

    vec3 pos = position + vec3(0.0, 0.0, h);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    vec4 c = texture2D(uMap, vUv);
    vec3 lightDir = normalize(vec3(0.4, 0.55, 1.0));
    float diff = max(dot(vNormal, lightDir), 0.0);
    float shade = 0.55 + diff * 0.55;
    gl_FragColor = vec4(c.rgb * shade, c.a);
  }
`;

const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader });

let mesh = null;

function buildMesh() {
  if (mesh) {
    scene.remove(mesh);
    mesh.geometry.dispose();
  }
  const gridW = state.gridCols * CARD_W_RATIO;
  const gridH = state.gridRows;
  const segs = Math.max(120, 30 * Math.max(state.gridCols, state.gridRows));
  const geo = new THREE.PlaneGeometry(gridW, gridH, segs, segs);
  mesh = new THREE.Mesh(geo, material);
  scene.add(mesh);
  fitCamera();
}

function fitCamera() {
  const w = canvasEl.clientWidth || 1;
  const h = canvasEl.clientHeight || 1;
  const aspect = w / h;
  camera.aspect = aspect;
  const gridW = state.gridCols * CARD_W_RATIO;
  const gridH = state.gridRows;
  const fovRad = (camera.fov * Math.PI) / 180;
  const distForH = (gridH * 1.18) / (2 * Math.tan(fovRad / 2));
  const distForW = (gridW * 1.18) / (2 * Math.tan(fovRad / 2) * aspect);
  const dist = Math.max(distForH, distForW);
  // Slight downward tilt so waves are visible
  camera.position.set(0, -gridH * 0.18, dist * 0.96);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}

// --- Atlas drawing ---
function roundedRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function hexToRgb(hex) {
  let h = (hex || '').replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

function mixRgb(a, b, t) {
  return {
    r: Math.round(a.r * (1 - t) + b.r * t),
    g: Math.round(a.g * (1 - t) + b.g * t),
    b: Math.round(a.b * (1 - t) + b.b * t),
  };
}

const rgbStr = ({ r, g, b }, a = 1) => `rgba(${r},${g},${b},${a})`;

// Chain stitch: a row of stroked ovals end-to-end, slightly overlapping so
// the seam reads as interlocked loops rather than a dashed line.
function drawChainStitch(ctx, x1, y1, x2, y2, color, linkLen, linkW, lineW) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < linkLen * 0.5) return;
  const ux = dx / len;
  const uy = dy / len;
  const angle = Math.atan2(uy, ux);
  const count = Math.max(1, Math.floor(len / linkLen));
  const startOffset = (len - count * linkLen) / 2;
  const rgb = hexToRgb(color);
  const shadow = rgbStr(mixRgb(rgb, { r: 0, g: 0, b: 0 }, 0.55), 0.55);

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let i = 0; i < count; i++) {
    const t = startOffset + (i + 0.5) * linkLen;
    const cx = x1 + ux * t;
    const cy = y1 + uy * t;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    // Soft shadow under the loop (offset perpendicular to seam direction)
    ctx.strokeStyle = shadow;
    ctx.lineWidth = lineW + 1.5;
    ctx.beginPath();
    ctx.ellipse(0, lineW * 0.45, linkLen * 0.49, linkW * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Thread loop itself
    ctx.strokeStyle = color;
    ctx.lineWidth = lineW;
    ctx.beginPath();
    ctx.ellipse(0, 0, linkLen * 0.49, linkW * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
  ctx.restore();
}

// Soft cabochon: dome shaded from a single base color. Highlight blends toward
// white from the upper-left, body uses the base, lower-right falls off to a
// darker version. A small specular adds the wet-glass look.
function drawCabochon(ctx, cx, cy, r, hexColor) {
  const base = hexToRgb(hexColor);
  const highlight = mixRgb(base, { r: 255, g: 255, b: 255 }, 0.65);
  const midShade = mixRgb(base, { r: 0, g: 0, b: 0 }, 0.18);
  const deep = mixRgb(base, { r: 0, g: 0, b: 0 }, 0.55);

  // Cast shadow on the quilt under the dome
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.beginPath();
  ctx.ellipse(cx + r * 0.06, cy + r * 0.22, r * 1.08, r * 0.95, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Dome body — radial gradient shifted to the upper-left
  const body = ctx.createRadialGradient(
    cx - r * 0.35, cy - r * 0.4, r * 0.05,
    cx, cy, r * 1.1,
  );
  body.addColorStop(0, rgbStr(highlight));
  body.addColorStop(0.45, rgbStr(base));
  body.addColorStop(0.85, rgbStr(midShade));
  body.addColorStop(1, rgbStr(deep));
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Subtle dark rim where the dome meets the quilt
  ctx.strokeStyle = rgbStr(deep, 0.55);
  ctx.lineWidth = Math.max(0.75, r * 0.04);
  ctx.beginPath();
  ctx.arc(cx, cy, r - ctx.lineWidth * 0.5, 0, Math.PI * 2);
  ctx.stroke();

  // Crescent of bounce light at the lower edge (gives the cabochon depth)
  const bounce = ctx.createRadialGradient(
    cx + r * 0.25, cy + r * 0.35, r * 0.1,
    cx + r * 0.25, cy + r * 0.35, r * 0.7,
  );
  const bounceColor = mixRgb(base, { r: 255, g: 255, b: 255 }, 0.25);
  bounce.addColorStop(0, rgbStr(bounceColor, 0.45));
  bounce.addColorStop(1, rgbStr(bounceColor, 0));
  ctx.fillStyle = bounce;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Tight specular highlight
  const spec = ctx.createRadialGradient(
    cx - r * 0.38, cy - r * 0.42, 0,
    cx - r * 0.38, cy - r * 0.42, r * 0.42,
  );
  spec.addColorStop(0, 'rgba(255,255,255,0.92)');
  spec.addColorStop(0.45, 'rgba(255,255,255,0.25)');
  spec.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = spec;
  ctx.beginPath();
  ctx.arc(cx - r * 0.38, cy - r * 0.42, r * 0.42, 0, Math.PI * 2);
  ctx.fill();
}

function computeCellSize() {
  // Aim for source resolution (488×680), shrink uniformly if either dim would
  // overrun the GPU's max texture size.
  let cellW = 488;
  let cellH = 680;
  const maxByW = Math.floor(ATLAS_MAX / state.gridCols);
  const maxByH = Math.floor(ATLAS_MAX / state.gridRows);
  if (cellW > maxByW) { cellW = maxByW; cellH = Math.round((cellW * 680) / 488); }
  if (cellH > maxByH) { cellH = maxByH; cellW = Math.round((cellH * 488) / 680); }
  return {
    cellW: Math.max(96, cellW),
    cellH: Math.max(Math.round((96 * 680) / 488), cellH),
  };
}

function rebuildAtlas() {
  const { cellW: cellPxW, cellH: cellPxH } = computeCellSize();
  const W = cellPxW * state.gridCols;
  const H = cellPxH * state.gridRows;
  const dimsChanged = atlasCanvas.width !== W || atlasCanvas.height !== H;
  if (dimsChanged) {
    atlasCanvas.width = W;
    atlasCanvas.height = H;
    // CanvasTexture sometimes keeps stale dimensions when the source canvas
    // resizes; dispose + recreate guarantees a fresh GPU texture.
    atlasTexture.dispose();
    atlasTexture = createAtlasTexture();
    uniforms.uMap.value = atlasTexture;
  }

  // Quilt-backing color (also fills card-corner whitespace once cards are clipped)
  atlasCtx.fillStyle = '#0a0a0a';
  atlasCtx.fillRect(0, 0, W, H);

  const cornerR = Math.max(6, Math.round(cellPxW * 0.05));

  for (let r = 0; r < state.gridRows; r++) {
    for (let c = 0; c < state.gridCols; c++) {
      const idx = r * state.gridCols + c;
      const slot = state.assignments[idx];
      const x = c * cellPxW;
      const y = r * cellPxH;

      if (slot && slot._img && slot._img.complete && slot._img.naturalWidth > 0) {
        atlasCtx.save();
        roundedRectPath(atlasCtx, x, y, cellPxW, cellPxH, cornerR);
        atlasCtx.clip();
        atlasCtx.drawImage(slot._img, x, y, cellPxW, cellPxH);
        atlasCtx.restore();
      } else {
        atlasCtx.save();
        roundedRectPath(atlasCtx, x + 4, y + 4, cellPxW - 8, cellPxH - 8, cornerR);
        atlasCtx.fillStyle = '#161c27';
        atlasCtx.fill();
        atlasCtx.strokeStyle = '#2c3548';
        atlasCtx.lineWidth = 2;
        atlasCtx.setLineDash([8, 8]);
        atlasCtx.stroke();
        atlasCtx.setLineDash([]);
        atlasCtx.restore();
      }
    }
  }

  // Chain-stitch seams
  const stitchColor = state.threadColor;
  const linkLen = Math.max(14, cellPxW * 0.06);
  const linkW = linkLen * 0.55;
  const lineW = Math.max(2, cellPxW * 0.01);

  for (let r = 1; r < state.gridRows; r++) {
    drawChainStitch(atlasCtx, 0, r * cellPxH, W, r * cellPxH, stitchColor, linkLen, linkW, lineW);
  }
  for (let c = 1; c < state.gridCols; c++) {
    drawChainStitch(atlasCtx, c * cellPxW, 0, c * cellPxW, H, stitchColor, linkLen, linkW, lineW);
  }
  // Outer perimeter
  const inset = linkW * 0.6;
  drawChainStitch(atlasCtx, inset, inset, W - inset, inset, stitchColor, linkLen, linkW, lineW);
  drawChainStitch(atlasCtx, inset, H - inset, W - inset, H - inset, stitchColor, linkLen, linkW, lineW);
  drawChainStitch(atlasCtx, inset, inset, inset, H - inset, stitchColor, linkLen, linkW, lineW);
  drawChainStitch(atlasCtx, W - inset, inset, W - inset, H - inset, stitchColor, linkLen, linkW, lineW);

  // Cabochons at interior junctions, sized to cover the rounded-corner gap
  const buttonR = Math.max(cornerR * 1.55, cellPxW * 0.075);
  for (let r = 1; r < state.gridRows; r++) {
    for (let c = 1; c < state.gridCols; c++) {
      drawCabochon(atlasCtx, c * cellPxW, r * cellPxH, buttonR, state.buttonColor);
    }
  }

  atlasTexture.needsUpdate = true;
}

function loadImage(card, onReady) {
  let img = state.imageCache.get(card.sm);
  if (img) {
    if (img.complete && img.naturalWidth > 0) onReady(img);
    else img.addEventListener('load', () => onReady(img), { once: true });
    return img;
  }
  img = new Image();
  img.addEventListener('load', () => onReady(img), { once: true });
  img.src = card.sm;
  state.imageCache.set(card.sm, img);
  return img;
}

// --- UI ---
function refreshSlotStatus() {
  const filled = state.assignments.filter(Boolean).length;
  const total = state.assignments.length;
  document.getElementById('slotStatus').textContent = `${filled} / ${total}`;
}

function renderPool() {
  const poolEl = document.getElementById('pool');
  poolEl.innerHTML = '';
  for (const card of state.pool) {
    const placed = state.assignments.some(s => s && s.id === card.id);
    const el = document.createElement('div');
    el.className = 'card' + (placed ? ' placed' : '');
    el.title = card.name;
    const img = document.createElement('img');
    img.src = card.sm;
    img.alt = card.name;
    img.loading = 'lazy';
    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = card.name;
    el.append(img, name);
    el.addEventListener('click', () => placeCard(card));
    poolEl.appendChild(el);
  }
}

function placeCard(card) {
  const idx = state.assignments.findIndex(s => !s);
  if (idx === -1) return;
  const entry = { id: card.id, name: card.name, sm: card.sm, _img: null };
  state.assignments[idx] = entry;
  loadImage(card, (img) => {
    entry._img = img;
    rebuildAtlas();
  });
  rebuildAtlas();
  renderPool();
  refreshSlotStatus();
}

function removeAt(col, row) {
  const idx = row * state.gridCols + col;
  if (idx >= 0 && idx < state.assignments.length && state.assignments[idx]) {
    state.assignments[idx] = null;
    rebuildAtlas();
    renderPool();
    refreshSlotStatus();
  }
}

function clearAll() {
  state.assignments = state.assignments.map(() => null);
  rebuildAtlas();
  renderPool();
  refreshSlotStatus();
}

function fillRandom() {
  state.assignments = state.assignments.map(() => {
    const card = state.pool[Math.floor(Math.random() * state.pool.length)];
    const entry = { id: card.id, name: card.name, sm: card.sm, _img: null };
    loadImage(card, (img) => {
      entry._img = img;
      rebuildAtlas();
    });
    return entry;
  });
  rebuildAtlas();
  renderPool();
  refreshSlotStatus();
}

function shufflePool() {
  const arr = state.allCards.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const cells = state.gridCols * state.gridRows;
  const size = Math.max(10, cells + 2);
  state.pool = arr.slice(0, size);
  renderPool();
}

function setGrid(n) {
  state.gridCols = n;
  state.gridRows = n;
  state.assignments = new Array(n * n).fill(null);
  const cells = n * n;
  if (state.pool.length < Math.max(10, cells + 2)) {
    shufflePool();
  } else {
    renderPool();
  }
  buildMesh();
  rebuildAtlas();
  refreshSlotStatus();
}

// --- Click → cell ---
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

canvasEl.addEventListener('click', (e) => {
  if (!mesh) return;
  const rect = canvasEl.getBoundingClientRect();
  ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObject(mesh);
  if (!hits.length) return;
  const p = hits[0].point;
  const gridW = state.gridCols * CARD_W_RATIO;
  const gridH = state.gridRows;
  const u = (p.x + gridW / 2) / gridW;
  const v = (p.y + gridH / 2) / gridH;
  if (u < 0 || u > 1 || v < 0 || v > 1) return;
  const col = Math.min(state.gridCols - 1, Math.max(0, Math.floor(u * state.gridCols)));
  const row = Math.min(state.gridRows - 1, Math.max(0, Math.floor((1 - v) * state.gridRows)));
  removeAt(col, row);
});

// --- Loop & resize ---
let lastT = performance.now();
function frame(now) {
  const dt = (now - lastT) / 1000;
  lastT = now;
  if (!state.params.paused) uniforms.uTime.value += dt;
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

function onResize() {
  const w = canvasEl.clientWidth;
  const h = canvasEl.clientHeight;
  if (w === 0 || h === 0) return;
  renderer.setSize(w, h, false);
  fitCamera();
}
new ResizeObserver(onResize).observe(canvasEl);
window.addEventListener('resize', onResize);

// --- Wire controls ---
document.getElementById('gridSize').addEventListener('change', e => {
  setGrid(parseInt(e.target.value, 10));
});
document.getElementById('waviness').addEventListener('input', e => {
  state.params.amplitude = parseFloat(e.target.value);
  uniforms.uAmplitude.value = state.params.amplitude;
  document.getElementById('waveReadout').textContent = state.params.amplitude.toFixed(3);
});
document.getElementById('speed').addEventListener('input', e => {
  state.params.speed = parseFloat(e.target.value);
  uniforms.uSpeed.value = state.params.speed;
  document.getElementById('speedReadout').textContent = state.params.speed.toFixed(2) + '×';
});
document.getElementById('frequency').addEventListener('input', e => {
  state.params.frequency = parseFloat(e.target.value);
  uniforms.uFrequency.value = state.params.frequency;
  document.getElementById('freqReadout').textContent = state.params.frequency.toFixed(1);
});
document.getElementById('pause').addEventListener('click', e => {
  state.params.paused = !state.params.paused;
  e.target.textContent = state.params.paused ? 'Play' : 'Pause';
});
document.getElementById('randomize').addEventListener('click', fillRandom);
document.getElementById('clear').addEventListener('click', clearAll);
document.getElementById('shufflePool').addEventListener('click', shufflePool);
document.getElementById('threadColor').addEventListener('input', e => {
  state.threadColor = e.target.value;
  rebuildAtlas();
});
document.getElementById('buttonColor').addEventListener('input', e => {
  state.buttonColor = e.target.value;
  rebuildAtlas();
});

// --- Boot ---
async function boot() {
  const res = await fetch('cards.json');
  const cards = await res.json();
  state.allCards = cards.filter(c => c && c.name && !/^_+$/.test(c.name) && c.sm);
  shufflePool();
  setGrid(2);
  onResize();
  fillRandom();
  requestAnimationFrame(frame);
}

boot().catch(err => {
  console.error('Quilt failed to boot:', err);
});
