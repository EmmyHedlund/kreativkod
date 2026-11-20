
// vi har skapat ett interaktivt konstverk som använder webbkameran för att skapa ljus och ljud utifrån människors rörelser.
// Med hjälp av MediaPipe skiljs människorna från bakgrunden och visas som vita siluetter med färgade auror.
// Programmet kan skilja mellan upp till tre personer och ge dem olika färger.
// Genom att jämföra kamerans bildrutor upptäcks rörelser som skapar ljuspartiklar runt kroppen.
// Rörelserna styr också musiken med hjälp av Tone.js. Höjden på rörelsen påverkar tonen och mängden rörelse påverkar hur ofta ljud spelas.
// Tanken är att kroppen ska bli en del av konstverket och att upplevelsen förändras beroende på hur man rör sig. 
// och  att skapa en känsla av att man är en del av ett levande ljus- och ljudlandskap som reagerar på ens rörelser.
// Cloud och chatGPt har används som hjälpmedel för att skriva koden, framförallt mediapipe-delen och ljuddelen. 
// Glitterpartiklarna och eldflugorna i bakgrunden har vi tagit från egen kod tidiogare som vi skapat i p5

// Grundinställningar för kamerans upplösning, grafiklagren och rutnätet som används vid bildanalysen.
const CW=320,CH=240,BW=640,BH=480,PS=4,GW=80,GH=60,N=GW*GH,AR=.5,T2=Math.PI*2,NB=[-1,1,-GW,GW];

// Färgpaletter för de tre personerna. Varje palett har en aurafärg och flera färger för ljuspartiklarna.
const P=[
{aura:"#f93dc4",colors:[[255,190,215],[255,205,175],[255,180,125],[255,235,160],[255,220,210]],core:[255,240,215]},
{aura:"#fffc2e",colors:[[170,230,255],[175,255,235],[150,200,255],[200,255,245],[185,215,255]],core:[235,250,255]},
{aura:"#a35cff",colors:[[215,185,255],[235,200,255],[190,170,255],[255,200,245],[225,215,255]],core:[250,240,255]}];

// Tonerna som används när rörelserna skapar musik.
const MP=P.length,scale3=["C3","D3","E3","G3","A3","C4","D4","E4","G4","A4","C5","D5","E5","G5","A5","C6","D6","E6"];

// Hjälpfunktioner för färger och för att skapa separata grafikytor.
const rgba=(c,a)=>`rgba(${c[0]},${c[1]},${c[2]},${a})`;
const G=(w,h)=>{const g=createGraphics(w,h);g.pixelDensity(1);return g};
const cnv=(w,h)=>{const c=document.createElement("canvas");c.width=w;c.height=h;return c};
const sctx=cnv(CW,CH).getContext("2d",{willReadFrequently:!0});

// Variabler för kameran, AI-modellen, grafiklagren och ljudet.
let video,seg,segReady,segRun,hasMask,lastAI=0,maskL,bodyL,auraL=[],scratch,glowL,prevReady,regC,regX,regImg,sprites,pluck,reverb,audioOn,audioBusy,lastSound=0,peopleCount=1;

// Arrayer som sparar bilddata och hjälper programmet att hitta rörelser och skilja mellan personer.
let prevLum=new Float32Array(N),personMask=new Uint8ClampedArray(N),bin=new Uint8Array(N),tmp=new Uint8Array(N),dil=new Uint8Array(N),labels=new Int16Array(N),queue=new Int32Array(N),slotMap=new Int8Array(N).fill(-1);

// Håller reda på personernas positioner och de olika partiklarna.
let active=Array(MP).fill(!1),tracks=Array(MP).fill(null),balls=[],glitter=[],trail=[];

// Gör bilderna mjukare när de förstoras.
function smth(){drawingContext.imageSmoothingEnabled=!0;drawingContext.imageSmoothingQuality="high"}


