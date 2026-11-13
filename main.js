
// En enda Pixi-canvas ligger bakom sidan och ritar två saker:
//   1. ett fält av prickar som musen puffar bort och som klick skapar vågor i
//   2. en generativ bild i varje ruta i rutnätet
// Ordning i filen:
//   start -> färger -> input -> prickfält -> motiv -> animationsloop


const app = new PIXI.Application();
await app.init({
  resizeTo: window,             // canvasen följer fönstrets storlek
  backgroundAlpha: 0,           // genomskinlig bakgrund, sidans färg syns igenom
  antialias: true,
  resolution: Math.min(window.devicePixelRatio || 1, 2),
  autoDensity: true,
});
document.getElementById("stage").appendChild(app.canvas);

// Två lager. Rutorna ritas sist, så de hamnar ovanpå prickarna.
const fieldLayer = new PIXI.Graphics();
const artLayer = new PIXI.Graphics();
app.stage.addChild(fieldLayer, artLayer);

// Om användaren valt "minska rörelse" i sitt system stannar animationerna
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;


// ---------- Färger ----------
// Färgerna hämtas från CSS-variablerna, så canvasen alltid matchar sidan.

const colours = {};

function readColours() {
  const css = getComputedStyle(document.documentElement);
  for (const name of ["ink", "muted", "accent", "tile"]) {
    colours[name] = new PIXI.Color(css.getPropertyValue(`--${name}`).trim()).toNumber();
  }
}

readColours();
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", readColours);

// Tangenttryck byter accentfärg. Listan går runt: efter sista kommer första igen.
const accentChoices = ["#2b44d6", "#e63946", "#2a9d8f", "#7b2cbf", "#f4a261"];
let accentIndex = 0;

window.addEventListener("keydown", () => {
  accentIndex = (accentIndex + 1) % accentChoices.length;
  colours.accent = new PIXI.Color(accentChoices[accentIndex]).toNumber();
});


// ---------- Input 

const pointer = { x: -9999, y: -9999 };   // börjar långt utanför skärmen
const ripples = [];                        // varje klick lägger till en våg: { x, y, born }

window.addEventListener("pointermove", (e) => {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
});

window.addEventListener("pointerdown", (e) => {
  ripples.push({ x: e.clientX, y: e.clientY, born: performance.now() });
});

// Varje ruta har ett hover-värde som glider mjukt mellan 0 och 1
const tiles = [...document.querySelectorAll(".tile")].map((el) => {
  const tile = {
    box: el.querySelector(".art"),
    motif: el.querySelector(".art").dataset.motif,
    hover: 0,     // nuvarande värde
    target: 0,    // värdet det glider mot
  };
  el.addEventListener("pointerenter", () => { tile.target = 1; });
  el.addEventListener("pointerleave", () => { tile.target = 0; });
  return tile;
});


// ---------- Prickfält ----------
// Varje prick har en hemposition och en nuvarande position.
// Musen och vågorna puffar bort den, och en fjäder drar den tillbaka hem.

const SPACING = 28;           // avstånd mellan prickar
const PUSH_RADIUS = 150;      // hur nära musen en prick måste vara för att puffas
const RIPPLE_SPEED = 500;     // pixlar per sekund
const RIPPLE_LIFE = 2000;     // millisekunder innan en våg försvinner

let dots = [];

// Bygger om hela rutnätet (körs vid start och när fönstret ändrar storlek)
function buildField() {
  dots = [];
  for (let x = SPACING / 2; x < window.innerWidth; x += SPACING) {
    for (let y = SPACING / 2; y < window.innerHeight; y += SPACING) {
      dots.push({ homeX: x, homeY: y, x, y, vx: 0, vy: 0 });
    }
  }
}

// Puffar en prick bort från en punkt. Ju närmare, desto starkare puff.
function pushAway(dot, fromX, fromY, radius, strength) {
  const dx = dot.x - fromX;
  const dy = dot.y - fromY;
  const distance = Math.hypot(dx, dy) || 1;   // || 1 hindrar delning med noll
  if (distance < radius) {
    const force = (1 - distance / radius) * strength;
    dot.vx += (dx / distance) * force;
    dot.vy += (dy / distance) * force;
  }
}

