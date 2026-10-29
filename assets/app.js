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
    { key: 'perfil', n: '01', title: 'Perfil', sub: 'Hacer que los datos signifiquen algo', tag: 'Ingeniería de datos' },
    { key: 'trayectoria', n: '02', title: 'Trayectoria', sub: '2020 — hoy', tag: 'RNB · Preference' },
    { key: 'sap', n: '03', title: 'SAP', sub: 'Metodología · del dato a la decisión', tag: 'Metodología' },
    { key: 'metodo', n: '04', title: 'Método', sub: 'Del dato al propósito', tag: 'D · I · C · P' },
    { key: 'sobre-mi', n: '05', title: 'Sobre mí', sub: 'Tres lugares, una mirada', tag: 'Rioja · Jaén · Valencia' },
    { key: 'formacion', n: '06', title: 'Formación', sub: 'Grado · Máster · MBA', tag: '5 certificaciones' },
    { key: 'servicios', n: '07', title: 'Servicios', sub: '¿Quieres una web como esta?', tag: 'Diseño web' },
    { key: 'contacto', n: '08', title: 'Contacto', sub: '¿Tienes un problema de datos?', tag: 'Escríbeme' }
  ];
  const byKey = Object.fromEntries(SECTIONS.map(s => [s.key, s]));
  const LABELS = { intro: { n: '>_', title: 'Terminal' }, inicio: { n: '00', title: 'Inicio' }, privacidad: { n: '§', title: 'Privacidad' } };
  // La vista de entrada (intro) se publica en la dirección #terminal
  const hashFor = k => (k === 'intro' ? 'terminal' : k);
  const HASH_ALIAS = { terminal: 'intro', agenda: 'contacto', sistema: 'sap', intro: null };
  const keyForHash = h => (Object.prototype.hasOwnProperty.call(HASH_ALIAS, h) ? HASH_ALIAS[h] : h);
  const labelFor = k => byKey[k] || LABELS[k] || { n: '', title: k };

  const MOTIF = {
    perfil: '<div class="m"></div>',
    trayectoria: '<div class="m"><i data-y="2020"></i><i data-y="2024"></i><i data-y="hoy"></i></div>',
    sap: '<div class="m">' + [4, 3, 2, 1, 0].map(k => `<i style="--k:${k}"></i>`).join('') + '</div>',
    metodo: '<div class="m">' + [0, 1, 2, 3].map(k => `<i style="--k:${k}"></i>`).join('') + '</div>',
    'sobre-mi': '<div class="m">&#x265E;&#xFE0E;</div>',
    formacion: '<div class="m"><i>DP-700</i><i>DP-900</i><i>AZ-900</i><i>PL-900</i><i>MOS-200</i></div>',
    servicios: '<div class="m"><span class="m-bar"><i></i><i></i><i></i></span><span class="m-l m-l1"></span><span class="m-l m-l2"></span><span class="m-l m-l3"></span><span class="m-cur"></span></div>',
    contacto: '<div class="m">@</div>'
  };
  const coverHTML = s => `<div class="cover cv-${s.key}">${MOTIF[s.key]}<span class="cover-num">${s.n}</span><span class="cover-tag">${s.tag}</span><div class="cover-txt"><b class="cover-title">${s.title}</b><span class="cover-sub">${s.sub}</span></div></div>`;

  /* ================= Logros ================= */
  const ACH = [
    { id: 'hola', name: '¡Hola, mundo!', desc: 'Entra en la web desde el terminal' },
    { id: 'terminal', name: 'Usuario avanzado', desc: 'Escribe un comando en el terminal' },
    { id: 'explorador', name: 'Explorador', desc: 'Visita cuatro secciones distintas' },
    { id: 'flujo', name: 'Flujo completo', desc: 'Recorre las cinco capas del flujo SAP' },
    { id: 'vuelta', name: 'Vuelta completa', desc: 'Gira el modelo 3D una vuelta entera' },
    { id: 'lector', name: 'Ratón de biblioteca', desc: 'Pasa por todos los libros de la estantería' },
    { id: 'sinfrenos', name: 'Sin frenos', desc: 'Llena la barra para pasar de sección' },
    { id: 'conversacion', name: 'Primera conversación', desc: 'Escríbeme por el formulario, correo o LinkedIn' }
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
    function unlock(id) {
      if (got.has(id)) return;
      const a = ACH.find(x => x.id === id);
      if (!a) return;
      got.add(id);
      local.set('logros', [...got]);
      render();
      toast(`<b>Logro ${got.size}/${ACH.length}</b><span>${a.name}</span>`);
      if (got.size === ACH.length) {
        toast('<b>Completado</b><span>Has desbloqueado todos los logros</span>');
        setTimeout(() => emit('logros-completos'), 2400);
      }
    }
    function setOpen(open) {
      panel.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
    }
    toggle.addEventListener('click', e => { e.stopPropagation(); setOpen(panel.hidden); });
    document.addEventListener('click', e => { if (!panel.hidden && !panel.contains(e.target) && e.target !== toggle) setOpen(false); });
    function reset() { got = new Set(); render(); }
    render();
    return { unlock, setOpen, reset, toast, isOpen: () => !panel.hidden, size: () => got.size };
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
  const keyFromHash = () => {
    const k = keyForHash(decodeURIComponent(location.hash.slice(1)));
    return k && views[k] ? k : null;
  };
  function go(key, how, src) {
    if (busy) return;
    if (key === current) { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); return; }
    const hash = '#' + hashFor(key);
    if (location.hash !== hash) history.pushState(null, '', hash);
    transitionTo(key, how, src);
  }
  async function transitionTo(key, how, src) {
    if (busy || !views[key]) return;
    busy = true;
    try {
      if (reduce) show(key);
      else if (current === 'intro' && key !== 'intro') await introExit(key);
      else if (how === 'flip' && src) await flipOpen(src, key);
      else await curtain(key);
    } catch (_) { show(key); }
    busy = false;
  }
  history.scrollRestoration = 'manual';
  window.addEventListener('popstate', () => {
    const k = keyFromHash() || 'inicio';
    if (k !== current) transitionTo(k, 'curtain');
  });
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const k = keyForHash(a.getAttribute('href').slice(1));
    if (!k || !views[k]) return;
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

  /* Salida de la intro: la pantalla sube como un telón y revela el destino */
  async function introExit(key) {
    session.set('introSeen', true);
    ach.unlock('hola');
    const intro = views.intro, dest = views[key];
    intro.style.zIndex = 6;
    dest.classList.add('is-active');
    current = key;
    setBodyState(key);
    emit('leave', 'intro');
    emit('enter', key, 'intro');
    const a = intro.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-100%)' }], { duration: 1100, easing: EASE_IO, fill: 'forwards' });
    $('.crt', intro).animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(18%) scale(.88)', opacity: .4 }], { duration: 1100, easing: EASE_IO, fill: 'forwards' });
    await done(a, 1100);
    intro.classList.remove('is-active');
    intro.getAnimations({ subtree: true }).forEach(x => x.cancel());
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
      links.forEach(a => a.classList.toggle('is-current', a.getAttribute('href') === '#' + hashFor(current)));
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
          el.innerHTML = `<div class="tile-inner">${coverHTML(SECTIONS[idx])}</div>`;
          stage.appendChild(el);
          tiles.push({ el, c, r, idx, cx: 0, cy: 0 });
        }
      }
    }
    function layout() {
      build();
      const ow = W, oh = H;
      vw = innerWidth; vh = innerHeight;
      const small = vw < 700;
      W = Math.round(small ? vw * 0.66 : clamp(vw * 0.25, 280, 460));
      H = Math.round(W * 0.68);
      G = Math.round(W * (small ? 0.07 : 0.075));
      spanW = EC * (W + G); spanH = ER * (H + G);
      tiles.forEach(t => { t.el.style.width = W + 'px'; t.el.style.height = H + 'px'; });
      if (!placed) {
        ox = vw / 2 - (COLS * (W + G) - G) / 2;
        oy = vh / 2 - (ROWS * (H + G) - G) / 2;
        placed = true;
      } else if (ow) { ox *= W / ow; oy *= H / oh; }
      dirty = true;
    }
    const wrap = (v, span, center) => ((v - (center - span / 2)) % span + span) % span + (center - span / 2);
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
        t.el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,${z.toFixed(1)}px) rotateY(${ry.toFixed(2)}deg) rotateX(${rx.toFixed(2)}deg)`;
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
        go(SECTIONS[idx].key, 'flip', $('.tile-inner', down.tile));
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

  /* ================= Partículas (número de sección) ================= */
  const particles = (() => {
    const cv = $('#particles'), ctx = cv.getContext('2d');
    const N = fine && innerWidth > 900 ? 2200 : 800;
    const P = new Float32Array(N * 6); // x, y, tx, ty, seed, size
    let w = 0, h = 0, label = null, active = false, looping = false, mx = -9999, my = -9999, seeded = false;
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
      const desk = w > 760;
      const S = Math.round(desk ? Math.min(h * 0.58, w * 0.32) : Math.min(h * 0.3, w * 0.55));
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
      for (let y = 0; y < oc.height; y += step) for (let x = 0; x < oc.width; x += step) if (data[(y * oc.width + x) * 4 + 3] > 120) pts.push(x, y);
      const cx = desk ? w * 0.77 : w * 0.7, cy = desk ? h * 0.36 : h * 0.17;
      const out = new Float32Array(N * 2);
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
    const step = () => { const p = clamp((now() - t0) / 1200, 0, 1); el.textContent = pre + Math.round(n * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); };
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
      <p class="nb-prompt"><span class="who">SELECT datos FROM alvaro</span><br><span class="cmd">WHERE sección = '${lab.title}';</span><span class="caret" aria-hidden="true"></span></p>
      <div class="nb-row">
        <div class="nb-bar" aria-hidden="true">${'<i></i>'.repeat(32)}</div>
        <p class="nb-hint"><span>Sigue deslizando para continuar ↓</span><span class="nb-pct">0%</span></p>
        <button class="nb-go" type="button">Ir a ${lab.title} →</button>
      </div>
      <div class="nb-foot"><span>© 2026 Álvaro José Torres Baeza</span><nav aria-label="Pie"><a href="#inicio">Inicio</a><a href="#terminal">Terminal</a><a href="#privacidad">Privacidad</a><a href="mailto:alvarotorresbaeza@gmail.com" data-ach="conversacion">Correo</a><a href="https://www.linkedin.com/in/ajtb" target="_blank" rel="noopener noreferrer" data-ach="conversacion">LinkedIn ↗</a><a href="https://www.instagram.com/alvarojtb/" target="_blank" rel="noopener noreferrer" data-ach="conversacion">Instagram ↗</a></nav><span>alvarotorresbaeza.com</span></div>
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
      return now() - bottomSince > 260;
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
      if (now() - lastIn > (touchMode ? 500 : 170)) p = Math.max(0, p - (touchMode ? 0.012 : 0.028));
      render();
      if (p > 0 && !busy) requestAnimationFrame(step); else { looping = false; if (busy) { p = 0; render(); } }
    }
    window.addEventListener('wheel', e => {
      if (e.deltaY <= 0 || !ready()) return;
      const d = e.deltaMode === 1 ? e.deltaY * 40 : e.deltaMode === 2 ? e.deltaY * 800 : e.deltaY;
      add(clamp(d, 0, 140) / 1300);
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
      if (ready()) add(0.14);
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
    resizeT = setTimeout(() => { hub.layout(); particles.resize(); updateReveals(); }, 150);
  });

  /* ================= Entrada/salida de vistas ================= */
  const visited = new Set(local.get('visitadas', []));
  on('enter', (key, prev) => {
    const v = views[key];
    if (key === 'inicio') hub.enter(prev === 'intro');
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
  on('leave', key => { if (key === 'inicio') hub.leave(); });

  /* ================= Intro · terminal CRT ================= */
  (function intro() {
    const view = views.intro, form = $('#crt-form'), input = $('#crt-input'), out = $('#crt-out'), screen = $('#crt-content');
    const crtScreen = $('.crt-screen', view), promptLabel = $('label', form), tryBar = $('.crt-try', view);
    const enter = key => {
      if (current !== 'intro' || busy) return;
      ach.unlock('hola');
      session.set('introSeen', true);
      history.replaceState(null, '', '#' + key);
      transitionTo(key);
    };
    $('#enter-btn').addEventListener('click', () => enter('inicio'));
    // Minúsculas, sin tildes, espacios simples y sin «;» final: así da igual cómo se escriba
    const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').replace(/;+\s*$/, '').trim();
    const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    const ALIAS = { sistema: 'sap', metodologia: 'sap', 'metodologia sap': 'sap', 'sobre mi': 'sobre-mi', sobremi: 'sobre-mi', about: 'sobre-mi', trabajo: 'trayectoria', web: 'servicios', webs: 'servicios', cv: 'perfil' };
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
    const PH_CMD = fine ? 'escribe aquí un comando…' : 'toca y escribe aquí…';
    function setMode(m, label, placeholder, chips) {
      mode = m;
      promptLabel.textContent = label;
      input.placeholder = placeholder;
      tryBar.innerHTML = chips ? chips.map(c => `<button type="button" data-cmd="${esc(c)}">${esc(c)}</button>`).join(' ') : DEFAULT_TRY;
      view.classList.toggle('mode-sql', m === 'sql');
    }
    const resetMode = () => setMode('cmd', 'usuario:~$', PH_CMD, null);
    input.placeholder = PH_CMD;

    /* ---------- Comandos de información ---------- */
    const INFO = {
      ayuda: () => [
        'info ...... whoami · neofetch · stack · experiencia · proyecto',
        '            estudios · certs · servicios · email',
        'datos ..... sql  (consulta mis datos con SQL)',
        'contacto .. mensaje  (escríbeme desde aquí)',
        'efectos ... matrix · top · scan · apagar',
        'navegar ... abrir <sección> · entrar · salir',
        'secciones . perfil · trayectoria · sap · metodo · sobre-mi',
        '            formacion · servicios · contacto',
        'extras .... cafe · ajedrez · hora · logros · trofeo · limpiar',
        'historial . flechas ↑ ↓',
        'Y hay comandos secretos… «secretos» muestra tu progreso.'
      ],
      whoami: () => ['Álvaro José Torres Baeza', 'Ingeniería de datos e integración SAP · Valencia, ES', 'También diseño y desarrollo webs a medida.'],
      neofetch: () => [
        'atb@datos', '---------',
        'SO ........ ATB·DATA 1.0 LTS',
        'Host ...... Valencia, España',
        `Uptime .... ${years} años en datos`,
        'Empresa ... RNB Cosméticos',
        'Shell ..... SQL',
        'Stack ..... SAP · SQL Server · Qlik · Fabric',
        'Certs ..... 5 × Microsoft',
        'Extra ..... diseño web a medida'
      ],
      stack: () => [
        'origen ....... SAP · CDS Views · BAPIs · Fiori',
        'integración .. SQL · ETL · Pipelines',
        'modelo ....... SAP Datasphere · SQL Server',
        'plataforma ... Microsoft Fabric · OneLake · Azure',
        'decisión ..... Qlik Sense · Power BI · SSRS'
      ],
      experiencia: () => ['2024 — hoy   RNB Cosméticos', '             Ingeniería de datos e integración SAP', '2020 — 2024  Preference', '             Bases de datos y desarrollo a medida'],
      proyecto: () => ['Control presupuestario · Qlik Sense', '≈30 usuarios · todas las áreas de la compañía', 'gasto real · gasto comprometido · presupuesto', 'Escribe «abrir trayectoria» para ver el detalle.'],
      estudios: () => ['Grado .. Ingeniería Informática · Universidad de Jaén', 'Máster . Big Data & Business Intelligence · INESEM / Nebrija', 'MBA .... Transformación Digital · UPV'],
      certs: () => ['DP-700 .. Fabric Data Engineer Associate', 'DP-900 .. Azure Data Fundamentals', 'AZ-900 .. Azure Fundamentals', 'PL-900 .. Power Platform Fundamentals', 'MOS-200 . Microsoft Office Specialist · Excel'],
      servicios: () => ['Diseño y desarrollo de webs a medida:', '  · portfolios y marca personal', '  · webs para proyectos y negocios', '  · experiencias interactivas como esta', 'Escribe «mensaje» o «abrir servicios».'],
      email: () => ['alvarotorresbaeza@gmail.com', 'linkedin.com/in/ajtb', 'instagram.com/alvarojtb', 'O escribe «mensaje» y te contesto yo.'],
      cafe: () => ['   ( (', '    ) )', '  .______.', '  |      |]', '  \\      /', "   `----'", 'Café listo. Los datos, en un momento.'],
      ajedrez: () => ['1. e4 e5  2. Cf3 Cc6  3. Ab5', 'Apertura española: estrategia antes que táctica.'],
      hora: () => [new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }) + ' · Valencia'],
      logros: () => [`${ach.size()}/${ACH.length} logros desbloqueados. Ábrelos desde «Logros» dentro de la web.`]
    };
    const INFO_ALIAS = { help: 'ayuda', '?': 'ayuda', comandos: 'ayuda', fetch: 'neofetch', exp: 'experiencia', certificaciones: 'certs', correo: 'email', mail: 'email', linkedin: 'email', instagram: 'email', redes: 'email', coffee: 'cafe', chess: 'ajedrez', date: 'hora' };

    /* ---------- Motor SQL sobre datos de la web ---------- */
    const T = {
      experiencia: { cols: ['id', 'empresa', 'puesto', 'desde', 'hasta'], rows: [
        [1, 'RNB Cosméticos', 'Ingeniería de datos e integración SAP', 2024, 'hoy'],
        [2, 'Preference', 'Bases de datos y desarrollo a medida', 2020, 2024]] },
      certs: { cols: ['codigo', 'nombre', 'nivel', 'area'], rows: [
        ['DP-700', 'Fabric Data Engineer', 'Associate', 'Datos'],
        ['DP-900', 'Azure Data Fundamentals', 'Fundamentals', 'Datos'],
        ['AZ-900', 'Azure Fundamentals', 'Fundamentals', 'Cloud'],
        ['PL-900', 'Power Platform Fundamentals', 'Fundamentals', 'Bajo código'],
        ['MOS-200', 'Office Specialist · Excel', 'Specialist', 'Ofimática']] },
      stack: { cols: ['herramienta', 'capa', 'orden'], rows: [
        ['SAP', 'origen', 1], ['CDS Views', 'origen', 1], ['BAPIs', 'origen', 1], ['Fiori', 'origen', 1],
        ['SQL', 'integración', 2], ['ETL', 'integración', 2], ['Pipelines', 'integración', 2],
        ['SAP Datasphere', 'modelo', 3], ['SQL Server', 'modelo', 3],
        ['Microsoft Fabric', 'plataforma', 4], ['OneLake', 'plataforma', 4], ['Azure', 'plataforma', 4],
        ['Qlik Sense', 'decisión', 5], ['Power BI', 'decisión', 5], ['SSRS', 'decisión', 5]] },
      estudios: { cols: ['tipo', 'titulo', 'centro'], rows: [
        ['Grado', 'Ingeniería Informática', 'Universidad de Jaén'],
        ['Máster', 'Big Data & Business Intelligence', 'INESEM · Nebrija'],
        ['MBA', 'Transformación Digital', 'UPV']] },
      proyectos: { cols: ['nombre', 'herramienta', 'usuarios', 'areas'], rows: [
        ['Control presupuestario', 'Qlik Sense', 30, 'Todas']] },
      lugares: { cols: ['ciudad', 'etapa', 'latitud', 'longitud'], rows: [
        ['La Rioja', 'origen', 42.47, -2.45], ['Jaén', 'raíces', 37.78, -3.79], ['Valencia', 'presente', 39.47, -0.38]] },
      servicios: { cols: ['servicio', 'para'], rows: [
        ['Portfolio y marca personal', 'Presentarte con una web propia'],
        ['Webs para proyectos y negocios', 'Presentar un servicio o producto'],
        ['Experiencias interactivas', 'Webs con animación y 3D']] }
    };
    const TABLES = Object.keys(T);
    const sqlErr = msg => { const e = new Error(msg); e.sql = true; return e; };
    function colIdx(t, name, tname) {
      const i = t.cols.indexOf(name);
      if (i < 0) throw sqlErr(`La tabla «${tname}» no tiene la columna «${name}». Columnas: ${t.cols.join(', ')}.`);
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
      if (!m) throw sqlErr(`No entiendo el filtro «${text.trim()}». Ejemplo: WHERE nivel = 'associate'`);
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
      if (!data.length) { print(['0 filas. Ningún registro cumple el filtro.']); return; }
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
        cells.forEach((r, n) => { lines.push(`── fila ${n + 1} ──`); r.forEach((v, i) => lines.push(`${cols[i].padStart(pad)}: ${v}`)); });
        print(lines, 'tbl');
      }
      print([`${data.length} ${data.length === 1 ? 'fila' : 'filas'}.`]);
    }
    function sqlExec(raw) {
      try {
        const q = norm(raw);
        if (/^(show tables|tablas|tables|\.tables|\\dt)$/.test(q)) {
          print(TABLES.map(n => `${n.padEnd(12)} (${T[n].cols.join(', ')})`), 'tbl');
          print(['Usa DESCRIBE <tabla> para ver sus campos.']);
          return;
        }
        let m = q.match(/^(?:describe|desc|columnas|campos)\s+([a-z_]+)$/);
        if (m) {
          const t = T[m[1]];
          if (!t) throw sqlErr(`No existe la tabla «${m[1]}». Tablas: ${TABLES.join(', ')}.`);
          print(t.cols.map((c, i) => `${c.padEnd(12)} ${typeof t.rows[0][i] === 'number' ? 'número' : 'texto'}`), 'tbl');
          print([`Ejemplo: SELECT ${t.cols.slice(0, 2).join(', ')} FROM ${m[1]};`]);
          return;
        }
        m = q.match(/^select\s+(.+?)\s+from\s+([a-z_]+)(?:\s+where\s+(.+?))?(?:\s+order\s+by\s+([a-z_]+)(?:\s+(asc|desc))?)?(?:\s+limit\s+(\d+))?$/);
        if (!m) throw sqlErr('No entiendo la consulta. Prueba: SELECT * FROM certs;  o escribe «ayuda».');
        const [, colsRaw, tname, w, orderCol, dir, limit] = m;
        const t = T[tname];
        if (!t) throw sqlErr(`No existe la tabla «${tname}». Tablas: ${TABLES.join(', ')}.`);
        let rows = t.rows.slice();
        if (w) rows = rows.filter(r => where(r, t, tname, w));
        if (orderCol) { const i = colIdx(t, orderCol, tname); rows.sort((a, b) => compare(a[i], b[i]) * (dir === 'desc' ? -1 : 1)); }
        if (limit) rows = rows.slice(0, +limit);
        if (/^count\(\s*\*\s*\)$/.test(colsRaw.trim())) { table(['count'], [[rows.length]]); return; }
        const cols = colsRaw.trim() === '*' ? t.cols : colsRaw.split(',').map(c => c.trim());
        const idx = cols.map(c => colIdx(t, c, tname));
        table(cols, rows.map(r => idx.map(i => r[i])));
      } catch (err) {
        print([err.sql ? err.message : 'Algo ha fallado con esa consulta. Escribe «ayuda» para ver ejemplos.'], 'err');
      }
    }
    function startSql() {
      setMode('sql', 'sql>', 'SELECT * FROM certs;', ['SHOW TABLES', 'DESCRIBE stack', 'SELECT * FROM certs', 'ayuda', 'salir']);
      print([
        'Modo SQL · consulta mis datos como en una base de datos real.',
        `Tablas: ${TABLES.join(' · ')}`,
        'Mira los campos de una tabla con: DESCRIBE certs',
        "Ejemplo: SELECT nombre, nivel FROM certs WHERE nivel = 'associate';",
        'Mayúsculas, minúsculas y tildes dan igual. «ayuda» = chuleta · «salir» = volver.'
      ]);
    }
    function sqlHelp() {
      print([
        'SELECT col1, col2 FROM tabla ....... elegir columnas (o * para todas)',
        "WHERE campo = 'valor' .............. filtrar ( = != > < >= <= )",
        "WHERE campo LIKE '%sap%' ........... contiene un texto",
        "WHERE capa IN ('modelo', 'origen') . está en una lista",
        'AND / OR ........................... combinar filtros',
        'ORDER BY campo DESC ................ ordenar',
        'LIMIT 3 ............................ limitar filas',
        'SELECT COUNT(*) FROM tabla ......... contar filas',
        'SHOW TABLES · DESCRIBE tabla ....... ver la estructura'
      ], 'tbl');
      print(["Prueba: SELECT empresa, desde FROM experiencia ORDER BY desde DESC;"]);
    }
    function sqlLine(v) {
      const c = norm(v);
      if (!c) return;
      print(['sql> ' + v], 'cmd');
      if (['salir', 'exit', 'quit', '\\q', 'q'].includes(c)) { resetMode(); print(['Has salido del modo SQL.']); return; }
      if (['ayuda', 'help', '?'].includes(c)) { sqlHelp(); return; }
      if (['limpiar', 'clear', 'cls'].includes(c)) { clearOut(); return; }
      sqlExec(v);
    }

    /* ---------- Mensaje por conversación ---------- */
    let msg = null;
    function startMsg() {
      msg = { step: 'nombre' };
      setMode('msg', 'nombre>', 'tu nombre', ['cancelar']);
      print(['Vamos a escribirme un mensaje. Puedes escribir «cancelar» en cualquier momento.', '¿Cómo te llamas?']);
    }
    async function msgStep(v) {
      const c = norm(v);
      if (!c) return;
      print([promptLabel.textContent + ' ' + v], 'cmd');
      if (c === 'cancelar' || c === 'salir') { msg = null; resetMode(); print(['Mensaje cancelado.']); return; }
      if (msg.step === 'nombre') {
        if (v.length < 2) { print(['Necesito al menos tu nombre.']); return; }
        msg.nombre = v; msg.step = 'email';
        setMode('msg', 'correo>', 'tu@correo.com', ['cancelar']);
        print([`Encantado, ${v}. ¿A qué correo te respondo?`]);
      } else if (msg.step === 'email') {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { print(['Ese correo no parece válido. Revísalo, por favor.'], 'err'); return; }
        msg.email = v; msg.step = 'mensaje';
        setMode('msg', 'mensaje>', 'cuéntame qué necesitas', ['cancelar']);
        print(['Perfecto. ¿Qué te gustaría contarme? (datos, SAP, una web…)']);
      } else if (msg.step === 'mensaje') {
        if (v.length < 5) { print(['Cuéntame un poco más.']); return; }
        msg.mensaje = v; msg.step = 'ok';
        setMode('msg', '¿enviar?>', 's / n', ['s', 'n']);
        print(['Al enviarlo aceptas la política de privacidad (alvarotorresbaeza.com/#privacidad).', '¿Lo envío? (s/n)']);
      } else if (msg.step === 'ok') {
        if (['n', 'no'].includes(c)) { msg = null; resetMode(); print(['Vale, no lo envío.']); return; }
        if (!['s', 'si', 'y', 'yes'].includes(c)) { print(['Responde «s» para enviar o «n» para cancelar.']); return; }
        const data = msg;
        msg = null;
        resetMode();
        print(['Enviando…']);
        try {
          const res = await fetch(FORM_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ nombre: data.nombre, email: data.email, mensaje: data.mensaje, origen: 'Terminal de la web', _subject: 'Nuevo mensaje desde el terminal de alvarotorresbaeza.com', _template: 'table', _captcha: 'false' })
          });
          const j = await res.json().catch(() => ({}));
          if (!res.ok || String(j.success) !== 'true') throw new Error('envío');
          print(['Mensaje enviado. Te responderé lo antes posible.']);
          ach.unlock('conversacion');
        } catch (_) {
          print(['No se ha podido enviar ahora mismo. Escríbeme a alvarotorresbaeza@gmail.com.'], 'err');
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
      const chars = '01SELECTFROMWHEREDATOSAPETL{}<>=+*'.split('');
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
        print(['Has visto el código. Ahora escribe «sql» y lee los datos de verdad.']);
      };
      fxRaf = requestAnimationFrame(step);
    }
    function top() {
      stopFx();
      const procs = ['sap-extract', 'etl-pipeline', 'datasphere', 'qlik-dash', 'fabric-lake', 'sql-server', 'curiosidad'];
      print(['PID'.padEnd(5) + 'PROCESO'.padEnd(13) + 'CPU'.padEnd(10) + '   %'], 'tbl');
      const lines = print(procs.map(() => ''), 'tbl');
      let n = 0;
      const tick = () => {
        lines.forEach((p, i) => {
          const cpu = procs[i] === 'curiosidad' ? 92 + Math.random() * 8 : 5 + Math.random() * 60;
          p.textContent = `${String(1200 + i * 7).padEnd(5)}${procs[i].padEnd(13)}${'|'.repeat(Math.round(cpu / 10)).padEnd(10)}${cpu.toFixed(0).padStart(4)}%`;
        });
        if (++n > 14) { clearInterval(fxTimer); fxTimer = null; print(['El proceso «curiosidad» siempre va al máximo.']); }
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
        bar.textContent = `Escaneando [${'#'.repeat(Math.round(pct / 100 * 14)).padEnd(14, '.')}] ${Math.round(pct)}%`;
        if (pct < 100) return;
        clearInterval(fxTimer); fxTimer = null;
        print(['Resultado del análisis:', '  curiosidad ......... alta', '  paciencia .......... suficiente para llegar aquí', '  interés en datos ... probable', 'Recomendación: escribe «mensaje» y hablamos.']);
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
      const steps = ['Conectando con mainframe.alvaro…', 'Saltando el cortafuegos… [OK]', 'Descifrando contraseñas… ********', 'Extrayendo la base de datos secreta…', 'ERROR 403 · ACCESO DENEGADO', 'Este sistema solo se abre con una buena conversación.', 'Prueba con «mensaje».'];
      let i = 0;
      fxTimer = setInterval(() => {
        print([steps[i]], i === 4 ? 'alert' : '');
        if (++i >= steps.length) { clearInterval(fxTimer); fxTimer = null; }
      }, 420);
    }

    /* ---------- Comandos secretos ---------- */
    const SECRETS = {
      ojo: { hint: 'te observa en la cabecera de cada sección', run: () => print(['    .-"""-.', "   /  .-.  \\", '  |  ( o )  |', "   \\  '-'  /", "    '-...-'", 'Te veo. Y también veo los datos… cuando están bien modelados.'], 'art') },
      triangulo: { hint: 'la forma de tu cursor', run: () => print(['      /\\', '     /  \\', '    / ·  \\', '   /______\\', 'Tres lados, tres lugares: La Rioja, Jaén y Valencia.'], 'art') },
      hack: { hint: 'lo que intentaría un intruso', run: hack },
      rioja: { hint: 'donde empezó todo', run: () => print(['Tierra de viñedos. Los buenos procesos, como el vino, necesitan su tiempo.']) },
      jaen: { hint: 'olivos y calma', run: () => print(['Mar de olivos. Los datos, como el aceite: mejor limpios y de primera extracción.']) },
      valencia: { hint: 'el presente', run: () => print(['Luz, mar y datos bien modelados. Aquí se construye.']) },
      nietzsche: { hint: 'el primero de la estantería', run: () => print(['«Quien tiene un porqué para vivir soporta casi cualquier cómo.»', 'En datos: quien tiene un para qué soporta cualquier ETL.']) },
      seneca: { hint: 'un estoico con nombre propio', run: () => print(['«No es que tengamos poco tiempo, es que perdemos mucho.»', 'Por eso automatizo las cargas.']) },
      '42': { hint: 'la respuesta a todo', run: () => print(['42. Pero ¿cuál era la pregunta? Sin pregunta, el dato no sirve.']) },
      xyzzy: { hint: 'palabra mágica de las aventuras de texto', run: () => print(['Nada ocurre.', '(Bueno, sí: acabas de encontrar un secreto.)']) },
      ping: { hint: '¿hay alguien ahí?', run: () => print(['PING alvarotorresbaeza.com', 'pong · 12 ms desde Valencia', 'Hay alguien al otro lado. Escribe «mensaje».']) },
      'rm -rf': { hint: 'el comando más peligroso', run: () => print(['rm: no se puede borrar «/»: los datos tienen copia de seguridad.', 'Buen intento.']) }
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
        ? `¡Secreto ${total}/${total}! Los has encontrado todos. Eres de los míos: escribe «mensaje».`
        : `Secreto descubierto · ${secretFound.size}/${total}`], 'alert'), k === 'hack' ? 3200 : 120);
    }
    function listSecrets() {
      const keys = Object.keys(SECRETS);
      print([`Secretos descubiertos: ${secretFound.size}/${keys.length}`]);
      print(keys.map(k => {
        const name = secretFound.has(k) ? k : k[0] + '·'.repeat(Math.max(1, k.length - 1));
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
      print(['usuario:~$ ' + v], 'cmd');
      if (['entrar', 'inicio', 'start', 'enter', 'login', 'salir', 'exit'].includes(c)) { ach.unlock('terminal'); enter('inicio'); return; }
      if (['limpiar', 'clear', 'cls'].includes(c)) { clearOut(); screen.classList.remove('is-session'); return; }
      if (c === 'terminal') { print(['Ya estás en el terminal. Escribe «entrar» para volver a la web.']); return; }
      if (c === 'trofeo' || c === 'trophy') {
        const left = ACH.length - ach.size();
        if (left <= 0) showTrophy(); else print([`Te ${left === 1 ? 'falta 1 logro' : `faltan ${left} logros`} para el trofeo.`]);
        return;
      }
      if (c.startsWith('sudo')) { print(['Permiso denegado. Prueba con «mensaje».']); return; }
      if (['sql', 'mysql', 'psql', 'sqlite'].includes(c)) { ach.unlock('terminal'); startSql(); return; }
      if (['mensaje', 'contactar', 'escribeme', 'hablar', 'hablame', 'contacta'].includes(c)) { ach.unlock('terminal'); startMsg(); return; }
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
      if (views[key] && key !== 'intro') { ach.unlock('terminal'); print(['Abriendo ' + labelFor(key).title + '…']); setTimeout(() => enter(key), 450); return; }
      print([`Comando no encontrado: ${v}. Escribe «ayuda».`]);
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
    if (hint) hint.textContent = fine ? 'o escribe un comando en la pantalla' : 'o toca la pantalla para escribir';
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
    on('leave', key => { if (key === 'intro') stopFx(); });

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
      print(['¡Todos los logros desbloqueados!']);
      const p = document.createElement('p');
      p.className = 'crt-talk';
      p.innerHTML = '<button type="button">Háblame</button>';
      $('button', p).addEventListener('click', () => enter('contacto'));
      out.appendChild(p);
      print(['Pulsa «Háblame» o escribe «mensaje».']);
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
    const nameEl = $('.crt-name', view), portraitEl = $('#crt-portrait');
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
      if (portraitEl && portraitEl.getBoundingClientRect().height < 70) screen.classList.add('no-portrait');
    }
    on('enter', key => { if (key === 'intro') requestAnimationFrame(fitCrt); });
    window.addEventListener('resize', () => requestAnimationFrame(fitCrt));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => requestAnimationFrame(fitCrt));
    setTimeout(fitCrt, 1200);
  })();

  /* Retrato tramado (dither) para la pantalla CRT. Usa assets/retrato.jpg si existe. */
  function drawPortrait() {
    const cv = $('#crt-portrait');
    if (!cv) return;
    const ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
    const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    function dither(src) {
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
      const img = g.getImageData(0, 0, W, H), d = img.data;
      const res = ctx.createImageData(W, H), r = res.data;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        let l = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255 * (d[i + 3] / 255);
        if (src) {
          const ex = (x - W / 2) / (W * 0.55), ey = (y - H * 0.55) / (H * 0.62);
          l = clamp((l - 0.08) * 1.35, 0, 1) * clamp(1.25 - Math.sqrt(ex * ex + ey * ey), 0, 1);
        }
        if (l > (BAYER[(y % 4) * 4 + (x % 4)] + 0.5) / 16) { r[i] = 212; r[i + 1] = 236; r[i + 2] = 142; r[i + 3] = 255; }
      }
      ctx.putImageData(res, 0, 0);
    }
    const img = new Image();
    img.onload = () => dither(img);
    img.onerror = () => dither(null);
    img.src = 'assets/retrato.jpg';
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
      if (++eyeClicks === 3) ach.toast('<b>Pista</b><span>Escribe «ojo» en el terminal</span>');
    });
    h.appendChild(s);
  });
  try { console.log('%c¿Curioseando el código? Escribe «hack» en el terminal de la web.', 'color:#d4ec8e;font:14px monospace'); } catch (_) {}
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

  /* Enlaces que llevan al formulario con un tema ya marcado (p. ej. «Diseño de una web») */
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-topic]');
    if (!t) return;
    const box = $$('#cform input[name="tema"]').find(x => x.value === t.dataset.topic);
    if (box) box.checked = true;
  });

  /* ================= Contacto ================= */
  const FORM_ENDPOINT = 'https://formsubmit.co/ajax/alvarotorresbaeza@gmail.com';
  (function contact() {
    const form = $('#cform'), status = $('#f-status'), send = $('#f-send');
    const setStatus = (msg, cls) => { status.textContent = msg; status.className = 'fstatus ' + (cls || ''); };
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const f = form.elements;
      const checks = [
        [f.nombre, f.nombre.value.trim().length > 1],
        [f.email, /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.value.trim())],
        [f.mensaje, f.mensaje.value.trim().length > 4],
        [f.acepto, f.acepto.checked]
      ];
      checks.forEach(([el, ok]) => el.setAttribute('aria-invalid', String(!ok)));
      const bad = checks.find(([, ok]) => !ok);
      if (bad) {
        setStatus(bad[0] === f.acepto ? 'Marca la casilla de la política de privacidad para poder enviarlo.' : 'Revisa los campos marcados: nombre, un correo válido y tu mensaje.', 'err');
        bad[0].focus();
        return;
      }
      if (f._honey.value) { setStatus('Mensaje enviado. Te responderé lo antes posible.', 'ok'); form.reset(); return; }
      send.disabled = true;
      setStatus('Enviando…');
      const temas = $$('input[name="tema"]:checked', form).map(x => x.value).join(', ');
      try {
        const res = await fetch(FORM_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ nombre: f.nombre.value.trim(), empresa: f.empresa.value.trim(), email: f.email.value.trim(), temas, mensaje: f.mensaje.value.trim(), _subject: 'Nuevo mensaje desde alvarotorresbaeza.com', _template: 'table', _captcha: 'false' })
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || String(j.success) !== 'true') throw new Error(j.message || 'error');
        setStatus('Mensaje enviado. Te responderé lo antes posible.', 'ok');
        form.reset();
        ach.unlock('conversacion');
      } catch (_) {
        setStatus('No se ha podido enviar ahora mismo. Escríbeme directamente a alvarotorresbaeza@gmail.com.', 'err');
      }
      send.disabled = false;
    });
    form.addEventListener('input', e => { if (e.target.getAttribute('aria-invalid') === 'true') e.target.removeAttribute('aria-invalid'); });
    const copyBtn = $('#copy-mail'), addr = $('#mail-addr');
    copyBtn.addEventListener('click', () => {
      const flash = t => { copyBtn.textContent = t; setTimeout(() => { copyBtn.textContent = 'Copiar'; }, 1800); };
      const fallback = () => { const r = document.createRange(); r.selectNodeContents(addr); const s = getSelection(); s.removeAllRanges(); s.addRange(r); flash('Seleccionado'); };
      try { navigator.clipboard.writeText(addr.textContent.trim()).then(() => flash('Copiado'), fallback); } catch (_) { fallback(); }
    });
    $('#clear-local').addEventListener('click', () => {
      local.clear(); session.clear(); visited.clear(); ach.reset();
      $('#clear-msg').textContent = 'Datos locales borrados.';
    });
  })();

  /* ================= Sistema 3D ================= */
  (function stack3d() {
    const LAYERS = [
      { code: '01', name: 'Origen', title: 'Ecosistema SAP', short: 'SAP', sub: 'CDS Views · BAPIs · Fiori',
        lead: 'El dato nace en la operación: pedidos, materiales, clientes, producción. Entender cómo se genera es el primer paso para poder confiar en él.',
        question: '¿Dónde nace realmente este dato?',
        does: ['Extracción e integración desde SAP con CDS Views y BAPIs', 'Lectura de la lógica de negocio que hay detrás de cada tabla', 'Apoyo a procesos y aplicaciones Fiori', 'Identificación de la fuente fiable de cada indicador'],
        tools: ['SAP', 'CDS Views', 'BAPIs', 'Fiori'] },
      { code: '02', name: 'Integración', title: 'ETL y pipelines', short: 'ETL', sub: 'SQL · Pipelines',
        lead: 'Mover datos entre sistemas sin que pierdan su contexto por el camino. Procesos que se ejecutan solos y avisan cuando algo falla.',
        question: '¿Llega completo, a tiempo y con su contexto?',
        does: ['Diseño y mantenimiento de procesos ETL', 'Cargas automatizadas y planificadas', 'Control de errores y trazabilidad de cada carga', 'Validaciones desde el origen'],
        tools: ['SQL', 'ETL', 'Pipelines', 'SQL Server'] },
      { code: '03', name: 'Modelo', title: 'Datasphere y SQL Server', short: 'Modelo', sub: 'Datasphere · SQL Server',
        lead: 'Un modelo común para que ventas, operaciones y finanzas hablen de lo mismo cuando dicen «pedido» o «margen».',
        question: '¿Significa lo mismo para todas las áreas?',
        does: ['Modelado de datos en SAP Datasphere y SQL Server', 'Definiciones de negocio compartidas entre áreas', 'Calidad del dato: completitud, coherencia, duplicados', 'Documentación pensada para que el modelo dure'],
        tools: ['SAP Datasphere', 'SQL Server', 'Data Modeling', 'Data Quality'] },
      { code: '04', name: 'Plataforma', title: 'Microsoft Fabric', short: 'Fabric', sub: 'OneLake · Azure',
        lead: 'Una plataforma unificada donde almacenamiento, ingeniería y analítica comparten espacio. Respaldado por la certificación Fabric Data Engineer (DP-700).',
        question: '¿Puede crecer sin volverse frágil?',
        does: ['Almacenamiento centralizado en OneLake', 'Ingeniería de datos dentro de Fabric', 'Arquitectura preparada para nuevos orígenes y usos', 'Integración con el ecosistema Azure'],
        tools: ['Microsoft Fabric', 'OneLake', 'Azure', 'Power BI'] },
      { code: '05', name: 'Decisión', title: 'Analítica', short: 'Analítica', sub: 'Qlik · Power BI · SSRS',
        lead: 'Informes y cuadros de mando que responden preguntas concretas de negocio. Es la última capa del flujo, y la única que la mayoría de la gente ve.',
        question: '¿Qué decisión cambia con esta información?',
        does: ['Cuadros de mando en Qlik Sense para todas las áreas', 'Informes operativos con SSRS', 'Análisis y exploración con Qlik y Power BI', 'Traducción de necesidades de negocio a métricas'],
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
      count.innerHTML = `Capa <b>${LAYERS[selected].code}</b> de 0${N}`;
      if (shown !== selected) {
        shown = selected;
        const L = LAYERS[selected];
        detail.innerHTML = `<p class="d-kicker"><span>Capa ${L.code} / 0${N}</span><span>${L.name}</span></p><h3 class="d-title">${L.title}</h3><p class="d-lead">${L.lead}</p><div class="d-q"><p class="d-label">Pregunta clave</p><p class="d-question">${L.question}</p></div><div><p class="d-label">Qué hago</p><ul class="ticks">${L.does.map(d => `<li>${d}</li>`).join('')}</ul></div><div><p class="d-label">Herramientas</p><div class="chips">${L.tools.map(t => `<span class="chip">${t}</span>`).join('')}</div></div>`;
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
    function startTour() { playBtn.setAttribute('aria-pressed', 'true'); playLabel.textContent = 'Pausar recorrido'; playIcon.innerHTML = '<path d="M2 1h3v10H2zM7 1h3v10H7z"/>'; select(0, true); tourStep(); }
    function stopTour() {
      if (tourTimer === null && playBtn.getAttribute('aria-pressed') === 'false') return;
      clearTimeout(tourTimer); tourTimer = null;
      playBtn.setAttribute('aria-pressed', 'false'); playLabel.textContent = 'Recorrer el flujo';
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
      const txt = `Giro <b>${normD(cur.rz)}°</b> · Inclinación <b>${Math.round(cur.rx)}°</b>`;
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
  const start = keyFromHash();
  if (start) show(start);
  else if (session.get('introSeen', false)) { history.replaceState(null, '', '#inicio'); show('inicio'); }
  else show('intro');
})();
