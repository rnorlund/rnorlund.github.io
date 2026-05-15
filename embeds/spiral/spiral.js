/* Infinite-zoom golden spiral of MTG card images.
 *
 * Geometry. A golden rectangle of width PHI and height 1 is recursively
 * partitioned by placing a square on one side and recursing on the leftover
 * golden rectangle. The chosen side cycles LEFT → TOP → RIGHT → BOTTOM,
 * giving an inward spiral. Each square has side PHI^(-i).
 *
 * The remaining-rectangle origin (x_r, y_r) converges to the spiral fixed
 * point. Summing the per-cycle shifts:
 *   conv_x = PHI^4 / (PHI^4 - 1)   ≈ 1.17082
 *   conv_y = PHI^3 / (PHI^4 - 1)   ≈ 0.72361
 *
 * Self-similarity. The discrete golden spiral is self-similar under
 * (scale by PHI, rotate 90°) per step. Rotation would tilt the card art
 * and make the wrap-snap visible, so we use the rotation-free version:
 * (scale by PHI^4, no rotation) every 4 steps. Scaling the layout by PHI^4
 * about the convergence point maps square (i+4) onto square i exactly.
 *
 * Resolution. Each slot is assigned a tier (small/large) based on the
 * slot's MAXIMUM rendered pixel size across the full cycle:
 *   max_px(slot) = squares[slot].size * U * PHI^4
 * If max_px > UPGRADE_THRESHOLD, the slot uses the 672-wide "large" image
 * for every card that ever lands in it, regardless of where in the cycle
 * we are; otherwise it uses the 488-wide "small". Because all 200 images
 * (100 cards × 2 sizes) are pre-cached at startup, src swaps on every
 * shift are instant — no on-demand fetch, no "stays low-res while the
 * large fetches" symptom.
 */

