/* ═══════════════════════════════════════════════════════════
   CARTOGRAFIAS DO ABANDONO — módulo de acessibilidade
   Preferências do leitor, salvas neste navegador. Sem dependências.
   ═══════════════════════════════════════════════════════════ */
(() => {
'use strict';

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const root = document.documentElement;
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
const ruler = $('#a11yRuler');
const maskT = $('#a11yMaskTop'), maskB = $('#a11yMaskBot');
let py = innerHeight / 2, rafTrack = 0;

const track = (y) => {
  py = y;
  if (rafTrack) return;
  rafTrack = requestAnimationFrame(() => {
    rafTrack = 0;
    if (S.ruler) ruler.style.top = (py - ruler.offsetHeight / 2) + 'px';
    if (S.mask) {
      const band = 88;
      maskT.style.height = Math.max(0, py - band / 2) + 'px';
      maskB.style.height = Math.max(0, innerHeight - py - band / 2) + 'px';
    }
  });
};
addEventListener('mousemove', e => { if (S.ruler || S.mask) track(e.clientY); }, { passive: true });
addEventListener('touchmove', e => {
  if ((S.ruler || S.mask) && e.touches[0]) track(e.touches[0].clientY);
}, { passive: true });

/* ─────────── VLIBRAS ─────────── */
let librasLoaded = false, librasLoading = false;
const librasNote = $('#librasNote');

function toggleLibras(on) {
  if (!on) return;
  if (librasLoaded || librasLoading) return;
  librasLoading = true;
  librasNote.hidden = false;
  librasNote.textContent = 'Carregando o tradutor de Libras do VLibras (gov.br)…';

  const s = document.createElement('script');
  s.src = 'https://vlibras.gov.br/app/vlibras-plugin.js';
  s.async = true;
  s.onload = () => {
    try {
      new window.VLibras.Widget('https://vlibras.gov.br/app');
      librasLoaded = true;
      librasNote.textContent = 'Tradutor de Libras ativo. Use o boneco na lateral da tela para traduzir os textos.';
      setTimeout(() => { librasNote.hidden = true; }, 6000);
    } catch {
      librasNote.textContent = 'Não foi possível iniciar o VLibras. Tente recarregar a página.';
    }
    librasLoading = false;
  };
  s.onerror = () => {
    librasLoading = false;
    librasNote.textContent = 'Sem conexão com o VLibras (vlibras.gov.br). O recurso precisa de internet.';
  };
  document.body.appendChild(s);
}

/* ─────────── LEITURA EM VOZ ALTA ─────────── */
const synth = window.speechSynthesis;
const ttsBar = $('#ttsBar');
const ttsState = $('#ttsState');
const btnPlay = $('#ttsPlay'), btnStop = $('#ttsStop');
const btnPrev = $('#ttsPrev'), btnNext = $('#ttsNext'), btnRate = $('#ttsRate');

let blocks = [], cursorIdx = -1, speaking = false, paused = false, keepAlive = 0;

const markBlocks = () => {
  const sel = 'main p, main h1, main h2, main h3, main h4, main figcaption, main dd, main .q__t, main .dim__kw';
  blocks = $$(sel).filter(el => {
    if (el.closest('.a11y, .tts, .roteiro, .lb')) return false;
    const t = el.textContent.trim();
    return t.length > 1 && el.offsetParent !== null;
  });
  blocks.forEach((el, i) => { el.dataset.read = i; });
};

const ttsSupported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

let ptVoice = null;
const pickVoice = () => {
  const vs = synth?.getVoices?.() || [];
  ptVoice = vs.find(v => /pt[-_]BR/i.test(v.lang)) || vs.find(v => /^pt/i.test(v.lang)) || null;
};
if (ttsSupported) {
  pickVoice();
  synth.addEventListener?.('voiceschanged', pickVoice);
}

const setStatus = (t) => { ttsState.textContent = t; };
const iconPlay = '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" fill="currentColor"/></svg>';
const iconPause = '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M7 4.5h4v15H7zm6 0h4v15h-4z" fill="currentColor"/></svg>';

const showTTSBar = (v) => {
  ttsBar.classList.toggle('is-on', v);
  ttsBar.setAttribute('aria-hidden', String(!v));
  if (v) {
    markBlocks();
    setStatus(ttsSupported
      ? 'Toque num parágrafo para ouvir, ou use ▶'
      : 'Este navegador não tem síntese de voz.');
    [btnPlay, btnPrev, btnNext, btnStop].forEach(b => { b.disabled = !ttsSupported; });
  }
};

const clearMark = () => $$('[data-read].is-speaking').forEach(el => el.classList.remove('is-speaking'));

const speakAt = (i) => {
  if (!ttsSupported || !blocks.length) return;
  synth.cancel();
  cursorIdx = Math.max(0, Math.min(i, blocks.length - 1));
  const el = blocks[cursorIdx];
  clearMark();
  el.classList.add('is-speaking');
  el.scrollIntoView({ block: 'center', behavior: S.nofx ? 'auto' : 'smooth' });

  const u = new SpeechSynthesisUtterance(el.textContent.trim().replace(/\s+/g, ' '));
  u.lang = 'pt-BR';
  if (ptVoice) u.voice = ptVoice;
  u.rate = S.rate;
  u.onend = () => {
    if (!speaking) return;
    if (cursorIdx < blocks.length - 1) speakAt(cursorIdx + 1);
    else stopTTS('Leitura concluída.');
  };
  u.onerror = () => stopTTS('A leitura foi interrompida.');

  speaking = true; paused = false;
  btnPlay.innerHTML = iconPause;
  btnPlay.setAttribute('aria-label', 'Pausar leitura');
  setStatus(`Lendo ${cursorIdx + 1} de ${blocks.length}`);
  synth.speak(u);

  // Chrome interrompe falas longas por conta própria; este ping mantém viva.
  clearInterval(keepAlive);
  keepAlive = setInterval(() => {
    if (!speaking || paused) return;
    synth.pause(); synth.resume();
  }, 9000);
};

function stopTTS(msg) {
  clearInterval(keepAlive);
  if (ttsSupported) synth.cancel();
  speaking = false; paused = false; cursorIdx = -1;
  clearMark();
  btnPlay.innerHTML = iconPlay;
  btnPlay.setAttribute('aria-label', 'Iniciar leitura');
  setStatus(msg || 'Toque num parágrafo para ouvir, ou use ▶');
}

btnPlay.addEventListener('click', () => {
  if (!ttsSupported) return;
  if (!speaking) {
    markBlocks();
    // começa pelo primeiro bloco visível na tela
    const start = blocks.findIndex(el => el.getBoundingClientRect().bottom > 90);
    speakAt(start < 0 ? 0 : start);
  } else if (paused) {
    synth.resume(); paused = false;
    btnPlay.innerHTML = iconPause;
    setStatus(`Lendo ${cursorIdx + 1} de ${blocks.length}`);
  } else {
    synth.pause(); paused = true;
    btnPlay.innerHTML = iconPlay;
    setStatus('Pausado');
  }
});
btnStop.addEventListener('click', () => stopTTS());
btnPrev.addEventListener('click', () => speaking && speakAt(cursorIdx - 1));
btnNext.addEventListener('click', () => speaking && speakAt(cursorIdx + 1));

const RATES = [0.75, 1, 1.25, 1.5];
btnRate.addEventListener('click', () => {
  S.rate = RATES[(RATES.indexOf(S.rate) + 1) % RATES.length] ?? 1;
  persist(); syncUI();
  if (speaking) speakAt(cursorIdx);
});

/* clicar num bloco lê a partir dele */
document.addEventListener('click', e => {
  if (!S.tts || !ttsSupported) return;
  if (e.target.closest('.a11y, .tts, .roteiro, .lb, .nav, a, button, [role="button"], input, textarea')) return;
  const el = e.target.closest('[data-read]');
  if (!el) return;
  markBlocks();
  speakAt(Number(el.dataset.read) || blocks.indexOf(el));
});

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
markBlocks();
if (S.libras) toggleLibras(true);
if (S.tts) showTTSBar(true);
apply();
addEventListener('beforeunload', () => { if (ttsSupported) synth.cancel(); });

})();