// Här startas kameran och alla grafiklager, partiklar och AI-modellen förbereds.
function setup(){
 const canvas = createCanvas(windowWidth,windowHeight);
 canvas.parent(document.querySelector("main"));
 pixelDensity(1);smth();

 video=createCapture(VIDEO);video.size(CW,CH);video.hide();

 maskL=G(BW,BH);bodyL=G(BW,BH);scratch=G(BW,BH);
 for(let i=0;i<MP;i++)auraL.push(G(BW*AR,BH*AR));
 glowL=G(CW,CH);

 regC=cnv(GW,GH);regX=regC.getContext("2d");regImg=regX.createImageData(GW,GH);

 // Skapar små färdiga ljusbilder som kan användas flera gånger när någon rör sig.
 sprites=P.map(p=>p.colors.map(c=>{
  const s=cnv(16,16),x=s.getContext("2d");
  [[7.5,c,22],[4.5,c,45],[2,p.core,105]].forEach(([r,k,a])=>{x.fillStyle=rgba(k,a/255);x.beginPath();x.arc(8,8,r,0,T2);x.fill()});
  return s}));

 // Skapar de små bollarna och glittret som syns i bakgrunden.
 for(let i=0;i<40;i++)balls.push({x:random(width),y:random(height),vx:random(-.7,.7),vy:random(-.7,.7)});
 for(let i=0;i<100;i++)glitter.push({x:random(width),y:random(height),size:random(1,3),phase:random(T2),speed:random(.01,.04)});

 // Laddar MediaPipe som används för att skilja människorna från bakgrunden.
 const base="https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1/",s=document.createElement("script");
 s.src=base+"selfie_segmentation.js";
 s.onload=()=>{seg=new SelfieSegmentation({locateFile:f=>base+f});seg.setOptions({modelSelection:0});seg.onResults(onSeg);segReady=!0;console.log("AI-modellen är redo!")};
 s.onerror=()=>console.error("Kunde inte ladda AI-modellen.");
 document.head.appendChild(s);
}


// Tar emot resultatet från MediaPipe och skapar en vit siluett av människorna i kamerabilden.
function onSeg(r){
 if(!r.segmentationMask)return;
 maskL.clear();
 let c=maskL.drawingContext;
 c.save();c.imageSmoothingEnabled=!0;c.imageSmoothingQuality="high";c.filter="blur(4px)";c.drawImage(r.segmentationMask,0,0,BW,BH);c.restore();
 bodyL.clear();
 c=bodyL.drawingContext;
 c.save();c.drawImage(maskL.canvas,0,0);c.globalCompositeOperation="source-in";c.fillStyle="#ffffff";c.globalAlpha=.9;c.fillRect(0,0,BW,BH);c.restore();

 // Gör om AI-masken till ett mindre rutnät som är lättare att analysera.
 sctx.clearRect(0,0,CW,CH);sctx.drawImage(r.segmentationMask,0,0,CW,CH);
 const px=sctx.getImageData(0,0,CW,CH).data;
 for(let gy=0;gy<GH;gy++)for(let gx=0;gx<GW;gx++)personMask[gx+gy*GW]=px[(gy*PS*CW+gx*PS)*4];
 hasMask=!0;

 analyze();

 // Skapar en färgad aura för varje aktiv personregion.
 for(let s=0;s<MP;s++){
  if(!active[s])continue;
  let src=bodyL.canvas;
  if(peopleCount>1){buildBody(s);src=scratch.canvas}
  renderAura(auraL[s],src,P[s].aura);
 }
}

// Skapar ett mjukt ljussken runt kroppens siluett genom att lägga på oskärpa och färg.
function renderAura(l,src,col){
 l.clear();
 const c=l.drawingContext,w=l.canvas.width,h=l.canvas.height;
 c.save();
 [24,8].forEach(b=>{c.filter=`blur(${b*AR}px)`;c.globalAlpha=.9;c.drawImage(src,0,0,w,h)});
 c.filter="none";c.globalAlpha=1;c.globalCompositeOperation="source-in";c.fillStyle=col;c.fillRect(0,0,w,h);
 c.restore();
}


