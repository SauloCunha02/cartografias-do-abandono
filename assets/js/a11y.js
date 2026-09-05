/* ═══════════════════════════════════════════════════════════
   CARTOGRAFIAS DO ABANDONO — módulo de acessibilidade
   Preferências do leitor, salvas neste navegador. Sem dependências.
   ═══════════════════════════════════════════════════════════ */
(() => {
'use strict';

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const root = document.documentElement;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const KEY = 'cartografias.a11y.v1';

/* ─────────── ESTADO ─────────── */
const DEFAULTS = {
  nofx: false, ruler: false, mask: false, spacing: false, legible: false,
  hc: false, underline: false, bigcursor: false, focus: false,
  libras: false, tts: false, txt: 0, cb: 'none', rate: 1,
};
let S = { ...DEFAULTS };
try { S = { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY)) || {}) }; } catch {}
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };

const TOGGLES = ['nofx','ruler','mask','spacing','legible','hc','underline','bigcursor','focus'];
const CB_TYPES = ['protan','deutan','tritan','acromat'];

/* ─────────── APLICAÇÃO ─────────── */
const apply = () => {
  TOGGLES.forEach(k => root.classList.toggle('a-' + k, !!S[k]));
  root.classList.toggle('a-libras', !!S.libras);
  root.classList.toggle('a-tts', !!S.tts);

  [1,2,3].forEach(n => root.classList.toggle('a-txt' + n, S.txt === n));
  CB_TYPES.forEach(t => root.classList.toggle('cb-' + t, S.cb === t));

  // régua e máscara não convivem: a última ligada vence
  if (S.ruler && S.mask) S.mask = false;

  if (S.ruler || S.mask) desenhar();

  syncUI();
  const n = countActive();
  openBtn.classList.toggle('has-active', n > 0);
  openBtn.setAttribute('aria-label', n ? `Acessibilidade — ${n} ajuste${n > 1 ? 's' : ''} ativo${n > 1 ? 's' : ''}` : 'Acessibilidade');
  if (counter) counter.textContent = n ? `${n} ativo${n > 1 ? 's' : ''}` : 'nenhum ajuste ativo';
  persist();
};

const countActive = () =>
  TOGGLES.filter(k => S[k]).length + (S.libras ? 1 : 0) + (S.tts ? 1 : 0) +
  (S.txt ? 1 : 0) + (S.cb !== 'none' ? 1 : 0);

/* ─────────── PAINEL ─────────── */
const panel   = $('#a11yPanel');
const openBtn = $('#a11yOpen');
const scrim   = $('#a11yScrim');
const counter = $('#a11yCount');
let lastFocus = null;

const setPanel = (v) => {
  panel.classList.toggle('is-open', v);
  panel.setAttribute('aria-hidden', String(!v));
  openBtn.setAttribute('aria-expanded', String(v));
  if (v) {
    lastFocus = document.activeElement;
    scrim.hidden = false;
    requestAnimationFrame(() => scrim.classList.add('is-on'));
    $('#a11yClose').focus();
  } else {
    scrim.classList.remove('is-on');
    setTimeout(() => { scrim.hidden = true; }, 500);
    lastFocus?.focus();
  }
};
openBtn.addEventListener('click', () => setPanel(!panel.classList.contains('is-open')));
$('#a11yClose').addEventListener('click', () => setPanel(false));
scrim.addEventListener('click', () => setPanel(false));

