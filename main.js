// Startar Pixi och lägger dess canvas på sidan
const app = new PIXI.Application();
await app.init({ resizeTo: window, background: "#ffffff" });
document.body.appendChild(app.canvas);

// Färgpaletter. Ett tangenttryck byter till nästa palett.
const palettes = [
  ["#2b44d6", "#6c8bff", "#a5b4fc"],   // blå
  ["#e63946", "#ff8a5b", "#ffd166"],   // varm
  ["#2a9d8f", "#52b788", "#b7e4c7"],   // grön
  ["#7b2cbf", "#c77dff", "#ff70a6"]    // lila/rosa
];
let paletteIndex = 0;

// Två Graphics-objekt: ett för rutnätet och ett för partiklarna
const dots = new PIXI.Graphics();
const burst = new PIXI.Graphics();
app.stage.addChild(dots);
app.stage.addChild(burst);

// Håller koll på var musen är
const mouse = { x: -1000, y: -1000 };
window.addEventListener("pointermove", (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

// Lista med alla partiklar som just nu är levande
let particles = [];

// Vid klick skapas 30 nya partiklar som flyger åt slumpmässiga håll
window.addEventListener("pointerdown", (e) => {
  const palette = palettes[paletteIndex];
  for (let i = 0; i < 30; i++) {
    const angle = Math.random() * Math.PI * 2;   // slumpad riktning
    const speed = 1 + Math.random() * 5;         // slumpad hastighet
    particles.push({
      x: e.clientX,
      y: e.clientY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 3 + Math.random() * 8,
      life: 1,                                   // 1 = helt synlig, 0 = borta
      color: palette[Math.floor(Math.random() * palette.length)]
    });
  }
});

// Vid tangenttryck byts palett
window.addEventListener("keydown", () => {
  paletteIndex = (paletteIndex + 1) % palettes.length;
});

// Ger ett "slumpat" tal mellan 0 och 1 som alltid blir samma för samma ruta,
// så att färgerna inte flimrar för varje bildruta
function stableRandom(x, y) {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

// Körs varje bildruta
app.ticker.add(() => {
  const palette = palettes[paletteIndex];

  // 1. Rutnätet: prickar som växer ju närmare musen de är
  dots.clear();
  for (let x = 0; x < app.screen.width; x += 30) {
    for (let y = 0; y < app.screen.height; y += 30) {
      const distance = Math.hypot(x - mouse.x, y - mouse.y);
      const radius = Math.max(1.5, 12 - distance / 25);
      const color = palette[Math.floor(stableRandom(x, y) * palette.length)];
      dots.circle(x, y, radius).fill(color);
    }
  }

  // 2. Partiklarna: flytta, rita och låt dem blekna bort
  burst.clear();
  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.05;      // lite tyngdkraft
    p.life -= 0.015;   // blir mer genomskinlig för varje bildruta
    burst.circle(p.x, p.y, p.size * p.life).fill({ color: p.color, alpha: Math.max(p.life, 0) });
  }
  // Tar bort partiklar som har försvunnit så att listan inte växer i evighet
  particles = particles.filter((p) => p.life > 0);
});