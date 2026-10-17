/* Three human moments, revealed by ordinary page scroll. Images decode before a dissolve. */
(() => {
 'use strict';
 const host=document.querySelector('#essencia');
 if(!host)return;
 const root=document.documentElement,reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const compact=matchMedia('(max-height: 519px), (max-width: 700px) and (max-height: 619px)');
 const frame=host.querySelector('.essence-frame'),panels=[...host.querySelectorAll('[data-essence-panel]')];
 const buttons=[...host.querySelectorAll('[data-essence-select]')];
 const line=host.querySelector('.essence-line'),status=host.querySelector('.essence-status');
 if(!frame||!panels.length||panels.length!==buttons.length)return;
 const lines=['A fresh perspective on what matters.','Time enough to get every detail right.','Great design happens together.'];
 let active=0,desired=0,request=0,animation=null,commitPending=null,raf=0,visible=false,disposed=false,suspended=false;
 const removers=[],decodes=new Map();
 const listen=(target,type,handler,options)=>{target.addEventListener(type,handler,options);removers.push(()=>target.removeEventListener(type,handler,options));};
 const readable=()=>!disposed&&!suspended&&!document.hidden&&!root.classList.contains('viewer-open')&&!root.classList.contains('intro-playing');
 const canMove=()=>readable()&&!reduced.matches&&!root.classList.contains('motion-paused');
 const clamp=value=>Math.max(0,Math.min(1,value));
 function settle(index,announce=false){
  active=index;
  panels.forEach((panel,i)=>{panel.style.opacity=i===index?'1':'0';panel.style.zIndex=i===index?'1':'0';panel.setAttribute('aria-hidden',String(!compact.matches&&i!==index));});
  buttons.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
  line.textContent=lines[index];
  host.dataset.portrait=String(index+1);host.removeAttribute('aria-busy');
  if(announce)status.textContent=`${buttons[index].dataset.title}. ${lines[index]}`;
 }
 function cancelTransition(){animation?.cancel();animation=null;commitPending=null;settle(active);}
 function decode(index){
  if(decodes.has(index))return decodes.get(index);
  const photo=panels[index].querySelector('img');photo.loading='eager';
  const pending=typeof photo.decode==='function'?photo.decode():Promise.resolve();
  const decoded=pending.catch(error=>{decodes.delete(index);throw error;});
  decodes.set(index,decoded);return decoded;
 }
 async function select(index,{announce=false,retry=false}={}){
  if(disposed||(!retry&&index===desired))return;
  desired=index;const token=++request;cancelTransition();
  if(index===active){if(announce)settle(index,true);return;}
  host.setAttribute('aria-busy','true');if(announce)status.textContent='';
  try{await decode(index);}catch{
   if(token===request&&!disposed){host.removeAttribute('aria-busy');if(announce)status.textContent="This portrait couldn't load. Please try again.";}
   return;
  }
  if(disposed||token!==request)return;
  const incoming=panels[index];
  const commit=()=>{if(disposed||token!==request)return;settle(index,announce);animation?.cancel();animation=null;commitPending=null;};
  if(!canMove()||!visible||compact.matches||typeof incoming.animate!=='function'){commit();return;}
  incoming.style.zIndex='2';commitPending=commit;
  animation=incoming.animate([{opacity:0},{opacity:1}],{duration:560,easing:'cubic-bezier(.25,.1,.25,1)',fill:'forwards'});
  animation.finished.then(commit).catch(()=>{});
 }
 function geometry(){
  const box=host.getBoundingClientRect(),stickyTop=parseFloat(getComputedStyle(frame).top)||0;
  const distance=Math.max(1,box.height-frame.getBoundingClientRect().height);
  return {top:box.top+(window.scrollY||0)-stickyTop,distance,progress:clamp((stickyTop-box.top)/distance)};
 }
 function paint(){
  raf=0;if(!visible||!readable()||compact.matches)return;
  const {progress}=geometry(),index=Math.min(panels.length-1,Math.floor(progress*panels.length));
  host.style.setProperty('--essence-progress',progress.toFixed(4));
  select(index);
  if(canMove())host.style.setProperty('--essence-light',`${((progress-.5)*48).toFixed(2)}px`);
 }
 function queuePaint(){if(visible&&readable()&&!compact.matches&&!raf)raf=requestAnimationFrame(paint);}
 function reconcile(){
  if(!canMove()){if(raf)cancelAnimationFrame(raf);raf=0;commitPending?.();}
  queuePaint();
 }
 function navigate(index){
  if(disposed)return;
  if(compact.matches){select(index,{announce:true,retry:true});panels[index].scrollIntoView({block:'start',behavior:canMove()?'smooth':'instant'});return;}
  const {top,distance}=geometry();
  // Seek to the centre of each portrait's reading interval. Native scrolling stays interruptible.
  window.scrollTo({top:Math.max(0,top+distance*(index+.5)/panels.length),behavior:canMove()?'smooth':'instant'});
  if(!canMove())select(index,{announce:true,retry:true});
  else if(index===desired)select(index,{announce:true,retry:true});
  queuePaint();
 }
 buttons.forEach((button,index)=>{
  listen(button,'click',()=>navigate(index));
  listen(button,'keydown',event=>{
   const next=event.key==='ArrowRight'?Math.min(buttons.length-1,index+1):event.key==='ArrowLeft'?Math.max(0,index-1):event.key==='Home'?0:event.key==='End'?buttons.length-1:null;
   if(next===null)return;event.preventDefault();buttons[next].focus({preventScroll:true});navigate(next);
  });
 });
 function updateLayout(){
  host.classList.toggle('essence-scroll',!compact.matches);cancelTransition();settle(active);queuePaint();
 }
 listen(window,'scroll',queuePaint,{passive:true});listen(window,'resize',queuePaint,{passive:true});
 listen(window,'azimute:motion',reconcile);listen(document,'visibilitychange',reconcile);listen(reduced,'change',reconcile);listen(compact,'change',updateLayout);
 const observer=new IntersectionObserver(entries=>{
  visible=entries[0].isIntersecting;
  if(visible){panels.forEach((_,index)=>decode(index).catch(()=>{}));queuePaint();}
  else{if(raf)cancelAnimationFrame(raf);raf=0;commitPending?.();}
 },{rootMargin:'400px 0px'});
 observer.observe(host);
 const rootObserver=typeof MutationObserver==='function'?new MutationObserver(reconcile):null;
 rootObserver?.observe(root,{attributes:true,attributeFilter:['class']});
 listen(window,'pagehide',event=>{
  suspended=true;if(raf)cancelAnimationFrame(raf);raf=0;commitPending?.();
  if(!event.persisted){disposed=true;request++;observer.disconnect();rootObserver?.disconnect();removers.forEach(remove=>remove());}
 });
 listen(window,'pageshow',()=>{suspended=false;reconcile();});
 settle(0);host.classList.add('essence-ready');updateLayout();
})();
