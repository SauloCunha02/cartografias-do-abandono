/* ═══════════════════════════════════════════════════════════
   CARTOGRAFIAS DO ABANDONO — interações
   Sem dependências externas.
   ═══════════════════════════════════════════════════════════ */
(() => {
'use strict';

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const RM = window.matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

/* rede de segurança: um erro de script nunca deixa a página travada */
addEventListener('error', () => {
  document.body.classList.remove('is-loading');
  document.body.classList.add('no-js');
});
const lerp  = (a, b, t) => a + (b - a) * t;

/* ─────────── 1. PRELOADER ─────────── */
const boot = () => {
  const pre = $('#pre'), bar = $('#preBar'), num = $('#preNum');
  const srcs = ['assets/img/capa.jpg', 'assets/img/foto-01.jpg', 'assets/img/foto-02.jpg'];
  let loaded = 0, shown = 0, target = 0, done = false;

  const tick = () => {
    shown = lerp(shown, target, .2);
    if (target - shown < 1) shown = target;
    bar.style.width = shown + '%';
    num.textContent = Math.round(shown);
    if (shown < 100) requestAnimationFrame(tick);
    else if (!done) { done = true; setTimeout(finish, 260); }
  };

  const finish = () => {
    pre.classList.add('is-done');
    document.body.classList.remove('is-loading');
    setTimeout(() => pre.remove(), 800);
  };

  const bump = () => { loaded++; target = clamp(Math.round(loaded / srcs.length * 100), 0, 100); };

  srcs.forEach(s => {
    const i = new Image();
    i.onload = i.onerror = bump;
    i.src = s;
  });
  // rede lenta ou offline: não prender o usuário
  setTimeout(() => { target = 100; }, 3500);
  target = 8;
  requestAnimationFrame(tick);
};
boot();

/* ─────────── 1b. FADE DAS IMAGENS (sobre o LQIP) ─────────── */
$$('.lqip img').forEach(img => {
  if (img.complete && img.naturalWidth) img.classList.add('is-loaded');
  else img.addEventListener('load', () => img.classList.add('is-loaded'), { once: true });
  img.addEventListener('error', () => img.classList.add('is-loaded'), { once: true });
});

/* ─────────── 2. SPLIT DE TEXTO ─────────── */
$$('.split').forEach(el => {
  const html = el.innerHTML.split('<br>').map(seg =>
    seg.trim().split(/\s+/).filter(Boolean)
       .map(w => `<span class="w"><i>${w}</i></span>`).join(' ')
  ).join('<br>');
  el.innerHTML = html;
  $$('.w > i', el).forEach((i, k) => i.style.setProperty('--wi', k));
});

/* ─────────── 3. REVELAÇÕES ─────────── */
$$('.rev').forEach(el => { if (el.dataset.d) el.style.setProperty('--d', el.dataset.d); });

const revIO = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('is-in');
    revIO.unobserve(e.target);
  });
}, { rootMargin: '0px 0px -12% 0px', threshold: .08 });

$$('.rev, .split, .plate__media').forEach(el => revIO.observe(el));

/* ─────────── 4. PARALLAX ─────────── */
const pxItems = $$('[data-parallax]').map(el => ({
  el, amt: parseFloat(el.dataset.parallax) || .2, cur: 0, to: 0, vis: false
}));