/* foco preso dentro do painel aberto */
panel.addEventListener('keydown', e => {
  if (e.key !== 'Tab') return;
  const f = $$('button, [href], input, textarea, [tabindex]:not([tabindex="-1"])', panel)
    .filter(el => el.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});

/* ─────────── LIGAÇÃO DOS CONTROLES ─────────── */
$$('.sw[data-k]').forEach(b => {
  b.addEventListener('click', () => {
    const k = b.dataset.k;
    S[k] = !S[k];
    if (k === 'ruler' && S.ruler) S.mask = false;
    if (k === 'mask' && S.mask) S.ruler = false;
    if (k === 'libras') toggleLibras(S.libras);
    if (k === 'tts' && !S.tts) stopTTS();
    if (k === 'tts' && S.tts) showTTSBar(true);
    if (k === 'tts' && !S.tts) showTTSBar(false);
    apply();
  });
});

$$('.seg[data-seg]').forEach(seg => {
  seg.addEventListener('click', e => {
    const b = e.target.closest('button[data-v]');
    if (!b) return;
    const field = seg.dataset.seg;
    S[field] = field === 'txt' ? Number(b.dataset.v) : b.dataset.v;
    apply();
  });
});

const syncUI = () => {
  $$('.sw[data-k]').forEach(b => b.setAttribute('aria-checked', String(!!S[b.dataset.k])));
  $$('.seg[data-seg]').forEach(seg => {
    const field = seg.dataset.seg;
    $$('button[data-v]', seg).forEach(b => {
      const v = field === 'txt' ? Number(b.dataset.v) : b.dataset.v;
      b.setAttribute('aria-pressed', String(S[field] === v));
    });
  });
  const rb = $('#ttsRate');
  if (rb) rb.textContent = String(S.rate).replace('.', ',') + '×';
};

/* perfis rápidos */
const PROFILES = {
  leitura:  { tts: true, txt: 1, spacing: true, underline: true, focus: true },
  baixavisao: { txt: 3, hc: true, bigcursor: true, underline: true, focus: true, spacing: true },
  movimento: { nofx: true },
  foco: { mask: true, nofx: true, spacing: true },
};
$$('[data-profile]').forEach(b => {
  b.addEventListener('click', () => {
    const p = PROFILES[b.dataset.profile];
    if (!p) return;
    Object.assign(S, p);
    if (S.tts) showTTSBar(true);
    apply();
    announce(`Perfil aplicado: ${b.querySelector('b').textContent}`);
  });
});

$('#a11yReset').addEventListener('click', () => {
  stopTTS();
  toggleLibras(false);
  showTTSBar(false);
  S = { ...DEFAULTS };
  apply();
  announce('Preferências restauradas ao padrão.');
});

/* ─────────── RÉGUA E MÁSCARA ─────────── */
/* Com mouse, a guia segue o ponteiro. No toque isso não funciona: o dedo é
   usado para rolar, então a guia saltava junto e parava onde o dedo largasse.
   Em telas de toque ela fica parada e se move por um puxador arrastável. */
const ruler = $('#a11yRuler');
const maskT = $('#a11yMaskTop'), maskB = $('#a11yMaskBot');
const grip  = $('#a11yGuideGrip');
const TOQUE = matchMedia('(hover: none), (pointer: coarse)');

let py = Math.round(innerHeight * 0.42), rafTrack = 0;

const desenhar = () => {
  if (rafTrack) return;
  rafTrack = requestAnimationFrame(() => {
    rafTrack = 0;
    const alvo = clamp(py, 40, innerHeight - 40);
    if (S.ruler) ruler.style.top = (alvo - ruler.offsetHeight / 2) + 'px';
    if (S.mask) {
      const faixa = TOQUE.matches ? 132 : 88;
      maskT.style.height = Math.max(0, alvo - faixa / 2) + 'px';
      maskB.style.height = Math.max(0, innerHeight - alvo - faixa / 2) + 'px';
    }
    if (grip) grip.style.top = alvo + 'px';
  });
};

const track = (y) => { py = y; desenhar(); };

addEventListener('mousemove', e => {
  if ((S.ruler || S.mask) && !TOQUE.matches) track(e.clientY);
}, { passive: true });

/* puxador: só aparece em telas de toque, arrasta a guia sem rolar a página */
if (grip) {
  let arrastando = false;
  const iniciar = (e) => {
    arrastando = true;
    grip.setPointerCapture?.(e.pointerId);
    grip.classList.add('is-drag');
    e.preventDefault();
  };
  const mover = (e) => { if (arrastando) { track(e.clientY); e.preventDefault(); } };
  const soltar = () => { arrastando = false; grip.classList.remove('is-drag'); };
  grip.addEventListener('pointerdown', iniciar);
  grip.addEventListener('pointermove', mover);
  addEventListener('pointerup', soltar);
  addEventListener('pointercancel', soltar);

  grip.addEventListener('keydown', e => {
    const passo = e.shiftKey ? 60 : 20;
    if (e.key === 'ArrowUp')   { track(py - passo); e.preventDefault(); }
    if (e.key === 'ArrowDown') { track(py + passo); e.preventDefault(); }
  });
}

addEventListener('resize', () => { py = clamp(py, 40, innerHeight - 40); desenhar(); });
desenhar();

/* ─────────── VLIBRAS ─────────── */
let librasLoaded = false, librasLoading = false;
const librasNote = $('#librasNote');

const aviso = (txt, some) => {
  librasNote.hidden = false;
  librasNote.textContent = txt;
  if (some) setTimeout(() => { librasNote.hidden = true; }, 7000);
};

/* O plugin procura por este markup para se montar. Sem ele o script carrega,
   o construtor não reclama e nada aparece na tela. */
const criarContainerVLibras = () => {
  if ($('div[vw]')) return;
  const wrap = document.createElement('div');
  wrap.setAttribute('vw', '');
  wrap.className = 'enabled';
  wrap.innerHTML =
    '<div vw-access-button class="active"></div>' +
    '<div vw-plugin-wrapper><div class="vw-plugin-top-wrapper"></div></div>';
  document.body.appendChild(wrap);
};

function toggleLibras(on) {
  if (!on) { librasNote.hidden = true; return; }
  if (librasLoaded || librasLoading) return;
  librasLoading = true;
  aviso('Carregando o tradutor de Libras do VLibras (gov.br)…');
  criarContainerVLibras();

  const s = document.createElement('script');
  s.src = 'https://vlibras.gov.br/app/vlibras-plugin.js';
  s.async = true;
  s.onload = () => {
    librasLoading = false;
    try {
      new window.VLibras.Widget('https://vlibras.gov.br/app');
    } catch {
      aviso('Não foi possível iniciar o VLibras. Tente recarregar a página.');
      return;
    }
    // só confirma depois de ver o boneco na tela; o plugin monta em etapas
    let tentativas = 0;
    const conferir = setInterval(() => {
      const botao = $('div[vw] [vw-access-button]');
      if (botao && botao.offsetParent !== null) {
        clearInterval(conferir);
        librasLoaded = true;
        aviso('Tradutor de Libras ativo. Use o boneco na lateral da tela.', true);
      } else if (++tentativas > 30) {
        clearInterval(conferir);
        aviso('O VLibras demorou a responder. Tente recarregar a página.');
      }
    }, 400);
  };
  s.onerror = () => {
    librasLoading = false;
    aviso('Sem conexão com o VLibras (vlibras.gov.br). O recurso precisa de internet.');
  };
  document.body.appendChild(s);
}

/* ─────────── LEITURA EM VOZ ALTA ─────────── */
const synth = window.speechSynthesis;
const ttsSupported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
const ttsBar = $('#ttsBar');
const ttsState = $('#ttsState');
const btnPlay = $('#ttsPlay'), btnStop = $('#ttsStop');
const btnPrev = $('#ttsPrev'), btnNext = $('#ttsNext'), btnRate = $('#ttsRate');

/* Um "trecho" é uma frase. Blocos longos são fatiados: dá destaque mais fino e,
   se a síntese morrer no meio, perde-se uma frase — não o parágrafo inteiro. */
let parts = [];      // [{el, text, block}]
let pi = -1;         // índice do trecho atual
let speaking = false, paused = false, watchdog = 0;

const BLOCK_SEL = [
  'main p', 'main h1', 'main h2', 'main h3', 'main h4',
  'main figcaption', 'main dd', 'main .facts dt', 'main .q__t',
  'main .dim__ttl', 'main .dim__kw', 'main .divider__sub', 'main .hero__meta',
].join(', ');

/* Texto como um leitor de tela ouviria: sem conteúdo decorativo e sem palavras
   grudadas onde havia quebra de linha. Mantém .sr-only, que é o texto real. */
const readable = (el) => {
  const c = el.cloneNode(true);
  c.querySelectorAll('[aria-hidden="true"]').forEach(n => n.remove());
  c.querySelectorAll('br').forEach(n => n.replaceWith(' '));
  return c.textContent.replace(/\s+/g, ' ').trim();
};

/* Corta o texto em trechos de no máximo MAXLEN caracteres.
   Três estágios, do corte mais natural ao mais bruto: ponto final,
   depois pontuação interna, e só então limite de palavra. Uma frase
   longa sem ponto (comum neste catálogo) precisa dos três. */
const MAXLEN = 220;

const splitBy = (txt, re) => {
  const raw = txt.match(re) || [txt];
  const out = [];
  let buf = '';
  for (const frag of raw) {
    const f = frag.trim();
    if (!f) continue;
    if (!buf) buf = f;
    else if ((buf + ' ' + f).length <= MAXLEN) buf += ' ' + f;
    else { out.push(buf); buf = f; }
  }
  if (buf) out.push(buf);
  return out;
};

const byWords = (txt) => {
  const out = [];
  let buf = '';
  for (const w of txt.split(/\s+/)) {
    if (!buf) buf = w;
    else if ((buf + ' ' + w).length <= MAXLEN) buf += ' ' + w;
    else { out.push(buf); buf = w; }
  }
  if (buf) out.push(buf);
  return out;
};

const sentences = (t) => {
  const out = [];
  for (const frase of splitBy(t, /[^.!?…]+[.!?…]+["”'’)]*\s*|[^.!?…]+$/g)) {
    if (frase.length <= MAXLEN) { out.push(frase); continue; }
    // frase longa: tenta pontuação interna
    for (const parte of splitBy(frase, /[^,;:—–]+[,;:—–]+\s*|[^,;:—–]+$/g)) {
      if (parte.length <= MAXLEN) out.push(parte);
      else out.push(...byWords(parte));   // último recurso
    }
  }
  return out.filter(x => /[\p{L}\p{N}]/u.test(x));
};

const buildParts = () => {
  const els = $$(BLOCK_SEL).filter(el =>
    !el.closest('.a11y, .tts, .roteiro, .lb') && readable(el).length > 1);
  parts = [];
  els.forEach((el, bi) => {
    el.dataset.read = bi;
    sentences(readable(el)).forEach(text => parts.push({ el, text, block: bi }));
  });
};

/* o trecho pode estar numa aba fechada ou num acordeão recolhido */
const reveal = (el) => {
  const pane = el.closest('.tl__pane');
  if (pane && pane.hidden) $('#' + pane.getAttribute('aria-labelledby'))?.click();
  const dim = el.closest('.dim');
  if (dim && !dim.classList.contains('is-on')) $('.dim__hd', dim)?.click();
};

let ptVoice = null;
const pickVoice = () => {
  const vs = synth?.getVoices?.() || [];
  ptVoice = vs.find(v => /pt[-_]BR/i.test(v.lang)) || vs.find(v => /^pt/i.test(v.lang)) || null;
};
if (ttsSupported) { pickVoice(); synth.addEventListener?.('voiceschanged', pickVoice); }

const setStatus = (t) => { ttsState.textContent = t; };
const ICON_PLAY  = '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" fill="currentColor"/></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M7 4.5h4v15H7zm6 0h4v15h-4z" fill="currentColor"/></svg>';

const clearMark = () => $$('.is-speaking').forEach(el => el.classList.remove('is-speaking'));

const progress = () => {
  const b = parts[pi]?.block ?? 0;
  const total = parts.length ? parts[parts.length - 1].block + 1 : 0;
  return 'Lendo ' + (b + 1) + ' de ' + total;
};

const showTTSBar = (v) => {
  ttsBar.classList.toggle('is-on', v);
  ttsBar.setAttribute('aria-hidden', String(!v));
  if (!v) return;
  buildParts();
  setStatus(ttsSupported ? 'Toque num parágrafo para ouvir, ou use ▶'
                         : 'Este navegador não tem síntese de voz.');
  [btnPlay, btnPrev, btnNext, btnStop].forEach(b => { b.disabled = !ttsSupported; });
};

const speakPart = (i) => {
  if (!ttsSupported || !parts.length) return;
  pi = Math.max(0, Math.min(i, parts.length - 1));
  const part = parts[pi], el = part.el;

  synth.cancel();
  reveal(el);
  clearMark();
  el.classList.add('is-speaking');
  const r = el.getBoundingClientRect();
  if (r.top < 80 || r.bottom > innerHeight - 80)
    el.scrollIntoView({ block: 'center', behavior: S.nofx ? 'auto' : 'smooth' });

  const u = new SpeechSynthesisUtterance(part.text);
  u.lang = 'pt-BR';
  if (ptVoice) u.voice = ptVoice;
  u.rate = S.rate;
  u.onend = () => {
    if (!speaking || paused) return;
    if (pi < parts.length - 1) speakPart(pi + 1);
    else stopTTS('Leitura concluída.');
  };
  u.onerror = (e) => {
    // cancel() dispara "interrupted"/"canceled": é troca de trecho, não falha
    if (e.error === 'interrupted' || e.error === 'canceled') return;
    if (speaking && pi < parts.length - 1) speakPart(pi + 1);
    else stopTTS('A leitura foi interrompida.');
  };

  speaking = true; paused = false;
  btnPlay.innerHTML = ICON_PAUSE;
  btnPlay.setAttribute('aria-label', 'Pausar leitura');
  setStatus(progress());
  synth.speak(u);
};

/* Se a síntese morrer sem avisar (acontece em sessões longas), o vigia retoma.
   Substitui o antigo pause()/resume() periódico, que cortava a fala no meio. */
const startWatchdog = () => {
  clearInterval(watchdog);
  watchdog = setInterval(() => {
    if (!speaking || paused || !ttsSupported) return;
    if (!synth.speaking && !synth.pending) {
      if (pi < parts.length - 1) speakPart(pi + 1);
      else stopTTS('Leitura concluída.');
    }
  }, 1600);
};

function stopTTS(msg) {
  clearInterval(watchdog);
  if (ttsSupported) synth.cancel();
  speaking = false; paused = false; pi = -1;
  clearMark();
  btnPlay.innerHTML = ICON_PLAY;
  btnPlay.setAttribute('aria-label', 'Iniciar leitura');
  setStatus(msg || 'Toque num parágrafo para ouvir, ou use ▶');
}

btnPlay.addEventListener('click', () => {
  if (!ttsSupported) return;
  if (!speaking) {
    buildParts();
    const start = parts.findIndex(p => p.el.getBoundingClientRect().bottom > 90);
    speakPart(start < 0 ? 0 : start);
    startWatchdog();
  } else if (paused) {
    synth.resume(); paused = false;
    btnPlay.innerHTML = ICON_PAUSE;
    btnPlay.setAttribute('aria-label', 'Pausar leitura');
    setStatus(progress());
  } else {
    synth.pause(); paused = true;
    btnPlay.innerHTML = ICON_PLAY;
    btnPlay.setAttribute('aria-label', 'Continuar leitura');
    setStatus('Pausado');
  }
});
btnStop.addEventListener('click', () => stopTTS());

/* pular navega por bloco, não por frase, e funciona mesmo pausado */
const jumpBlock = (dir) => {
  if (!ttsSupported) return;
  if (!parts.length) buildParts();
  const cur = pi < 0 ? 0 : parts[pi].block;
  const idx = parts.findIndex(p => p.block === cur + dir);
  if (idx < 0) return;
  paused = false;
  speakPart(idx);
  startWatchdog();
};
btnPrev.addEventListener('click', () => jumpBlock(-1));
btnNext.addEventListener('click', () => jumpBlock(1));

const RATES = [0.75, 1, 1.25, 1.5];
btnRate.addEventListener('click', () => {
  S.rate = RATES[(RATES.indexOf(S.rate) + 1) % RATES.length] ?? 1;
  persist(); syncUI();
  if (speaking) speakPart(pi);
});

/* Clicar num trecho lê a partir dele.

   Vários trechos moram dentro de botões — as perguntas (.q__t) e os títulos
   das dimensões (.dim__ttl) — então não dá para simplesmente ignorar botões:
   isso deixava justamente esse conteúdo inalcançável pelo clique. O ouvinte
   roda na fase de captura e, quando o trecho está dentro de um controle cuja
   ação pode esperar, lê em vez de acionar o controle.

   Controles com função própria (abrir foto, trocar aba) continuam vencendo. */
const CTRL_VENCE = '.lnk, [data-goto], [data-zoom], .cmp__zoom, .cmp__grip, .tl__tab, .burger, .btn, .icb';

document.addEventListener('click', e => {
  if (!S.tts || !ttsSupported) return;
  if (e.target.closest('.a11y, .tts, .roteiro, .lb, .nav')) return;
  if (e.target.closest(CTRL_VENCE)) return;

  const el = e.target.closest('[data-read]');
  if (!el) return;

  // dentro de um controle adiável: lê e segura a ação dele
  if (e.target.closest('button, [role="button"], label, a')) {
    e.preventDefault();
    e.stopPropagation();
  }

  buildParts();
  const idx = parts.findIndex(p => p.el === el);
  if (idx < 0) return;
  speakPart(idx);
  startWatchdog();
}, true);

/* ─────────── AVISOS PARA LEITOR DE TELA ─────────── */
const live = $('#a11yLive');
const announce = (msg) => {
  live.textContent = '';
  setTimeout(() => { live.textContent = msg; }, 60);
};

/* ─────────── ATALHOS DE TECLADO ─────────── */
addEventListener('keydown', e => {
  const typing = /^(INPUT|TEXTAREA)$/.test(e.target.tagName);
  if (e.altKey && (e.key === 'a' || e.key === 'A')) {
    e.preventDefault(); setPanel(!panel.classList.contains('is-open')); return;
  }
  if (e.altKey && (e.key === 'l' || e.key === 'L') && ttsSupported) {
    e.preventDefault();
    if (!S.tts) { S.tts = true; showTTSBar(true); apply(); }
    btnPlay.click(); return;
  }
  if (e.key === 'Escape') {
    if (speaking) { stopTTS(); return; }
    if (panel.classList.contains('is-open') && !typing) setPanel(false);
  }
});

/* ─────────── INÍCIO ─────────── */
buildParts();
if (S.libras) toggleLibras(true);
if (S.tts) showTTSBar(true);
apply();
addEventListener('beforeunload', () => { if (ttsSupported) synth.cancel(); });

})();
