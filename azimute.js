(() => {
  'use strict';
  const root=document.documentElement, reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const motionButton=document.querySelector('.motion-toggle'), header=document.querySelector('.header');
  let introTimeline, heroTimeline, paused=reduced.matches, introStarted=false, introSettled=!!window.azimuteIntroExpired, introActive=false, introSafety;
  let revealTweens=[],photoTweens=[];
  let nightReady=false;
  const heroState={presence:1,night:0};
  function publishHero(){window.AZIMUTE_HERO_PRESENCE=heroState.presence;window.AZIMUTE_HERO_NIGHT=heroState.night;root.style.setProperty('--hero-presence',heroState.presence);root.style.setProperty('--hero-night',nightReady?heroState.night:0);window.dispatchEvent(new CustomEvent('azimute:hero',{detail:{...heroState}}));}
  document.querySelector('.hero__image--night').decode().then(()=>{nightReady=true;publishHero();}).catch(()=>{});
  publishHero();
  const hasGsap=!!window.gsap, hasScroll=hasGsap&&!!window.ScrollTrigger;
  function setIntroInert(value){document.querySelectorAll('header,footer,.motion-toggle').forEach(el=>{el.inert=value;});document.querySelectorAll('main>*').forEach(el=>{el.inert=value;});}
  function finishIntro(){
    const wasActive=introActive;introSettled=true;introActive=false;clearTimeout(introSafety);introTimeline?.kill();
    root.classList.remove('intro-playing');root.classList.add('intro-done');
    setIntroInert(false);
    if(wasActive&&hasGsap){gsap.set(['.hero__image','.hero__content','.header','.hero__scroll'],{clearProps:'opacity,visibility,transform'});heroState.presence=1;publishHero();heroTimeline?.scrollTrigger?.refresh();heroTimeline?.progress(heroTimeline.scrollTrigger.progress);}
  }
  window.azimuteFinishIntro=finishIntro;
  function startIntro(force=false){
    if(!force&&(introStarted||introSettled||window.azimuteIntroExpired))return;introStarted=true;
    if(!force&&location.hash&&location.hash!=='#inicio'){
      finishIntro();document.fonts.ready.then(()=>requestAnimationFrame(()=>document.getElementById(location.hash.slice(1))?.scrollIntoView({behavior:'instant',block:'start'})));return;
    }
    if(!hasGsap||reduced.matches||paused){finishIntro();return;}
    introActive=true;introSettled=false;introSafety=setTimeout(finishIntro,4200);
    root.classList.remove('intro-done','intro-safe');root.classList.add('intro-playing');
    setIntroInert(true);
    gsap.set('.entrance__surface',{opacity:1,clipPath:'inset(0% 0% 0% 0%)'});gsap.set('.entrance__light',{opacity:0,xPercent:-100});gsap.set('.entrance__identity',{opacity:1,y:0});
    heroState.presence=0;heroState.night=0;publishHero();gsap.set(['.hero__content','.header','.hero__scroll'],{opacity:0});
    introTimeline=gsap.timeline({onComplete:()=>{introActive=false;introSettled=true;clearTimeout(introSafety);setIntroInert(false);root.classList.remove('intro-playing');root.classList.add('intro-done');}})
      .fromTo('.brand-stroke',{strokeDasharray:1,strokeDashoffset:1},{strokeDashoffset:0,duration:1.2,ease:'power2.inOut'})
      .fromTo('.brand-orbit',{strokeDasharray:1,strokeDashoffset:1},{strokeDashoffset:0,duration:1.1,ease:'power2.out'},.2)
      .fromTo('.brand-material',{opacity:0},{opacity:1,duration:.9},.3)
      .fromTo('.brand-bearing',{opacity:0,y:12},{opacity:1,y:0,duration:.8,ease:'power3.out'},.55)
      .fromTo('.entrance__name',{opacity:0,y:12,clipPath:'inset(0 100% 0 0)'},{opacity:1,y:0,clipPath:'inset(0 0% 0 0)',duration:1,ease:'power3.out'},.55)
      .to('.entrance__light',{opacity:.8,xPercent:150,duration:2.1,ease:'sine.inOut'},.3)
      .to('.entrance__identity',{y:-18,opacity:0,duration:.5},1.9)
      .to('.entrance__surface',{clipPath:'inset(0% 0% 100% 0%)',duration:1.25,ease:'power4.inOut'},2.05)
      .to('.entrance__light',{opacity:0,duration:.3},2.15)
      .to(heroState,{presence:1,duration:1.25,ease:'power2.inOut',onUpdate:publishHero},2.1)
      .to('.header',{opacity:1,duration:.7},2.35)
      .fromTo('.hero__content',{y:24,opacity:0},{y:0,opacity:1,duration:1,ease:'power3.out'},2.45)
      .to('.hero__scroll',{opacity:1,duration:.5},2.85);
  }
  document.querySelector('.skip-intro').addEventListener('click',finishIntro);
  document.querySelector('.skip-link').addEventListener('click',finishIntro);
  document.querySelector('.replay').addEventListener('click',()=>{finishIntro();window.scrollTo({top:0,behavior:'instant'});history.replaceState(null,'',location.pathname+location.search+'#inicio');heroTimeline?.progress(0);if(hasScroll)ScrollTrigger.update();startIntro(true);document.querySelector('.skip-intro').focus({preventScroll:true});});
  const menuButton=document.querySelector('.menu-toggle'),menu=document.querySelector('.mobile-menu');
  function closeMenu(){menu.hidden=true;menuButton.setAttribute('aria-expanded','false');menuButton.setAttribute('aria-label','Open menu');updateHeader();}
  menuButton.addEventListener('click',()=>{const open=menuButton.getAttribute('aria-expanded')!=='true';menu.hidden=!open;menuButton.setAttribute('aria-expanded',String(open));menuButton.setAttribute('aria-label',open?'Close menu':'Open menu');if(open)header.classList.add('is-solid');else updateHeader();});
  menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(introActive||!introSettled)finishIntro();const wasOpen=!menu.hidden;closeMenu();if(wasOpen)menuButton.focus();}});
  function updateHeader(){
    const solid=window.scrollY>document.querySelector('.hero').offsetHeight-90||!menu.hidden;
    header.classList.toggle('is-solid',solid);
    const deep=[...document.querySelectorAll('.architecture-chapter,.outdoor,.footer')].some(section=>{const b=section.getBoundingClientRect();return b.top<80&&b.bottom>80;});
    header.classList.toggle('is-deep',solid&&deep&&menu.hidden);
    let active='';document.querySelectorAll('main>section[id],footer[id]').forEach(section=>{if(section.getBoundingClientRect().top<innerHeight*.35)active=section.id;});
    document.querySelectorAll('.nav a,.mobile-menu a').forEach(a=>{if(a.hash==='#'+active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});
    root.style.setProperty('--page-progress',Math.min(1,window.scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight)));
  }
  let ticking=false;
  window.addEventListener('scroll',()=>{if(ticking)return;ticking=true;requestAnimationFrame(()=>{updateHeader();ticking=false;})},{passive:true});
  function configureMotion(){
    heroTimeline?.scrollTrigger?.kill();heroTimeline?.kill();
    if(hasGsap)gsap.set(['.hero__image-frame','.hero__content','.hero__scroll','.hero__side','.hero__reframe'],{clearProps:'all'});
    const enabled=hasScroll&&!reduced.matches;
    root.classList.toggle('motion-paused',paused||reduced.matches);root.classList.toggle('scroll-motion',enabled);document.querySelector('.hero__content').inert=false;
    motionButton.setAttribute('aria-pressed',String(paused));motionButton.setAttribute('aria-label',paused?'Enable animations':'Reduce animations');motionButton.querySelector('.motion-icon').textContent=paused?'▷':'Ⅱ';
    window.dispatchEvent(new Event('azimute:motion'));
    if(!hasScroll||reduced.matches){heroState.presence=1;heroState.night=0;publishHero();return;}
    gsap.registerPlugin(ScrollTrigger);

    heroTimeline=gsap.timeline({scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom bottom',scrub:paused?true:.65,invalidateOnRefresh:true},onUpdate:()=>{const content=document.querySelector('.hero__content');const hide=Number(gsap.getProperty(content,'opacity'))<.08;content.inert=hide;}})
      .to('.hero__content',{y:-50,opacity:0,ease:'none',duration:.24},.15)
      .to(['.hero__side','.hero__scroll'],{opacity:0,duration:.2},0)
      .fromTo(heroState,{night:0},{night:1,duration:.39,ease:'sine.inOut',onUpdate:publishHero},.04)
      .fromTo(heroState,{presence:1},{presence:0,duration:.34,ease:'sine.inOut',onUpdate:publishHero},.66)
      .to('.hero__reframe',{opacity:1,duration:.17},.82);
  }
  function configureReveals(){
    revealTweens.forEach(tween=>{tween.scrollTrigger?.kill();tween.revert();});revealTweens=[];
    photoTweens.forEach(tween=>{tween.scrollTrigger?.kill();tween.revert();});photoTweens=[];
    if(hasScroll&&!reduced.matches&&!paused){gsap.registerPlugin(ScrollTrigger);document.querySelectorAll('.reveal').forEach(el=>{if(el.getBoundingClientRect().top<innerHeight*.92)return;revealTweens.push(gsap.from(el,{opacity:0,y:32,duration:1.25,ease:'power2.out',scrollTrigger:{trigger:el,start:'top 94%',once:true}}));});}
    if(hasScroll&&!reduced.matches&&!paused){document.querySelectorAll('.editorial-photo .photo-band img').forEach(image=>photoTweens.push(gsap.fromTo(image,{scale:1.055,yPercent:-2},{scale:1.055,yPercent:2,ease:'none',scrollTrigger:{trigger:image.parentElement,start:'top bottom',end:'bottom top',scrub:.7}})));}
  }
  motionButton.addEventListener('click',()=>{
    paused=!paused;root.classList.toggle('motion-paused',paused);
    motionButton.setAttribute('aria-pressed',String(paused));motionButton.setAttribute('aria-label',paused?'Enable animations':'Reduce animations');motionButton.querySelector('.motion-icon').textContent=paused?'▷':'Ⅱ';
    // Pausing ambient movement must not change document height or the reading position.
    if(heroTimeline?.scrollTrigger){const scrub=heroTimeline.scrollTrigger.getTween();if(scrub){scrub.duration(paused?0:.65);if(paused)scrub.progress(1);else scrub.resume();}}
    configureReveals();window.dispatchEvent(new Event('azimute:motion'));
  });
  reduced.addEventListener('change',()=>{paused=reduced.matches;if(introActive)finishIntro();configureMotion();configureReveals();if(hasScroll)ScrollTrigger.refresh();});
  let sizeTimer,lastWidth=innerWidth;addEventListener('resize',()=>{clearTimeout(sizeTimer);sizeTimer=setTimeout(()=>{if(innerWidth>1000)closeMenu();if(Math.abs(innerWidth-lastWidth)>2){lastWidth=innerWidth;configureMotion();}updateHeader();},220);});
  configureReveals();
  configureMotion();updateHeader();
  const hero=document.querySelector('.hero__image');Promise.race([hero.decode().catch(()=>{}),new Promise(resolve=>setTimeout(resolve,900))]).then(()=>startIntro());
  root.classList.add('navigation-ready');
  const gallery=document.querySelector('.gallery'),galleryImage=document.querySelector('#gallery-image'),allItems=window.AZIMUTE_MEDIA||[];
  const selection=allItems.map(item=>item.id),portraitView=matchMedia('(max-width:700px)');
  function categoryItems(category){return category==='selection'?selection.map(id=>allItems.find(item=>item.id===id)).filter(Boolean):allItems.filter(item=>item.category===category);}
  function assignPhoto(image,item,portrait=false,sizes='100vw'){
    const srcset=portrait?item.portraitSrcset:item.srcset;
    image.sizes=sizes;if(srcset)image.srcset=srcset;else image.removeAttribute('srcset');
    image.src=portrait?item.portrait:item.src;
  }
  let items=categoryItems('selection'),galleryIndex=0,requestedIndex=0,galleryRequest=0,currentGalleryItem=items[0];
  let autoPlay=false,autoTimer,stageVisible=false,hovered=false,pending=null,playFocusIntent=false,playPointerState=null;
  let committedItems=items,committedCategory='selection',requestedCategory='selection';
  const categoryButtons=category=>document.querySelectorAll('[data-category]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.category===category)));
  const playButton=document.querySelector('.gallery-play'),viewer=document.querySelector('.photo-viewer');
  const incomingLayer=document.createElement('img');
  incomingLayer.className='gallery-incoming';incomingLayer.alt='';incomingLayer.setAttribute('aria-hidden','true');incomingLayer.width=1280;incomingLayer.height=721;
  incomingLayer.style.opacity='0';incomingLayer.style.visibility='hidden';incomingLayer.style.pointerEvents='none';
  document.querySelector('.gallery__stage').append(incomingLayer);
  function updatePlay(){playButton.setAttribute('aria-pressed',String(autoPlay));playButton.setAttribute('aria-label',autoPlay?'Pause image sequence':'Play image sequence');playButton.firstElementChild.textContent=autoPlay?'Ⅱ':'▷';}
  function canPlay(){return autoPlay&&!paused&&!reduced.matches&&!document.hidden&&stageVisible&&!hovered&&!viewer.open&&(!gallery.contains(document.activeElement)||document.activeElement===playButton&&playFocusIntent);}
  function canAnimatePhoto(){return hasGsap&&!paused&&!reduced.matches&&!document.hidden&&!viewer.open;}
  function restorePhoto(){
    if(hasGsap){gsap.killTweensOf(incomingLayer);gsap.killTweensOf(galleryImage);gsap.set(incomingLayer,{clearProps:'transform'});gsap.set(galleryImage,{clearProps:'filter,transform'});}
    galleryImage.style.opacity='1';incomingLayer.style.opacity='0';incomingLayer.style.visibility='hidden';gallery.classList.remove('is-transitioning');
  }
  function cancelPending(){galleryRequest++;items=committedItems;requestedCategory=committedCategory;categoryButtons(committedCategory);requestedIndex=galleryIndex;pending=null;gallery.removeAttribute('aria-busy');restorePhoto();}
  function scheduleAuto(){clearTimeout(autoTimer);gallery.classList.remove('is-playing');if(!canPlay()){if(pending&&!pending.manual)cancelPending();return;}if(pending)return;gallery.classList.add('is-playing');autoTimer=setTimeout(()=>changeImage(1,false),6500);}
  function stopAuto(){autoPlay=false;updatePlay();scheduleAuto();}
  function commitImage(item,index){assignPhoto(galleryImage,item,portraitView.matches);galleryImage.alt=item.alt;galleryImage.dataset.mediaId=String(item.id);galleryImage.style.objectPosition=portraitView.matches?'50% 50%':item.position||'50% 50%';gallery.classList.toggle('is-plan',item.category==='plans');galleryIndex=index;currentGalleryItem=item;committedItems=items;committedCategory=requestedCategory;categoryButtons(committedCategory);document.querySelector('#gallery-title').textContent=item.title;document.querySelector('.gallery__count').textContent=`${String(index+1).padStart(2,'0')} / ${String(items.length).padStart(2,'0')}`;document.querySelector('.gallery__status').textContent='';gallery.removeAttribute('aria-busy');}
  function finishPhoto(request){
    if(!pending||pending.request!==request||request!==galleryRequest)return;
    const ready=pending;pending=null;commitImage(ready.item,ready.index);restorePhoto();scheduleAuto();
  }
  async function changeImage(direction,manual=true,absolute=false){
    if(!items.length)return;if(manual)stopAuto();restorePhoto();clearTimeout(autoTimer);gallery.classList.remove('is-playing');
    requestedIndex=absolute?0:(requestedIndex+direction+items.length)%items.length;
    const index=requestedIndex,item=items[index],request=++galleryRequest;
    pending={request,manual,item,index,ready:false};
    document.querySelector('.gallery__title').setAttribute('aria-live',manual?'polite':'off');gallery.setAttribute('aria-busy','true');
    const incoming=new Image();assignPhoto(incoming,item,portraitView.matches);
    try{await incoming.decode();if(request!==galleryRequest)return;if(!manual&&!canPlay()){cancelPending();return;}pending.ready=true;
      if(canAnimatePhoto()){
        assignPhoto(incomingLayer,item,portraitView.matches);incomingLayer.style.objectPosition=portraitView.matches?'50% 50%':item.position||'50% 50%';incomingLayer.style.objectFit=item.category==='plans'?'contain':'cover';
        incomingLayer.style.backgroundColor=item.category==='plans'?'#f8f8f6':'#171715';incomingLayer.style.visibility='visible';gallery.classList.add('is-transitioning');
        // The current photo remains opaque until the decoded layer fully covers it.
        gsap.fromTo(incomingLayer,{opacity:0},{opacity:1,duration:.72,ease:'sine.inOut',onComplete:()=>finishPhoto(request)});
      }else finishPhoto(request);
    }catch{if(request!==galleryRequest)return;cancelPending();document.querySelector('.gallery__status').textContent="This image couldn't be opened. Try the next one.";scheduleAuto();}
  }
  if(items.length)commitImage(items[0],0);
  document.querySelectorAll('[data-category]').forEach(button=>button.addEventListener('click',()=>{const selected=categoryItems(button.dataset.category);if(!selected.length)return;stopAuto();items=selected;requestedCategory=button.dataset.category;changeImage(0,true,true);}));
  portraitView.addEventListener('change',()=>{cancelPending();commitImage(currentGalleryItem,galleryIndex);});
  document.querySelector('.gallery-prev').addEventListener('click',()=>changeImage(-1));document.querySelector('.gallery-next').addEventListener('click',()=>changeImage(1));
  playButton.addEventListener('pointerdown',()=>{playPointerState=autoPlay;});
  playButton.addEventListener('pointercancel',()=>{playPointerState=null;});
  playButton.addEventListener('click',()=>{autoPlay=!(playPointerState??autoPlay);playPointerState=null;playFocusIntent=autoPlay;updatePlay();scheduleAuto();});
  gallery.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){e.preventDefault();changeImage(-1)}if(e.key==='ArrowRight'){e.preventDefault();changeImage(1)}});
  let touchStart;galleryImage.addEventListener('touchstart',e=>{stopAuto();touchStart={x:e.changedTouches[0].clientX,y:e.changedTouches[0].clientY}},{passive:true});galleryImage.addEventListener('touchend',e=>{if(!touchStart)return;const dx=e.changedTouches[0].clientX-touchStart.x,dy=e.changedTouches[0].clientY-touchStart.y;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.6)changeImage(dx<0?1:-1);touchStart=null;},{passive:true});
  gallery.addEventListener('pointerenter',()=>{hovered=true;scheduleAuto();});gallery.addEventListener('pointerleave',()=>{hovered=false;scheduleAuto();});
  gallery.addEventListener('focusin',()=>{playFocusIntent=false;stopAuto();});gallery.addEventListener('focusout',()=>setTimeout(scheduleAuto,0));
  new IntersectionObserver(entries=>{stageVisible=entries[0].isIntersecting&&entries[0].intersectionRatio>=.6;scheduleAuto();},{threshold:.6}).observe(document.querySelector('.gallery__stage'));
  let viewerOrigin,viewerItem,viewerRequest=0;
  const viewerImage=viewer.querySelector('img'),landscapeButton=viewer.querySelector('.viewer-landscape'),portraitButton=viewer.querySelector('.viewer-portrait'),viewerNote=viewer.querySelector('.photo-viewer__note');
  const viewerNoteText=viewerNote?.textContent||'Representative imagery. For illustration purposes only.';
  async function showViewerOrientation(portrait){
    if(!viewer.open||!viewerItem||portrait&&!viewerItem.portrait)return;
    const item=viewerItem,request=++viewerRequest,decoded=new Image();assignPhoto(decoded,item,portrait,'94vw');viewer.setAttribute('aria-busy','true');
    try{await decoded.decode();if(request!==viewerRequest||!viewer.open)return;
      assignPhoto(viewerImage,item,portrait,'94vw');viewerImage.alt=item.alt;viewer.classList.toggle('is-portrait',portrait);
      landscapeButton?.setAttribute('aria-pressed',String(!portrait));portraitButton?.setAttribute('aria-pressed',String(portrait));
      viewer.removeAttribute('aria-busy');if(viewerNote)viewerNote.textContent=viewerNoteText;
    }catch{if(request!==viewerRequest||!viewer.open)return;viewer.removeAttribute('aria-busy');if(viewerNote)viewerNote.textContent="This format couldn't be opened. The previous image is still available.";}
  }
  landscapeButton?.addEventListener('click',()=>showViewerOrientation(false));portraitButton?.addEventListener('click',()=>showViewerOrientation(true));
  function openPhotoViewer(item,origin,source,alt,portrait=false){
    if(viewer.open)return;
    viewerItem=item;viewerOrigin=origin;
    viewerImage.removeAttribute('srcset');viewerImage.src=source;viewerImage.alt=alt;
    const hasPortrait=!!viewerItem?.portrait;if(landscapeButton){landscapeButton.hidden=!hasPortrait;landscapeButton.setAttribute('aria-pressed','true');}if(portraitButton){portraitButton.hidden=!hasPortrait;portraitButton.setAttribute('aria-pressed','false');}
    viewer.classList.remove('is-portrait');if(viewerNote)viewerNote.textContent=viewerNoteText;
    document.querySelector('#viewer-title').textContent=viewerItem?.title||'Representative imagery';viewer.showModal();root.classList.add('viewer-open');scheduleAuto();window.dispatchEvent(new Event('azimute:motion'));showViewerOrientation(portrait);
  }
  document.querySelectorAll('.photo-open').forEach(button=>button.addEventListener('click',()=>{
    // Settle only an explicit, already decoded request before taking the modal snapshot.
    if(pending?.manual&&pending.ready)finishPhoto(pending.request);
    const image=button.closest('.photo-band').querySelector('img');
    const item=button.closest('.gallery')?currentGalleryItem:allItems.find(item=>item.id===Number(image.dataset.mediaId||button.dataset.mediaId)||image.getAttribute('src')===item.src);
    openPhotoViewer(item,button,image.currentSrc||image.src,image.alt,portraitView.matches);
  }));
  window.addEventListener('azimute:open-media',event=>{
    const item=allItems.find(photo=>photo.id===Number(event.detail?.id));if(!item)return;
    const origin=event.detail?.origin?.nodeType===1?event.detail.origin:document.querySelector('.architecture-open-photo');
    openPhotoViewer(item,origin,item.texture||item.src,item.alt,!!event.detail?.portrait);
  });
  viewer.querySelector('.photo-viewer__close').addEventListener('click',()=>viewer.close());viewer.addEventListener('click',e=>{if(e.target===viewer){const b=viewer.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)viewer.close();}});
  viewer.addEventListener('close',()=>{viewerRequest++;viewer.removeAttribute('aria-busy');root.classList.remove('viewer-open');viewerOrigin?.focus({preventScroll:true});scheduleAuto();window.dispatchEvent(new Event('azimute:motion'));});
  window.addEventListener('azimute:motion',()=>{if(paused||reduced.matches||viewer.open||document.hidden){clearTimeout(autoTimer);if(pending?.manual&&pending.ready)finishPhoto(pending.request);else restorePhoto();}scheduleAuto();});
  reduced.addEventListener('change',()=>{if(reduced.matches)stopAuto();});
  updatePlay();
  root.classList.toggle('tab-inactive',document.hidden);
  document.addEventListener('visibilitychange',()=>{root.classList.toggle('tab-inactive',document.hidden);scheduleAuto();window.dispatchEvent(new Event('azimute:motion'));});
})();
