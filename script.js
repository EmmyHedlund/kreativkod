// script.js: the dot grid itself (settings, data and the logic for how dots behave).
// main.js loads after this file and uses the variables and functions below.
// Remember to rewrite these comments in your own words.

// ---------- Settings ----------
const SPACING = 27;        // distance between dots in pixels
const BASE_RADIUS = 1.6;   // size of a dot when nothing is happening
const HOVER_RADIUS = 7;    // extra size right under the mouse
const HOVER_RANGE = 150;   // how far from the mouse the dots react
const EASING = 0.15;       // 0-1, lower = slower, smoother movement
const RIPPLE_LIFE = 70;    // how many frames a click ring lasts

// Colours to cycle through when a key is pressed
const COLORS = [0x3347d6, 0xe63946, 0x2a9d8f, 0xf4a261, 0x000000];
let colorIndex = 0;

// Shape mode: 0 = circles, 1 = squares, 2 = mixed
let shapeMode = 0;

// ---------- State ----------
let dots = [];             // every dot: position, current size and a random seed
const mouse = { x: 0, y: 0 };
const ripples = [];        // active click waves

// Build the grid, used at start and when the window is resized
function buildGrid(width, height) {
  dots = [];
  for (let y = SPACING / 2; y < height; y += SPACING) {
    for (let x = SPACING / 2; x < width; x += SPACING) {
      dots.push({ x, y, size: BASE_RADIUS, seed: Math.random() });
    }
  }
}

// Start a new ring that spreads out from a click
function addRipple(x, y) {
  ripples.push({ x, y, age: 0 });
}

// Change colour on a key press, and change shapes every second press
function nextStyle() {
  colorIndex = (colorIndex + 1) % COLORS.length;
  if (colorIndex % 2 === 0) shapeMode = (shapeMode + 1) % 3;
}

// Update every dot for one frame. dt = how much time has passed.
// Returns the dots sorted by shape so they can be drawn efficiently.
function updateDots(dt) {
  // Age the ripples and remove the old ones
  for (let i = ripples.length - 1; i >= 0; i--) {
    ripples[i].age += dt;
    if (ripples[i].age > RIPPLE_LIFE) ripples.splice(i, 1);
  }

  const circles = [];
  const squares = [];

  for (const d of dots) {
    // 1. Size from the mouse: biggest right under it, fading out with distance
    const dx = d.x - mouse.x;
    const dy = d.y - mouse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const t = Math.max(0, 1 - dist / HOVER_RANGE);
    let target = BASE_RADIUS + HOVER_RADIUS * t * t * (3 - 2 * t); // smoothstep

    // 2. Extra size from click ripples: a ring that moves outwards and fades
    for (const r of ripples) {
      const rx = d.x - r.x;
      const ry = d.y - r.y;
      const rd = Math.sqrt(rx * rx + ry * ry);
      const ringRadius = r.age * 12;
      const off = (rd - ringRadius) / 35;
      target += 6 * Math.exp(-off * off) * (1 - r.age / RIPPLE_LIFE);
    }

    // 3. Ease towards the target so it feels soft instead of jumping
    d.size += (target - d.size) * Math.min(1, EASING * dt);

    // 4. Pick shape, circles or squares (mixed mode uses each dot's random seed)
    const useSquare = shapeMode === 1 || (shapeMode === 2 && d.seed > 0.5);
    if (useSquare) {
      squares.push(d);
    } else {
      circles.push(d);
    }
  }

  return { circles, squares };
}

// Draw the dots onto a PixiJS Graphics object
function drawDots(g, circles, squares) {
  g.clear();
  for (const d of circles) g.circle(d.x, d.y, d.size);
  g.fill(COLORS[colorIndex]);
  for (const d of squares) g.rect(d.x - d.size, d.y - d.size, d.size * 2, d.size * 2);
  g.fill(COLORS[colorIndex]);
}