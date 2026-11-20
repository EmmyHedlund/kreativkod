// Den här koden skapar en bakgrund med små lysande eldflugor som rör sig och blinkar.
// Eldflugorna ritas på en egen canvas bakom personen och auran.
// Animationen anpassas också efter användarens inställningar för minskad rörelse.

(()=>{
// Kollar om användaren har valt minskad rörelse i sitt system.
// rnd är en kortare variant av Math.random som används för att slumpa värden.
const red=matchMedia("(prefers-reduced-motion: reduce)").matches,
rnd=Math.random;

// W och H är canvasens bredd och höjd, dpr är skärmens pixeltäthet och flugor är listan med alla eldflugor.
let W,H,dpr,flugor;

// Hämtar canvasen där eldflugorna ska ritas.
const cv=document.getElementById("eldflugor"),
ctx=cv.getContext("2d");

// Skapar en eldfluga med slumpmässig position, storlek, hastighet, färg och blinkning.
const nyFluga=()=>{
 const n=rnd();
 return{
  x:rnd()*W,                          
  y:H*(.15+rnd()*.8),                 
  r:(.8+n*2.2)*dpr,                   
  hast:(4+n*14)*dpr,                  
  vinkel:rnd()*Math.PI*2,            
  sväng:(rnd()-.5)*.8,              
  fas:rnd()*6.28,                
  blink:.4+rnd()*.9,                 
  färg:rnd()<.7?[255,225,140]:[255,170,235] 
 };
};

// Anpassar canvasen efter skärmens storlek och bestämmer hur många eldflugor som ska finnas.
// Antalet beror på skärmbredden, minst 25 och högst 70.
const storlek=()=>{
 dpr=Math.min(devicePixelRatio||1,2);
 W=cv.width=innerWidth*dpr;
 H=cv.height=innerHeight*dpr;
 flugor=Array.from({
  length:Math.round(Math.min(70,Math.max(25,innerWidth/25)))
 },nyFluga);
};

// Skapar om eldflugorna om webbläsarfönstret ändrar storlek.
addEventListener("resize",storlek);
storlek();

// Sparar tiden för förra bildrutan så att rörelsen blir lika snabb på alla datorer.
let sist=performance.now();

// Huvudloopen som flyttar och ritar eldflugorna i varje bildruta.
const ram=nu=>{
 // dt är tiden sedan förra bildrutan i sekunder (högst 0,05 så att inget hoppar om fliken varit pausad).
 const dt=Math.min(.05,(nu-sist)/1e3);
 sist=nu;

 // Rensar canvasen och gör att eldflugornas ljus kan förstärka varandra.
 ctx.clearRect(0,0,W,H);
 ctx.globalCompositeOperation="lighter";

 for(const f of flugor){

  // Eldflugorna rör sig i lite olika riktningar och kommer tillbaka när de lämnar skärmen.
  // Om användaren har valt minskad rörelse står de stilla.
  if(!red){
   f.vinkel+=f.sväng*dt+(rnd()-.5)*.6*dt;             
   f.x+=Math.cos(f.vinkel)*f.hast*dt;                 
   f.y+=Math.sin(f.vinkel)*f.hast*dt*.6-2*dt*dpr;       

   // Lämnar flugan skärmen dyker den upp på motsatt sida.
   if(f.x<-20)f.x=W+20;
   if(f.x>W+20)f.x=-20;
   if(f.y<-20)f.y=H+20;
   if(f.y>H+20)f.y=-20;
  }

  // Räknar ut ljusstyrkan med en sinuskurva så att flugan blinkar mjukt.
  // Värdet ligger mellan 0,1 och 1, så flugan slocknar aldrig helt.
  const lj=Math.pow(Math.max(0,Math.sin(nu/1e3*f.blink+f.fas)),2)*.9+.1,
  [r,g,b]=f.färg,
  R=f.r*5,
  // Skapar ett mjukt ljussken som är starkast i mitten och tonas ut mot kanten.
  gr=ctx.createRadialGradient(f.x,f.y,0,f.x,f.y,R),
  c=a=>`rgba(${r},${g},${b},${a})`;

  gr.addColorStop(0,c(lj));
  gr.addColorStop(.25,c(lj*.35));
  gr.addColorStop(1,c(0));

  // Ritar eldflugan som en cirkel fylld med ljusskenet.
  ctx.fillStyle=gr;
  ctx.beginPath();
  ctx.arc(f.x,f.y,R,0,6.283);
  ctx.fill();
 }

 // Fortsätter animationen genom att anropa nästa bildruta.
 requestAnimationFrame(ram);
};

requestAnimationFrame(ram);
})();