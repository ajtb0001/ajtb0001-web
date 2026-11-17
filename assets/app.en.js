/* ATB · Datos con propósito — lógica de la web (sin dependencias) */
(() => {
  'use strict';

  /* ================= Utilidades ================= */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const now = () => performance.now();
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const body = document.body;
  const EASE_IO = 'cubic-bezier(.76,0,.24,1)';
  const EASE_OUT = 'cubic-bezier(.2,.8,.2,1)';
  // Espera a que termine una animación, con un límite para que la navegación nunca se quede bloqueada
  const done = (anim, ms) => Promise.race([anim.finished.catch(() => {}), wait(ms + 400)]);

  const makeStore = kind => ({
    get(k, d) { try { const v = window[kind].getItem('atb.' + k); return v === null ? d : JSON.parse(v); } catch (_) { return d; } },
    set(k, v) { try { window[kind].setItem('atb.' + k, JSON.stringify(v)); } catch (_) {} },
    clear() { try { const s = window[kind]; Object.keys(s).filter(k => k.startsWith('atb.')).forEach(k => s.removeItem(k)); } catch (_) {} }
  });
  const local = makeStore('localStorage');
  const session = makeStore('sessionStorage');

  const listeners = {};
  const on = (ev, fn) => (listeners[ev] = listeners[ev] || []).push(fn);
  const emit = (ev, ...a) => (listeners[ev] || []).forEach(fn => fn(...a));

  /* ================= Datos ================= */
  const SECTIONS = [
    { key: 'perfil', n: '01', title: 'Profile', sub: 'Data and AI for better decisions', tag: 'Strategy · Governance' },
    { key: 'trayectoria', n: '02', title: 'Experience', sub: '2020 — today', tag: 'RNB · Preference' },
    { key: 'como-trabajo', n: '03', title: 'How I work', sub: 'From problem to value', tag: 'Method · SAP', cv: 'sap' },
    { key: 'formacion', n: '04', title: 'Education', sub: 'Degree · Master’s · MBA', tag: 'DP-700 · MBA' },
    { key: 'proyectos', n: '05', title: 'Custom projects', sub: 'Applied AI, apps and websites', tag: 'AI · Apps · Web', cv: 'servicios' },
    { key: 'sobre-mi', n: '06', title: 'About me', sub: 'Three places, one outlook', tag: 'Rioja · Jaén · Valencia' },
    { key: 'contacto', n: '07', title: 'Contact', sub: 'Data or custom projects', tag: 'Write to me' }
  ];
  const byKey = Object.fromEntries(SECTIONS.map(s => [s.key, s]));
  // Los dos caminos del contacto (formulario y comando «mensaje»)
  const CAMINOS = ['Data opportunities and collaborations', 'Web, app or AI projects'];
  // El mosaico del inicio tiene 8 huecos: las 7 secciones y el terminal
  const HUB = [...SECTIONS, { key: 'intro', n: '>_', title: 'Terminal', sub: 'Type a command', tag: 'ATB·DATA', cv: 'terminal' }];
  const LABELS = { intro: { n: '>_', title: 'Terminal' }, inicio: { n: '00', title: 'Home' }, privacidad: { n: '§', title: 'Privacy' } };
  /* Direcciones: cada vista tiene su propia ruta (/trayectoria/, /en/experience/…).
     La vista previa de Claude no admite rutas y usa #clave (window.ATB.route = 'hash'). */
  const CFG = window.ATB || {};
  const ROUTE = CFG.route === 'hash' ? 'hash' : 'path';
  const ROOT = typeof CFG.root === 'string' ? CFG.root : '/';
  const LANG = (CFG.lang || document.documentElement.lang) === 'en' ? 'en' : 'es';
  const SLUGS = {
    es: { intro: 'terminal', inicio: '', perfil: 'perfil', trayectoria: 'trayectoria', 'como-trabajo': 'como-trabajo', formacion: 'formacion', proyectos: 'proyectos', 'sobre-mi': 'sobre-mi', contacto: 'contacto', privacidad: 'privacidad' },
    en: { intro: 'terminal', inicio: '', perfil: 'profile', trayectoria: 'experience', 'como-trabajo': 'how-i-work', formacion: 'education', proyectos: 'projects', 'sobre-mi': 'about', contacto: 'contact', privacidad: 'privacy' }
  };
  const PREFIX = { es: '/', en: '/en/' };
  const pathFor = (k, lang = LANG) => PREFIX[lang] + (SLUGS[lang][k] ? SLUGS[lang][k] + '/' : '');
  const hashFor = k => (k === 'intro' ? 'terminal' : k);
  const urlFor = k => (ROUTE === 'hash' ? '#' + hashFor(k) : pathFor(k));
  // Direcciones antiguas con # que siguen funcionando (#trayectoria, #sap, #servicios…)
  const HASH_ALIAS = { terminal: 'intro', agenda: 'contacto', sistema: 'como-trabajo', sap: 'como-trabajo', metodo: 'como-trabajo', servicios: 'proyectos', intro: null };
  const keyForHash = h => (Object.prototype.hasOwnProperty.call(HASH_ALIAS, h) ? HASH_ALIAS[h] : h);
  // Clave de vista a partir de una ruta, en cualquiera de los dos idiomas
  function keyForPath(p) {
    const parts = p.replace(/index\.html$/, '').split('/').filter(Boolean);
    if (parts[0] === 'en') parts.shift();
    if (!parts.length) return 'inicio';
    if (parts.length > 1) return null;
    for (const l of ['es', 'en']) for (const k in SLUGS[l]) if (SLUGS[l][k] === parts[0]) return k;
    return null;
  }
  const labelFor = k => byKey[k] || LABELS[k] || { n: '', title: k };

  const MOTIF = {
    perfil: '<div class="m"></div>',
    trayectoria: '<div class="m"><i data-y="2020"></i><i data-y="2024"></i><i data-y="today"></i></div>',
    'como-trabajo': '<div class="m">' + [4, 3, 2, 1, 0].map(k => `<i style="--k:${k}"></i>`).join('') + '</div>',
    intro: '<div class="m"><i>$ whoami</i><i>$ sql</i><i>$ _</i></div>',
    'sobre-mi': '<div class="m">&#x265E;&#xFE0E;</div>',
    formacion: '<div class="m"><i>DP-700</i><i>MBA</i><i>AZ-900</i><i>DP-900</i><i>PL-900</i></div>',
    proyectos: '<div class="m"><span class="m-bar"><i></i><i></i><i></i></span><span class="m-l m-l1"></span><span class="m-l m-l2"></span><span class="m-l m-l3"></span><span class="m-cur"></span></div>',
    contacto: '<div class="m">@</div>'
  };
  const coverHTML = s => `<div class="cover cv-${s.cv || s.key}">${MOTIF[s.key]}<span class="cover-num">${s.n}</span><span class="cover-tag">${s.tag}</span><div class="cover-txt"><b class="cover-title">${s.title}</b><span class="cover-sub">${s.sub}</span></div></div>`;

  /* ================= Logros ================= */
  const ACH = [
    { id: 'hola', name: 'Hello, world!', desc: 'Enter the site from the terminal' },
    { id: 'terminal', name: 'Power user', desc: 'Type a command in the terminal' },
    { id: 'explorador', name: 'Explorer', desc: 'Visit four different sections' },
    { id: 'flujo', name: 'Full flow', desc: 'Go through all five layers of the SAP flow' },
    { id: 'vuelta', name: 'Full turn', desc: 'Spin the 3D model all the way round' },
    { id: 'lector', name: 'Bookworm', desc: 'Hover over every book on the shelf' },
    { id: 'sinfrenos', name: 'No brakes', desc: 'Fill the bar to move to the next section' },
    { id: 'conversacion', name: 'First conversation', desc: 'Write to me via the form, email or LinkedIn' }
  ];
  const ach = (() => {
    let got = new Set(local.get('logros', []));
    const list = $('#ach-list'), panel = $('#ach-panel'), toggle = $('#ach-toggle');
    const counts = [$('#ach-count'), $('#ach-count-2')];
    const toastEl = $('#toast');
    const queue = [];
    let showing = false;
    function render() {
      list.innerHTML = ACH.map(a => {
        const ok = got.has(a.id);
        return `<li class="${ok ? 'on' : ''}"><span class="ach-ico" aria-hidden="true"></span><span><span class="ach-name">${ok ? a.name : '?'.repeat(Math.max(6, a.name.length - 2))}</span><span class="ach-desc">${a.desc}</span></span></li>`;
      }).join('');
      counts.forEach(c => { if (c) c.textContent = `${got.size}/${ACH.length}`; });
    }
    async function pump() {
      if (showing || !queue.length) return;
      showing = true;
      toastEl.innerHTML = queue.shift();
      toastEl.classList.add('on');
      await wait(2600);
      toastEl.classList.remove('on');
      await wait(500);
      showing = false;
      pump();
    }
    function toast(html) { queue.push(html); pump(); }
    // Los logros solo se enseñan en el terminal: fuera de él se guardan en silencio y se avisan al volver
    let fresh = [];
    function unlock(id) {
      if (got.has(id)) return;
      const a = ACH.find(x => x.id === id);
      if (!a) return;
      got.add(id);
      local.set('logros', [...got]);
      render();
      if (current === 'intro') toast(`<b>Achievement ${got.size}/${ACH.length}</b><span>${a.name}</span>`);
      else fresh.push(a.name);
      if (got.size === ACH.length) {
        if (current === 'intro') toast('<b>Completed</b><span>You’ve unlocked every achievement</span>');
        setTimeout(() => emit('logros-completos'), 2400);
      }
    }
    const takeFresh = () => { const f = fresh; fresh = []; return f; };
    function setOpen(open) {
      panel.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
    }
    toggle.addEventListener('click', e => { e.stopPropagation(); setOpen(panel.hidden); });
    document.addEventListener('click', e => { if (!panel.hidden && !panel.contains(e.target) && e.target !== toggle) setOpen(false); });
    function reset() { got = new Set(); render(); }
    render();
    return { unlock, setOpen, reset, toast, takeFresh, isOpen: () => !panel.hidden, size: () => got.size, has: id => got.has(id) };
  })();
  document.addEventListener('click', e => { const t = e.target.closest('[data-ach]'); if (t) ach.unlock(t.dataset.ach); });

  /* ================= Vistas y enrutado ================= */
  const views = {};
  $$('.view').forEach(v => { views[v.dataset.view] = v; });
  let current = null, busy = false;

  function setBodyState(key) {
    const v = views[key];
    body.classList.toggle('is-intro', key === 'intro');
    body.classList.toggle('is-hub', key === 'inicio');
    body.classList.toggle('is-page', v.classList.contains('view--page'));
    body.classList.toggle('tone-light', v.classList.contains('view--light'));
  }
  function show(key) {
    const prev = current;
    if (prev && views[prev]) { views[prev].classList.remove('is-active'); emit('leave', prev); }
    current = key;
    views[key].classList.add('is-active');
    setBodyState(key);
    window.scrollTo(0, 0);
    emit('enter', key, prev);
  }
  // Al cambiar de vista: título de la pestaña y enlace al otro idioma apuntando a la misma sección
  const langSwitch = $('#lang-switch');
  on('enter', key => {
    if (ROUTE === 'path') document.title = titleFor(key);
    if (langSwitch) langSwitch.setAttribute('href', pathFor(key, LANG === 'en' ? 'es' : 'en'));
  });
  // Vista que corresponde a la dirección actual: primero un #antiguo, luego la ruta
  const keyFromLocation = () => {
    let k = null;
    if (location.hash.length > 1) { try { k = keyForHash(decodeURIComponent(location.hash.slice(1))); } catch (_) {} }
    if (!k && ROUTE === 'path') k = keyForPath(location.pathname);
    return k && views[k] ? k : null;
  };
  // Clave de vista de un enlace interno (#clave o /ruta/), o null si no es de la web
  function keyForLink(a) {
    const href = a.getAttribute('href') || '';
    if (href.startsWith('#')) { const k = keyForHash(href.slice(1)); return k && views[k] ? k : null; }
    if (ROUTE !== 'path' || a.target === '_blank' || a.hasAttribute('download') || a.hasAttribute('hreflang')) return null;
    let u;
    try { u = new URL(href, location.href); } catch (_) { return null; }
    if (u.origin !== location.origin || /\.\w+$/.test(u.pathname.replace(/index\.html$/, ''))) return null;
    if ((u.pathname.startsWith('/en/') || u.pathname === '/en') !== (LANG === 'en')) return null;
    const k = keyForPath(u.pathname);
    return k && views[k] ? k : null;
  }
  // Título de la pestaña según la vista
  const homeTitle = LANG === 'en' ? 'Álvaro Torres Baeza · Data & AI, architecture and governance' : 'Álvaro Torres Baeza · Datos e IA, arquitectura y gobierno';
  const titleFor = k => (k === 'inicio' ? homeTitle : `${labelFor(k).title} · Álvaro Torres Baeza`);
  function setUrl(key, replace) {
    const url = urlFor(key);
    const same = ROUTE === 'hash' ? location.hash === url : location.pathname === url && !location.hash;
    if (!same) { try { history[replace ? 'replaceState' : 'pushState'](null, '', url); } catch (_) {} }
  }
  function go(key, how, src) {
    if (busy) return;
    if (key === current) { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); return; }
    setUrl(key);
    transitionTo(key, how, src);
  }
  async function transitionTo(key, how, src) {
    if (busy || !views[key]) return;
    busy = true;
    try {
      if (reduce) show(key);
      else if (key === 'intro' && current && current !== 'intro') await introEnter();
      else if (current === 'intro' && key !== 'intro') await introExit(key);
      else if (how === 'flip' && src) await flipOpen(src, key);
      else await curtain(key);
    } catch (_) { show(key); }
    busy = false;
  }
  history.scrollRestoration = 'manual';
  window.addEventListener('popstate', () => {
    const k = keyFromLocation() || 'inicio';
    if (k !== current) transitionTo(k, 'curtain');
  });
  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.button > 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]');
    if (!a) return;
    const k = keyForLink(a);
    if (!k) return;
    e.preventDefault();
    if (menu.isOpen()) menu.close(true);
    ach.setOpen(false);
    if (current === 'inicio' && a.closest('.dock') && a.dataset.i) go(k, 'flip', hub.tileFor(+a.dataset.i));
    else go(k, 'curtain');
  });

  /* Telón entre secciones (como el vídeo de referencia) */
  async function curtain(key) {
    const c = $('#curtain'), lab = labelFor(key);
    $('#curtain-n').textContent = lab.n;
    $('#curtain-title').textContent = lab.title;
    const up = c.animate([{ transform: 'translateY(101%)' }, { transform: 'translateY(0%)' }], { duration: 560, easing: EASE_IO, fill: 'forwards' });
    const t = $('.curtain-inner').animate([{ transform: 'translateY(80px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 700, delay: 160, easing: EASE_OUT, fill: 'both' });
    await done(up, 560);
    show(key);
    await wait(160);
    const out = c.animate([{ transform: 'translateY(0%)' }, { transform: 'translateY(-101%)' }], { duration: 700, easing: EASE_IO, fill: 'forwards' });
    await done(out, 700);
    up.cancel(); out.cancel(); t.cancel();
  }

  /* Tarjeta que se expande hasta ocupar la pantalla */
  async function flipOpen(srcEl, key) {
    const r = srcEl.getBoundingClientRect();
    const flip = $('#flip'), vw = innerWidth, vh = innerHeight;
    flip.innerHTML = coverHTML(byKey[key]);
    flip.style.display = 'block';
    const from = `inset(${r.top}px ${vw - r.right}px ${vh - r.bottom}px ${r.left}px round 24px)`;
    const a = flip.animate([{ clipPath: from }, { clipPath: 'inset(0px 0px 0px 0px round 0px)' }], { duration: 850, easing: EASE_IO, fill: 'forwards' });
    $('.cover-txt', flip).animate([{ transform: 'translateY(60px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 800, delay: 250, easing: EASE_OUT, fill: 'both' });
    await done(a, 850);
    show(key);
    await wait(80);
    const b = flip.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 480, easing: 'ease', fill: 'forwards' });
    await done(b, 480);
    flip.style.display = 'none';
    flip.innerHTML = '';
    a.cancel(); b.cancel();
  }

  /* Terminal ⇄ web como una cámara que entra y sale de la pantalla del ordenador.
     Calcula cuánto hay que ampliar el monitor para que su pantalla llene la ventana. */
  const EASE_CAM = 'cubic-bezier(.66,0,.22,1)';
  function screenZoom(crt) {
    const scr = $('.crt-screen', crt), cr = crt.getBoundingClientRect(), sr = scr.getBoundingClientRect();
    const vw = innerWidth, vh = innerHeight;
    crt.style.transformOrigin = `${sr.left - cr.left + sr.width / 2}px ${sr.top - cr.top + sr.height / 2}px`;
    const dx = vw / 2 - (sr.left + sr.width / 2), dy = vh / 2 - (sr.top + sr.height / 2);
    const s = Math.max(vw / sr.width, vh / sr.height) * 1.12;
    return `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) scale(${s.toFixed(3)})`;
  }

  /* Entrada al terminal: la web queda dentro de la pantalla y la cámara se aleja hasta ver el ordenador; luego se enciende */
  // Durante el zoom se apagan los efectos caros (sombras, líneas animadas) para que el navegador solo mueva una imagen ya dibujada
  const camOn = (...els) => els.forEach(el => el.classList.add('is-cam'));
  const camOff = (...els) => els.forEach(el => el.classList.remove('is-cam'));
  function flashEl(crt) {
    let f = $('.crt-flash', crt);
    if (!f) { f = document.createElement('div'); f.className = 'crt-flash'; $('.crt-screen', crt).appendChild(f); }
    return f;
  }
  async function introEnter() {
    const prev = current, from = views[prev], intro = views.intro, crt = $('.crt', intro);
    camOn(intro, from);
    intro.classList.add('is-active', 'is-arriving');
    intro.style.zIndex = 6;
    current = 'intro';
    setBodyState('intro');
    emit('leave', prev);
    emit('enter', 'intro', prev);
    // Un fotograma para que el terminal ya tenga su tamaño (con límite por si la pestaña está en segundo plano)
    await Promise.race([new Promise(r => requestAnimationFrame(r)), wait(60)]);
    const zoom = screenZoom(crt), T = 1150;
    from.style.transformOrigin = `50% ${window.scrollY + innerHeight / 2}px`;
    const a = crt.animate([{ transform: zoom }, { transform: zoom, offset: 0.12 }, { transform: 'none' }], { duration: T, easing: EASE_CAM, fill: 'both' });
    const b = intro.animate([{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 1 }], { duration: T, easing: 'linear', fill: 'both' });
    const c = from.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.82)', offset: 0.4 }, { opacity: 0, transform: 'scale(.82)' }], { duration: T, easing: 'ease-in', fill: 'both' });
    // La pantalla se enciende cuando el monitor ya casi está en su sitio
    setTimeout(() => intro.classList.remove('is-arriving'), T * 0.72);
    await done(a, T);
    intro.classList.remove('is-arriving');
    camOff(intro, from);
    from.classList.remove('is-active');
    from.style.transformOrigin = '';
    window.scrollTo(0, 0);
    a.cancel(); b.cancel(); c.cancel();
    crt.style.transformOrigin = '';
    intro.style.zIndex = '';
  }

  /* Salida del terminal: la cámara se mete dentro de la pantalla y aparece la web */
  async function introExit(key) {
    session.set('introSeen', true);
    ach.unlock('hola');
    const intro = views.intro, dest = views[key], crt = $('.crt', intro);
    const zoom = screenZoom(crt), T = 1150;
    camOn(intro, dest);
    intro.style.zIndex = 6;
    dest.classList.add('is-active');
    current = key;
    setBodyState(key);
    emit('leave', 'intro');
    emit('enter', key, 'intro');
    const a = crt.animate([{ transform: 'none' }, { transform: zoom }], { duration: T, easing: EASE_CAM, fill: 'forwards' });
    // Destello de la pantalla al atravesarla (solo opacidad: barato de animar)
    const f = flashEl(crt).animate([{ opacity: 0 }, { opacity: 0, offset: 0.35 }, { opacity: 0.55 }], { duration: T, easing: 'ease-in', fill: 'forwards' });
    const b = intro.animate([{ opacity: 1 }, { opacity: 1, offset: 0.62 }, { opacity: 0 }], { duration: T, easing: 'linear', fill: 'forwards' });
    const c = dest.animate([{ opacity: 0, transform: 'scale(.8)' }, { opacity: 0, transform: 'scale(.8)', offset: 0.55, easing: EASE_OUT }, { opacity: 1, transform: 'none' }], { duration: T, easing: 'linear', fill: 'both' });
    await done(a, T);
    camOff(intro, dest);
    intro.classList.remove('is-active');
    a.cancel(); b.cancel(); c.cancel(); f.cancel();
    intro.getAnimations({ subtree: true }).forEach(x => x.cancel());
    crt.style.transformOrigin = '';
    intro.style.zIndex = '';
  }

  /* ================= Barra superior y reloj ================= */
  const topbar = $('#topbar');
  (function clock() {
    let fmt, tzf;
    try {
      fmt = new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      tzf = new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', timeZoneName: 'short' });
    } catch (_) { fmt = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }); }
    const outs = [$('#clock'), ...$$('[data-clock]')], tzOut = $('#clock-tz');
    function tick() {
      const d = new Date(), txt = fmt.format(d);
      outs.forEach(o => { if (o) o.textContent = txt; });
      if (tzf && tzOut) { const p = tzf.formatToParts(d).find(x => x.type === 'timeZoneName'); if (p) tzOut.textContent = p.value; }
      setTimeout(tick, 1000 - (Date.now() % 1000));
    }
    tick();
  })();

  /* ================= Menú índice ================= */
  const menu = (() => {
    const el = $('#menu'), btn = $('#menu-btn'), closeBtn = $('#menu-close'), preview = $('#menu-preview');
    const links = $$('.menu-list a', el);
    links.forEach((a, k) => a.querySelector('span').style.setProperty('--k', k));
    let open = false;
    function openMenu() {
      if (open || busy) return;
      open = true;
      el.hidden = false;
      body.style.overflow = 'hidden';
      btn.setAttribute('aria-expanded', 'true');
      links.forEach(a => a.classList.toggle('is-current', keyForLink(a) === current));
      if (!reduce) {
        el.classList.remove('is-anim'); void el.offsetWidth; el.classList.add('is-anim');
        el.animate([{ clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 700, easing: EASE_IO });
      }
      setTimeout(() => closeBtn.focus(), 50);
    }
    async function close(instant) {
      if (!open) return;
      open = false;
      btn.setAttribute('aria-expanded', 'false');
      preview.classList.remove('on');
      if (!instant && !reduce) {
        await done(el.animate([{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(0 0 100% 0)' }], { duration: 520, easing: EASE_IO }), 520);
      }
      el.hidden = true;
      body.style.overflow = '';
      if (!instant) btn.focus();
    }
    btn.addEventListener('click', openMenu);
    closeBtn.addEventListener('click', () => close());
    links.forEach(a => {
      const i = +a.dataset.i;
      const enter = () => {
        if (i < 0 || !fine) { preview.classList.remove('on'); return; }
        preview.innerHTML = coverHTML(SECTIONS[i]);
        preview.classList.add('on');
      };
      a.addEventListener('mouseenter', enter);
      a.addEventListener('focus', enter);
    });
    $('#menu-list').addEventListener('mouseleave', () => preview.classList.remove('on'));
    el.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      if (e.key === 'Tab') {
        const f = $$('a,button', el).filter(x => x.offsetParent !== null);
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    return { open: openMenu, close, isOpen: () => open };
  })();
  // Atajo de teclado: «M» abre o cierra el menú (fuera de campos de texto y del terminal)
  document.addEventListener('keydown', e => {
    if (e.key.toLowerCase() !== 'm' || e.ctrlKey || e.metaKey || e.altKey || current === 'intro') return;
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || document.activeElement.isContentEditable) return;
    e.preventDefault();
    if (menu.isOpen()) menu.close(); else menu.open();
  });

  /* Índice lateral: marca la sección actual */
  const railLinks = $$('#rail a');
  on('enter', key => railLinks.forEach(a => {
    const isCur = a.dataset.k === key;
    a.classList.toggle('is-current', isCur);
    if (isCur) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  }));

  /* ================= Mosaico curvo (inicio) ================= */
  const hub = (() => {
    const root = $('#hub'), stage = $('#hub-stage');
    // En horizontal: 4 columnas × 2 filas de contenido; en vertical (móvil): 2 × 4
    let COLS = 4, ROWS = 2, EC = 8, ER = 6, mode = '';
    let tiles = [];
    let W = 0, H = 0, G = 0, vw = 0, vh = 0, spanW = 0, spanH = 0;
    let ox = 0, oy = 0, vx = 0, vy = 0, target = null;
    let running = false, dragging = false, interacted = false, placed = false, abNow = -1, down = null, dirty = true;

    function build() {
      const m = innerWidth < innerHeight && innerWidth < 900 ? 'v' : 'h';
      if (m === mode) return;
      mode = m;
      if (m === 'v') { COLS = 2; ROWS = 4; EC = 4; ER = 8; } else { COLS = 4; ROWS = 2; EC = 8; ER = 6; }
      stage.innerHTML = '';
      tiles = [];
      placed = false;
      for (let r = 0; r < ER; r++) {
        for (let c = 0; c < EC; c++) {
          const idx = (c % COLS) + COLS * (r % ROWS);
          const el = document.createElement('div');
          el.className = 'tile';
          el.dataset.i = idx;
          el.innerHTML = `<div class="tile-inner">${coverHTML(HUB[idx])}</div>`;
          stage.appendChild(el);
          tiles.push({ el, c, r, idx, cx: 0, cy: 0 });
        }
      }
    }
    function layout() {
      build();
      const ow = W, oh = H;
      // El mosaico ocupa solo su zona (a la derecha del retrato en escritorio, debajo en móvil)
      vw = root.clientWidth || innerWidth; vh = root.clientHeight || innerHeight;
      const small = innerWidth < 700;
      W = Math.round(small ? innerWidth * 0.62 : clamp(innerWidth * 0.22, 260, 420));
      H = Math.round(W * 0.68);
      G = Math.round(W * (small ? 0.07 : 0.075));
      spanW = EC * (W + G); spanH = ER * (H + G);
      // Cada tarjeta lleva su propia perspectiva con el punto de fuga en el centro del mosaico (ver render)
      tiles.forEach(t => { t.el.style.width = W + 'px'; t.el.style.height = H + 'px'; t.el.style.transformOrigin = `${vw / 2}px ${vh / 2}px`; });
      if (!placed) {
        ox = vw / 2 - (COLS * (W + G) - G) / 2;
        oy = vh / 2 - (ROWS * (H + G) - G) / 2;
        placed = true;
      } else if (ow) { ox *= W / ow; oy *= H / oh; }
      dirty = true;
    }
    const wrap = (v, span, center) => ((v - (center - span / 2)) % span + span) % span + (center - span / 2);
    /* Rendimiento: antes el escenario era 3D compartido (preserve-3d) y el navegador tenía que ordenar en
       profundidad ~40 capas en cada fotograma (de ~60 a ~20 fps mientras el mosaico se desliza).
       Ahora cada tarjeta es plana y lleva su propia perspective(): con el origen de transformación en el
       centro del mosaico, perspective · translate(centro tarjeta − centro mosaico) · giro · translate(inverso)
       da exactamente la misma proyección que antes. El orden de dibujo lo marca z-index según la profundidad. */
    const PERSP = 1100;
    function render() {
      const cx0 = vw / 2, cy0 = vh / 2, kx = 1 / (vw * 0.58), ky = 1 / (vh * 0.62);
      for (let i = 0; i < tiles.length; i++) {
        const t = tiles[i];
        const x = wrap(t.c * (W + G) + ox + W / 2, spanW, cx0) - W / 2;
        const y = wrap(t.r * (H + G) + oy + H / 2, spanH, cy0) - H / 2;
        t.cx = x + W / 2; t.cy = y + H / 2;
        const nx = (t.cx - cx0) * kx, ny = (t.cy - cy0) * ky;
        const d2 = nx * nx + ny * ny;
        if (reduce) { t.el.style.transform = `translate3d(${x}px,${y}px,0)`; continue; }
        const z = -d2 * 240, ry = clamp(nx * 22, -38, 38), rx = clamp(-ny * 16, -30, 30);
        t.el.style.transform = `perspective(${PERSP}px) translate3d(${(t.cx - cx0).toFixed(1)}px,${(t.cy - cy0).toFixed(1)}px,${z.toFixed(1)}px) rotateY(${ry.toFixed(2)}deg) rotateX(${rx.toFixed(2)}deg) translate(${(cx0 - W / 2).toFixed(1)}px,${(cy0 - H / 2).toFixed(1)}px)`;
        const zi = 300 + Math.round(z / 6);
        if (t.zi !== zi) { t.zi = zi; t.el.style.zIndex = zi; }
      }
      dirty = false;
    }
    function loop() {
      if (!running) return;
      if (target) {
        ox += (target.x - ox) * 0.12; oy += (target.y - oy) * 0.12; dirty = true;
        if (Math.abs(target.x - ox) < 0.5 && Math.abs(target.y - oy) < 0.5) target = null;
      } else if (!dragging) {
        if (vx || vy) {
          ox += vx; oy += vy; vx *= 0.93; vy *= 0.93; dirty = true;
          if (Math.abs(vx) < 0.02) vx = 0;
          if (Math.abs(vy) < 0.02) vy = 0;
        }
        if (!interacted && !reduce) { ox -= 0.35; dirty = true; }
      }
      if (fine && !reduce) {
        const ab = Math.min(7, Math.hypot(vx, vy) * 0.55);
        if (Math.abs(ab - abNow) > 0.15 || (ab === 0 && abNow !== 0)) { abNow = ab < 0.15 ? 0 : ab; root.style.setProperty('--ab', abNow.toFixed(2)); }
      }
      if (dirty) render();
      requestAnimationFrame(loop);
    }
    function enter(fromIntro) {
      const wasRunning = running;
      running = true;
      layout(); render();
      if (!reduce) {
        tiles.forEach(t => {
          const d = Math.hypot(t.cx - vw / 2, t.cy - vh / 2) / Math.max(vw, vh);
          t.el.style.setProperty('--dl', ((fromIntro ? 0.35 : 0.1) + d * 0.7).toFixed(2) + 's');
        });
        root.classList.remove('hub-enter'); void root.offsetWidth; root.classList.add('hub-enter');
        setTimeout(() => root.classList.remove('hub-enter'), 2400);
      }
      if (!wasRunning) requestAnimationFrame(loop);
    }
    function leave() { running = false; highlight(null); }
    function highlight(idx) {
      root.classList.toggle('has-hl', idx !== null);
      tiles.forEach(t => t.el.classList.toggle('is-hl', t.idx === idx));
    }
    function nearest(idx) {
      let best = null, bd = Infinity;
      tiles.forEach(t => { if (t.idx !== idx) return; const d = (t.cx - vw / 2) ** 2 + (t.cy - vh / 2) ** 2; if (d < bd) { bd = d; best = t; } });
      return best;
    }
    function tileFor(idx) { const t = nearest(idx); return t ? $('.tile-inner', t.el) : null; }
    function panTo(idx) {
      const t = nearest(idx); if (!t) return;
      interacted = true; vx = vy = 0;
      target = { x: ox + (vw / 2 - t.cx), y: oy + (vh / 2 - t.cy) };
    }
    root.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      vx = vy = 0; target = null;
      down = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, t: now(), tile: e.target.closest('.tile'), id: e.pointerId };
    });
    root.addEventListener('pointermove', e => {
      if (!down) return;
      if (!dragging && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) {
        dragging = true; interacted = true;
        root.classList.add('is-dragging');
        try { root.setPointerCapture(down.id); } catch (_) {}
      }
      if (!dragging) return;
      const dx = e.clientX - down.lx, dy = e.clientY - down.ly;
      ox += dx; oy += dy; dirty = true;
      vx = vx * 0.35 + dx * 0.65; vy = vy * 0.35 + dy * 0.65;
      down.lx = e.clientX; down.ly = e.clientY; down.t = now();
    });
    function end(e, cancel) {
      if (!down) return;
      if (!dragging && !cancel && down.tile) {
        const idx = +down.tile.dataset.i;
        go(HUB[idx].key, 'flip', $('.tile-inner', down.tile));
      } else if (now() - down.t > 90) { vx = vy = 0; }
      vx = clamp(vx, -60, 60); vy = clamp(vy, -60, 60);
      dragging = false; down = null;
      root.classList.remove('is-dragging');
    }
    root.addEventListener('pointerup', e => end(e, false));
    root.addEventListener('pointercancel', e => end(e, true));
    root.addEventListener('wheel', e => {
      e.preventDefault();
      interacted = true; target = null;
      const k = e.deltaMode === 1 ? 16 : 1;
      vx -= e.deltaX * k * 0.09; vy -= e.deltaY * k * 0.09;
      vx = clamp(vx, -60, 60); vy = clamp(vy, -60, 60);
    }, { passive: false });
    document.addEventListener('keydown', e => {
      if (current !== 'inicio' || busy || menu.isOpen() || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
      const m = { ArrowLeft: [1, 0], ArrowRight: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
      if (!m) return;
      e.preventDefault(); interacted = true;
      vx += m[0] * 16; vy += m[1] * 16;
    });
    const dock = $('#dock');
    $$('a[data-i]', dock).forEach(a => {
      const i = +a.dataset.i;
      a.addEventListener('mouseenter', () => highlight(i));
      a.addEventListener('mouseleave', () => highlight(null));
      a.addEventListener('focus', () => { highlight(i); panTo(i); });
      a.addEventListener('blur', () => highlight(null));
    });
    return { enter, leave, layout: () => { if (running) { layout(); render(); } }, tileFor };
  })();

  /* ================= Retrato de partículas en el inicio ================= */
  // Cada píxel encendido del retrato tramado es una partícula que vuela hasta su sitio
  const me = (() => {
    const box = $('.me-portrait'), cv = $('#me-canvas');
    if (!box || !cv) return { enter() {}, leave() {}, resize() {} };
    const ctx = cv.getContext('2d');
    // Misma imagen que el retrato del terminal: 132 × 160 píxeles tramados
    const COLS = 132, ROWS = 160;
    let img = null, w = 0, h = 0, cell = 1, P = null, N = 0, active = false, looping = false, sizeKey = '';
    let mx = -9999, my = -9999, lastMove = 0;
    const loadImg = new Promise(res => {
      const i = new Image();
      i.onload = () => res(i); i.onerror = () => res(null);
      i.src = ROOT + 'assets/retrato.jpg';
    });
    function build() {
      const bw = box.clientWidth, bh = box.clientHeight;
      if (bw < 40 || bh < 40) return false;
      const key = bw + 'x' + bh;
      if (key === sizeKey && P) return true;
      sizeKey = key;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = bw; h = bh;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cell = Math.min(w / COLS, h / ROWS);
      // Centrado en horizontal y apoyado abajo
      const ox = (w - COLS * cell) / 2, oy = h - ROWS * cell;
      const bits = portraitBits(img, COLS, ROWS), pts = [];
      for (let i = 0; i < bits.length; i++) if (bits[i]) pts.push(ox + (i % COLS) * cell, oy + ((i / COLS) | 0) * cell);
      N = pts.length / 2;
      P = new Float32Array(N * 5); // x, y, tx, ty, semilla
      for (let k = 0; k < N; k++) {
        const q = k * 5;
        P[q + 2] = pts[k * 2]; P[q + 3] = pts[k * 2 + 1]; P[q + 4] = Math.random();
      }
      return true;
    }
    function scatter() {
      for (let k = 0; k < N; k++) {
        const q = k * 5, a = Math.random() * Math.PI * 2, r = (0.6 + Math.random()) * Math.max(w, h);
        P[q] = w / 2 + Math.cos(a) * r; P[q + 1] = h / 2 + Math.sin(a) * r;
      }
    }
    function settle() { for (let k = 0; k < N; k++) { const q = k * 5; P[q] = P[q + 2]; P[q + 1] = P[q + 3]; } }
    function draw() {
      ctx.clearRect(0, 0, w, h);
      const R = Math.max(36, w * 0.14), R2 = R * R, sz = cell + 0.15;
      let moving = 0;
      ctx.fillStyle = '#d4ec8e';
      for (let k = 0; k < N; k++) {
        const q = k * 5, e = 0.06 + P[q + 4] * 0.04;
        let x = P[q] + (P[q + 2] - P[q]) * e, y = P[q + 1] + (P[q + 3] - P[q + 1]) * e;
        const dx = x - mx, dy = y - my, dd = dx * dx + dy * dy;
        if (dd < R2 && dd > 0.01) { const dl = Math.sqrt(dd), f = (1 - dl / R) * 7; x += dx / dl * f; y += dy / dl * f; }
        if (Math.abs(x - P[q]) + Math.abs(y - P[q + 1]) > 0.05) moving++;
        P[q] = x; P[q + 1] = y;
        ctx.fillRect(x, y, sz, sz);
      }
      return moving;
    }
    function frame(t) {
      if (!active || document.hidden) { looping = false; return; }
      const moving = draw(t);
      // Cuando todo está en su sitio se para la animación para no gastar batería (y se enciende el brillo, que es caro en movimiento)
      if (!moving && now() - lastMove > 400) { looping = false; box.classList.add('is-still'); return; }
      requestAnimationFrame(frame);
    }
    function kick() { if (active && !reduce && !looping) { looping = true; box.classList.remove('is-still'); requestAnimationFrame(frame); } }
    async function enter() {
      active = true;
      img = await loadImg;
      if (!active || !build()) return;
      if (reduce) { settle(); draw(0); box.classList.add('is-still'); return; }
      ctx.clearRect(0, 0, w, h);
      // Las partículas empiezan a volar cuando ha terminado la transición de entrada
      for (let i = 0; busy && i < 60; i++) await wait(50);
      if (!active) return;
      scatter(); kick();
    }
    function leave() { active = false; mx = my = -9999; }
    function resize() { if (!active) return; sizeKey = ''; if (build()) { settle(); if (reduce) draw(0); else kick(); } }
    const point = e => { const r = cv.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; lastMove = now(); kick(); };
    const away = () => { mx = my = -9999; lastMove = now(); kick(); };
    if (!reduce) {
      box.addEventListener('pointermove', point);
      box.addEventListener('pointerdown', point);
      box.addEventListener('pointerleave', away);
      box.addEventListener('pointerup', away);
      box.addEventListener('pointercancel', away);
    }
    document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
    return { enter, leave, resize };
  })();

  /* ================= Partículas (número de sección) ================= */
  const particles = (() => {
    const cv = $('#particles'), ctx = cv.getContext('2d');
    const N = fine && innerWidth > 900 ? 2200 : 800;
    const P = new Float32Array(N * 6); // x, y, tx, ty, seed, size
    let w = 0, h = 0, label = null, active = false, looping = false, mx = -9999, my = -9999, seeded = false, numW = 0;
    const cache = new Map();
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = innerWidth; h = innerHeight;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cache.clear();
      if (label) setShape(label, true);
    }
    function targets(text) {
      const key = text + '|' + w + 'x' + h;
      if (cache.has(key)) return cache.get(key);
      // Tablet en vertical: el número arriba, como en el móvil (el CSS deja el texto justo debajo)
      const desk = w > 760 && !(h >= w && w <= 1100);
      const tab = !desk && w > 760;
      const S = Math.round(desk ? Math.min(h * 0.58, w * 0.32) : tab ? Math.min(h * 0.24, w * 0.5) : Math.min(h * 0.3, w * 0.55));
      if (S < 16) { const r = new Float32Array(N * 2); for (let i = 0; i < N * 2; i += 2) { r[i] = Math.random() * w; r[i + 1] = Math.random() * h; } return r; }
      const oc = document.createElement('canvas');
      oc.width = Math.round(S * 1.5); oc.height = Math.round(S * 1.05);
      const o = oc.getContext('2d');
      o.fillStyle = '#fff'; o.textAlign = 'center'; o.textBaseline = 'middle';
      o.font = `300 ${S}px Newsreader, Georgia, serif`;
      o.fillText(text, oc.width / 2, oc.height / 2 + S * 0.04);
      const data = o.getImageData(0, 0, oc.width, oc.height).data;
      const step = Math.max(2, Math.round(S / 170));
      const pts = [];
      let maxY = 0;
      for (let y = 0; y < oc.height; y += step) for (let x = 0; x < oc.width; x += step) if (data[(y * oc.width + x) * 4 + 3] > 120) { pts.push(x, y); maxY = y; }
      const cx = desk ? w * 0.77 : w * 0.7, cy = desk ? h * 0.36 : tab ? h * 0.2 : h * 0.17;
      const out = new Float32Array(N * 2);
      // Borde inferior real del número dibujado: en móvil y tablet vertical el texto de la sección empieza justo debajo
      out.bottom = desk ? 0 : cy - oc.height / 2 + maxY;
      const count = pts.length / 2 || 1;
      for (let i = 0; i < N; i++) {
        const j = (Math.random() * count | 0) * 2;
        out[i * 2] = cx - oc.width / 2 + (pts[j] || 0) + (Math.random() - 0.5) * step;
        out[i * 2 + 1] = cy - oc.height / 2 + (pts[j + 1] || 0) + (Math.random() - 0.5) * step;
      }
      cache.set(key, out);
      return out;
    }
    function scatter() {
      for (let i = 0; i < N; i++) {
        const k = i * 6;
        P[k] = Math.random() * w; P[k + 1] = Math.random() * h;
        P[k + 4] = Math.random(); P[k + 5] = Math.random() < 0.15 ? 2 : 1.2;
      }
      seeded = true;
    }
    function setShape(text, instant) {
      label = text;
      if (!seeded) scatter();
      const t = targets(text);
      // Al cambiar de sección o de ancho (no cuando el móvil esconde sus barras al hacer scroll, para que el texto no salte)
      if (t.bottom && (!instant || w !== numW)) { numW = w; document.documentElement.style.setProperty('--num-bottom', Math.round(t.bottom) + 'px'); }
      for (let i = 0; i < N; i++) {
        const k = i * 6;
        P[k + 2] = t[i * 2]; P[k + 3] = t[i * 2 + 1];
        if (instant) { P[k] = P[k + 2]; P[k + 1] = P[k + 3]; }
      }
      kick();
    }
    function draw(t) {
      const vis = 1 - clamp(window.scrollY / (h * 0.8), 0, 1);
      ctx.clearRect(0, 0, w, h);
      if (vis <= 0.01) return false;
      const disp = 1 - vis, R = 90, R2 = R * R;
      ctx.fillStyle = '#d4ec8e';
      for (let pass = 0; pass < 2; pass++) {
        ctx.globalAlpha = (pass ? 0.38 : 0.85) * vis;
        for (let i = pass; i < N; i += 2) {
          const k = i * 6, s = P[k + 4];
          let tx = P[k + 2] + Math.sin(t * 0.0011 + s * 40) * 1.6;
          let ty = P[k + 3] + Math.cos(t * 0.0013 + s * 30) * 1.6 - disp * h * (0.15 + s * 0.35);
          tx += (s - 0.5) * disp * w * 0.6;
          let x = P[k] + (tx - P[k]) * 0.075, y = P[k + 1] + (ty - P[k + 1]) * 0.075;
          const dx = x - mx, dy = y - my, dd = dx * dx + dy * dy;
          if (dd < R2 && dd > 0.01) { const d = Math.sqrt(dd), f = (1 - d / R) * 9; x += dx / d * f; y += dy / d * f; }
          P[k] = x; P[k + 1] = y;
          const sz = P[k + 5];
          ctx.fillRect(x, y, sz, sz);
        }
      }
      ctx.globalAlpha = 1;
      return true;
    }
    function frame(t) {
      if (!active || document.hidden) { looping = false; return; }
      const drew = draw(t);
      if (!drew) { looping = false; return; }
      requestAnimationFrame(frame);
    }
    function kick() {
      if (!active) return;
      if (reduce) { for (let i = 0; i < N * 6; i += 6) { P[i] = P[i + 2]; P[i + 1] = P[i + 3]; } draw(0); return; }
      if (!looping) { looping = true; requestAnimationFrame(frame); }
    }
    function showFor(text) {
      active = true;
      const go = () => setShape(text, false);
      if (document.fonts && document.fonts.load) document.fonts.load('300 120px Newsreader').then(go, go); else go();
    }
    function stop() { active = false; ctx.clearRect(0, 0, w, h); }
    if (fine) window.addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; }, { passive: true });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
    resize();
    return { showFor, stop, resize, kick };
  })();

  /* ================= Animaciones de entrada y texto revelado ================= */
  let enteredAt = 0;
  const countUp = root => $$('[data-count]', root).forEach(el => {
    if (reduce) return;
    const n = +el.dataset.count, pre = el.dataset.prefix || '', t0 = now();
    // data-fmt="miles": separador de miles con punto (1.200)
    const fmt = el.dataset.fmt === 'miles' ? v => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : String;
    const step = () => { const p = clamp((now() - t0) / 1200, 0, 1); el.textContent = pre + fmt(Math.round(n * (1 - Math.pow(1 - p, 3)))); if (p < 1) requestAnimationFrame(step); };
    step();
  });
  const io = new IntersectionObserver(entries => {
    const base = now() - enteredAt < 700 ? 0.45 : 0;
    entries.filter(en => en.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      .forEach((en, k) => {
        en.target.style.setProperty('--d', (base + k * 0.08).toFixed(2) + 's');
        en.target.classList.add('in');
        io.unobserve(en.target);
        countUp(en.target);
      });
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });

  const reveals = $$('.reveal-text').map(el => {
    const parts = el.textContent.trim().split(/\s+/);
    el.innerHTML = parts.map(p => `<span class="w">${p}</span>`).join(' ');
    return { el, words: $$('.w', el), n: -1 };
  });
  function updateReveals() {
    const v = views[current];
    if (!v || !body.classList.contains('is-page')) return;
    const vh = innerHeight;
    reveals.forEach(r => {
      if (!v.contains(r.el)) return;
      const rect = r.el.getBoundingClientRect();
      const p = clamp((vh * 0.95 - rect.top) / (vh * 0.5 + rect.height * 0.5), 0, 1);
      const n = Math.round(p * r.words.length);
      if (n === r.n) return;
      const a = Math.min(n, r.n < 0 ? 0 : r.n), b = Math.max(n, r.n < 0 ? r.words.length : r.n);
      for (let i = a; i < b; i++) r.words[i].classList.toggle('on', i < n);
      r.n = n;
    });
  }

  /* ================= Banda «siguiente» y scroll sostenido ================= */
  $$('.next-slot').forEach(slot => {
    const next = slot.dataset.next, lab = labelFor(next);
    const band = document.createElement('footer');
    band.className = 'next-band';
    band.dataset.next = next;
    band.innerHTML = `<div class="wrap">
      <p class="nb-prompt"><span class="who">SELECT data FROM alvaro</span><br><span class="cmd">WHERE section = '${lab.title}';</span><span class="caret" aria-hidden="true"></span></p>
      <div class="nb-row">
        <div class="nb-bar" aria-hidden="true">${'<i></i>'.repeat(32)}</div>
        <p class="nb-hint"><span>Keep scrolling to continue ↓</span><span class="nb-pct">0%</span></p>
        <button class="nb-go" type="button">Go to ${lab.title} →</button>
      </div>
      <div class="nb-foot"><span>© 2026 Álvaro José Torres Baeza</span><nav aria-label="Footer"><a href="${urlFor('inicio')}">Home</a><a href="${urlFor('intro')}">Terminal</a><a href="${urlFor('privacidad')}">Privacy</a><a href="mailto:alvarotorresbaeza@gmail.com" data-ach="conversacion">Email</a><a href="https://www.linkedin.com/in/ajtb" target="_blank" rel="noopener noreferrer" data-ach="conversacion">LinkedIn ↗</a></nav><span>alvarotorresbaeza.com</span></div>
    </div>`;
    $('.nb-go', band).addEventListener('click', () => go(next, 'curtain'));
    slot.replaceWith(band);
  });

  const hold = (() => {
    let p = 0, lastIn = 0, looping = false, segs = [], pct = null, next = null, lit = -1, bottomSince = 0, touchMode = false;
    const SEG = 32;
    // En móvil la barra del navegador cambia la altura visible: se usa el visualViewport y más margen
    const atBottom = slack => {
      const vh = window.visualViewport ? window.visualViewport.height : innerHeight;
      return window.scrollY + vh >= document.documentElement.scrollHeight - slack;
    };
    function bind(view) {
      const band = $('.next-band', view);
      segs = band ? $$('.nb-bar i', band) : [];
      pct = band ? $('.nb-pct', band) : null;
      next = band ? band.dataset.next : null;
      p = 0; lit = -1; bottomSince = 0; render();
    }
    function render() {
      const n = Math.round(p * SEG);
      if (n === lit) return;
      for (let i = 0; i < segs.length; i++) segs[i].classList.toggle('on', i < n);
      lit = n;
      if (pct) pct.textContent = Math.round(p * 100) + '%';
    }
    function ready(touch) {
      if (!next || busy || menu.isOpen() || !body.classList.contains('is-page')) return false;
      if (!atBottom(touch ? 60 : 8)) { bottomSince = 0; return false; }
      if (touch) return true;
      if (!bottomSince) bottomSince = now();
      return now() - bottomSince > 120;
    }
    function add(v, touch) {
      touchMode = !!touch;
      p = Math.min(1, p + v);
      lastIn = now();
      render();
      if (p >= 1) { const n = next; p = 0; ach.unlock('sinfrenos'); go(n, 'curtain'); return; }
      if (!looping) { looping = true; requestAnimationFrame(step); }
    }
    function step() {
      if (now() - lastIn > (touchMode ? 500 : 450)) p = Math.max(0, p - (touchMode ? 0.012 : 0.014));
      render();
      if (p > 0 && !busy) requestAnimationFrame(step); else { looping = false; if (busy) { p = 0; render(); } }
    }
    window.addEventListener('wheel', e => {
      if (e.deltaY <= 0 || !ready()) return;
      const d = e.deltaMode === 1 ? e.deltaY * 40 : e.deltaMode === 2 ? e.deltaY * 800 : e.deltaY;
      // Unas 4-5 vueltas de rueda de ratón (o un gesto corto en el panel táctil) bastan para pasar de sección
      add(clamp(d, 0, 140) / 480);
    }, { passive: true });
    let ty = null;
    window.addEventListener('touchstart', e => { ty = e.touches[0].clientY; }, { passive: true });
    window.addEventListener('touchmove', e => {
      if (ty === null) return;
      const y = e.touches[0].clientY, dy = ty - y;
      ty = y;
      if (dy > 0 && ready(true)) add(Math.min(dy, 80) / 330, true);
    }, { passive: true });
    document.addEventListener('keydown', e => {
      if (!['ArrowDown', 'PageDown', ' ', 'End'].includes(e.key) || /INPUT|TEXTAREA|BUTTON|SELECT/.test(document.activeElement.tagName)) return;
      if (ready()) add(0.25);
    });
    return { bind, poke: ready };
  })();

  /* ================= Scroll global ================= */
  let scrollQueued = false;
  window.addEventListener('scroll', () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => {
      scrollQueued = false;
      topbar.classList.toggle('is-scrolled', window.scrollY > 30);
      updateReveals();
      particles.kick();
      hold.poke();
    });
  }, { passive: true });
  let resizeT = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => { hub.layout(); me.resize(); particles.resize(); updateReveals(); }, 150);
  });

  /* ================= Entrada/salida de vistas ================= */
  const visited = new Set(local.get('visitadas', []));
  on('enter', (key, prev) => {
    const v = views[key];
    if (key === 'inicio') { hub.enter(prev === 'intro'); me.enter(); }
    if (!v.classList.contains('view--page')) { particles.stop(); return; }
    enteredAt = now();
    $$('[data-anim]', v).forEach(el => { el.classList.remove('in'); el.style.removeProperty('--d'); io.observe(el); });
    reveals.forEach(r => { if (v.contains(r.el)) { r.n = -1; r.words.forEach(w => w.classList.remove('on')); } });
    requestAnimationFrame(updateReveals);
    if (v.classList.contains('view--light')) particles.stop(); else particles.showFor(v.dataset.n || '');
    hold.bind(v);
    topbar.classList.remove('is-scrolled');
    if (byKey[key]) {
      visited.add(key);
      local.set('visitadas', [...visited]);
      if (visited.size >= 4) ach.unlock('explorador');
    }
  });
  on('leave', key => { if (key === 'inicio') { hub.leave(); me.leave(); } });

  /* ================= Intro · terminal CRT ================= */
  (function intro() {
    const view = views.intro, form = $('#crt-form'), input = $('#crt-input'), out = $('#crt-out'), screen = $('#crt-content');
    const crtScreen = $('.crt-screen', view), promptLabel = $('label', form), tryBar = $('.crt-try', view);
    const enter = key => {
      if (current !== 'intro' || busy) return;
      ach.unlock('hola');
      session.set('introSeen', true);
      setUrl(key, true);
      transitionTo(key);
    };
    $('#enter-btn').addEventListener('click', () => enter('inicio'));
    // Minúsculas, sin tildes, espacios simples y sin «;» final: así da igual cómo se escriba
    const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').replace(/;+\s*$/, '').trim();
    const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    const ALIAS = { sistema: 'como-trabajo', sap: 'como-trabajo', metodo: 'como-trabajo', metodologia: 'como-trabajo', 'metodologia sap': 'como-trabajo', 'como trabajo': 'como-trabajo', comotrabajo: 'como-trabajo', 'sobre mi': 'sobre-mi', sobremi: 'sobre-mi', about: 'sobre-mi', trabajo: 'trayectoria', servicios: 'proyectos', 'proyectos a medida': 'proyectos', web: 'proyectos', webs: 'proyectos', app: 'proyectos', apps: 'proyectos', ia: 'proyectos',
      // En inglés (sirven en las dos versiones)
      profile: 'perfil', experience: 'trayectoria', career: 'trayectoria', 'how i work': 'como-trabajo', 'how-i-work': 'como-trabajo', method: 'como-trabajo', education: 'formacion', studies: 'formacion', projects: 'proyectos', 'custom projects': 'proyectos', 'about me': 'sobre-mi', 'about-me': 'sobre-mi', contact: 'contacto', privacy: 'privacidad', home: 'inicio' };
    const years = Math.max(1, new Date().getFullYear() - 2020);

    /* ---------- Salida ---------- */
    function print(lines, cls) {
      screen.classList.add('is-session');
      const made = lines.map(l => {
        const p = document.createElement('p');
        p.textContent = l;
        if (cls) p.className = cls;
        out.appendChild(p);
        return p;
      });
      while (out.children.length > 60) out.removeChild(out.firstChild);
      return made;
    }
    const clearOut = () => { out.innerHTML = ''; };

    /* ---------- Modos: comandos, SQL y mensaje ---------- */
    let mode = 'cmd';
    const DEFAULT_TRY = tryBar.innerHTML;
    const PH_CMD = fine ? 'type a command here…' : 'tap and type here…';
    function setMode(m, label, placeholder, chips) {
      mode = m;
      promptLabel.textContent = label;
      input.placeholder = placeholder;
      tryBar.innerHTML = chips ? chips.map(c => `<button type="button" data-cmd="${esc(c)}">${esc(c)}</button>`).join(' ') : DEFAULT_TRY;
      view.classList.toggle('mode-sql', m === 'sql');
    }
    const resetMode = () => setMode('cmd', 'user:~$', PH_CMD, null);
    input.placeholder = PH_CMD;

    /* ---------- Comandos de información ---------- */
    const INFO = {
      ayuda: () => [
        'info ...... whoami · neofetch · rnb · stack · jobs',
        '            project · studies · certs · custom · email · cv',
        'data ...... sql  (query my data with SQL)',
        'contact ... message  (write to me from here)',
        'effects ... matrix · top · scan · shutdown',
        'navigate .. open <section> · enter · exit',
        'sections .. profile · experience · how-i-work · education',
        '            projects · about · contact',
        'extras .... coffee · chess · time · achievements · trophy · clear',
        'history ... arrow keys ↑ ↓',
        'And there are secret commands… “secrets” shows your progress.'
      ],
      whoami: () => ['Álvaro José Torres Baeza', 'Digital transformation with data and AI · Valencia, ES', 'Strategy, architecture and data governance so that', 'leadership decides with reliable data.', 'Next step: Head of Data. Destination: strategy and transformation.', 'Also: custom projects in applied AI, apps and websites.'],
      neofetch: () => [
        'atb@data', '--------',
        'OS ........ ATB·DATA 1.0 LTS',
        'Host ...... Valencia, Spain',
        `Uptime .... ${years} years in data`,
        'Company ... RNB Cosméticos (€301M · 1,200 people)',
        'Role ...... data architecture and governance',
        'Shell ..... SQL',
        'Stack ..... SAP · Datasphere · Fabric · Power BI · Qlik',
        'Certs ..... DP-700 + 3 × Fundamentals',
        'Extra ..... applied AI, custom apps and websites'
      ],
      rnb: () => [
        'RNB Cosméticos · a fast-growing cosmetics manufacturer',
        '€301M in revenue and 1,200 people in 2025,',
        'double-digit growth and acquisitions such as 3INA.',
        'My role: making sure the company has reliable data',
        'and that it reaches leadership decisions.',
        'Type “open experience” to see the details.'
      ],
      stack: () => [
        'source ....... SAP · CDS Views · BAPIs · Fiori',
        'integration .. SQL · ETL · Pipelines',
        'model ........ SAP Datasphere · SQL Server',
        'platform ..... Microsoft Fabric · OneLake · Azure',
        'decision ..... Qlik Sense · Power BI · SSRS'
      ],
      experiencia: () => ['2024 — today RNB Cosméticos', '             Data engineering · architecture and governance', '             Microsoft Fabric platform · SAP model', '             in Datasphere · auditable access', '2020 — 2024  Preference', '             Databases and custom development'],
      proyecto: () => ['Company-wide budget control', 'Designed and led end to end.', '≈30 managers · 7 areas · a single source of data', 'actual spend · committed spend · budget', 'Type “open experience” to see the details.'],
      estudios: () => ['Degree . Computer Engineering · University of Jaén', 'Master’s Big Data & Business Intelligence · INESEM / Nebrija', 'MBA .... Digital Transformation · UPV'],
      certs: () => ['DP-700 .. Fabric Data Engineer Associate', 'Fundamentals:', '  AZ-900 · Azure Fundamentals', '  DP-900 · Azure Data Fundamentals', '  PL-900 · Power Platform Fundamentals'],
      'a-medida': () => ['Custom projects, with the same method I use with data:', '  · applied AI: assistants with RAG and MCP servers', '  · custom apps for your business', '  · websites and portfolios', '  · interactive experiences like this one', 'Type “message” or “open projects”.'],
      email: () => ['alvarotorresbaeza@gmail.com', 'linkedin.com/in/ajtb', 'Or type “message” and I’ll reply myself.'],
      cv: () => { setTimeout(() => window.open(ROOT + 'cv/CV-Alvaro-Torres-Baeza-EN.pdf', '_blank', 'noopener'), 300); return ['Opening the CV (PDF)…', 'alvarotorresbaeza.com/cv/CV-Alvaro-Torres-Baeza-EN.pdf']; },
      cafe: () => ['   ( (', '    ) )', '  .______.', '  |      |]', '  \\      /', "   `----'", 'Coffee’s ready. The data, in a moment.'],
      ajedrez: () => ['1. e4 e5  2. Nf3 Nc6  3. Bb5', 'Ruy López opening: strategy before tactics.'],
      hora: () => [new Date().toLocaleString('en-GB', { timeZone: 'Europe/Madrid' }) + ' · Valencia'],
      logros: () => [`${ach.size()}/${ACH.length} achievements unlocked:`, ...ACH.map(a => (ach.has(a.id) ? '[x] ' + a.name : '[ ] ' + '?'.repeat(Math.max(6, a.name.length - 2))) + ' · ' + a.desc)]
    };
    const INFO_ALIAS = { help: 'ayuda', '?': 'ayuda', comandos: 'ayuda', fetch: 'neofetch', exp: 'experiencia', certificaciones: 'certs', correo: 'email', mail: 'email', linkedin: 'email', redes: 'email', coffee: 'cafe', chess: 'ajedrez', date: 'hora', empresa: 'rnb', servicios: 'a-medida', curriculum: 'cv', 'curriculum vitae': 'cv', resume: 'cv',
      // En inglés («experience» abre la sección; la ficha corta es «jobs»)
      commands: 'ayuda', jobs: 'experiencia', work: 'experiencia', company: 'rnb', project: 'proyecto', studies: 'estudios', certifications: 'certs', custom: 'a-medida', 'custom-projects': 'a-medida', time: 'hora', achievements: 'logros' };

    /* ---------- Motor SQL sobre datos de la web ---------- */
    const T = {
      experience: { cols: ['id', 'company', 'role', 'start', 'end'], rows: [
        [1, 'RNB Cosméticos', 'Data engineering and SAP integration', 2024, 'today'],
        [2, 'Preference', 'Databases and custom development', 2020, 2024]] },
      certs: { cols: ['code', 'name', 'level', 'area'], rows: [
        ['DP-700', 'Fabric Data Engineer', 'Associate', 'Data'],
        ['DP-900', 'Azure Data Fundamentals', 'Fundamentals', 'Data'],
        ['AZ-900', 'Azure Fundamentals', 'Fundamentals', 'Cloud'],
        ['PL-900', 'Power Platform Fundamentals', 'Fundamentals', 'Low code']] },
      stack: { cols: ['tool', 'layer', 'step'], rows: [
        ['SAP', 'source', 1], ['CDS Views', 'source', 1], ['BAPIs', 'source', 1], ['Fiori', 'source', 1],
        ['SQL', 'integration', 2], ['ETL', 'integration', 2], ['Pipelines', 'integration', 2],
        ['SAP Datasphere', 'model', 3], ['SQL Server', 'model', 3],
        ['Microsoft Fabric', 'platform', 4], ['OneLake', 'platform', 4], ['Azure', 'platform', 4],
        ['Qlik Sense', 'decision', 5], ['Power BI', 'decision', 5], ['SSRS', 'decision', 5]] },
      education: { cols: ['type', 'title', 'school'], rows: [
        ['Degree', 'Computer Engineering', 'University of Jaén'],
        ['Master', 'Big Data & Business Intelligence', 'INESEM · Nebrija'],
        ['MBA', 'Digital Transformation', 'UPV']] },
      projects: { cols: ['name', 'scope', 'tech', 'users'], rows: [
        ['Company data platform', 'architecture', 'Microsoft Fabric', 'whole company'],
        ['SAP data model', 'architecture', 'SAP Datasphere', 'finance and operations'],
        ['Access model and permissions audit', 'governance', 'Fabric · Power BI · SAP', 'whole company'],
        ['Budget control', 'business', 'Qlik Sense', '30 managers · 7 areas'],
        ['Product development time matrix', 'business', 'BI', 'product development'],
        ['Migration to Qlik Cloud', 'architecture', 'Qlik', 'whole company']] },
      places: { cols: ['city', 'stage', 'latitude', 'longitude'], rows: [
        ['La Rioja', 'origin', 42.47, -2.45], ['Jaén', 'roots', 37.78, -3.79], ['Valencia', 'present', 39.47, -0.38]] },
      custom: { cols: ['type', 'purpose'], rows: [
        ['Applied AI', 'Assistants with RAG and MCP servers'],
        ['Custom apps', 'Tools for your business'],
        ['Websites and portfolios', 'Presenting you or your business'],
        ['Interactive experiences', 'Websites with animation and 3D']] }
    };
    const TABLES = Object.keys(T);
    const sqlErr = msg => { const e = new Error(msg); e.sql = true; return e; };
    function colIdx(t, name, tname) {
      const i = t.cols.indexOf(name);
      if (i < 0) throw sqlErr(`Table “${tname}” has no column “${name}”. Columns: ${t.cols.join(', ')}.`);
      return i;
    }
    function value(s) {
      s = s.trim();
      const q = s.match(/^'(.*)'$|^"(.*)"$/);
      if (q) return q[1] !== undefined ? q[1] : q[2];
      if (/^-?\d+(\.\d+)?$/.test(s)) return +s;
      return s;
    }
    function compare(a, b) {
      if (typeof a === 'number' && typeof b === 'number') return a - b;
      return norm(a).localeCompare(norm(b), 'es');
    }
    function cond(row, t, tname, text) {
      const m = text.trim().match(/^([a-z_]+)\s*(not like|like|not in|in|<>|!=|>=|<=|=|>|<)\s*(.+)$/);
      if (!m) throw sqlErr(`I don’t understand the filter “${text.trim()}”. Example: WHERE level = 'associate'`);
      const a = row[colIdx(t, m[1], tname)], op = m[2], raw = m[3];
      if (op === 'like' || op === 'not like') {
        const pat = norm(value(raw)).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.');
        const ok = new RegExp('^' + pat + '$').test(norm(a));
        return op === 'like' ? ok : !ok;
      }
      if (op === 'in' || op === 'not in') {
        const list = raw.replace(/^\(|\)$/g, '').split(',').map(value);
        const ok = list.some(v => compare(a, v) === 0);
        return op === 'in' ? ok : !ok;
      }
      const c = compare(a, value(raw));
      return { '=': c === 0, '!=': c !== 0, '<>': c !== 0, '>': c > 0, '<': c < 0, '>=': c >= 0, '<=': c <= 0 }[op];
    }
    function where(row, t, tname, text) {
      const parts = text.split(/\s+(and|or)\s+(?=(?:[^']*'[^']*')*[^']*$)/);
      let res = cond(row, t, tname, parts[0]);
      for (let i = 1; i < parts.length; i += 2) {
        const next = cond(row, t, tname, parts[i + 1]);
        res = parts[i] === 'and' ? res && next : res || next;
      }
      return res;
    }
    function charsWide() {
      const p = document.createElement('p');
      p.className = 'tbl';
      p.innerHTML = '<span class="crt-measure">0000000000</span>';
      out.appendChild(p);
      const w = $('.crt-measure', p).getBoundingClientRect().width / 10 || 9;
      p.remove();
      return Math.max(20, Math.floor(out.clientWidth / w) - 1);
    }
    function table(cols, data) {
      if (!data.length) { print(['0 rows. No record matches the filter.']); return; }
      const cells = data.map(r => r.map(v => String(v)));
      const widths = cols.map((c, i) => Math.min(26, Math.max(c.length, ...cells.map(r => r[i].length))));
      const fit = (s, w) => (s.length > w ? s.slice(0, w - 1) + '…' : s.padEnd(w));
      const total = widths.reduce((a, w) => a + w + 3, 1);
      screen.classList.add('is-session');
      if (total <= charsWide()) {
        const sep = '+' + widths.map(w => '-'.repeat(w + 2)).join('+') + '+';
        const row = r => '| ' + r.map((v, i) => fit(v, widths[i])).join(' | ') + ' |';
        print([sep, row(cols), sep, ...cells.map(row), sep], 'tbl');
      } else {
        // Pantalla estrecha: un registro por bloque, como el modo \G de MySQL
        const pad = Math.max(...cols.map(c => c.length));
        const lines = [];
        cells.forEach((r, n) => { lines.push(`── row ${n + 1} ──`); r.forEach((v, i) => lines.push(`${cols[i].padStart(pad)}: ${v}`)); });
        print(lines, 'tbl');
      }
      print([`${data.length} ${data.length === 1 ? 'row' : 'rows'}.`]);
    }
    function sqlExec(raw) {
      try {
        const q = norm(raw);
        if (/^(show tables|tablas|tables|\.tables|\\dt)$/.test(q)) {
          print(TABLES.map(n => `${n.padEnd(12)} (${T[n].cols.join(', ')})`), 'tbl');
          print(['Use DESCRIBE <table> to see its fields.']);
          return;
        }
        let m = q.match(/^(?:describe|desc|columnas|campos|columns|fields)\s+([a-z_]+)$/);
        if (m) {
          const t = T[m[1]];
          if (!t) throw sqlErr(`Table “${m[1]}” doesn’t exist. Tables: ${TABLES.join(', ')}.`);
          print(t.cols.map((c, i) => `${c.padEnd(12)} ${typeof t.rows[0][i] === 'number' ? 'number' : 'text'}`), 'tbl');
          print([`Example: SELECT ${t.cols.slice(0, 2).join(', ')} FROM ${m[1]};`]);
          return;
        }
        m = q.match(/^select\s+(.+?)\s+from\s+([a-z_]+)(?:\s+where\s+(.+?))?(?:\s+order\s+by\s+([a-z_]+)(?:\s+(asc|desc))?)?(?:\s+limit\s+(\d+))?$/);
        if (!m) throw sqlErr('I don’t understand the query. Try: SELECT * FROM certs;  or type “help”.');
        const [, colsRaw, tname, w, orderCol, dir, limit] = m;
        const t = T[tname];
        if (!t) throw sqlErr(`Table “${tname}” doesn’t exist. Tables: ${TABLES.join(', ')}.`);
        let rows = t.rows.slice();
        if (w) rows = rows.filter(r => where(r, t, tname, w));
        if (orderCol) { const i = colIdx(t, orderCol, tname); rows.sort((a, b) => compare(a[i], b[i]) * (dir === 'desc' ? -1 : 1)); }
        if (limit) rows = rows.slice(0, +limit);
        if (/^count\(\s*\*\s*\)$/.test(colsRaw.trim())) { table(['count'], [[rows.length]]); return; }
        const cols = colsRaw.trim() === '*' ? t.cols : colsRaw.split(',').map(c => c.trim());
        const idx = cols.map(c => colIdx(t, c, tname));
        table(cols, rows.map(r => idx.map(i => r[i])));
      } catch (err) {
        print([err.sql ? err.message : 'Something went wrong with that query. Type “help” to see examples.'], 'err');
      }
    }
    function startSql() {
      setMode('sql', 'sql>', 'SELECT * FROM certs;', ['SHOW TABLES', 'DESCRIBE stack', 'SELECT * FROM certs', 'help', 'exit']);
      print([
        'SQL mode · query my data as if it were a real database.',
        `Tables: ${TABLES.join(' · ')}`,
        'See the fields of a table with: DESCRIBE certs',
        "Example: SELECT name, level FROM certs WHERE level = 'associate';",
        'Upper or lower case and accents don’t matter. “help” = cheat sheet · “exit” = go back.'
      ]);
    }
    function sqlHelp() {
      print([
        'SELECT col1, col2 FROM table ....... pick columns (or * for all)',
        "WHERE field = 'value' .............. filter ( = != > < >= <= )",
        "WHERE field LIKE '%sap%' ........... contains some text",
        "WHERE layer IN ('model', 'source') . is in a list",
        'AND / OR ........................... combine filters',
        'ORDER BY field DESC ................ sort',
        'LIMIT 3 ............................ limit rows',
        'SELECT COUNT(*) FROM table ......... count rows',
        'SHOW TABLES · DESCRIBE table ....... see the structure'
      ], 'tbl');
      print(["Try: SELECT company, start FROM experience ORDER BY start DESC;"]);
    }
    function sqlLine(v) {
      const c = norm(v);
      if (!c) return;
      print(['sql> ' + v], 'cmd');
      if (['salir', 'exit', 'quit', '\\q', 'q'].includes(c)) { resetMode(); print(['You’ve left SQL mode.']); return; }
      if (['ayuda', 'help', '?'].includes(c)) { sqlHelp(); return; }
      if (['limpiar', 'clear', 'cls'].includes(c)) { clearOut(); return; }
      sqlExec(v);
    }

    /* ---------- Mensaje por conversación ---------- */
    let msg = null;
    function startMsg() {
      msg = { step: 'nombre' };
      setMode('msg', 'name>', 'your name', ['cancel']);
      print(['Let’s write me a message. You can type “cancel” at any time.', 'What’s your name?']);
    }
    async function msgStep(v) {
      const c = norm(v);
      if (!c) return;
      print([promptLabel.textContent + ' ' + v], 'cmd');
      if (['cancelar', 'salir', 'cancel', 'exit'].includes(c)) { msg = null; resetMode(); print(['Message cancelled.']); return; }
      if (msg.step === 'nombre') {
        if (v.length < 2) { print(['I need at least your name.']); return; }
        if (v.length > 100) { print(['That name is too long.'], 'err'); return; }
        msg.nombre = v; msg.step = 'camino';
        setMode('msg', 'topic>', '1 or 2', ['1', '2', 'cancel']);
        print([`Nice to meet you, ${v}. What would you like to talk about?`, '  1 · Data opportunities and collaborations', '  2 · Web, app or AI projects']);
      } else if (msg.step === 'camino') {
        const path = { 1: CAMINOS[0], 2: CAMINOS[1], datos: CAMINOS[0], proyectos: CAMINOS[1], proyecto: CAMINOS[1], data: CAMINOS[0], projects: CAMINOS[1], project: CAMINOS[1] }[c];
        if (!path) { print(['Answer “1” or “2”.']); return; }
        msg.camino = path; msg.step = 'email';
        setMode('msg', 'email>', 'you@email.com', ['cancel']);
        print([`${path}. Which email should I reply to?`]);
      } else if (msg.step === 'email') {
        if (v.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { print(['That email doesn’t look valid. Please check it.'], 'err'); return; }
        msg.email = v; msg.step = 'mensaje';
        setMode('msg', 'message>', 'tell me what you need', ['cancel']);
        print(['Perfect. What would you like to tell me?']);
      } else if (msg.step === 'mensaje') {
        if (v.length < 5) { print(['Tell me a little more.']); return; }
        if (v.length > 4000) { print(['That’s a bit long for the terminal. Shorten it or use the contact form.'], 'err'); return; }
        msg.mensaje = v; msg.step = 'ok';
        setMode('msg', 'send?>', 'y / n', ['y', 'n']);
        print(['By sending it you accept the privacy policy (alvarotorresbaeza.com/en/privacy/).', 'Shall I send it? (y/n)']);
      } else if (msg.step === 'ok') {
        if (['n', 'no'].includes(c)) { msg = null; resetMode(); print(['OK, I won’t send it.']); return; }
        if (!['s', 'si', 'y', 'yes'].includes(c)) { print(['Answer “y” to send or “n” to cancel.']); return; }
        const data = msg;
        msg = null;
        resetMode();
        const blocked = sendBlock();
        if (blocked) { print([blocked], 'err'); return; }
        print(['Sending…']);
        try {
          const res = await fetch(FORM_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ nombre: data.nombre, email: data.email, camino: data.camino, mensaje: data.mensaje, origen: 'Terminal de la web (EN)', _subject: 'Nuevo mensaje (EN) desde el terminal de alvarotorresbaeza.com', _template: 'table', _captcha: 'false' })
          });
          const j = await res.json().catch(() => ({}));
          if (!res.ok || String(j.success) !== 'true') throw new Error('envío');
          print(['Message sent. I’ll get back to you as soon as possible.']);
          sendLog();
          ach.unlock('conversacion');
        } catch (_) {
          print(['It couldn’t be sent right now. Write to me at alvarotorresbaeza@gmail.com.'], 'err');
        }
      }
    }

    /* ---------- Efectos ---------- */
    let fxTimer = null, fxRaf = 0;
    function stopFx() {
      clearInterval(fxTimer); clearTimeout(fxTimer); fxTimer = null;
      cancelAnimationFrame(fxRaf); fxRaf = 0;
      const mc = $('.crt-matrix', crtScreen);
      if (mc) mc.remove();
    }
    function matrix() {
      stopFx();
      const r = crtScreen.getBoundingClientRect();
      const c = document.createElement('canvas');
      c.className = 'crt-matrix';
      c.width = Math.round(r.width); c.height = Math.round(r.height);
      crtScreen.insertBefore(c, $('.crt-fx', crtScreen));
      const g = c.getContext('2d'), fs = Math.max(12, Math.round(r.width / 46));
      const cols = Math.ceil(c.width / fs), drops = Array.from({ length: cols }, () => Math.random() * -25);
      const chars = '01SELECTFROMWHEREDATASAPETL{}<>=+*'.split('');
      g.font = `${fs}px VT323, monospace`;
      const t0 = now();
      let last = 0;
      const step = t => {
        if (t - last > 45) {
          last = t;
          g.fillStyle = 'rgba(12,17,9,.2)';
          g.fillRect(0, 0, c.width, c.height);
          g.fillStyle = '#d4ec8e';
          for (let i = 0; i < cols; i++) {
            g.fillText(chars[Math.random() * chars.length | 0], i * fs, drops[i] * fs);
            if (drops[i] * fs > c.height && Math.random() > 0.95) drops[i] = 0;
            drops[i]++;
          }
        }
        if (now() - t0 < 6500 && current === 'intro') { fxRaf = requestAnimationFrame(step); return; }
        fxRaf = 0;
        c.classList.add('out');
        setTimeout(() => c.remove(), 600);
        print(['You’ve seen the code. Now type “sql” and read the real data.']);
      };
      fxRaf = requestAnimationFrame(step);
    }
    function top() {
      stopFx();
      const procs = ['sap-extract', 'etl-pipeline', 'datasphere', 'qlik-dash', 'fabric-lake', 'sql-server', 'curiosity'];
      print(['PID'.padEnd(5) + 'PROCESS'.padEnd(13) + 'CPU'.padEnd(10) + '   %'], 'tbl');
      const lines = print(procs.map(() => ''), 'tbl');
      let n = 0;
      const tick = () => {
        lines.forEach((p, i) => {
          const cpu = procs[i] === 'curiosity' ? 92 + Math.random() * 8 : 5 + Math.random() * 60;
          p.textContent = `${String(1200 + i * 7).padEnd(5)}${procs[i].padEnd(13)}${'|'.repeat(Math.round(cpu / 10)).padEnd(10)}${cpu.toFixed(0).padStart(4)}%`;
        });
        if (++n > 14) { clearInterval(fxTimer); fxTimer = null; print(['The “curiosity” process always runs at full power.']); }
      };
      tick();
      fxTimer = setInterval(tick, 380);
    }
    function scan() {
      stopFx();
      const [bar] = print([''], 'tbl');
      let pct = 0;
      const tick = () => {
        pct = Math.min(100, pct + 4 + Math.random() * 9);
        bar.textContent = `Scanning [${'#'.repeat(Math.round(pct / 100 * 14)).padEnd(14, '.')}] ${Math.round(pct)}%`;
        if (pct < 100) return;
        clearInterval(fxTimer); fxTimer = null;
        print(['Scan result:', '  curiosity .......... high', '  patience ........... enough to get this far', '  interest in data ... likely', 'Recommendation: type “message” and let’s talk.']);
      };
      fxTimer = setInterval(tick, 140);
    }
    function powerOff() {
      stopFx();
      screen.classList.add('crt-off');
      fxTimer = setTimeout(() => {
        clearOut();
        screen.classList.remove('is-session', 'crt-off');
        fxTimer = null;
      }, 1700);
    }
    function hack() {
      stopFx();
      const steps = ['Connecting to mainframe.alvaro…', 'Bypassing the firewall… [OK]', 'Cracking passwords… ********', 'Extracting the secret database…', 'ERROR 403 · ACCESS DENIED', 'This system only opens with a good conversation.', 'Try “message”.'];
      let i = 0;
      fxTimer = setInterval(() => {
        print([steps[i]], i === 4 ? 'alert' : '');
        if (++i >= steps.length) { clearInterval(fxTimer); fxTimer = null; }
      }, 420);
    }

    /* ---------- Comandos secretos ---------- */
    const SECRETS = {
      ojo: { label: 'eye', hint: 'watches you from every section header', run: () => print(['    .-"""-.', "   /  .-.  \\", '  |  ( o )  |', "   \\  '-'  /", "    '-...-'", 'I see you. And I see the data too… when it’s well modelled.'], 'art') },
      triangulo: { label: 'triangle', hint: 'the shape of your cursor', run: () => print(['      /\\', '     /  \\', '    / ·  \\', '   /______\\', 'Three sides, three places: La Rioja, Jaén and Valencia.'], 'art') },
      hack: { hint: 'what an intruder would try', run: hack },
      rioja: { hint: 'where it all began', run: () => print(['Land of vineyards. Good processes, like wine, need their time.']) },
      jaen: { hint: 'olive trees and calm', run: () => print(['A sea of olive trees. Data, like olive oil: best clean and first-pressed.']) },
      valencia: { hint: 'the present', run: () => print(['Light, sea and well-modelled data. This is where things get built.']) },
      nietzsche: { hint: 'the first one on the shelf', run: () => print(['“He who has a why to live can bear almost any how.”', 'In data: whoever has a what-for can bear any ETL.']) },
      seneca: { hint: 'a Stoic with a name of his own', run: () => print(['“It is not that we have a short time to live, but that we waste a lot of it.”', 'That’s why I automate the data loads.']) },
      '42': { hint: 'the answer to everything', run: () => print(['42. But what was the question? Without a question, data is useless.']) },
      xyzzy: { hint: 'magic word from the old text adventures', run: () => print(['Nothing happens.', '(Well, something does: you’ve just found a secret.)']) },
      ping: { hint: 'is anybody out there?', run: () => print(['PING alvarotorresbaeza.com', 'pong · 12 ms from Valencia', 'There’s someone on the other side. Type “message”.']) },
      'rm -rf': { hint: 'the most dangerous command', run: () => print(['rm: cannot remove “/”: the data is backed up.', 'Nice try.']) }
    };
    const SECRET_ALIAS = { eye: 'ojo', triangle: 'triangulo', hacker: 'hack', vino: 'rioja', 'la rioja': 'rioja', olivo: 'jaen', olivos: 'jaen', aceite: 'jaen', seneca: 'seneca', 'el sentido de la vida': '42' };
    const secretFound = new Set(local.get('secretos', []));
    function secretKey(c) {
      if (c.startsWith('rm ')) return 'rm -rf';
      const k = SECRET_ALIAS[c] || c;
      return SECRETS[k] ? k : null;
    }
    function findSecret(k) {
      SECRETS[k].run();
      if (secretFound.has(k)) return;
      secretFound.add(k);
      local.set('secretos', [...secretFound]);
      const total = Object.keys(SECRETS).length;
      setTimeout(() => print([secretFound.size === total
        ? `Secret ${total}/${total}! You’ve found them all. You’re my kind of person: type “message”.`
        : `Secret found · ${secretFound.size}/${total}`], 'alert'), k === 'hack' ? 3200 : 120);
    }
    function listSecrets() {
      const keys = Object.keys(SECRETS);
      print([`Secrets found: ${secretFound.size}/${keys.length}`]);
      print(keys.map(k => {
        const nm = SECRETS[k].label || k, name = secretFound.has(k) ? nm : nm[0] + '·'.repeat(Math.max(1, nm.length - 1));
        return `${secretFound.has(k) ? '▲' : '△'} ${name.padEnd(11)} ${secretFound.has(k) ? '' : '— ' + SECRETS[k].hint}`;
      }), 'tbl');
    }

    /* ---------- Intérprete ---------- */
    function run(raw) {
      const v = raw.trim();
      if (mode === 'msg') { msgStep(v); return; }
      if (mode === 'sql') { stopFx(); sqlLine(v); return; }
      const c = norm(v);
      if (!c) { enter('inicio'); return; }
      stopFx();
      print(['user:~$ ' + v], 'cmd');
      if (['entrar', 'inicio', 'start', 'enter', 'login', 'salir', 'exit', 'home'].includes(c)) { ach.unlock('terminal'); enter('inicio'); return; }
      if (['limpiar', 'clear', 'cls'].includes(c)) { clearOut(); screen.classList.remove('is-session'); return; }
      if (c === 'terminal') { print(['You’re already in the terminal. Type “enter” to go back to the site.']); return; }
      if (c === 'trofeo' || c === 'trophy') {
        const left = ACH.length - ach.size();
        if (left <= 0) showTrophy(); else print([`${left === 1 ? '1 achievement' : `${left} achievements`} left to win the trophy.`]);
        return;
      }
      if (c.startsWith('sudo')) { print(['Permission denied. Try “message”.']); return; }
      if (['sql', 'mysql', 'psql', 'sqlite'].includes(c)) { ach.unlock('terminal'); startSql(); return; }
      if (['mensaje', 'contactar', 'escribeme', 'hablar', 'hablame', 'contacta', 'message', 'msg', 'write', 'talk'].includes(c)) { ach.unlock('terminal'); startMsg(); return; }
      if (c === 'matrix') { ach.unlock('terminal'); matrix(); return; }
      if (c === 'top' || c === 'htop') { ach.unlock('terminal'); top(); return; }
      if (c === 'scan') { ach.unlock('terminal'); scan(); return; }
      if (['apagar', 'shutdown', 'reboot', 'reiniciar', 'poweroff'].includes(c)) { ach.unlock('terminal'); powerOff(); return; }
      if (c === 'secretos' || c === 'secrets') { ach.unlock('terminal'); listSecrets(); return; }
      const sk = secretKey(c);
      if (sk) { ach.unlock('terminal'); findSecret(sk); return; }
      // Una consulta SQL escrita directamente sobre una tabla de datos
      const sel = c.match(/^select\s+.+\s+from\s+([a-z_]+)/);
      if ((sel && T[sel[1]]) || /^(show tables|describe |desc )/.test(c)) { ach.unlock('terminal'); sqlExec(v); return; }
      const info = INFO[INFO_ALIAS[c] || c];
      if (info) { ach.unlock('terminal'); print(info()); return; }
      const nav = (sel && [sel[0], sel[1]]) || c.match(/^(?:abrir|open|cd|ir)\s+(.+)$/);
      let key = nav ? nav[1] : c;
      key = ALIAS[key] || key.replace(/\s+/g, '-');
      if (key === 'experiencia') key = 'trayectoria';
      if (key === 'certs' || key === 'estudios') key = 'formacion';
      if (views[key] && key !== 'intro') { ach.unlock('terminal'); print(['Opening ' + labelFor(key).title + '…']); setTimeout(() => enter(key), 450); return; }
      print([`Command not found: ${v}. Type “help”.`]);
    }

    /* ---------- Entrada: historial con flechas y sugerencias pulsables ---------- */
    const hist = [];
    let hIdx = 0;
    form.addEventListener('submit', e => {
      e.preventDefault();
      const v = input.value;
      input.value = '';
      if (v.trim() && mode !== 'msg' && hist[hist.length - 1] !== v.trim()) hist.push(v.trim());
      hIdx = hist.length;
      run(v);
    });
    input.addEventListener('keydown', e => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      if (!hist.length || mode === 'msg') return;
      e.preventDefault();
      hIdx = clamp(hIdx + (e.key === 'ArrowUp' ? -1 : 1), 0, hist.length);
      input.value = hist[hIdx] || '';
      requestAnimationFrame(() => input.setSelectionRange(input.value.length, input.value.length));
    });
    tryBar.addEventListener('click', e => {
      const b = e.target.closest('[data-cmd]');
      if (!b) return;
      run(b.dataset.cmd);
      if (fine) input.focus({ preventScroll: true });
    });
    const hint = $('.intro-hint', view);
    if (hint) hint.textContent = fine ? 'or type a command on the screen' : 'or tap the screen to type';
    crtScreen.addEventListener('click', e => { if (!e.target.closest('button, a')) input.focus(); });

    /* ---------- Móvil: con el teclado abierto, el terminal ocupa solo la parte visible ---------- */
    if (!fine) {
      const vv = window.visualViewport;
      const fit = () => {
        if (!view.classList.contains('kb')) return;
        view.style.top = (vv ? vv.offsetTop : 0) + 'px';
        view.style.height = (vv ? vv.height : innerHeight) + 'px';
        view.style.bottom = 'auto';
      };
      const reset = () => { view.classList.remove('kb'); view.style.top = view.style.height = view.style.bottom = ''; };
      input.addEventListener('focus', () => { view.classList.add('kb'); screen.classList.add('is-session'); fit(); setTimeout(fit, 250); setTimeout(fit, 600); });
      input.addEventListener('blur', () => setTimeout(() => {
        if (document.activeElement === input) return;
        reset();
        if (!out.children.length) screen.classList.remove('is-session');
      }, 150));
      if (vv) { vv.addEventListener('resize', fit); vv.addEventListener('scroll', fit); }
      on('leave', key => { if (key === 'intro') { input.blur(); reset(); } });
    }

    /* ---------- Entrada y salida de la vista ---------- */
    let introAt = 0, acc = 0, trophyPending = false;
    const settled = () => now() - introAt > 1200;
    on('enter', key => {
      if (key !== 'intro') return;
      introAt = now(); acc = 0;
      clearOut();
      msg = null;
      resetMode();
      screen.classList.remove('is-session', 'crt-off');
      if (trophyPending) { trophyPending = false; setTimeout(showTrophy, reduce ? 0 : 900); return; }
      if (fine) setTimeout(() => { if (current === 'intro') input.focus({ preventScroll: true }); }, 1600);
    });
    on('leave', key => { if (key === 'intro') { stopFx(); ach.setOpen(false); } });
    // Logros conseguidos mientras se navegaba por la web: se cuentan al volver al terminal
    on('enter', key => {
      if (key !== 'intro') return;
      const f = ach.takeFresh();
      if (f.length) setTimeout(() => ach.toast(`<b>${f.length === 1 ? 'New achievement' : f.length + ' new achievements'} · ${ach.size()}/${ACH.length}</b><span>${f.join(' · ')}</span>`), reduce ? 0 : 1400);
    });

    /* ---------- Trofeo final: al completar los 8 logros ---------- */
    const TROPHY = [
      '      ___________',
      '     (___________)',
      '    /|    ATB    |\\',
      '   ( |   8 / 8   | )',
      '    \\|           |/',
      '      \\         /',
      "       '._   _.'",
      '          | |',
      '        __|_|__',
      '       |_______|'
    ];
    function showTrophy() {
      clearOut();
      print(TROPHY, 'art');
      print(['All achievements unlocked!']);
      const p = document.createElement('p');
      p.className = 'crt-talk';
      p.innerHTML = '<button type="button">Talk to me</button>';
      $('button', p).addEventListener('click', () => enter('contacto'));
      out.appendChild(p);
      print(['Press “Talk to me” or type “message”.']);
    }
    function goTrophy() {
      if (current === 'intro') { showTrophy(); return; }
      if (busy) { setTimeout(goTrophy, 400); return; }
      if (menu.isOpen()) menu.close(true);
      ach.setOpen(false);
      trophyPending = true;
      go('intro', 'curtain');
    }
    on('logros-completos', goTrophy);

    /* ---------- Gestos para entrar en la web ---------- */
    view.addEventListener('wheel', e => { if (e.deltaY > 0 && settled() && mode === 'cmd') { acc += e.deltaY; if (acc > 140) enter('inicio'); } }, { passive: true });
    let sy = null;
    view.addEventListener('touchstart', e => { sy = e.touches[0].clientY; }, { passive: true });
    view.addEventListener('touchend', e => { if (sy !== null && settled() && mode === 'cmd' && sy - e.changedTouches[0].clientY > 60) enter('inicio'); sy = null; }, { passive: true });
    document.addEventListener('keydown', e => {
      if (current !== 'intro' || busy || !settled() || document.activeElement === input) return;
      if (['Enter', 'ArrowDown', ' '].includes(e.key) && document.activeElement.tagName !== 'BUTTON') { e.preventDefault(); enter('inicio'); }
    });
    drawPortrait();

    /* ---------- Ajuste: si el texto no cabe en la pantalla del monitor, se reduce hasta que encaje ---------- */
    const nameEl = $('.crt-name', view), portraitEl = $('.crt-portrait-box', view);
    function fitCrt() {
      if (current !== 'intro') return;
      screen.style.fontSize = ''; nameEl.style.fontSize = '';
      screen.classList.remove('no-portrait');
      const base = parseFloat(getComputedStyle(screen).fontSize), baseName = parseFloat(getComputedStyle(nameEl).fontSize);
      let k = 1;
      while (screen.scrollHeight > screen.clientHeight + 2 && k > 0.62) {
        k -= 0.06;
        screen.style.fontSize = (base * k).toFixed(2) + 'px';
        nameEl.style.fontSize = (baseName * k).toFixed(2) + 'px';
      }
      if (portraitEl && portraitEl.clientHeight < 70) screen.classList.add('no-portrait');
    }
    on('enter', key => { if (key === 'intro') requestAnimationFrame(fitCrt); });
    window.addEventListener('resize', () => requestAnimationFrame(fitCrt));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => requestAnimationFrame(fitCrt));
    setTimeout(fitCrt, 1200);
  })();

  /* Retrato tramado (dither) de assets/retrato.jpg: 1 = píxel encendido. Lo usan el terminal y el inicio. */
  function portraitBits(src, W, H) {
    const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    const o = document.createElement('canvas'); o.width = W; o.height = H;
    const g = o.getContext('2d');
    if (src) {
      const s = Math.max(W / src.width, H / src.height);
      const dw = src.width * s, dh = src.height * s;
      g.drawImage(src, (W - dw) / 2, (H - dh) / 2, dw, dh);
    } else {
      const grad = g.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#fff'); grad.addColorStop(1, '#555');
      g.fillStyle = grad;
      g.font = `${Math.round(H * 0.95)}px "Segoe UI Symbol","Noto Sans Symbols 2","DejaVu Sans",serif`;
      g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      g.fillText('♞', W / 2, H * 0.9);
    }
    const d = g.getImageData(0, 0, W, H).data, bits = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      let l = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255 * (d[i + 3] / 255);
      if (src) {
        const ex = (x - W / 2) / (W * 0.55), ey = (y - H * 0.55) / (H * 0.62);
        l = clamp((l - 0.08) * 1.35, 0, 1) * clamp(1.25 - Math.sqrt(ex * ex + ey * ey), 0, 1);
      }
      if (l > (BAYER[(y % 4) * 4 + (x % 4)] + 0.5) / 16) bits[y * W + x] = 1;
    }
    return bits;
  }
  /* Retrato para la pantalla CRT */
  function drawPortrait() {
    const cv = $('#crt-portrait');
    if (!cv) return;
    const ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
    function paint(src) {
      const bits = portraitBits(src, W, H), res = ctx.createImageData(W, H), r = res.data;
      for (let p = 0; p < bits.length; p++) if (bits[p]) { const i = p * 4; r[i] = 212; r[i + 1] = 236; r[i + 2] = 142; r[i + 3] = 255; }
      ctx.putImageData(res, 0, 0);
    }
    const img = new Image();
    img.onload = () => paint(img);
    img.onerror = () => paint(null);
    img.src = ROOT + 'assets/retrato.jpg';
  }

  /* ================= Mascota «Dato» ================= */
  const MASCOT = '<svg viewBox="0 0 64 76" aria-hidden="true"><g class="body"><path d="M6 15v44c0 5 11.6 9 26 9s26-4 26-9V15" fill="#b9d26f"/><ellipse cx="32" cy="15" rx="26" ry="9" fill="#d4ec8e"/><path d="M6 50c0 5 11.6 9 26 9s26-4 26-9" fill="none" stroke="#8fa64c" stroke-width="1.6"/><g class="eyes"><circle cx="23" cy="33" r="6.2" fill="#fff"/><circle cx="41" cy="33" r="6.2" fill="#fff"/><circle class="pupil" cx="23" cy="33" r="2.9" fill="#141a12"/><circle class="pupil" cx="41" cy="33" r="2.9" fill="#141a12"/></g><path d="M27 43q5 4.5 10 0" stroke="#141a12" stroke-width="2.2" fill="none" stroke-linecap="round"/></g></svg>';
  const mascots = $$('[data-mascot]');
  mascots.forEach(m => { m.innerHTML = MASCOT; });
  if (fine && !reduce) {
    let mq = false, px = 0, py = 0;
    window.addEventListener('pointermove', e => {
      px = e.clientX; py = e.clientY;
      if (mq) return;
      mq = true;
      requestAnimationFrame(() => {
        mq = false;
        mascots.forEach(m => {
          if (!m.offsetParent) return;
          const r = m.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height * 0.43;
          const a = Math.atan2(py - cy, px - cx), d = Math.min(2.6, Math.hypot(px - cx, py - cy) / 60);
          const t = `translate(${(Math.cos(a) * d).toFixed(2)}px,${(Math.sin(a) * d).toFixed(2)}px)`;
          $$('.pupil', m).forEach(p => { p.style.transform = t; });
        });
      });
    }, { passive: true });
  }

  /* ================= Ojo (detalle sutil en la cabecera de cada sección) ================= */
  const EYE = '<svg viewBox="0 0 44 26" aria-hidden="true"><g class="lid"><path class="almond" d="M2 13Q22-3 42 13 22 29 2 13Z"/><circle class="iris" cx="22" cy="13" r="6.4"/><circle class="pupil" cx="22" cy="13" r="2.7"/><circle class="glint" cx="24.2" cy="10.8" r="1.1"/></g></svg>';
  // Pista escondida: al pulsar el ojo tres veces, sugiere un comando secreto del terminal
  let eyeClicks = 0;
  $$('.view--page .page-hero').forEach(h => {
    const s = document.createElement('span');
    s.className = 'eye-mark';
    s.innerHTML = EYE;
    s.addEventListener('click', () => {
      const lid = $('.lid', s);
      if (lid && lid.animate && !reduce) lid.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(.08)' }, { transform: 'scaleY(1)' }], { duration: 260 });
      if (++eyeClicks === 3) ach.toast('<b>Hint</b><span>Type “eye” in the terminal</span>');
    });
    h.appendChild(s);
  });
  try { console.log('%cPoking around the code? Type “hack” in the site’s terminal.', 'color:#d4ec8e;font:14px monospace'); } catch (_) {}
  if (fine && !reduce) {
    let eq = false, ex = 0, ey = 0;
    window.addEventListener('pointermove', e => {
      ex = e.clientX; ey = e.clientY;
      if (eq) return;
      eq = true;
      requestAnimationFrame(() => {
        eq = false;
        const v = views[current], eye = v && $('.eye-mark', v);
        if (!eye) return;
        const r = eye.getBoundingClientRect();
        if (r.bottom < 0) return;
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const a = Math.atan2(ey - cy, ex - cx), d = Math.min(4.5, Math.hypot(ex - cx, ey - cy) / 60);
        const t = `translate(${(Math.cos(a) * d * 1.3).toFixed(2)}px,${(Math.sin(a) * d * 0.7).toFixed(2)}px)`;
        $$('.iris, .pupil, .glint', eye).forEach(c => { c.style.transform = t; });
      });
    }, { passive: true });
  }

  /* ================= Cursor propio (solo con ratón): triángulo con punto y estela ================= */
  if (fine) (function cursor() {
    const root = document.documentElement;
    const el = document.createElement('div');
    el.className = 'cursor';
    el.setAttribute('aria-hidden', 'true');
    // Flecha: triángulo con punto y «palito», inclinada como un puntero; la punta (0,0) es la que hace clic
    el.innerHTML = '<svg viewBox="-3 -3 26 26"><g transform="rotate(-35)"><path class="c-out" d="M0 0 7 13H-7Z M0 13V22"/><path class="c-in" d="M0 0 7 13H-7Z"/><path class="c-stem" d="M0 13V22"/><circle class="c-dot" cy="8.6" r="1.6"/></g></svg>';
    const cv = document.createElement('canvas');
    cv.className = 'cursor-trail';
    cv.setAttribute('aria-hidden', 'true');
    document.body.append(cv, el);
    const ctx = cv.getContext('2d');
    const LIFE = 420;
    const INTERACTIVE = 'a, button, input, textarea, label, select, [role="button"], .tile, .plate-top, .crt-screen';
    let pts = [], looping = false, shown = false;
    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    window.addEventListener('resize', size);
    function hide() { shown = false; root.classList.remove('cursor-on'); el.style.opacity = 0; }
    function draw() {
      const t0 = now();
      while (pts.length && t0 - pts[0].t > LIFE) pts.shift();
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ctx.fillStyle = '#d4ec8e';
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i], k = 1 - (t0 - p.t) / LIFE, s = 1.2 + k * 3.6;
        ctx.globalAlpha = k * 0.42;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - s);
        ctx.lineTo(p.x + s * 0.87, p.y + s * 0.5);
        ctx.lineTo(p.x - s * 0.87, p.y + s * 0.5);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (pts.length) requestAnimationFrame(draw); else looping = false;
    }
    window.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') { if (shown) hide(); return; }
      const x = e.clientX, y = e.clientY;
      el.style.transform = `translate3d(${x}px,${y}px,0)`;
      if (!shown) { shown = true; root.classList.add('cursor-on'); el.style.opacity = 1; }
      el.classList.toggle('is-hover', !!(e.target.closest && e.target.closest(INTERACTIVE)));
      if (reduce) return;
      const last = pts[pts.length - 1];
      if (!last || Math.hypot(x - last.x, y - last.y) > 6) pts.push({ x, y, t: now() });
      if (!looping) { looping = true; requestAnimationFrame(draw); }
    }, { passive: true });
    window.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') el.classList.add('is-down'); }, { passive: true });
    window.addEventListener('pointerup', () => el.classList.remove('is-down'), { passive: true });
    root.addEventListener('mouseleave', () => { el.style.opacity = 0; });
    root.addEventListener('mouseenter', () => { if (shown) el.style.opacity = 1; });
    window.addEventListener('blur', () => { el.style.opacity = 0; });
  })();

  /* ================= Estantería ================= */
  (function shelf() {
    const books = $$('#shelf .book'), seen = new Set();
    books.forEach((b, i) => b.addEventListener('pointerenter', () => { seen.add(i); if (seen.size === books.length) ach.unlock('lector'); }));
  })();

  /* Enlaces que llevan al formulario con un camino ya marcado (p. ej. desde «Proyectos a medida») */
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-topic]');
    if (!t) return;
    const radio = $(`#cform input[name="camino"][data-path="${t.dataset.topic}"]`);
    if (radio) radio.checked = true;
  });

  /* ================= Contacto ================= */
  const FORM_ENDPOINT = 'https://formsubmit.co/ajax/alvarotorresbaeza@gmail.com';
  // Freno a envíos repetidos desde un mismo navegador: 1 minuto entre envíos y máximo 3 por hora
  const SEND_GAP = 60e3, SEND_MAX = 3, HOUR = 36e5;
  const sendBlock = () => {
    const t = Date.now(), log = local.get('envios', []).filter(x => t - x < HOUR);
    if (log.length && t - log[log.length - 1] < SEND_GAP) return 'You’ve just sent me a message. Please wait a minute before sending another.';
    if (log.length >= SEND_MAX) return 'You’ve already sent me several messages. I’ll reply soon; if it’s urgent, write to me at alvarotorresbaeza@gmail.com.';
    return '';
  };
  const sendLog = () => { const t = Date.now(); local.set('envios', [...local.get('envios', []).filter(x => t - x < HOUR), t]); };
  (function contact() {
    const form = $('#cform'), status = $('#f-status'), send = $('#f-send');
    const setStatus = (msg, cls) => { status.textContent = msg; status.className = 'fstatus ' + (cls || ''); };
    // Una persona tarda más de 4 segundos en rellenar el formulario; un robot, no
    let startedAt = 0;
    const markStart = () => { if (!startedAt) startedAt = now(); };
    form.addEventListener('focusin', markStart);
    form.addEventListener('input', markStart);
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const f = form.elements;
      const camino = $('input[name="camino"]:checked', form);
      const paths = $('.paths', form);
      paths.classList.toggle('is-invalid', !camino);
      if (!camino) {
        setStatus('Choose what you’d like to talk about: data opportunities or a custom project.', 'err');
        $('input[name="camino"]', form).focus();
        return;
      }
      const checks = [
        [f.nombre, f.nombre.value.trim().length > 1],
        [f.email, /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.value.trim())],
        [f.mensaje, f.mensaje.value.trim().length > 4],
        [f.acepto, f.acepto.checked]
      ];
      checks.forEach(([el, ok]) => el.setAttribute('aria-invalid', String(!ok)));
      const bad = checks.find(([, ok]) => !ok);
      if (bad) {
        setStatus(bad[0] === f.acepto ? 'Tick the privacy policy box so it can be sent.' : 'Check the highlighted fields: name, a valid email and your message.', 'err');
        bad[0].focus();
        return;
      }
      if (f._honey.value || !startedAt || now() - startedAt < 4000) { setStatus('Message sent. I’ll get back to you as soon as possible.', 'ok'); form.reset(); return; }
      const blocked = sendBlock();
      if (blocked) { setStatus(blocked, 'err'); return; }
      send.disabled = true;
      setStatus('Sending…');
      try {
        const res = await fetch(FORM_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ camino: camino.value, nombre: f.nombre.value.trim(), empresa: f.empresa.value.trim(), email: f.email.value.trim(), mensaje: f.mensaje.value.trim(), _subject: `Nuevo mensaje (EN) · ${camino.value}`, _template: 'table', _captcha: 'false' })
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || String(j.success) !== 'true') throw new Error(j.message || 'error');
        setStatus('Message sent. I’ll get back to you as soon as possible.', 'ok');
        sendLog();
        form.reset();
        startedAt = now();
        ach.unlock('conversacion');
      } catch (_) {
        setStatus('It couldn’t be sent right now. Write to me directly at alvarotorresbaeza@gmail.com.', 'err');
      }
      send.disabled = false;
    });
    form.addEventListener('input', e => {
      if (e.target.getAttribute('aria-invalid') === 'true') e.target.removeAttribute('aria-invalid');
      if (e.target.name === 'camino') $('.paths', form).classList.remove('is-invalid');
    });
    const copyBtn = $('#copy-mail'), addr = $('#mail-addr');
    copyBtn.addEventListener('click', () => {
      const flash = t => { copyBtn.textContent = t; setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1800); };
      const fallback = () => { const r = document.createRange(); r.selectNodeContents(addr); const s = getSelection(); s.removeAllRanges(); s.addRange(r); flash('Selected'); };
      try { navigator.clipboard.writeText(addr.textContent.trim()).then(() => flash('Copied'), fallback); } catch (_) { fallback(); }
    });
    $('#clear-local').addEventListener('click', () => {
      local.clear(); session.clear(); visited.clear(); ach.reset();
      $('#clear-msg').textContent = 'Local data deleted.';
    });
  })();

  /* ================= Sistema 3D ================= */
  (function stack3d() {
    const LAYERS = [
      { code: '01', name: 'Source', title: 'SAP ecosystem', short: 'SAP', sub: 'CDS Views · BAPIs · Fiori',
        lead: 'Data is born in operations: orders, materials, customers, production. Understanding how it is generated is the first step towards trusting it.',
        question: 'Where is this data really born?',
        does: ['Extraction and integration from SAP with CDS Views and BAPIs', 'Reading the business logic behind each table', 'Support for Fiori processes and applications', 'Identifying the reliable source of each KPI'],
        tools: ['SAP', 'CDS Views', 'BAPIs', 'Fiori'] },
      { code: '02', name: 'Integration', title: 'ETL and pipelines', short: 'ETL', sub: 'SQL · Pipelines',
        lead: 'Moving data between systems without it losing its context along the way. Processes that run on their own and raise an alert when something fails.',
        question: 'Does it arrive complete, on time and with its context?',
        does: ['Design and maintenance of ETL processes', 'Automated, scheduled loads', 'Error handling and traceability for every load', 'Validation right from the source'],
        tools: ['SQL', 'ETL', 'Pipelines', 'SQL Server'] },
      { code: '03', name: 'Model', title: 'Datasphere and SQL Server', short: 'Model', sub: 'Datasphere · SQL Server',
        lead: 'A shared model so that sales, operations and finance mean the same thing when they say “order” or “margin”.',
        question: 'Does it mean the same thing to every area?',
        does: ['Data modelling in SAP Datasphere and SQL Server', 'Business definitions shared across areas', 'Data quality: completeness, consistency, duplicates', 'Documentation designed to make the model last'],
        tools: ['SAP Datasphere', 'SQL Server', 'Data Modeling', 'Data Quality'] },
      { code: '04', name: 'Platform', title: 'Microsoft Fabric', short: 'Fabric', sub: 'OneLake · Azure',
        lead: 'A unified platform where storage, engineering and analytics share the same space. Backed by the Fabric Data Engineer certification (DP-700).',
        question: 'Can it grow without becoming fragile?',
        does: ['Centralised storage in OneLake', 'Data engineering inside Fabric', 'An architecture ready for new sources and uses', 'Integration with the Azure ecosystem'],
        tools: ['Microsoft Fabric', 'OneLake', 'Azure', 'Power BI'] },
      { code: '05', name: 'Decision', title: 'Analytics', short: 'Analytics', sub: 'Qlik · Power BI · SSRS',
        lead: 'Reports and dashboards that answer specific business questions. It is the last layer of the flow, and the only one most people ever see.',
        question: 'Which decision changes with this information?',
        does: ['Qlik Sense dashboards for every area', 'Operational reports with SSRS', 'Analysis and exploration with Qlik and Power BI', 'Translating business needs into metrics'],
        tools: ['Qlik Sense', 'Power BI', 'SSRS'] }
    ];
    const N = LAYERS.length, GAP = 64, EXPLODE = 58, LIFT = 10;
    const HT = (N - 1) * GAP + EXPLODE + LIFT;
    const viz = $('#viz'), stage = $('#viz-stage'), stack = $('#stack'), index = $('#layer-index');
    const detail = $('#detail-body'), count = $('#viz-count');
    const playBtn = $('#play-tour'), playLabel = $('#play-label'), playIcon = $('#play-icon'), playBar = $('#play-bar');
    stack.style.setProperty('--lift', (-HT / 2) + 'px');
    stack.style.setProperty('--h', HT + 'px');
    [[0.1, 0.1], [0.9, 0.1], [0.1, 0.9], [0.9, 0.9]].forEach(([x, y]) => {
      const p = document.createElement('div'); p.className = 'pillar';
      p.style.cssText = `left:${x * 100}%;top:${y * 100}%;height:${HT}px`; stack.appendChild(p);
    });
    [[0.1, 0.1, 0], [0.9, 0.9, 1.3], [0.1, 0.9, 2.5], [0.9, 0.1, 0.7], [0.5, 0.5, 1.9], [0.3, 0.7, 3.1]].forEach(([x, y, d]) => {
      const p = document.createElement('div'); p.className = 'particle';
      p.style.cssText = `left:${x * 100}%;top:${y * 100}%;animation-delay:${d}s`; stack.appendChild(p);
    });
    const plates = LAYERS.map((L, i) => {
      const p = document.createElement('div'); p.className = 'plate'; p.dataset.i = i;
      p.innerHTML = `<div class="plate-side plate-side--s"></div><div class="plate-side plate-side--e"></div><div class="plate-side plate-side--n"></div><div class="plate-side plate-side--w"></div><div class="plate-top"><div class="pt-head"><span class="pt-code">${L.code}</span><span>${L.name}</span></div><div><span class="pt-title">${L.short}</span><span class="pt-sub">${L.sub}</span></div></div>`;
      stack.appendChild(p); return p;
    });
    const buttons = LAYERS.map((L, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'li-btn'; b.dataset.i = i;
      b.setAttribute('aria-pressed', 'false'); b.setAttribute('aria-controls', 'layer-detail');
      b.innerHTML = `<span class="li-code">${L.code}</span><span>${L.name}</span>`;
      b.addEventListener('click', () => select(i));
      b.addEventListener('mouseenter', () => plates[i].classList.add('is-hover'));
      b.addEventListener('mouseleave', () => plates[i].classList.remove('is-hover'));
      return b;
    });
    [...buttons].reverse().forEach(b => index.appendChild(b));
    let selected = 0, shown = -1;
    const seenLayers = new Set();
    function render() {
      plates.forEach((p, i) => {
        p.style.transform = `translateZ(${i * GAP + (i > selected ? EXPLODE : 0) + (i === selected ? LIFT : 0)}px)`;
        p.classList.toggle('is-active', i === selected);
      });
      buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(i === selected)));
      count.innerHTML = `Layer <b>${LAYERS[selected].code}</b> of 0${N}`;
      if (shown !== selected) {
        shown = selected;
        const L = LAYERS[selected];
        detail.innerHTML = `<p class="d-kicker"><span>Layer ${L.code} / 0${N}</span><span>${L.name}</span></p><h3 class="d-title">${L.title}</h3><p class="d-lead">${L.lead}</p><div class="d-q"><p class="d-label">Key question</p><p class="d-question">${L.question}</p></div><div><p class="d-label">What I do</p><ul class="ticks">${L.does.map(d => `<li>${d}</li>`).join('')}</ul></div><div><p class="d-label">Tools</p><div class="chips">${L.tools.map(t => `<span class="chip">${t}</span>`).join('')}</div></div>`;
        if (!reduce && detail.animate) detail.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: EASE_OUT });
      }
      seenLayers.add(selected);
      if (seenLayers.size === N) ach.unlock('flujo');
    }
    function select(i, fromTour) { selected = (i + N) % N; if (!fromTour) stopTour(); render(); }
    const STEP = 3200;
    let tourTimer = null;
    function restartBar() { playBar.style.animation = 'none'; void playBar.offsetWidth; playBar.style.animation = `fill ${STEP}ms linear forwards`; }
    function tourStep() { restartBar(); tourTimer = setTimeout(() => { if (selected < N - 1) { select(selected + 1, true); tourStep(); } else stopTour(); }, STEP); }
    function startTour() { playBtn.setAttribute('aria-pressed', 'true'); playLabel.textContent = 'Pause the tour'; playIcon.innerHTML = '<path d="M2 1h3v10H2zM7 1h3v10H7z"/>'; select(0, true); tourStep(); }
    function stopTour() {
      if (tourTimer === null && playBtn.getAttribute('aria-pressed') === 'false') return;
      clearTimeout(tourTimer); tourTimer = null;
      playBtn.setAttribute('aria-pressed', 'false'); playLabel.textContent = 'Play the flow';
      playIcon.innerHTML = '<path d="M2 1v10l9-5z"/>'; playBar.style.animation = 'none';
    }
    playBtn.addEventListener('click', () => (tourTimer ? stopTour() : startTour()));
    $('#prev-layer').addEventListener('click', () => select(selected - 1));
    $('#next-layer').addEventListener('click', () => select(selected + 1));
    viz.addEventListener('keydown', e => {
      const up = e.key === 'ArrowUp' || e.key === 'ArrowRight', dn = e.key === 'ArrowDown' || e.key === 'ArrowLeft';
      if (!up && !dn) return;
      e.preventDefault(); select(selected + (up ? 1 : -1));
      if (document.activeElement && document.activeElement.classList.contains('li-btn')) buttons[selected].focus();
    });

    const CAMS = { iso: { rx: 58, rz: 45 }, front: { rx: 80, rz: 0 }, top: { rx: 24, rz: 45 } };
    const ZOOMS = [0.7, 0.85, 1, 1.15, 1.3, 1.45];
    const view = { rx: 58, rz: 45 }, cur = { rx: 58, rz: 45 };
    const normD = d => ((Math.round(d) % 360) + 360) % 360;
    const stackPos = stack.parentElement, readout = $('#viz-readout');
    const camBtns = $$('[data-cam]'), zoomBtns = $$('[data-zoom]');
    let zi = 2, vel = 0, drag = null, interacted = false, visible = false, rafId = 0, lastReadout = '', spun = 0;
    function apply() {
      stack.style.setProperty('--rx', cur.rx.toFixed(2) + 'deg');
      stack.style.setProperty('--rz', cur.rz.toFixed(2) + 'deg');
      const txt = `Rotation <b>${normD(cur.rz)}°</b> · Tilt <b>${Math.round(cur.rx)}°</b>`;
      if (txt !== lastReadout) { readout.innerHTML = txt; lastReadout = txt; }
    }
    function markCam() {
      camBtns.forEach(b => { const v = CAMS[b.dataset.cam]; b.setAttribute('aria-pressed', String(Math.abs(v.rx - view.rx) < 1 && Math.abs(normD(v.rz) - normD(view.rz)) < 1)); });
    }
    function spin(d) { spun += Math.abs(d); if (spun >= 360) ach.unlock('vuelta'); }
    function tick(t) {
      if (!drag) {
        if (Math.abs(vel) > 0.02) { view.rz += vel; spin(vel); vel *= 0.93; markCam(); } else vel = 0;
      }
      let trz = view.rz, trx = view.rx;
      if (!interacted) { trz += Math.sin(t / 2800) * 6; trx += Math.sin(t / 3700) * 2; }
      const k = drag ? 0.35 : 0.1;
      cur.rx += (trx - cur.rx) * k; cur.rz += (trz - cur.rz) * k;
      apply();
      rafId = visible ? requestAnimationFrame(tick) : 0;
    }
    function settle() { markCam(); if (reduce) { cur.rx = view.rx; cur.rz = view.rz; apply(); } }
    function setCam(rx, rz) { interacted = true; vel = 0; view.rx = rx; view.rz = rz + 360 * Math.round((view.rz - rz) / 360); settle(); }
    function setZoom(i) {
      zi = clamp(i, 0, ZOOMS.length - 1);
      stackPos.style.setProperty('--zoom', ZOOMS[zi]);
      zoomBtns[0].disabled = zi === 0; zoomBtns[1].disabled = zi === ZOOMS.length - 1;
    }
    camBtns.forEach(b => b.addEventListener('click', () => { const v = CAMS[b.dataset.cam]; setCam(v.rx, v.rz); }));
    $$('[data-rotate]').forEach(b => b.addEventListener('click', () => { interacted = true; vel = 0; const d = +b.dataset.rotate; view.rz += d; spin(d); settle(); }));
    zoomBtns.forEach(b => b.addEventListener('click', () => setZoom(zi + +b.dataset.zoom)));
    stage.addEventListener('wheel', e => { if (!e.ctrlKey) return; e.preventDefault(); setZoom(zi + (e.deltaY < 0 ? 1 : -1)); }, { passive: false });
    stage.addEventListener('dblclick', () => setCam(CAMS.iso.rx, CAMS.iso.rz));
    stage.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const plate = e.target.closest('.plate');
      vel = 0;
      drag = { x: e.clientX, y: e.clientY, lastX: e.clientX, lastT: now(), rx: view.rx, rz: view.rz, moved: false, plate: plate ? +plate.dataset.i : null, id: e.pointerId };
    });
    stage.addEventListener('pointermove', e => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 4) {
        drag.moved = true; interacted = true; stage.classList.add('is-dragging');
        try { stage.setPointerCapture(drag.id); } catch (_) {}
      }
      if (!drag.moved) return;
      const prev = view.rz;
      view.rz = drag.rz + dx * 0.5;
      view.rx = clamp(drag.rx - dy * 0.3, 10, 85);
      spin(view.rz - prev);
      vel = vel * 0.5 + (e.clientX - drag.lastX) * 0.25;
      drag.lastX = e.clientX; drag.lastT = now();
      settle();
    });
    function endDrag() {
      if (!drag) return;
      if (!drag.moved && drag.plate !== null) select(drag.plate);
      if (now() - drag.lastT > 90 || reduce) vel = 0;
      vel = clamp(vel, -12, 12);
      stage.classList.remove('is-dragging');
      drag = null;
    }
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', () => { if (drag) { drag.plate = null; endDrag(); } });
    setZoom(zi);
    if (reduce) apply();
    else new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible && !rafId) rafId = requestAnimationFrame(tick); }).observe(stage);
    render();
  })();

  /* ================= Teclado global ================= */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && ach.isOpen()) ach.setOpen(false);
  });

  /* ================= Arranque ================= */
  // Cada página llega con su vista marcada en el HTML; se recalcula desde la dirección por si acaso.
  // Un #antiguo (/#trayectoria) se cambia por su ruta nueva (/trayectoria/) sin recargar.
  const start = keyFromLocation() || 'inicio';
  $$('.view.is-active').forEach(v => v.classList.remove('is-active'));
  if (ROUTE === 'path' && location.hash.length > 1 && views[start]) setUrl(start, true);
  show(start);
})();
