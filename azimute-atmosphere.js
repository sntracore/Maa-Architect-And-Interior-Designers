/* Continuous CSS compositing only. No photography, canvas, or Three state is modified. */
(() => {
  'use strict';
  const root=document.documentElement,host=document.querySelector('.site-atmosphere');
  if(!host||host.dataset.atmosphereBound==='true')return;
  const crystal=host.querySelector('.site-atmosphere__crystal'),veil=host.querySelector('.site-atmosphere__veil'),light=host.querySelector('.site-atmosphere__light');
  if(!crystal||!veil||!light)return;
  host.dataset.atmosphereBound='true';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
  const smooth=x=>{const t=clamp(x);return t*t*(3-2*t);};
  // RGB foundation, crystal, veil, light. Stops come from actual section positions.
  const definitions=[
    ['.hero',[24,28,28,.50,.40,.28],true],
    ['#projeto',[76,60,45,.72,.51,.46],false],
    ['.architecture-chapter',[18,28,31,.60,.49,.35],true],
    ['#essencia',[44,39,33,.58,.46,.32],false],
    ['#residencias',[88,74,57,.69,.46,.42],false],
    ['.outdoor',[54,38,28,.78,.58,.45],false],
    ['#encontros',[79,67,51,.71,.49,.43],false],
    ['#espacos',[53,61,57,.70,.51,.36],false],
    ['.footer',[24,34,33,.62,.56,.32],false]
  ];
  const sections=definitions.map(([selector,theme,ownsScene])=>({element:document.querySelector(selector),selector,theme,ownsScene})).filter(section=>section.element);
  let stops=[],width=innerWidth,height=innerHeight,maxScroll=1,scroll=window.scrollY||0,progress=0,motionProgress=0;
  let heroPresence=Number.isFinite(window.AZIMUTE_HERO_PRESENCE)?clamp(window.AZIMUTE_HERO_PRESENCE):1;
  let raf=0,layoutDirty=true,measurementQueued=false,last=0,time=0,frames=0,disposed=false,suspended=false;
  let target=definitions[0][1].slice(),current=target.slice(),activeChapter='.hero';
  const removers=[],styleCache=new WeakMap();
  function listen(object,event,handler,options){object.addEventListener(event,handler,options);removers.push(()=>object.removeEventListener(event,handler,options));}
  function setStyle(element,property,value){let cache=styleCache.get(element);if(!cache){cache={};styleCache.set(element,cache);}if(cache[property]!==value){element.style[property]=value;cache[property]=value;}}
  function permitted(){return !disposed&&!suspended&&!document.hidden&&!reduced.matches&&!root.classList.contains('motion-paused')&&!root.classList.contains('viewer-open')&&!root.classList.contains('intro-playing');}
  function ownsViewport(){return sections.some(section=>section.ownsScene&&(section.selector!=='.hero'||heroPresence>=.995)&&Math.max(0,Math.min(scroll+height,section.bottom)-Math.max(scroll,section.top))>=height*.995);}
  function measure(){
    if(!layoutDirty)return;
    width=Math.max(1,innerWidth);height=Math.max(1,innerHeight);scroll=window.scrollY||0;
    maxScroll=Math.max(1,root.scrollHeight-height);
    for(const section of sections){const box=section.element.getBoundingClientRect();section.top=box.top+scroll;section.bottom=section.top+box.height;section.stop=section.top+Math.min(box.height*.46,height*.70);}
    stops=sections.slice().sort((a,b)=>a.stop-b.stop);layoutDirty=false;
  }
  function selectTheme(){
    measure();scroll=window.scrollY||0;progress=clamp(scroll/maxScroll);
    if(!stops.length)return;
    const probe=scroll+height*.48;
    let left=stops[0],right=left;
    for(let i=1;i<stops.length;i++){right=stops[i];if(probe<=right.stop)break;left=right;}
    const mix=left===right?0:smooth((probe-left.stop)/Math.max(1,right.stop-left.stop));
    target=left.theme.map((value,i)=>value+(right.theme[i]-value)*mix);
    const reading=sections.find(section=>probe>=section.top&&probe<section.bottom);
    activeChapter=reading?.selector||(probe<stops[0].top?stops[0].selector:stops.at(-1).selector);
  }
  function paintTheme(alpha=1){
    current=current.map((value,i)=>value+(target[i]-value)*alpha);
    setStyle(host,'backgroundColor',`rgb(${current.slice(0,3).map(Math.round).join(',')})`);
    setStyle(crystal,'opacity',current[3].toFixed(3));setStyle(veil,'opacity',current[4].toFixed(3));
    setStyle(light,'opacity',(current[5]*(.94+Math.sin(time*.13)*.06)).toFixed(3));
  }
  function paintMotion(){
    const depth=motionProgress-.5,mobile=width<=700,amount=mobile?.65:1;
    const cx=(depth*1.6+Math.sin(time*.073)*.55)*width*.01*amount;
    const cy=(depth*4.4+Math.cos(time*.051)*.38)*height*.01*amount;
    const vx=(-depth*1.1+Math.sin(time*.115+1.2)*.72)*width*.01*amount;
    const vy=(-depth*2.0+Math.cos(time*.093)*.42)*height*.01*amount;
    const lx=(depth*3.2+Math.sin(time*.17-.7)*1.3)*width*.01*amount;
    const ly=Math.sin(time*.067)*height*.004*amount;
    setStyle(crystal,'transform',`translate3d(${cx.toFixed(2)}px,${cy.toFixed(2)}px,0) scale(1.025)`);
    setStyle(veil,'transform',`translate3d(${vx.toFixed(2)}px,${vy.toFixed(2)}px,0)`);
    setStyle(light,'transform',`translate3d(${lx.toFixed(2)}px,${ly.toFixed(2)}px,0)`);
  }
  function stop(){if(raf)cancelAnimationFrame(raf);raf=0;last=0;host.classList.add('is-resting');}
  function frame(now){
    raf=0;
    if(!permitted()||ownsViewport()){stop();return;}
    const interval=1000/(width<=700?24:30);
    if(last&&now-last<interval){raf=requestAnimationFrame(frame);return;}
    const dt=last?Math.min((now-last)/1000,.08):interval/1000;last=now;time+=dt;
    motionProgress+=(progress-motionProgress)*(1-Math.exp(-5.5*dt));
    paintTheme(1-Math.exp(-5*dt));paintMotion();frames++;raf=requestAnimationFrame(frame);
  }
  function reconcile(){
    if(disposed)return;
    if(document.hidden||suspended){stop();return;}
    selectTheme();
    if(!permitted()||ownsViewport()){stop();paintTheme();return;}
    host.classList.remove('is-resting');
    if(!raf){last=0;raf=requestAnimationFrame(frame);}
  }
  function invalidate(){
    layoutDirty=true;if(measurementQueued||disposed||document.hidden||suspended)return;
    measurementQueued=true;
    // One layout refresh per event batch, with no permanent animation loop in reduced mode.
    queueMicrotask(()=>{measurementQueued=false;if(!disposed)reconcile();});
  }
  listen(window,'scroll',reconcile,{passive:true});
  listen(window,'resize',invalidate,{passive:true});
  listen(window,'load',invalidate);
  listen(window,'azimute:motion',reconcile);
  listen(window,'azimute:hero',event=>{const next=event.detail?.presence;if(!Number.isFinite(next))return;const wasOpaque=heroPresence>=.995;heroPresence=clamp(next);if(wasOpaque!==(heroPresence>=.995))reconcile();});
  listen(document,'visibilitychange',()=>{if(!document.hidden)layoutDirty=true;reconcile();});
  listen(reduced,'change',reconcile);
  const resizeObserver=typeof ResizeObserver==='function'?new ResizeObserver(invalidate):null;
  sections.forEach(section=>resizeObserver?.observe(section.element));
  const rootObserver=typeof MutationObserver==='function'?new MutationObserver(reconcile):null;
  rootObserver?.observe(root,{attributes:true,attributeFilter:['class']});
  document.fonts?.ready?.then(invalidate).catch(()=>{});
  function dispose(){
    if(disposed)return;disposed=true;stop();resizeObserver?.disconnect();rootObserver?.disconnect();
    for(const remove of removers)remove();
  }
  listen(window,'pagehide',event=>{suspended=true;stop();if(!event.persisted)dispose();});
  listen(window,'pageshow',()=>{suspended=false;layoutDirty=true;reconcile();});
  window.AZIMUTE_ATMOSPHERE=Object.freeze({getState:()=>({running:!!raf,frames,phase:time,progress,chapter:activeChapter,reduced:reduced.matches,paused:root.classList.contains('motion-paused'),hidden:document.hidden,ownScene:ownsViewport(),disposed}),dispose});
  selectTheme();motionProgress=progress;paintTheme();if(!reduced.matches)paintMotion();reconcile();
})();
