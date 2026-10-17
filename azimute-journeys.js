/* A natural scroll through the acervo, with decoded photographic transitions. */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-height: 480px)');
  const mobile = matchMedia('(max-width: 700px)');
  const media = new Map((window.AZIMUTE_MEDIA || []).map(item => [item.id, item]));
  const hasScroll = !!window.gsap && !!window.ScrollTrigger;
  const paused = () => reduced.matches || root.classList.contains('motion-paused') || root.classList.contains('viewer-open') || document.hidden;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const cleanups = [];
  document.querySelectorAll('.photo-journey').forEach(section => {
    const panels = [...section.querySelectorAll('.journey-panel')];
    if (!panels.length) return;
    const heading = section.querySelector('[data-journey-title]');
    const count = section.querySelector('.journey-count');
    const status = section.querySelector('.journey-status');
    const prev = section.querySelector('[data-journey-prev]');
    const next = section.querySelector('[data-journey-next]');
    const open = section.querySelector('.journey-open');
    const marks = [...section.querySelectorAll('.journey-progress i')];
    let current = 0, requested = 0, request = 0, trigger, pending, tween;
    let alive = true, visible = false, readiness = new Map();
    function hydrate(index) {
      const panel = panels[index];
      if (!panel) return Promise.resolve();
      const key = `${index}:${mobile.matches}`;
      if (readiness.has(key)) return readiness.get(key);
      const image = panel.querySelector('img');
      // Hidden panels must load before the next scroll interval reveals them.
      image.loading = 'eager';
      panel.querySelectorAll('[data-srcset]').forEach(node => { node.srcset = node.dataset.srcset; });
      if (image.dataset.src) image.src = image.dataset.src;
      const decoded = Promise.race([
        image.decode(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('image-timeout')), 12000))
      ]).catch(error => { readiness.delete(key); throw error; });
      readiness.set(key, decoded);
      return decoded;
    }
    function prefetch(index) {
      [index, index + 1].filter(i => i >= 0 && i < panels.length).forEach(i => hydrate(i).catch(() => {}));
    }
    function settleVisibility() {
      panels.forEach((panel, index) => {
        panel.classList.toggle('is-current', index === current);
        panel.classList.remove('is-entering');
        panel.setAttribute('aria-hidden', String(index !== current));
        panel.inert = index !== current;
        if (window.gsap) gsap.set(panel, {clearProps: 'opacity,visibility,clipPath,transform'});
      });
    }
    function commit(index, serial) {
      if (!alive || serial !== request) return;
      current = index; pending = null;
      const item = media.get(Number(panels[index].dataset.mediaId));
      heading.textContent = item?.title || panels[index].dataset.title;
      count.textContent = `${String(index + 1).padStart(2, '0')} / ${String(panels.length).padStart(2, '0')}`;
      open.dataset.mediaId = panels[index].dataset.mediaId;
      open.setAttribute('aria-label', `Ver imagem completa: ${heading.textContent}`);
      prev.disabled = index === 0; next.disabled = index === panels.length - 1;
      marks.forEach((mark, n) => {mark.classList.toggle('is-past', n < index);mark.classList.toggle('is-current', n === index);});
      section.dataset.activeIndex = String(index);
      section.removeAttribute('aria-busy'); status.textContent = '';
      settleVisibility(); prefetch(index);
    }
    async function show(index, manual = false) {
      index = clamp(index, 0, panels.length - 1);
      if (index === requested && pending || index === current && !pending) return;
      requested = index; const serial = ++request;
      tween?.kill(); pending = {index, serial, ready: false};
      settleVisibility(); section.setAttribute('aria-busy', 'true');
      heading.parentElement.setAttribute('aria-live', manual ? 'polite' : 'off');
      try {
        await hydrate(index);
        if (serial !== request || !alive) return;
        pending.ready = true;
        if (!hasScroll || paused() || !visible) { commit(index, serial); return; }
        const target = panels[index];
        target.classList.add('is-entering');
        const backwards = index < current;
        tween = gsap.fromTo(target, {opacity: .16, clipPath: backwards ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)'}, {
          opacity: 1, clipPath: 'inset(0 0% 0 0%)', duration: .85, ease: 'power2.inOut',
          onComplete: () => commit(index, serial)
        });
        prefetch(index);
      } catch {
        if (serial !== request || !alive) return;
        pending = null; section.removeAttribute('aria-busy');settleVisibility();
        status.textContent = "This image couldn't load. You can continue to the next one.";
        prev.disabled = requested === 0;next.disabled = requested === panels.length - 1;
      }
    }
    function desiredAt(progress) {return Math.min(panels.length - 1, Math.floor(clamp(progress, 0, 1) * panels.length));}
    function go(index) {
      const target = clamp(index, 0, panels.length - 1);
      if (trigger && section.classList.contains('journey-scroll')) {
        const progress = (target + .45) / panels.length;
        window.scrollTo({top: trigger.start + (trigger.end - trigger.start) * progress, behavior: 'instant'});
      }
      show(target, true);
    }
    const previous = () => go(requested - 1), following = () => go(requested + 1);
    const keyboard = event => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key) || !section.contains(document.activeElement)) return;
      event.preventDefault();go(requested + (event.key === 'ArrowRight' ? 1 : -1));
    };
    prev.addEventListener('click', previous);next.addEventListener('click', following);section.addEventListener('keydown', keyboard);
    const view = () => window.dispatchEvent(new CustomEvent('azimute:open-media', {detail:{id:Number(open.dataset.mediaId),origin:open,portrait:mobile.matches}}));
    open.addEventListener('click', view);
    function configure() {
      trigger?.kill();trigger = null;tween?.kill();request++;pending = null;section.removeAttribute('aria-busy');
      tween=null;settleVisibility();
      const linear = reduced.matches || compact.matches || !hasScroll;
      section.classList.toggle('journey-linear', linear);
      section.classList.toggle('journey-scroll', !linear);
      section.classList.add('journey-ready');
      if (linear) {
        panels.forEach((panel,index) => {panel.removeAttribute('aria-hidden');panel.inert=false;hydrate(index).catch(()=>{});});
      } else {
        settleVisibility();
        const top=()=>section.getBoundingClientRect().top+document.scrollingElement.scrollTop;
        trigger = ScrollTrigger.create({trigger:section,start:top,end:()=>top()+section.offsetHeight-innerHeight,onRefresh:self=>{section.dataset.scrollStart=String(self.start);section.dataset.scrollEnd=String(self.end);show(desiredAt(self.progress));},onUpdate:self=>{
          section.dataset.scrollProgress=String(self.progress);
          if (!root.classList.contains('viewer-open') && !document.hidden) show(desiredAt(self.progress));
        }});
        show(desiredAt(trigger.progress));
      }
    }
    function motion() {
      if (paused() && pending?.ready) {tween?.kill();commit(pending.index,pending.serial);}
      if (trigger && !root.classList.contains('viewer-open') && !document.hidden) show(desiredAt(trigger.progress));
    }
    const near = new IntersectionObserver(entries => {visible = entries[0].isIntersecting;if (visible) prefetch(requested);else if(pending?.ready){tween?.kill();commit(pending.index,pending.serial);}}, {rootMargin:'400px'});
    near.observe(section);
    commit(0, request); configure();
    reduced.addEventListener('change', configure);compact.addEventListener('change', configure);
    const orientation = () => {readiness = new Map();prefetch(current);};mobile.addEventListener('change', orientation);
    window.addEventListener('azimute:motion',motion);
    cleanups.push(()=>{alive=false;request++;tween?.kill();trigger?.kill();near.disconnect();reduced.removeEventListener('change',configure);compact.removeEventListener('change',configure);mobile.removeEventListener('change',orientation);window.removeEventListener('azimute:motion',motion);prev.removeEventListener('click',previous);next.removeEventListener('click',following);open.removeEventListener('click',view);section.removeEventListener('keydown',keyboard);});
  });
  document.querySelectorAll('.plan-card').forEach(button=>button.addEventListener('click',()=>window.dispatchEvent(new CustomEvent('azimute:open-media',{detail:{id:Number(button.dataset.mediaId),origin:button}}))));
  if (hasScroll) {ScrollTrigger.refresh();document.fonts.ready.then(()=>requestAnimationFrame(()=>ScrollTrigger.refresh()));}
  window.addEventListener('pagehide',event=>{if(!event.persisted)cleanups.forEach(fn=>fn());});
})();
