// main.js: sets up PixiJS and connects mouse, click and keyboard input.
// It uses the settings and functions from script.js, which must be loaded first.
// Remember to rewrite these comments in your own words.

async function start() {
  const container = document.getElementById("pixi-container");

  // In PixiJS 8 you have to await init() before using the app
  const app = new PIXI.Application();
  await app.init({
    resizeTo: window,       // canvas always fills the window
    backgroundAlpha: 0,     // transparent, the page background is white from CSS
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });
  container.appendChild(app.canvas);

  // One Graphics object that is cleared and redrawn every frame
  const g = new PIXI.Graphics();
  app.stage.addChild(g);

  // Build the grid now, and again whenever the window changes size
  buildGrid(app.screen.width, app.screen.height);
  app.renderer.on("resize", () => buildGrid(app.screen.width, app.screen.height));

  // Start with the "bloom" visible in the lower left so the page isn't empty
  mouse.x = app.screen.width * 0.3;
  mouse.y = app.screen.height * 0.65;

  // MOUSE (and touch): remember where the pointer is
  window.addEventListener("pointermove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  // CLICK: start a ring from the click position
  window.addEventListener("pointerdown", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    addRipple(e.clientX, e.clientY);
  });

  // KEYBOARD: any key changes colour and sometimes shape
  window.addEventListener("keydown", nextStyle);

  // Runs every frame: update the dots, then draw them
  app.ticker.add((ticker) => {
    const { circles, squares } = updateDots(ticker.deltaTime);
    drawDots(g, circles, squares);
  });
}

start();