function updateField(now) {
  // Tar bort vågor som har levt för länge
  while (ripples.length && now - ripples[0].born > RIPPLE_LIFE) ripples.shift();

  for (const dot of dots) {
    pushAway(dot, pointer.x, pointer.y, PUSH_RADIUS, 1.2);

    // En våg är en ring som växer. Bara prickar nära ringen puffas.
    for (const ripple of ripples) {
      const age = now - ripple.born;
      const ringRadius = (age / 1000) * RIPPLE_SPEED;
      const fromRing = Math.abs(Math.hypot(dot.x - ripple.x, dot.y - ripple.y) - ringRadius);
      if (fromRing < 20) pushAway(dot, ripple.x, ripple.y, ringRadius + 20, 3 * (1 - age / RIPPLE_LIFE));
    }

    // Fjäder som drar prickarna hem, och friktion så att de lugnar ner sig
    dot.vx = (dot.vx + (dot.homeX - dot.x) * 0.06) * 0.82;
    dot.vy = (dot.vy + (dot.homeY - dot.y) * 0.06) * 0.82;
    dot.x += dot.vx;
    dot.y += dot.vy;
  }
}

function drawField() {
  fieldLayer.clear();

  // Prickar som vilar ritas grå, prickar som rör sig ritas i accentfärgen
  const moving = [];
  for (const dot of dots) {
    const offset = Math.abs(dot.x - dot.homeX) + Math.abs(dot.y - dot.homeY);
    if (offset > 3) moving.push(dot);
    else fieldLayer.rect(dot.x - 1, dot.y - 1, 2, 2);
  }
  fieldLayer.fill({ color: colours.muted, alpha: 0.4 });

  for (const dot of moving) fieldLayer.rect(dot.x - 1.5, dot.y - 1.5, 3, 3);
  fieldLayer.fill(colours.accent);
}

buildField();
window.addEventListener("resize", buildField);


// ---------- Motiv ----------
// En ritfunktion per ruta. Alla tar samma värden:
//   g        Graphics-lagret att rita i
//   x, y     rutans övre vänstra hörn på skärmen
//   w, h     rutans bredd och höjd
//   t        tid i sekunder
//   hover    0 (vilar) till 1 (musen är över rutan)

// Slumptalsgenerator med fast startvärde, så att punkterna ser likadana ut
// varje gång sidan laddas
function seededRandom(seed) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

const random = seededRandom(7);
const scatterPoints = Array.from({ length: 48 }, () => ({ x: random(), y: random(), phase: random() * 6.28 }));