// Om flera personer syns används den här funktionen för att skapa en separat mask för varje personregion.
function buildBody(slot){
 const c=scratch.drawingContext,d=regImg.data;
 c.save();c.clearRect(0,0,BW,BH);c.globalCompositeOperation="source-over";c.globalAlpha=1;c.filter="none";c.drawImage(bodyL.canvas,0,0);
 for(let k=0;k<N;k++)d[k*4+3]=slotMap[k]===slot?255:0;
 regX.putImageData(regImg,0,0);
 c.globalCompositeOperation="destination-in";c.imageSmoothingEnabled=!0;c.drawImage(regC,0,0,BW,BH);
 c.restore();
}


// Gör områdena i personmasken lite större så att små mellanrum inte delar upp samma kropp i flera delar.
function dilate(a,b,dx,dy){
 for(let y=0;y<GH;y++)for(let x=0;x<GW;x++){
  let v=0;
  for(let d=-2;d<=2&&!v;d++){const X=x+d*dx,Y=y+d*dy;if(X>=0&&X<GW&&Y>=0&&Y<GH&&a[X+Y*GW])v=1}
  b[x+y*GW]=v;
 }
}


// Analyserar personmasken för att hitta sammanhängande områden och försöker följa dem mellan bildrutorna.
function analyze(){
 for(let k=0;k<N;k++)bin[k]=personMask[k]>128?1:0;
 dilate(bin,tmp,1,0);dilate(tmp,dil,0,1);
 labels.fill(0);
 const comps=[];let nl=0;

 // Söker igenom masken och räknar ut storleken och mittpunkten för varje sammanhängande område.
 for(let s=0;s<N;s++){
  if(!dil[s]||labels[s])continue;
  let h=0,t=0,a=0,sx=0,sy=0;
  queue[t++]=s;labels[s]=++nl;
  while(h<t){
   const k=queue[h++],x=k%GW;
   a++;sx+=x;sy+=(k-x)/GW;
   for(const d of NB){
    const nk=k+d;
    if((d==-1?x>0:d==1?x<GW-1:d<0?k>=GW:k<N-GW)&&dil[nk]&&!labels[nk]){labels[nk]=nl;queue[t++]=nk}
   }
  }
  comps.push({label:nl,area:a,cx:sx/a,cy:sy/a});
 }

 // Behåller de största områdena och ignorerar små delar som kan vara brus.
 const big=comps.filter(c=>c.area>=40).sort((a,b)=>b.area-a.area).slice(0,MP);
 slotMap.fill(-1);active.fill(!1);
 if(!big.length){active[0]=!0;peopleCount=1;return}
 const now=millis();
 tracks.forEach((t,s)=>{if(t&&now-t.t>1500)tracks[s]=null});

 // Jämför områdenas positioner med tidigare bildrutor för att försöka behålla samma färg på varje person.
 const cs=big.map(()=>-1),taken=[],pairs=[];
 big.forEach((c,i)=>tracks.forEach((t,s)=>{if(t){const d=Math.hypot(c.cx-t.cx,c.cy-t.cy);if(d<=30)pairs.push({i,s,d})}}));
 pairs.sort((a,b)=>a.d-b.d);
 for(const p of pairs)if(cs[p.i]<0&&!taken[p.s]){cs[p.i]=p.s;taken[p.s]=1}

 // Nya områden får en ledig personplats och därmed en egen färg.
 big.forEach((c,i)=>{
  if(cs[i]>=0)return;
  let ch=-1,o=Infinity;
  for(let s=0;s<MP;s++)if(!taken[s]&&tracks[s]===null){ch=s;break}
  if(ch<0)for(let s=0;s<MP;s++)if(!taken[s]&&tracks[s].t<o){o=tracks[s].t;ch=s}
  cs[i]=ch;taken[ch]=1;
 });

 // Sparar personernas nya positioner och kopplar pixlarna till rätt färg.
 const ls=[];
 big.forEach((c,i)=>{const s=cs[i];tracks[s]={cx:c.cx,cy:c.cy,t:now};active[s]=!0;ls[c.label]=s});
 for(let k=0;k<N;k++){const l=labels[k];if(l>0&&ls[l]!==undefined)slotMap[k]=ls[l]}
 peopleCount=big.length;
}