if (pxItems.length && !RM.matches) {
  const visIO = new IntersectionObserver(es => es.forEach(e => {
    const it = pxItems.find(i => i.el === e.target);
    if (it) it.vis = e.isIntersecting;
  }), { rootMargin: '20% 0px' });
  pxItems.forEach(i => visIO.observe(i.el));

  const loop = () => {
    const vh = innerHeight;
    for (const it of pxItems) {
      if (it.vis) {
        const r = it.el.getBoundingClientRect();
        const prog = (r.top + r.height / 2 - vh / 2) / vh;   // -1 … 1
        it.to = clamp(prog, -1.4, 1.4) * it.amt * 100;
      }
      it.cur = lerp(it.cur, it.to, .085);
      if (it.vis || Math.abs(it.cur - it.to) > .05)
        it.el.style.transform = `translate3d(0,${it.cur.toFixed(2)}px,0)`;
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

/* ─────────── 5. NAV + PROGRESSO + SCROLLSPY ─────────── */
const nav = $('#nav'), pBar = $('#progressBar');
let lastY = 0, navTicking = false;

const onScroll = () => {
  const y = scrollY;
  const h = document.documentElement.scrollHeight - innerHeight;
  pBar.style.transform = `scaleX(${h > 0 ? clamp(y / h, 0, 1) : 0})`;
  nav.classList.toggle('is-stuck', y > innerHeight * .72);
  nav.classList.toggle('is-hidden', y > lastY && y > innerHeight && !navOpen);
  lastY = y;
  navTicking = false;
};
addEventListener('scroll', () => {
  if (!navTicking) { navTicking = true; requestAnimationFrame(onScroll); }
}, { passive: true });
onScroll();

const spyLinks = $$('.nav__links a[data-spy]');
const spyIO = new IntersectionObserver(es => {
  es.forEach(e => {
    if (!e.isIntersecting) return;
    spyLinks.forEach(a => a.classList.toggle('is-on', a.getAttribute('href') === '#' + e.target.id));
  });
}, { rootMargin: '-45% 0px -50% 0px' });
$$('[data-spy-target]').forEach(s => spyIO.observe(s));

/* menu móvel */
const burger = $('#burger'), navLinks = $('#navLinks');
let navOpen = false;
const setNav = (v) => {
  navOpen = v;
  navLinks.classList.toggle('is-open', v);
  burger.setAttribute('aria-expanded', String(v));
  burger.setAttribute('aria-label', v ? 'Fechar menu' : 'Abrir menu');
};
burger.addEventListener('click', () => setNav(!navOpen));
navLinks.addEventListener('click', e => { if (e.target.closest('a')) setNav(false); });

/* ─────────── 6. CURSOR + ÍMÃ ─────────── */
const cur = $('#cursor');
if (matchMedia('(hover:hover) and (pointer:fine)').matches && !RM.matches) {
  const dot = $('.cursor__dot', cur), ring = $('.cursor__ring', cur), txt = $('.cursor__txt', cur);
  let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;

  addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    cur.classList.add('on');
    dot.style.transform = `translate3d(${mx}px,${my}px,0)`;
  }, { passive: true });
  addEventListener('mouseleave', () => cur.classList.remove('on'));

  (function ring_(){
    rx = lerp(rx, mx, .16); ry = lerp(ry, my, .16);
    ring.style.transform = `translate3d(${rx.toFixed(1)}px,${ry.toFixed(1)}px,0)`;
    txt.style.transform  = `translate3d(${rx.toFixed(1)}px,${ry.toFixed(1)}px,0) translate(-50%,-50%)`;
    requestAnimationFrame(ring_);
  })();

  $$('[data-cursor]').forEach(el => {
    el.addEventListener('mouseenter', () => { cur.classList.add('big'); txt.textContent = el.dataset.cursor; });
    el.addEventListener('mouseleave', () => cur.classList.remove('big'));
  });

  $$('[data-magnet]').forEach(el => {
    const str = 9;
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) / r.width * str}px,${(e.clientY - r.top - r.height / 2) / r.height * str}px)`;
    });
    el.addEventListener('mouseleave', () => { el.style.transform = ''; });
  });
}

/* ─────────── 7. COMPARADOR ─────────── */
const cmp = $('#cmp');
if (cmp) {
  const frame = $('.cmp__frame', cmp), grip = $('#cmpGrip');
  let p = 50, dragging = false, touched = false;

  const set = (v) => {
    p = clamp(v, 2, 98);
    frame.style.setProperty('--p', p + '%');
    grip.setAttribute('aria-valuenow', Math.round(p));
  };
  const fromX = (x) => {
    const r = frame.getBoundingClientRect();
    set((x - r.left) / r.width * 100);
  };

  const down = e => {
    if (e.target.closest('.cmp__zoom')) return;   // o botão de ampliar não arrasta
    touched = true; dragging = true;
    frame.setPointerCapture?.(e.pointerId); fromX(e.clientX);
  };
  const move = e => { if (dragging) fromX(e.clientX); };
  const up   = () => { dragging = false; };

  frame.addEventListener('pointerdown', down);
  frame.addEventListener('pointermove', move);
  addEventListener('pointerup', up);
  addEventListener('pointercancel', up);

  grip.addEventListener('keydown', e => {
    const step = e.shiftKey ? 10 : 3;
    if (['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) touched = true;
    if (e.key === 'ArrowLeft')  { set(p - step); e.preventDefault(); }
    if (e.key === 'ArrowRight') { set(p + step); e.preventDefault(); }
    if (e.key === 'Home') { set(2);  e.preventDefault(); }
    if (e.key === 'End')  { set(98); e.preventDefault(); }
  });

  // varredura de apresentação ao entrar em cena
  let teased = false;
  new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting || teased || RM.matches) return;
    teased = true;
    const t0 = performance.now();
    const sweep = (t) => {
      if (touched) return;                      // não briga com o usuário
      const k = clamp((t - t0) / 1500, 0, 1);
      const ease = 1 - Math.pow(1 - k, 3);
      set(50 + Math.sin(ease * Math.PI) * 26);
      if (k < 1) requestAnimationFrame(sweep); else set(50);
    };
    requestAnimationFrame(sweep);
  }), { threshold: .5 }).observe(cmp);

  set(50);
}

/* ─────────── 8. LINHA DO TEMPO ─────────── */
const tl = $('#tl');
if (tl) {
  const tabs = $$('.tl__tab', tl), panes = $$('.tl__pane', tl), ind = $('#tlInd');
  const place = (btn) => { ind.style.width = btn.offsetWidth + 'px'; ind.style.transform = `translateX(${btn.offsetLeft}px)`; };

  const go = (i) => {
    tabs.forEach((t, k) => {
      const on = k === i;
      t.classList.toggle('is-on', on);
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      panes[k].hidden = !on;
      panes[k].classList.toggle('is-on', on);
    });
    place(tabs[i]);
  };

  tabs.forEach((t, i) => {
    t.addEventListener('click', () => go(i));
    t.addEventListener('keydown', e => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      const n = (i + d + tabs.length) % tabs.length;
      go(n); tabs[n].focus();
    });
  });
  addEventListener('resize', () => place($('.tl__tab.is-on', tl)));
  document.fonts?.ready.then(() => place(tabs[0]));
  place(tabs[0]);
}

/* ─────────── 9. DIMENSÕES (acordeão) ─────────── */
$$('#dims .dim').forEach(d => {
  const hd = $('.dim__hd', d);
  hd.addEventListener('click', () => {
    const open = d.classList.contains('is-on');
    $$('#dims .dim').forEach(o => {
      o.classList.remove('is-on');
      $('.dim__hd', o).setAttribute('aria-expanded', 'false');
    });
    if (!open) { d.classList.add('is-on'); hd.setAttribute('aria-expanded', 'true'); }
  });
});

/* ─────────── 10. PERGUNTAS + ROTEIRO ─────────── */
const KEY = 'cartografias.roteiro.v1';
const GROUPS = [
  ['Prancha 01 — primeiro olhar',   ['q1', 'q2']],
  ['Desafio',                       ['q3']],
  ['Prancha 02 — marcas materiais', ['q4', 'q5']],
  ['O tempo do lugar · passado',    ['q6', 'q7', 'q8']],
  ['O tempo do lugar · presente',   ['q9', 'q10']],
  ['O tempo do lugar · futuro',     ['q11']],
  ['Reflita',                       ['q12']],
];

let state = {};
try { state = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { state = {}; }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} };

const qBtns   = $$('.q[data-q]');
const qText   = id => $(`.q[data-q="${id}"] .q__t`)?.textContent.trim() || id;
const TOTAL   = qBtns.length;
const badge   = $('#roteiroBadge'), counter = $('#roteiroCount'), list = $('#roteiroList');

const done = id => !!(state[id] && state[id].d);

const syncCounts = () => {
  const n = qBtns.filter(b => done(b.dataset.q)).length;
  badge.textContent = `${n}/${TOTAL}`;
  counter.textContent = `${n} de ${TOTAL}`;
};

const syncOne = (id) => {
  const on = done(id);
  $$(`.q[data-q="${id}"]`).forEach(b => {
    b.classList.toggle('is-done', on);
    b.setAttribute('aria-pressed', String(on));
  });
  const row = $(`.rt__i[data-rt="${id}"]`);
  if (row) {
    row.classList.toggle('is-done', on);
    const cb = $('input', row);
    if (cb) cb.checked = on;
  }
  syncCounts();
};

const toggle = (id) => {
  state[id] = state[id] || {};
  state[id].d = !done(id);
  save(); syncOne(id);
};

qBtns.forEach(b => {
  b.setAttribute('aria-pressed', 'false');
  b.addEventListener('click', () => toggle(b.dataset.q));
});

/* construção da gaveta */
list.innerHTML = GROUPS.map(([title, ids]) => `
  <p class="rt__grp">${title}</p>
  ${ids.map(id => `
    <div class="rt__i" data-rt="${id}">
      <label class="rt__row">
        <input type="checkbox" data-rt-cb="${id}">
        <span class="rt__q">${qText(id)}</span>
      </label>
      <textarea class="rt__note" data-rt-note="${id}" rows="1" placeholder="Anotações da aula…"></textarea>
    </div>`).join('')}
`).join('');

$$('[data-rt-cb]').forEach(cb => cb.addEventListener('change', () => toggle(cb.dataset.rtCb)));
$$('[data-rt-note]').forEach(ta => {
  const id = ta.dataset.rtNote;
  ta.value = (state[id] && state[id].n) || '';
  ta.addEventListener('input', () => {
    state[id] = state[id] || {};
    state[id].n = ta.value;
    save();
  });
});
qBtns.forEach(b => syncOne(b.dataset.q));

/* gaveta */
const drawer = $('#roteiro'), scrim = $('#scrim'), openBtn = $('#openRoteiro');
const setDrawer = (v) => {
  drawer.classList.toggle('is-open', v);
  drawer.setAttribute('aria-hidden', String(!v));
  openBtn.setAttribute('aria-expanded', String(v));
  document.body.classList.toggle('no-scroll', v);
  if (v) { scrim.hidden = false; requestAnimationFrame(() => scrim.classList.add('is-on')); $('#closeRoteiro').focus(); }
  else   { scrim.classList.remove('is-on'); setTimeout(() => { scrim.hidden = true; }, 500); openBtn.focus(); }
};
openBtn.addEventListener('click', () => setDrawer(!drawer.classList.contains('is-open')));
$('#closeRoteiro').addEventListener('click', () => setDrawer(false));
scrim.addEventListener('click', () => setDrawer(false));

$('#printRoteiro').addEventListener('click', () => print());
$('#clearRoteiro').addEventListener('click', () => {
  if (!confirm('Limpar todas as marcações e anotações do roteiro?')) return;
  state = {}; save();
  $$('[data-rt-note]').forEach(t => { t.value = ''; });
  qBtns.forEach(b => syncOne(b.dataset.q));
});

/* ─────────── 11. LIGHTBOX ─────────── */
const lb = $('#lb'), lbImg = $('#lbImg'), lbCap = $('#lbCap'), lbIdx = $('#lbIdx');
const gallery = $$('[data-zoom]').map(el => ({
  src: el.dataset.zoom,
  cap: el.dataset.cap || '',
  alt: $('img', el)?.alt || ''
}));
let gi = 0, lastFocus = null;

const show = (i) => {
  gi = (i + gallery.length) % gallery.length;
  const it = gallery[gi];
  lbImg.style.opacity = 0;
  const pre = new Image();
  pre.onload = () => { lbImg.src = it.src; lbImg.alt = it.alt; lbImg.style.opacity = ''; };
  pre.src = it.src;
  lbCap.textContent = it.cap;
  lbIdx.textContent = `${String(gi + 1).padStart(2, '0')} / ${String(gallery.length).padStart(2, '0')}`;
};

const openLb = (i) => {
  lastFocus = document.activeElement;
  show(i);
  lb.classList.add('is-open');
  lb.setAttribute('aria-hidden', 'false');
  document.body.classList.add('no-scroll');
  $('#lbX').focus();
};
const closeLb = () => {
  lb.classList.remove('is-open');
  lb.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('no-scroll');
  lastFocus?.focus();
};

$$('[data-zoom]').forEach((el, i) => {
  el.style.cursor = 'zoom-in';
  el.setAttribute('role', 'button');
  el.setAttribute('tabindex', '0');
  el.setAttribute('aria-label', 'Ampliar fotografia');
  el.addEventListener('click', () => openLb(i));
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLb(i); }
  });
});

$('#lbX').addEventListener('click', closeLb);
$('#lbP').addEventListener('click', () => show(gi - 1));
$('#lbN').addEventListener('click', () => show(gi + 1));
lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });

/* atalhos de dentro do texto */
$$('[data-goto]').forEach(b => {
  b.addEventListener('click', () => {
    const i = gallery.findIndex(g => g.src === b.dataset.goto);
    if (i >= 0) openLb(i);
  });
});

addEventListener('keydown', e => {
  if (lb.classList.contains('is-open')) {
    if (e.key === 'Escape') closeLb();
    if (e.key === 'ArrowLeft')  show(gi - 1);
    if (e.key === 'ArrowRight') show(gi + 1);
    if (e.key === 'Tab') {
      const f = $$('button', lb);
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    return;
  }
  if (e.key === 'Escape') {
    if (drawer.classList.contains('is-open')) setDrawer(false);
    else if (navOpen) setNav(false);
  }
});

/* ─────────── 12. ANO / ANCORAGEM SUAVE EM NAVEGADORES ANTIGOS ─────────── */
if (!('scrollBehavior' in document.documentElement.style)) {
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const t = $(a.getAttribute('href'));
    if (!t) return;
    e.preventDefault();
    scrollTo(0, t.getBoundingClientRect().top + scrollY - 80);
  }));
}

})();
