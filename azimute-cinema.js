/* A photographic descent. Scroll stays native; every scene also has direct controls. */
const chapter=document.querySelector('.architecture-chapter');
const host=chapter.querySelector('.architectural-depth'),sticky=chapter.querySelector('.architecture-sticky'),root=document.documentElement;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const tourIds=[22,16,17,15,13,8,21,24,19,3,4,23,26,31,30,29,32];
const mediaById=new Map((window.AZIMUTE_MEDIA||[]).map(item=>[item.id,item]));
let visible=false,booting=false,initialized=false,failed=false,disposed=false,currentIndex=0,refresh=()=>{},destroy=()=>{},jump=null;
const fallback=document.createElement('img');fallback.className='architecture-still';fallback.alt='';fallback.decoding='async';host.append(fallback);
const controls=document.createElement('div');controls.className='architecture-controls';controls.setAttribute('aria-label','Explore the 17 images in our portfolio');
const caption=document.createElement('div');caption.className='architecture-photo-caption';
const count=document.createElement('span');count.className='architecture-count';
const title=document.createElement('span');title.className='architecture-photo-title';caption.append(count,title);
const progress=document.createElement('progress');progress.className='architecture-progress';progress.max=tourIds.length;progress.setAttribute('aria-label','Current image in the experience');
function button(className,text,label){const element=document.createElement('button');element.type='button';element.className=className;element.textContent=text;if(label)element.setAttribute('aria-label',label);return element;}
const previous=button('architecture-step architecture-previous','←','Previous image'),next=button('architecture-step architecture-next','→','Next image');
const openPhoto=button('architecture-open-photo','Enlarge image');openPhoto.setAttribute('aria-haspopup','dialog');
const selectLabel=document.createElement('label');selectLabel.className='architecture-select-label';selectLabel.textContent='Choose image';
const select=document.createElement('select');select.className='architecture-select';select.setAttribute('aria-label','Choose one of the 17 images');
tourIds.forEach((id,index)=>{const option=document.createElement('option');option.value=String(index);option.textContent=`${String(index+1).padStart(2,'0')} · ${mediaById.get(id)?.title||'Imagem'}`;select.append(option);});selectLabel.append(select);
const skip=button('architecture-skip','Continue to the site ↓','Skip the experience and continue to the site');
const status=document.createElement('span');status.className='architecture-status';status.setAttribute('role','status');
const actions=document.createElement('div');actions.className='architecture-actions';actions.append(previous,selectLabel,next,openPhoto);
controls.append(caption,progress,actions,skip,status);sticky.append(controls);
chapter.classList.add('cinema-tour');

function syncPhotoControl(announce=false){
  const id=tourIds[currentIndex],item=mediaById.get(id),number=String(currentIndex+1).padStart(2,'0');
  count.textContent=`${number} / ${tourIds.length}`;title.textContent=item?.title||'Image unavailable';select.value=String(currentIndex);progress.value=currentIndex+1;
  progress.setAttribute('aria-valuetext',`Imagem ${currentIndex+1} de ${tourIds.length}: ${item?.title||''}`);
  previous.disabled=currentIndex===0;next.disabled=currentIndex===tourIds.length-1;openPhoto.disabled=!item;openPhoto.dataset.mediaId=String(id);
  openPhoto.setAttribute('aria-label',`Enlarge image ${currentIndex+1} of ${tourIds.length}: ${item?.title||''}`);
  if(item&&(!chapter.classList.contains('cinema-ready')||reduced.matches||failed)&&fallback.getAttribute('src')!==item.texture){fallback.src=item.texture;fallback.style.objectPosition=item.position||'center';}
  if(announce)status.textContent=`Imagem ${currentIndex+1} de ${tourIds.length}. ${item?.title||''}`;
}
function openMedia(id,origin=openPhoto){
  if(disposed||document.hidden||root.classList.contains('viewer-open')||!mediaById.has(id))return;
  window.dispatchEvent(new CustomEvent('azimute:open-media',{detail:{id,origin}}));
}
function choose(index){currentIndex=Math.max(0,Math.min(tourIds.length-1,index));syncPhotoControl(true);if(jump&&!reduced.matches&&!failed)jump(currentIndex);}
const openCurrentPhoto=()=>openMedia(tourIds[currentIndex]);
const prevPhoto=()=>choose(currentIndex-1),nextPhoto=()=>choose(currentIndex+1),selectPhoto=()=>choose(Number(select.value));
const skipTour=()=>{const destination=chapter.nextElementSibling;if(!destination)return;destination.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});const heading=destination.querySelector('h2,h3')||destination;heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});};
openPhoto.addEventListener('click',openCurrentPhoto);previous.addEventListener('click',prevPhoto);next.addEventListener('click',nextPhoto);select.addEventListener('change',selectPhoto);skip.addEventListener('click',skipTour);syncPhotoControl();
const canDisplay=()=>!document.hidden&&!reduced.matches&&!root.classList.contains('viewer-open');
const animated=()=>canDisplay()&&!root.classList.contains('motion-paused');
function reconcile(){
  if(disposed)return;const changed=chapter.classList.contains('cinema-reduced')!==reduced.matches;chapter.classList.toggle('cinema-reduced',reduced.matches);
  if(visible&&animated()&&!booting&&!initialized&&!failed)start();if(changed)syncPhotoControl();refresh();if(changed)window.ScrollTrigger?.refresh();
}
const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;reconcile();},{rootMargin:'180px'});observer.observe(chapter);
addEventListener('azimute:motion',reconcile);document.addEventListener('visibilitychange',reconcile);reduced.addEventListener('change',reconcile);