// Skickar kamerabilder till AI-modellen, men högst 15 gånger per sekund för att minska belastningen.
async function processSeg(){
 if(!segReady||segRun||!video.elt||video.elt.readyState<2)return;
 const now=millis();
 if(now-lastAI<1000/15)return;
 lastAI=now;segRun=!0;
 try{await seg.send({image:video.elt})}catch(e){console.error("AI-fel:",e)}finally{segRun=!1}
}


// Startar ljudet och skapar en mjuk synt med efterklang.
// Ljudet aktiveras först när användaren klickar eller rör skärmen.
async function startAudio(){
 if(audioOn||audioBusy)return;
 audioBusy=!0;
 try{
  await Tone.start();
  reverb=new Tone.Reverb({decay:5,wet:.5});
  await reverb.generate();
  pluck=new Tone.Synth({oscillator:{type:"sine"},envelope:{attack:.03,decay:.5,sustain:.08,release:2.5}});
  pluck.connect(reverb);reverb.toDestination();pluck.volume.value=-12;
  audioOn=!0;console.log("Ljudet är aktiverat!");
 }catch(e){console.error("Ljudfel:",e)}finally{audioBusy=!1}
}

function mousePressed(){startAudio()}
function touchStarted(){startAudio();return!1}


// Huvudloopen som uppdaterar bakgrunden, analyserar rörelser och ritar alla effekter.
function draw(){
 clear();drawGlitter();drawBalls();processSeg();movementLight();
 if(hasMask)drawPerson();
 drawTrail();
}


// Anpassar kamerabildens storlek så att den täcker hela skärmen och är centrerad.
function fit(){
 const s=max(width/CW,height/CH),w=CW*s,h=CH*s;
 return{w,h,x:(width-w)/2,y:(height-h)/2};
}


// Ritar den spegelvända kroppssiluetten tillsammans med aurorna och ljuset från rörelserna.
// Auran ändrar långsamt storlek för att skapa en pulserande effekt.
function drawPerson(){
 const f=fit(),a=1.02+(sin(millis()*.0011)+1)*.5*.2,w=f.w*a,h=f.h*a;
 push();translate(width,0);scale(-1,1);
 drawingContext.globalAlpha=145/255;
 for(let s=0;s<MP;s++)if(active[s])image(auraL[s],f.x-(w-f.w)/2,f.y-(h-f.h)/2,w,h);
 drawingContext.globalAlpha=1;
 image(bodyL,f.x,f.y,f.w,f.h);image(glowL,f.x,f.y,f.w,f.h);
 pop();
}


// Uppdaterar de små bollarna i bakgrunden och får dem att studsa mot skärmens kanter.
function drawBalls(){
 noStroke();fill(227,218,172);
 for(const b of balls){
  b.x+=b.vx;b.y+=b.vy;
  if(b.x<=2||b.x>=width-2)b.vx*=-1;
  if(b.y<=2||b.y>=height-2)b.vy*=-1;
  circle(b.x,b.y,4);
 }
}


// Ritar bakgrundens glitter som blinkar i olika takt och ibland ser ut som små stjärnor.
function drawGlitter(){
 noStroke();
 for(const g of glitter){
  const s=sin(frameCount*g.speed+g.phase),o=map(s,-1,1,20,150);
  fill(255,225,190,o);circle(g.x,g.y,max(.5,g.size+s*1.5));
  if(s>.85){stroke(255,235,210,o);strokeWeight(.7);line(g.x-4,g.y,g.x+4,g.y);line(g.x,g.y-4,g.x,g.y+4);noStroke()}
 }
}