(function () {
  const PHI = (1 + Math.sqrt(5)) / 2;
  const PHI4 = Math.pow(PHI, 4);                // ≈ 6.85410
  const CONV_X = PHI4 / (PHI4 - 1);             // ≈ 1.17082
  const CONV_Y = Math.pow(PHI, 3) / (PHI4 - 1); // ≈ 0.72361

  const SLOTS = 32;
  const SHIFT = 4;

  // No tier threshold. Every slot uses the large PNG once it's loaded; the
  // small JPG is only used as a transient fallback while a card's PNG is
  // still downloading on first page load. (A per-slot sm/lg tier introduces
  // a discrete src swap whenever a card shifts from a "small" slot into a
  // "large" slot at a wrap, which the eye reads as a sudden snap to higher
  // resolution at the wrap-boundary size — e.g. when a card grows to ~1/5
  // of the viewport. Always-lg eliminates that snap; the only remaining
  // resolution variation is the continuous one inherent to upscaling the
  // 745-px PNG to whatever pixel size each card currently has.)

  const cards = window.CARDS || [];
  if (cards.length === 0) {
    document.body.innerHTML =
      "<p style='padding:24px;color:#fff;font-family:sans-serif'>" +
      "No cards loaded. Run <code>python3 download_cards.py</code> first." +
      "</p>";
    return;
  }

  // ---- Pre-cache all images -------------------------------------------------

  // Held in module scope so the browser keeps them in its image cache.
  // Small images are tiny (~80 KB JPG); they load near-instantly. Large
  // PNGs are ~2 MB each, so we kick those off as background loads and
  // track which ones have finished — slots wanting lg keep showing sm
  // until that card's lg arrives, then upgrade in place (no flash, no
  // blank cards).
  const preloadedImages = [];
  const lgReady = new Set();        // card index → lg loaded?
  const lgListeners = new Set();    // callbacks fired whenever a new lg loads

  function preloadAll() {
    for (const c of cards) {
      const a = new Image();
      a.src = c.sm;
      preloadedImages.push(a);
    }
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i];
      const b = new Image();
      b.onload = () => {
        lgReady.add(i);
        for (const fn of lgListeners) fn(i);
      };
      b.src = c.lg;
      preloadedImages.push(b);
    }
  }
  preloadAll();

  // ---- Layout ---------------------------------------------------------------

  function buildSquares(n) {
    const out = [];
    let x = 0, y = 0, w = PHI, h = 1;
    const sides = ["L", "T", "R", "B"];
    for (let i = 0; i < n; i++) {
      const s = Math.min(w, h);
      const side = sides[i % 4];
      let sx, sy;
      if (side === "L") { sx = x; sy = y; x += s; w -= s; }
      else if (side === "T") { sx = x; sy = y; y += s; h -= s; }
      else if (side === "R") { sx = x + w - s; sy = y; w -= s; }
      else { sx = x; sy = y + h - s; h -= s; }
      out.push({ x: sx, y: sy, size: s, side });
    }
    return out;
  }
  const squares = buildSquares(SLOTS);

  // ---- DOM ------------------------------------------------------------------

  const spiral = document.getElementById("spiral");
  const curveSvg = document.getElementById("curve");
  const cardEls = [];
  const imgEls = [];
  for (let i = 0; i < SLOTS; i++) {
    const el = document.createElement("div");
    el.className = "card";
    el.dataset.slot = String(i);
    const img = document.createElement("img");
    img.alt = "";
    img.decoding = "async";
    img.loading = "eager";
    el.appendChild(img);
    spiral.appendChild(el);
    cardEls.push(el);
    imgEls.push(img);
  }

  function pickCard(...exclude) {
    if (cards.length <= exclude.length + 1) {
      return Math.floor(Math.random() * cards.length);
    }
    let idx;
    do { idx = Math.floor(Math.random() * cards.length); }
    while (exclude.includes(idx));
    return idx;
  }

  // ---- Sizing & card src ---------------------------------------------------

  let U = 0;

  function setSlotCard(slot, cardIdx) {
    const c = cards[cardIdx];
    // Always prefer lg. Fall back to sm only while a card's lg PNG is
    // still in flight from first page-load preload — once it loads, the
    // lgListeners below upgrade in place.
    imgEls[slot].src = lgReady.has(cardIdx) ? c.lg : c.sm;
  }

  // When a previously-pending lg finishes loading, upgrade any slot
  // currently showing that card (sm → lg) in place.
  lgListeners.add((loadedIdx) => {
    for (let i = 0; i < SLOTS; i++) {
      if (assignment[i] === loadedIdx) {
        imgEls[i].src = cards[loadedIdx].lg;
      }
    }
  });

  const assignment = new Array(SLOTS);

  function chooseBaseUnit(W, H) {
    return Math.max(W, H) * 1.25;
  }

  function layout() {
    const W = window.innerWidth;
    const H = window.innerHeight;
    U = chooseBaseUnit(W, H);
    // Card positions/sizes are set per frame by setTransform() so the
    // browser re-rasterizes from the source PNG at every zoom level.
    // Here we just rebuild the SVG arc and re-sync card srcs (in case
    // resize affected anything).
    for (let i = 0; i < SLOTS; i++) {
      if (assignment[i] != null) setSlotCard(i, assignment[i]);
    }
    buildCurve();
  }

  function initAssignments() {
    for (let i = 0; i < SLOTS; i++) {
      assignment[i] = pickCard(assignment[i - 1], assignment[i - 2]);
      setSlotCard(i, assignment[i]);
    }
  }

  // ---- Spiral arc overlay ---------------------------------------------------

  function buildCurve() {
    // The SVG fills the viewport (see .curve in style.css), so path coords
    // are absolute viewport pixels. Scaling is applied via transform with
    // origin at the viewport center.
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    curveSvg.style.transformOrigin = cx + "px " + cy + "px";
    const parts = [];
    for (let i = 0; i < SLOTS; i++) {
      const sq = squares[i];
      const x0 = cx + (sq.x - CONV_X) * U;
      const y0 = cy + (sq.y - CONV_Y) * U;
      const s = sq.size * U;
      let x1, y1, x2, y2;
      if (sq.side === "L") {
        x1 = x0 + s; y1 = y0;
        x2 = x0;     y2 = y0 + s;
      } else if (sq.side === "T") {
        x1 = x0 + s; y1 = y0 + s;
        x2 = x0;     y2 = y0;
      } else if (sq.side === "R") {
        x1 = x0;     y1 = y0 + s;
        x2 = x0 + s; y2 = y0;
      } else {
        x1 = x0;     y1 = y0;
        x2 = x0 + s; y2 = y0 + s;
      }
      parts.push(
        `M ${x1.toFixed(2)} ${y1.toFixed(2)} ` +
        `A ${s.toFixed(2)} ${s.toFixed(2)} 0 0 1 ` +
        `${x2.toFixed(2)} ${y2.toFixed(2)}`
      );
    }
    curveSvg.innerHTML = `<path d="${parts.join(" ")}"></path>`;
  }

  // ---- Animation ------------------------------------------------------------

  let running = true;
  let direction = +1;
  let period = 16000;
  let phase = 0;
  let lastTs = 0;

  // Apply the current zoom by setting each card's REAL CSS width/height/
  // left/top (not via transform: scale). CSS transforms scale the already-
  // rasterized texture on the GPU and do not re-paint, so PNG cards stay
  // pixelated as they grow. Setting the box's real size forces the browser
  // to repaint the <img> at the new size, which re-rasterizes from the
  // source PNG and stays sharp at every zoom level. (The same effect was
  // what made resolutions look great when the user manually resized the
  // window — every resize calls layout(), which sets real sizes.)
  // The SVG curve is vector; transform: scale on it is fine.
  function setTransform(scale) {
    for (let i = 0; i < SLOTS; i++) {
      const sq = squares[i];
      const el = cardEls[i];
      const sz = sq.size * U * scale;
      if (sz < 0.5) {
        if (el.style.display !== "none") el.style.display = "none";
        continue;
      }
      if (el.style.display === "none") el.style.display = "";
      const dx = (sq.x - CONV_X) * U * scale;
      const dy = (sq.y - CONV_Y) * U * scale;
      el.style.left = dx + "px";
      el.style.top = dy + "px";
      el.style.width = sz + "px";
      el.style.height = sz + "px";
    }
    curveSvg.style.transform = `scale(${scale})`;
  }

  // On a forward wrap, slots 0..SLOTS-SHIFT-1 inherit the assignment from
  // their +SHIFT neighbor; slots SLOTS-SHIFT..SLOTS-1 get fresh cards. Each
  // call to setSlotCard picks the src for that slot's static tier.
  function shiftForward() {
    for (let i = 0; i < SLOTS - SHIFT; i++) {
      assignment[i] = assignment[i + SHIFT];
      setSlotCard(i, assignment[i]);
    }
    for (let i = SLOTS - SHIFT; i < SLOTS; i++) {
      assignment[i] = pickCard(
        i >= 1 ? assignment[i - 1] : -1,
        i >= 2 ? assignment[i - 2] : -1
      );
      setSlotCard(i, assignment[i]);
    }
  }

  // On a reverse wrap, slots SHIFT..SLOTS-1 inherit from their -SHIFT
  // neighbor; slots 0..SHIFT-1 get fresh cards (emerging from beyond the
  // outermost square as the spiral zooms back out).
  function shiftBackward() {
    for (let i = SLOTS - 1; i >= SHIFT; i--) {
      assignment[i] = assignment[i - SHIFT];
      setSlotCard(i, assignment[i]);
    }
    for (let i = 0; i < SHIFT; i++) {
      assignment[i] = pickCard(
        i + 1 < SLOTS ? assignment[i + 1] : -1,
        i + 2 < SLOTS ? assignment[i + 2] : -1
      );
      setSlotCard(i, assignment[i]);
    }
  }

  function frame(ts) {
    if (!lastTs) lastTs = ts;
    const dt = ts - lastTs;
    lastTs = ts;
    if (running) {
      phase += (direction * dt) / period;
      while (phase >= 1) { phase -= 1; shiftForward(); }
      while (phase < 0)  { phase += 1; shiftBackward(); }
    }
    setTransform(Math.pow(PHI, 4 * phase));
    requestAnimationFrame(frame);
  }

  // ---- Controls -------------------------------------------------------------

  const toggleBtn = document.getElementById("toggle");
  const dirBtn = document.getElementById("dir");
  const speedInput = document.getElementById("speed");
  const speedReadout = document.getElementById("speedReadout");
  const showCurve = document.getElementById("showCurve");
  const arcColor = document.getElementById("arcColor");
  const arcWidth = document.getElementById("arcWidth");
  const arcReadout = document.getElementById("arcReadout");

  function applySpeed() {
    const v = Number(speedInput.value);
    period = 64000 / v;
    speedReadout.textContent = v.toFixed(2) + "×";
  }

  toggleBtn.addEventListener("click", () => {
    running = !running;
    toggleBtn.textContent = running ? "Pause" : "Play";
  });
  dirBtn.addEventListener("click", () => { direction = -direction; });
  speedInput.addEventListener("input", applySpeed);
  showCurve.addEventListener("change", () => {
    curveSvg.style.display = showCurve.checked ? "" : "none";
  });

  // Arc stroke width and color are driven by CSS custom properties so the
  // sliders mutate the live rendering without rebuilding the SVG path.
  function applyArcStyle() {
    document.documentElement.style.setProperty("--arc-color", arcColor.value);
    document.documentElement.style.setProperty("--arc-width", arcWidth.value);
    arcReadout.textContent = Number(arcWidth.value).toFixed(1) + "px";
  }
  arcColor.addEventListener("input", applyArcStyle);
  arcWidth.addEventListener("input", applyArcStyle);

  window.addEventListener("resize", layout);

  // ---- Boot -----------------------------------------------------------------

  layout();
  initAssignments();
  applySpeed();
  applyArcStyle();
  requestAnimationFrame(frame);
})();