async function start(){
  booting=true;
  const resources=new Set(),cleanups=[],pending=new Map();let dead=false,renderer,raf=0,stats;
  const own=resource=>{if(dead)resource.dispose();else resources.add(resource);return resource;};
  const release=resource=>{if(resource){resource.dispose();resources.delete(resource);}};
  function dispose(){
    if(dead)return;dead=true;if(raf)cancelAnimationFrame(raf);raf=0;pending.forEach(cancel=>cancel());pending.clear();
    cleanups.splice(0).forEach(fn=>fn());resources.forEach(resource=>resource.dispose());resources.clear();
    if(renderer){renderer.dispose();renderer.domElement.remove();}if(stats)stats.active=false;refresh=()=>{};jump=null;
  }
  destroy=dispose;
  try{
    if(!window.ScrollTrigger)throw Error('Scroll unavailable');
    const [T,{RoomEnvironment},S]=await Promise.all([import('./vendor/three.module.min.js'),import('./vendor/RoomEnvironment.js'),import('./azimute-sculpture.js')]);
    if(dead||disposed||!visible||!animated()){booting=false;dispose();return;}
    renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.setClearColor(0x181c1c);renderer.transmissionResolutionScale=.55;
    const canvas=renderer.domElement;canvas.className='cinema-canvas';canvas.setAttribute('aria-hidden','true');host.append(canvas);
    const scene=new T.Scene(),camera=new T.PerspectiveCamera(42,1,.1,110);scene.fog=new T.Fog(0x181c1c,36,80);
    const room=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer);try{scene.environment=own(pmrem.fromScene(room,.055)).texture;}finally{room.dispose();pmrem.dispose();}
    const backdrop=S.makeBackdrop(own);scene.add(backdrop);
    scene.add(new T.HemisphereLight(0xe5e8df,0x3d2d21,2.4));
    const key=new T.DirectionalLight(0xffd7a9,4.2);key.position.set(-6,9,10);scene.add(key);
    const rim=new T.DirectionalLight(0xd4e2e9,3.5);rim.position.set(7,2,-5);scene.add(rim);
    const light=new T.PointLight(0xffc48a,115,23,2);scene.add(light);
    const sculpture=S.createSculpture(new Map(),own);scene.add(sculpture.group);
    const loader=new T.TextureLoader(),textureRecords=new Map(),unavailable=new Set();let inflight=0,textureCenter=0;
    stats={frames:0,active:false,photographs:S.PHOTOGRAPHS.length,quality:1,averageFrameMs:0,p95FrameMs:0,longFrames:0,drawingBufferPixels:0,residentTextures:0,residentPhotoBytes:0,inflightTextures:0,highResolutionTextures:0,currentPhotoId:tourIds[0],currentPhotoIndex:0,progress:0};window.AZIMUTE_CINEMA_STATS=stats;
    const active=()=>visible&&canDisplay()&&!dead;
    let last=0,elapsed=0,phase=0,drawPhase=0,drawn=false,quality=1,samples=[],lastWidth=0,lastHeight=0;
    const pointer={x:0,y:0},target={x:0,y:0};
    function loadTexture(url){
      return new Promise((resolve,reject)=>{
        let settled=false;const token={};
        const fail=()=>{if(settled)return;settled=true;clearTimeout(timeout);pending.delete(token);reject(Error('Texture unavailable'));};
        const timeout=setTimeout(fail,8500);pending.set(token,fail);
        loader.load(url,texture=>{if(settled||dead){texture.dispose();return;}settled=true;clearTimeout(timeout);pending.delete(token);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());resolve(own(texture));},undefined,fail);
      });
    }
    const recordFor=id=>{if(!textureRecords.has(id))textureRecords.set(id,{});return textureRecords.get(id);};
    function updateTextureStats(){
      const textures=[...textureRecords.values()].flatMap(record=>Object.values(record));stats.residentTextures=textures.length;stats.highResolutionTextures=[...textureRecords.values()].filter(record=>record.high||record.native).length;
      stats.residentPhotoBytes=textures.reduce((sum,texture)=>sum+texture.image.width*texture.image.height*4*4/3,0);stats.inflightTextures=inflight;
    }
    function refreshResidency(){
      textureRecords.forEach((record,id)=>{
        const distance=Math.abs(tourIds.indexOf(id)-textureCenter);
        if(record.native&&distance>0){release(record.native);delete record.native;}
        if(record.high&&distance>2){release(record.high);delete record.high;}
        sculpture.setTexture(id,record.native||record.high||record.low||null);
      });updateTextureStats();
    }
    function requests(){
      const order=[0,1,-1,2,-2,3,-3,4,-4].map(offset=>textureCenter+offset).filter(index=>index>=0&&index<tourIds.length),list=[];
      for(const index of order){const id=tourIds[index],item=mediaById.get(id);if(item)list.push({id,kind:'low',url:item.thumbnail});}
      if(innerWidth>700){
        for(const index of order.filter(index=>Math.abs(index-textureCenter)<=2)){
          const id=tourIds[index],item=mediaById.get(id);if(!item)continue;
          const native=index===textureCenter&&item.width<2000&&host.clientWidth*.74*renderer.getPixelRatio()>1350;
          const job={id,kind:native?'native':'high',url:native?item.src:item.texture};if(index===textureCenter)list.splice(2,0,job);else list.push(job);
        }
      }
      return list;
    }
    const loading=new Set();
    function pumpTextures(){
      if(dead||!visible||document.hidden||root.classList.contains('viewer-open'))return;
      while(inflight<3){
        const job=requests().find(job=>!recordFor(job.id)[job.kind]&&!loading.has(`${job.id}:${job.kind}`)&&!unavailable.has(`${job.id}:${job.kind}`));if(!job)break;
        const key=`${job.id}:${job.kind}`;inflight++;loading.add(key);updateTextureStats();
        loadTexture(job.url).then(texture=>{
          if(dead)return;
          const distance=Math.abs(tourIds.indexOf(job.id)-textureCenter);
          if((job.kind==='native'&&distance>0)||(job.kind==='high'&&distance>2)){release(texture);return;}
          const record=recordFor(job.id);record[job.kind]=texture;sculpture.setTexture(job.id,record.native||record.high||record.low);requestDraw();
        }).catch(()=>{unavailable.add(key);}).finally(()=>{inflight--;loading.delete(key);if(!dead){updateTextureStats();pumpTextures();}});
      }
    }
    loadTexture('assets/crystal/azimute-crystal-universe.webp').then(texture=>{if(dead)return;backdrop.material.uniforms.uTexture.value=texture;backdrop.material.uniforms.uHasTexture.value=1;backdrop.material.uniforms.uImageAspect.value=texture.image.width/texture.image.height;requestDraw();}).catch(()=>{});

    function resize(){
      if(dead)return;const box=host.getBoundingClientRect(),width=Math.max(1,Math.round(box.width)),height=Math.max(1,Math.round(box.height));
      if(width===lastWidth&&height===lastHeight)return;lastWidth=width;lastHeight=height;
      const budget=innerWidth<=700?1600000:3400000,dpr=Math.min(devicePixelRatio,1.75,Math.sqrt(budget/(width*height)))*quality;
      renderer.setPixelRatio(dpr);renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();stats.drawingBufferPixels=canvas.width*canvas.height;backdrop.material.uniforms.uAspect.value=camera.aspect;
    }
    function render(now){
      raf=0;if(!active()){stats.active=false;return;}
      const isAnimated=animated(),raw=last?now-last:16.667,dt=Math.min(raw,64)/1000;last=now;if(isAnimated)elapsed+=dt;
      drawPhase=isAnimated?drawPhase+(phase-drawPhase)*S.damping(9,dt):phase;
      pointer.x+=(target.x-pointer.x)*S.damping(2.7,dt);pointer.y+=(target.y-pointer.y)*S.damping(2.7,dt);
      const pose=S.cameraPose(drawPhase,innerWidth<=700,camera.aspect),index=Math.max(0,Math.min(tourIds.length-1,Math.round(pose.index)));
      if(currentIndex!==index){currentIndex=index;syncPhotoControl();}
      if(textureCenter!==index){textureCenter=index;refreshResidency();pumpTextures();}
      chapter.style.setProperty('--sculpture-expansion',pose.expansion.toFixed(4));
      chapter.style.setProperty('--sculpture-copy',pose.copyOpacity.toFixed(3));chapter.style.setProperty('--sculpture-copy-y',`${(-S.smooth(0,.065,drawPhase)*24).toFixed(2)}px`);
      // The reveal mask expands over a full-size canvas, avoiding GPU target reallocation on scroll.
      resize();
      const actualPose=S.cameraPose(drawPhase,innerWidth<=700,camera.aspect);
      sculpture.group.rotation.y=actualPose.rotation+Math.sin(elapsed*.11)*.009;sculpture.group.position.x=actualPose.x;
      camera.position.set(pointer.x*.24,actualPose.y+pointer.y*.16,actualPose.z);camera.lookAt(actualPose.lookX,actualPose.lookY,0);
      light.position.set(actualPose.x+4.1*Math.sin(elapsed*.16+.8),actualPose.y+2.5,8.5+Math.cos(elapsed*.12));
      backdrop.material.uniforms.uTime.value=elapsed;backdrop.material.uniforms.uProgress.value=drawPhase;backdrop.material.uniforms.uPointer.value.set(pointer.x,pointer.y);
      renderer.render(scene,camera);stats.frames++;stats.active=isAnimated;stats.currentPhotoId=tourIds[index];stats.currentPhotoIndex=index;stats.progress=drawPhase;
      if(stats.frames>20&&isAnimated){samples.push(raw);if(samples.length>180)samples.shift();if(raw>50)stats.longFrames++;}
      if(stats.frames%90===0&&samples.length){const sorted=[...samples].sort((a,b)=>a-b);stats.p95FrameMs=sorted[Math.floor((sorted.length-1)*.95)];stats.averageFrameMs=samples.reduce((sum,x)=>sum+x,0)/samples.length;if(stats.frames>=270&&stats.averageFrameMs>30&&quality>.8){quality=.8;stats.quality=quality;lastWidth=0;resize();}}
      if(stats.frames===1||stats.frames%90===0||!isAnimated)Object.assign(canvas.dataset,{renderQuality:String(stats.quality),renderFrames:String(stats.frames),renderActive:String(stats.active),residentTextures:String(stats.residentTextures),residentPhotoBytes:String(Math.round(stats.residentPhotoBytes)),highResolutionTextures:String(stats.highResolutionTextures),inflightTextures:String(stats.inflightTextures),averageFrameMs:stats.averageFrameMs.toFixed(2),p95FrameMs:stats.p95FrameMs.toFixed(2),currentPhotoId:String(stats.currentPhotoId),currentPhotoIndex:String(stats.currentPhotoIndex),tourProgress:stats.progress.toFixed(5),drawingBufferPixels:String(stats.drawingBufferPixels),photographs:String(stats.photographs)});
      const central=recordFor(tourIds[index]);if(!drawn&&(central.low||central.high||central.native)){drawn=true;chapter.classList.add('cinema-ready');}
      if(isAnimated)raf=requestAnimationFrame(render);
    }
    function requestDraw(){if(active()&&!raf){last=0;raf=requestAnimationFrame(render);}}
    const ro=new ResizeObserver(()=>{resize();requestDraw();});ro.observe(host);cleanups.push(()=>ro.disconnect());resize();
    const chapterStart=()=>chapter.getBoundingClientRect().top+(document.scrollingElement?.scrollTop||scrollY);
    const trigger=ScrollTrigger.create({trigger:chapter,start:chapterStart,end:()=>chapterStart()+Math.max(1,chapter.offsetHeight-innerHeight),onUpdate:self=>{phase=self.progress;requestDraw();},onRefresh:self=>{phase=self.progress;requestDraw();}});phase=drawPhase=trigger.progress;textureCenter=Math.round(S.tourIndex(phase));currentIndex=textureCenter;syncPhotoControl();cleanups.push(()=>trigger.kill());
    jump=index=>{const progress=S.progressForPhoto(index);window.scrollTo({top:trigger.start+(trigger.end-trigger.start)*progress,behavior:root.classList.contains('motion-paused')?'instant':'smooth'});};

    const raycaster=new T.Raycaster(),pickPoint=new T.Vector2();let gesture=null;
    const canPick=()=>drawn&&active()&&!disposed;
    const pickPhoto=(clientX,clientY)=>{
      if(!canPick())return null;const box=canvas.getBoundingClientRect();if(!box.width||!box.height||clientX<box.left||clientX>box.right||clientY<box.top||clientY>box.bottom)return null;
      pickPoint.set((clientX-box.left)/box.width*2-1,1-(clientY-box.top)/box.height*2);scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);raycaster.setFromCamera(pickPoint,camera);
      for(const hit of raycaster.intersectObjects(sculpture.cards,true)){let card=hit.object;while(card&&card.userData.mediaId===undefined)card=card.parent;if(card&&mediaById.has(card.userData.mediaId))return card.userData.mediaId;}return null;
    };
    const pointerDown=event=>{if(!canPick()||event.isPrimary===false||event.button!==0){gesture=null;return;}gesture={id:event.pointerId,x:event.clientX,y:event.clientY,scrollY};};
    const pointerCancel=()=>{gesture=null;};
    const pointerDrag=event=>{if(gesture&&event.pointerId===gesture.id&&Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>9)gesture=null;};
    const pointerUp=event=>{const start=gesture;gesture=null;if(!start||event.pointerId!==start.id||Math.hypot(event.clientX-start.x,event.clientY-start.y)>9||Math.abs(scrollY-start.scrollY)>5)return;const id=pickPhoto(event.clientX,event.clientY);if(id!==null)openMedia(id);};
    canvas.style.cursor='pointer';canvas.style.pointerEvents='auto';canvas.addEventListener('pointerdown',pointerDown,{passive:true});canvas.addEventListener('pointermove',pointerDrag,{passive:true});canvas.addEventListener('pointerup',pointerUp,{passive:true});canvas.addEventListener('pointercancel',pointerCancel);canvas.addEventListener('pointerleave',pointerCancel);
    cleanups.push(()=>{gesture=null;canvas.removeEventListener('pointerdown',pointerDown);canvas.removeEventListener('pointermove',pointerDrag);canvas.removeEventListener('pointerup',pointerUp);canvas.removeEventListener('pointercancel',pointerCancel);canvas.removeEventListener('pointerleave',pointerCancel);});
    const move=event=>{if(event.pointerType==='touch'||!animated())return;const box=host.getBoundingClientRect();target.x=Math.max(-.5,Math.min(.5,(event.clientX-box.left)/box.width-.5));target.y=Math.max(-.5,Math.min(.5,.5-(event.clientY-box.top)/box.height));};
    const leave=()=>{target.x=target.y=0;};chapter.addEventListener('pointermove',move,{passive:true});chapter.addEventListener('pointerleave',leave);cleanups.push(()=>{chapter.removeEventListener('pointermove',move);chapter.removeEventListener('pointerleave',leave);});
    refresh=()=>{if(active()){unavailable.clear();pumpTextures();requestDraw();}else if(raf){cancelAnimationFrame(raf);raf=0;stats.active=false;canvas.dataset.renderActive='false';}};
    const contextLost=event=>{event.preventDefault();failed=true;chapter.classList.remove('cinema-ready');chapter.classList.add('cinema-fallback');syncPhotoControl();dispose();ScrollTrigger.refresh();};canvas.addEventListener('webglcontextlost',contextLost,{once:true});cleanups.push(()=>canvas.removeEventListener('webglcontextlost',contextLost));
    initialized=true;booting=false;syncPhotoControl();pumpTextures();refresh();
  }catch(error){failed=true;booting=false;dispose();chapter.classList.remove('cinema-ready');chapter.classList.add('cinema-fallback');syncPhotoControl();window.ScrollTrigger?.refresh();console.info('All images remain available in the controls.');}
}
function pageHide(event){
  if(event.persisted){visible=false;refresh();return;}disposed=true;observer.disconnect();destroy();controls.remove();fallback.remove();
  removeEventListener('azimute:motion',reconcile);document.removeEventListener('visibilitychange',reconcile);reduced.removeEventListener('change',reconcile);removeEventListener('pagehide',pageHide);removeEventListener('pageshow',pageShow);
}
function pageShow(event){if(event.persisted&&!disposed){const box=chapter.getBoundingClientRect();visible=box.top<innerHeight&&box.bottom>0;reconcile();}}
addEventListener('pagehide',pageHide);addEventListener('pageshow',pageShow);reconcile();