// Upptäcker rörelser genom att jämföra ljusstyrkan i kamerans nuvarande och föregående bildruta.
// När en förändring sker inom personmasken skapas ljus och ibland partiklar.
function movementLight(){
 if(!video.elt||video.elt.readyState<2)return;
 video.loadPixels();
 const px=video.pixels;
 if(!px.length)return;
 const g=glowL.drawingContext,first=!prevReady,f=fit();
 g.clearRect(0,0,CW,CH);
 let cnt=0,ySum=0,spawned=0;
 for(let y=0;y<CH;y+=PS)for(let x=0;x<CW;x+=PS){
  const k=x/PS+y/PS*GW,i=(x+y*CW)*4,cur=(px[i]+px[i+1]+px[i+2])/3;
  if(first){prevLum[k]=cur;continue}
  const diff=Math.abs(cur-prevLum[k]);
  prevLum[k]=cur;
  if(hasMask&&personMask[k]>128&&diff>35){
   const slot=slotMap[k]>=0?slotMap[k]:0;
   cnt++;ySum+=y;drawGlow(g,x,y,slot);
   if(spawned<3&&trail.length<90&&random()<.045){spawnTrail(x,y,f,slot);spawned++}
  }
 }
 if(first){prevReady=!0;return}

 // Antalet rörelsepunkter och deras genomsnittliga höjd används för att styra musiken.
 playSound(cnt,cnt?ySum/cnt:CH/2);
}


// Ritar små ljuspunkter där rörelse upptäcks, med färger från personens palett.
function drawGlow(c,x,y,slot){
 const sp=sprites[slot];
 c.drawImage(sp[Math.floor(Math.random()*sp.length)],x-8,y-8);
 if(Math.random()>.85){
  const a=random(T2),d=random(2,7);
  c.fillStyle=`rgba(255,250,225,${(random(130,230)/255).toFixed(3)})`;
  c.beginPath();c.arc(x+Math.cos(a)*d,y+Math.sin(a)*d,random(1,2.5)/2,0,T2);c.fill();
 }
}


// Skapar partiklar som utgår från rörelsen och långsamt flyter uppåt.
function spawnTrail(x,y,f,slot){
 trail.push({x:width-(f.x+x/CW*f.w),y:f.y+y/CH*f.h,vx:random(-1,1),vy:random(-1.5,-.2),size:random(.3,9),life:1,fade:random(.015,.03),color:random(P[slot].colors)});
}


// Uppdaterar rörelsepartiklarna och låter dem gradvis bli svagare tills de försvinner.
function drawTrail(){
 push();noStroke();
 for(let i=trail.length-1;i>=0;i--){
  const p=trail[i];
  p.x+=p.vx;p.y+=p.vy;p.vx*=.985;p.vy*=.99;p.life-=p.fade;
  if(p.life<=0){trail.splice(i,1);continue}
  const a=255*p.life,c=p.color;
  fill(c[0],c[1],c[2],a*.16);circle(p.x,p.y,p.size*2);
  fill(c[0],c[1],c[2],a*.65);circle(p.x,p.y,p.size);
  fill(255,248,230,a*.85);circle(p.x,p.y,max(.8,p.size*.35));
 }
 pop();
}


// Spelar toner när rörelse upptäcks. Rörelser högt upp ger högre toner, medan mer rörelse gör att tonerna kan spelas oftare.
function playSound(n,avgY){
 if(!audioOn||!pluck||n<3)return;
 if(millis()-lastSound>map(constrain(n,3,25),3,25,900,250)){
  pluck.triggerAttackRelease(scale3[constrain(floor(map(avgY,CH,0,0,scale3.length)),0,scale3.length-1)],"8n",Tone.now());
  lastSound=millis();
 }
}


// Anpassar canvasen om webbläsarfönstret ändrar storlek.
function windowResized(){resizeCanvas(windowWidth,windowHeight);smth()}
