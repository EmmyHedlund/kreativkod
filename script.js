// Skriv gärna om kommentarerna med dina egna ord, uppgiften kräver det.

// Sätter årtalet i sidfoten
document.getElementById("year").textContent = new Date().getFullYear();

// Färgerna som formerna slumpas ur
let palette = [0xff3d6e, 0xf4d35e, 0x3a86ff, 0x7ae7c7, 0x9b5de5];

// Alla former som lever just nu
const shapes = [];
const MAX_SHAPES = 150; // tak så att sidan inte blir seg

// Hjälpfunktion: slumptal mellan a och b
function rand(a, b) {
  return a + Math.random() * (b - a);
}

// Hjälpfunktion: välj en slumpad färg ur paletten
function randomColor() {
  return palette[Math.floor(Math.random() * palette.length)];
}

async function start() {
  const container = document.getElementById("pixi-container");

  // Skapar Pixi-appen (i version 8 måste init anropas med await)
  const app = new PIXI.Application();
  await app.init({
    resizeTo: container,   // canvasen följer containerns storlek
    backgroundAlpha: 0,    // genomskinlig, bakgrunden styrs av CSS
    antialias: true,
  });
  container.appendChild(app.canvas);

  // Skapar en ny form vid position x, y
  function spawn(x, y, big = false) {
    if (shapes.length >= MAX_SHAPES) {
      const old = shapes.shift(); // ta bort den äldsta
      old.g.destroy();
    }

    const g = new PIXI.Graphics();
    const size = big ? rand(30, 80) : rand(8, 30);
    const color = randomColor();

    // Slumpar mellan cirkel, ring och fyrkant
    const kind = Math.floor(rand(0, 3));
    if (kind === 0) {
      g.circle(0, 0, size).fill({ color, alpha: 0.8 });
    } else if (kind === 1) {
      g.circle(0, 0, size).stroke({ color, width: 4 });
    } else {
      g.rect(-size, -size, size * 2, size * 2).fill({ color, alpha: 0.8 });
    }

    g.x = x;
    g.y = y;
    app.stage.addChild(g);

    shapes.push({
      g,
      vx: rand(-1.5, 1.5),  // rörelse i sidled
      vy: rand(-1.5, 1.5),  // rörelse i höjdled
      spin: rand(-0.05, 0.05),
      life: 1,              // går från 1 till 0, sen försvinner formen
    });
  }

  // MUS: former följer efter muspekaren
  app.canvas.addEventListener("pointermove", (e) => {
    const r = app.canvas.getBoundingClientRect();
    spawn(e.clientX - r.left, e.clientY - r.top);
  });

  // KLICK: en explosion av stora former
  app.canvas.addEventListener("pointerdown", (e) => {
    const r = app.canvas.getBoundingClientRect();
    for (let i = 0; i < 15; i++) {
      spawn(e.clientX - r.left, e.clientY - r.top, true);
    }
  });

  // TANGENTBORD: en tangenttryckning byter palett och släpper formerna på slumpade platser
  window.addEventListener("keydown", () => {
    palette = Array.from({ length: 5 }, () => Math.floor(Math.random() * 0xffffff));
    for (let i = 0; i < 10; i++) {
      spawn(rand(0, app.screen.width), rand(0, app.screen.height), true);
    }
  });

  // Körs varje bildruta: flytta, rotera och tona ut formerna
  app.ticker.add(() => {
    for (let i = shapes.length - 1; i >= 0; i--) {
      const s = shapes[i];
      s.g.x += s.vx;
      s.g.y += s.vy;
      s.g.rotation += s.spin;
      s.life -= 0.01;
      s.g.alpha = Math.max(s.life, 0);
      s.g.scale.set(0.5 + s.life * 0.5);

      if (s.life <= 0) {
        s.g.destroy();
        shapes.splice(i, 1);
      }
    }
  });
}

start();