const motifs = {
  // Blomma: kronblad som öppnar sig när musen är över
  bloom(g, x, y, w, h, t, hover) {
    const cx = x + w / 2, cy = y + h / 2;
    const petals = 14;
    const open = 0.35 + 0.15 * Math.sin(t * 0.8) + hover * 0.5;
    const length = Math.min(w, h) * 0.4 * open;

    for (let i = 0; i < petals; i++) {
      const angle = (i / petals) * Math.PI * 2 + t * 0.1;
      const side = 0.18;
      g.poly([
        cx, cy,
        cx + Math.cos(angle - side) * length * 0.6, cy + Math.sin(angle - side) * length * 0.6,
        cx + Math.cos(angle) * length, cy + Math.sin(angle) * length,
        cx + Math.cos(angle + side) * length * 0.6, cy + Math.sin(angle + side) * length * 0.6,
      ]);
    }
    g.fill({ color: colours.accent, alpha: hover * 0.25 });
    g.stroke({ width: 1.25, color: colours.ink });
  },

  // Staplar: fyra kolumner av staplar som svajar, och står still vid hover
  bars(g, x, y, w, h, t, hover) {
    const columns = 4, rows = 12;
    const columnWidth = (w * 0.8) / columns;
    const rowHeight = (h * 0.7) / rows;
    const sway = 1 - hover;

    for (let c = 0; c < columns; c++) {
      const centre = x + w * 0.1 + columnWidth * (c + 0.5);
      for (let r = 0; r < rows; r++) {
        const barWidth = columnWidth * (0.25 + 0.5 * Math.abs(Math.sin(r * 0.7 + c * 1.3)));
        const shift = Math.sin(t * 1.2 + r * 0.4 + c) * columnWidth * 0.15 * sway;
        g.rect(centre - barWidth / 2 + shift, y + h * 0.15 + r * rowHeight, barWidth, rowHeight * 0.6);
      }
    }
    g.fill(hover > 0.5 ? colours.accent : colours.ink);
  },

  // Punktmoln: punkter som svävar, och linjer mellan nära punkter vid hover
  scatter(g, x, y, w, h, t, hover) {
    const points = scatterPoints.map((p) => ({
      x: x + w * (0.1 + 0.8 * p.x) + Math.sin(t * 0.7 + p.phase) * 10,
      y: y + h * (0.1 + 0.8 * p.y) + Math.cos(t * 0.5 + p.phase) * 10,
    }));

    if (hover > 0.01) {
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          if (Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y) < w * 0.16) {
            g.moveTo(points[i].x, points[i].y).lineTo(points[j].x, points[j].y);
          }
        }
      }
      g.stroke({ width: 1, color: colours.accent, alpha: hover * 0.8 });
    }

    for (const p of points) g.circle(p.x, p.y, 2.5);
    g.fill(colours.ink);
  },

  // Rutnät: celler som växer och krymper inom en fast ram
  grid(g, x, y, w, h, t, hover) {
    const columns = 8, rows = 6;
    const cellW = (w * 0.8) / columns, cellH = (h * 0.8) / rows;

    for (let i = 0; i < columns; i++) {
      for (let j = 0; j < rows; j++) {
        const size = 0.5 + 0.5 * Math.sin(t * (1 + hover * 2) + i * 0.6 + j * 0.9);
        const cx = x + w * 0.1 + cellW * (i + 0.5);
        const cy = y + h * 0.1 + cellH * (j + 0.5);
        g.rect(cx - (cellW * size) / 2.4, cy - (cellH * size) / 2.4, (cellW * size) / 1.2, (cellH * size) / 1.2);
      }
    }
    g.fill(hover > 0.5 ? colours.accent : colours.ink);
    g.rect(x + w * 0.1, y + h * 0.1, w * 0.8, h * 0.8).stroke({ width: 1.5, color: colours.ink });
  },

  // Ringar: cirklar som sprider sig utåt från mitten, snabbare vid hover
  rings(g, x, y, w, h, t, hover) {
    const cx = x + w / 2, cy = y + h / 2;
    const maxRadius = Math.min(w, h) * 0.45;
    const count = 7;

    for (let k = 0; k < count; k++) {
      const radius = (t * (18 + hover * 40) + (k * maxRadius) / count) % maxRadius;
      g.circle(cx, cy, radius).stroke({
        width: 1.5,
        color: hover > 0.5 ? colours.accent : colours.ink,
        alpha: 1 - radius / maxRadius,
      });
    }
    g.circle(cx, cy, 5 + hover * 4).fill(colours.ink);
  },

  // Länkar: noder som roterar och är kopplade till varandra med linjer
  links(g, x, y, w, h, t, hover) {
    const count = 7;
    const cx = x + w / 2, cy = y + h / 2;
    const nodes = [];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + t * 0.15;
      const radius = Math.min(w, h) * (0.28 + 0.08 * Math.sin(t + i * 2));
      nodes.push({ x: cx + Math.cos(angle) * radius * 1.3, y: cy + Math.sin(angle) * radius });
    }

    // Varje nod kopplas till två andra, så ingen blir ensam
    for (let i = 0; i < count; i++) {
      for (const step of [2, 3]) {
        const other = nodes[(i + step) % count];
        g.moveTo(nodes[i].x, nodes[i].y).lineTo(other.x, other.y);
      }
    }
    g.stroke({ width: 1.25, color: hover > 0.5 ? colours.accent : colours.ink, alpha: 0.6 + hover * 0.4 });

    for (const node of nodes) g.rect(node.x - 5, node.y - 5, 10, 10);
    g.fill(colours.ink);
  },
};

function drawTiles(time) {
  artLayer.clear();

  for (const tile of tiles) {
    // Låter hover-värdet närma sig sitt mål lite i taget (mjuk övergång)
    tile.hover += (tile.target - tile.hover) * 0.1;

    // Var på skärmen är rutan just nu? Hoppa över den om den är utanför bild.
    const r = tile.box.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) continue;

    artLayer.rect(r.left, r.top, r.width, r.height).fill(colours.tile);
    motifs[tile.motif](artLayer, r.left, r.top, r.width, r.height, time, tile.hover);
  }
}


// ---------- Animationsloop ----------

let time = 0;

// Körs en gång per bildruta
app.ticker.add((ticker) => {
  // Tiden går bara framåt om rörelse är tillåten, eller om musen är över en ruta
  const anyHover = tiles.some((tile) => tile.target > 0);
  if (!reduceMotion || anyHover) time += ticker.deltaMS / 1000;

  const now = performance.now();
  updateField(now);
  drawField();
  drawTiles(time);
});