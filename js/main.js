// ============================================
// LSB Aprende — Lengua de Señas Boliviana
// Main JS: navegación, tabs, modal de video y
// generación dinámica de las grillas de vocabulario
// ============================================

// Ruta base donde viven todos los .mp4 reales del proyecto
const VIDEOS_BASE = 'videos/';

// Construye una URL seguro para un archivo dentro de /videos
function videoUrl(relativePath) {
  return VIDEOS_BASE + relativePath.split('/').map(encodeURIComponent).join('/');
}

document.addEventListener('DOMContentLoaded', () => {

  // ---------- Menú móvil ----------
  const toggle = document.querySelector('.nav-toggle');
  const links  = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
    links.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => links.classList.remove('open'));
    });
  }

  // ---------- Link activo en navbar ----------
  const current = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === current || (current === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });

  // ---------- Barras de progreso animadas ----------
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const fill = e.target.querySelector('.progress-fill');
        if (fill) fill.style.width = fill.dataset.width;
      }
    });
  }, { threshold: 0.3 });

  document.querySelectorAll('.progress-bar').forEach(bar => {
    const fill = bar.querySelector('.progress-fill');
    if (fill) {
      fill.dataset.width = fill.style.width;
      fill.style.width = '0';
      observer.observe(bar);
    }
  });

  // ---------- Sistema de tabs ----------
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const group  = btn.dataset.group;
      const target = btn.dataset.tab;

      document.querySelectorAll(`.tab-btn[data-group="${group}"]`).forEach(b => b.classList.remove('active'));
      document.querySelectorAll(`.tab-content[data-group="${group}"]`).forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const panel = document.querySelector(`.tab-content[data-group="${group}"][data-tab="${target}"]`);
      if (panel) panel.classList.add('active');
    });
  });

  // ---------- Render de grillas de vocabulario (aprendizaje.html) ----------
  if (typeof LSB_DATA !== 'undefined') {
    renderCardGrid('alphabet-grid', LSB_DATA.alfabeto, 'letter-card', 'letter-char');
    renderCardGrid('numeros-grid', LSB_DATA.numeros, 'num-card', 'num-val');
    renderCardGrid('numeros-especiales-grid', LSB_DATA.numerosEspeciales, 'vocab-card', 'vocab-word');
    renderCardGrid('saludos-grid', LSB_DATA.saludos, 'vocab-card', 'vocab-word');
    renderCardGrid('dias-grid', LSB_DATA.dias, 'vocab-card', 'vocab-word');
    renderCardGrid('colores-grid', LSB_DATA.colores, 'vocab-card', 'vocab-word');
    renderCardGrid('familia-grid', LSB_DATA.familia, 'vocab-card', 'vocab-word');
    renderCardGrid('frases-grid', LSB_DATA.frases, 'vocab-card', 'vocab-word');
    renderCardGrid('expresiones-grid', LSB_DATA.expresiones, 'vocab-card', 'vocab-word');
  }

  // ---------- Navegación por hash (#basico, #intermedio, etc.) ----------
  const hash = window.location.hash;
  if (hash) {
    const target = hash.replace('#', '');
    const btn = document.querySelector(`.tab-btn[data-tab="${target}"]`);
    if (btn) {
      btn.click();
      setTimeout(() => btn.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200);
    }
  }

  // ---------- Modal de video ----------
  initVideoModal();
});

// ============================================
// Genera una grilla de tarjetas con <video muted>
// a partir de un arreglo de {label, file}
// ============================================
function renderCardGrid(containerId, items, cardClass, labelClass) {
  const container = document.getElementById(containerId);
  if (!container || !items) return;

  container.innerHTML = items.map(item => `
    <div class="${cardClass}">
      <video muted playsinline preload="metadata" controls>
        <source src="${videoUrl(item.file)}" type="video/mp4">
        Tu navegador no soporta videos.
      </video>
      <span class="${labelClass}">${item.label}</span>
    </div>
  `).join('');

  // Refuerza el silencio (algunos navegadores ignoran el atributo si el <video>
  // se insertó vía innerHTML)
  container.querySelectorAll('video').forEach(v => { v.muted = true; v.defaultMuted = true; });
}

// ============================================
// Modal de video: abre en grande y SIEMPRE muteado
// (el usuario puede reactivar el sonido manualmente
// desde los controles nativos si lo necesita)
// ============================================
function initVideoModal() {
  const videoModal        = document.getElementById('video-modal');
  const videoModalContent = document.getElementById('video-modal-content');
  const videoModalPlayer  = document.getElementById('video-modal-player');
  const videoModalClose   = document.getElementById('video-modal-close');

  if (!videoModal || !videoModalPlayer) return;

  function abrirModalCon(video) {
    const source = video.querySelector('source');
    if (!source) return;

    video.pause();

    videoModalPlayer.src = source.src;
    videoModalPlayer.muted = true;
    videoModalPlayer.defaultMuted = true;
    videoModal.classList.add('active');
    videoModalPlayer.play().catch(() => {});
  }

  // Delegación de eventos: funciona incluso con tarjetas generadas dinámicamente
  document.addEventListener('play', (event) => {
    const video = event.target;
    if (video.matches('.letter-card video, .vocab-card video, .num-card video')) {
      abrirModalCon(video);
    }
  }, true);

  function cerrarVideoModal() {
    videoModalPlayer.pause();
    videoModalPlayer.currentTime = 0;
    videoModalPlayer.removeAttribute('src');
    videoModalPlayer.load();
    videoModal.classList.remove('active');
  }

  if (videoModalClose) videoModalClose.addEventListener('click', cerrarVideoModal);

  videoModal.addEventListener('click', (event) => {
    if (event.target === videoModal) cerrarVideoModal();
  });

  if (videoModalContent) {
    videoModalContent.addEventListener('click', (event) => event.stopPropagation());
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && videoModal.classList.contains('active')) {
      cerrarVideoModal();
    }
  });
}

// ============================================
// Utilidades compartidas por los juegos mejorados
// ============================================
function shuffleG(arr) { return [...arr].sort(() => Math.random() - 0.5); }

// Junta todas las categorías de vocabulario (con video real) en un solo pool
function buildFullPool() {
  const cats = ['alfabeto', 'numeros', 'numerosEspeciales', 'saludos', 'dias', 'colores', 'familia', 'frases', 'expresiones'];
  const pool = [];
  cats.forEach(cat => {
    (LSB_DATA[cat] || []).forEach(item => {
      pool.push({ id: cat + ':' + item.label, label: item.label, file: item.file, cat });
    });
  });
  return pool;
}

function getBestScore(key) { return parseInt(localStorage.getItem(key) || '0', 10); }
function saveBestScore(key, value, higherIsBetter = true) {
  const current = getBestScore(key);
  const better = higherIsBetter ? value > current : (current === 0 || value < current);
  if (better) localStorage.setItem(key, String(value));
  return getBestScore(key);
}

// ============================================
// MINIJUEGO CLÁSICO 1 — Memoria LSB
// (Une la PALABRA con su VIDEO real de la seña)
// ============================================
function initMatchGame() {
  const leftCol   = document.getElementById('match-left');
  const rightCol  = document.getElementById('match-right');
  const scoreEl   = document.getElementById('match-score');
  const msgEl     = document.getElementById('match-msg');
  const movesEl   = document.getElementById('match-moves');
  const timeEl    = document.getElementById('match-time');
  const bestEl    = document.getElementById('match-best');
  const diffBtns  = document.querySelectorAll('.difficulty-btn[data-pairs]');
  if (!leftCol || !rightCol || typeof LSB_DATA === 'undefined') return;

  let pairs = 6;
  let score = 0, matched = 0, moves = 0, seconds = 0;
  let selected = null;
  let timerId = null;
  const fullPool = buildFullPool();

  function bestKey() { return `lsb_match_best_${pairs}`; }

  function startTimer() {
    clearInterval(timerId);
    seconds = 0;
    if (timeEl) timeEl.textContent = '0s';
    timerId = setInterval(() => {
      seconds++;
      if (timeEl) timeEl.textContent = seconds + 's';
    }, 1000);
  }

  function render() {
    score = 0; matched = 0; moves = 0; selected = null;
    if (scoreEl) scoreEl.textContent = 'Puntos: 0';
    if (movesEl) movesEl.textContent = '0';
    if (msgEl) msgEl.style.display = 'none';
    if (bestEl) {
      const best = getBestScore(bestKey());
      bestEl.textContent = best ? best + 's' : '—';
    }

    const items = shuffleG(fullPool).slice(0, pairs);
    const shuffledWords  = shuffleG(items);
    const shuffledVideos = shuffleG(items);

    leftCol.innerHTML  = '';
    rightCol.innerHTML = '';

    shuffledWords.forEach((item) => {
      const el = document.createElement('div');
      el.className = 'match-item';
      el.dataset.id = item.id;
      el.dataset.side = 'word';
      el.innerHTML = `<span>${item.label}</span>`;
      el.addEventListener('click', () => selectItem(el));
      leftCol.appendChild(el);
    });

    shuffledVideos.forEach((item) => {
      const el = document.createElement('div');
      el.className = 'match-item video-item';
      el.dataset.id = item.id;
      el.dataset.side = 'video';
      el.innerHTML = `<video muted playsinline autoplay loop preload="auto"><source src="${videoUrl(item.file)}" type="video/mp4"></video>`;
      el.addEventListener('click', () => selectItem(el));
      rightCol.appendChild(el);
    });

    startTimer();
  }

  function selectItem(el) {
    if (el.classList.contains('correct') || el.classList.contains('disabled')) return;

    if (!selected) {
      selected = el;
      el.classList.add('selected');
      return;
    }

    if (selected === el) {
      selected.classList.remove('selected');
      selected = null;
      return;
    }

    if (selected.dataset.side === el.dataset.side) {
      selected.classList.remove('selected');
      selected = el;
      el.classList.add('selected');
      return;
    }

    moves++;
    if (movesEl) movesEl.textContent = moves;

    if (selected.dataset.id === el.dataset.id) {
      selected.classList.remove('selected');
      selected.classList.add('correct', 'disabled');
      el.classList.add('correct', 'disabled');
      score++;
      matched++;
      if (scoreEl) scoreEl.textContent = `Puntos: ${score}`;
      showMsg(msgEl, '✅ ¡Correcto! ¡Muy bien!', true);
      selected = null;
      if (matched === pairs) {
        clearInterval(timerId);
        const best = saveBestScore(bestKey(), seconds, false);
        if (bestEl) bestEl.textContent = best + 's';
        setTimeout(() => {
          showMsg(msgEl, `🎉 ¡Completaste el juego en ${moves} movimientos y ${seconds}s! Mejor tiempo: ${best}s`, true);
        }, 500);
      }
    } else {
      selected.classList.remove('selected');
      selected.classList.add('wrong');
      el.classList.add('wrong');
      showMsg(msgEl, '❌ Intenta de nuevo', false);
      const s = selected, t = el;
      selected = null;
      setTimeout(() => {
        s.classList.remove('wrong');
        t.classList.remove('wrong');
      }, 800);
    }
  }

  function showMsg(el, text, ok) {
    if (!el) return;
    el.textContent = text;
    el.className = 'feedback-msg ' + (ok ? 'feedback-ok' : 'feedback-no');
    el.style.display = 'block';
    setTimeout(() => { if (matched < pairs) el.style.display = 'none'; }, 1800);
  }

  diffBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      diffBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      pairs = parseInt(btn.dataset.pairs, 10);
      render();
    });
  });

  const resetBtn = document.getElementById('match-reset');
  if (resetBtn) resetBtn.addEventListener('click', render);

  render();
}

// ============================================
// MINIJUEGO CLÁSICO 2 — Adivina la Seña (mejorado)
// Se muestra una PALABRA y el usuario elige el VIDEO
// correcto entre 4 opciones. Incluye vidas, racha,
// categorías y mejor puntaje.
// ============================================
function initGuessGame() {
  const promptEl   = document.getElementById('guess-word');
  const optsEl     = document.getElementById('guess-options');
  const feedEl     = document.getElementById('guess-feedback');
  const scoreEl    = document.getElementById('guess-score');
  const progressEl = document.getElementById('guess-progress');
  const nextBtn    = document.getElementById('guess-next');
  const livesEl    = document.getElementById('guess-lives');
  const streakEl   = document.getElementById('guess-streak');
  const bestEl     = document.getElementById('guess-best');
  const catBtns    = document.querySelectorAll('.category-btn[data-cat]');
  if (!promptEl || !optsEl || typeof LSB_DATA === 'undefined') return;

  const fullPool = buildFullPool();
  let category = 'mixto';
  let score = 0, streak = 0, lives = 3, round = 0, answered = false;
  let currentAnswer = null;
  let gameOver = false;
  const TOTAL_ROUNDS = 12;

  function bestKey() { return `lsb_guess_best_${category}`; }

  function poolForCategory() {
    if (category === 'alfabeto') return fullPool.filter(i => i.cat === 'alfabeto');
    if (category === 'vocabulario') return fullPool.filter(i => i.cat !== 'alfabeto');
    return fullPool;
  }

  function renderLives() {
    if (!livesEl) return;
    livesEl.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const span = document.createElement('span');
      span.className = 'life-heart' + (i < lives ? '' : ' lost');
      span.textContent = '❤️';
      livesEl.appendChild(span);
    }
  }

  function buildQuestion() {
    const pool = poolForCategory();
    const shuffledPool = shuffleG(pool);
    const correct = shuffledPool[0];
    const distractors = [];
    for (let i = 1; i < shuffledPool.length && distractors.length < 3; i++) {
      if (shuffledPool[i].label !== correct.label) distractors.push(shuffledPool[i]);
    }
    return { correct, options: shuffleG([correct, ...distractors]) };
  }

  function renderQuestion() {
    answered = false;
    const q = buildQuestion();
    currentAnswer = q.correct;

    promptEl.textContent = q.correct.label;
    if (feedEl) feedEl.style.display = 'none';
    if (progressEl) progressEl.textContent = `Pregunta ${round + 1} de ${TOTAL_ROUNDS}`;

    optsEl.innerHTML = '';
    q.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'video-option-btn';
      btn.innerHTML = `<video muted playsinline autoplay loop preload="auto"><source src="${videoUrl(opt.file)}" type="video/mp4"></video>`;
      btn.addEventListener('click', () => checkAnswer(btn, opt.label));
      optsEl.appendChild(btn);
    });

    if (nextBtn) nextBtn.disabled = true;
  }

  function checkAnswer(btn, chosenLabel) {
    if (answered || gameOver) return;
    answered = true;

    optsEl.querySelectorAll('.video-option-btn').forEach(b => b.classList.add('disabled'));

    if (chosenLabel === currentAnswer.label) {
      btn.classList.add('correct');
      streak++;
      const bonus = streak > 0 && streak % 3 === 0 ? 2 : 0;
      score += 1 + bonus;
      if (scoreEl) scoreEl.textContent = `Puntos: ${score}`;
      if (streakEl) streakEl.textContent = streak;
      showFeed(bonus ? `✅ ¡Correcto! 🔥 Racha de ${streak} (+${1 + bonus} pts)` : '✅ ¡Correcto!', true);
    } else {
      btn.classList.add('wrong');
      streak = 0;
      lives--;
      if (streakEl) streakEl.textContent = 0;
      renderLives();
      showFeed(`❌ Era: ${currentAnswer.label}`, false);
    }

    if (lives <= 0) {
      endGame();
      return;
    }

    if (nextBtn) nextBtn.disabled = false;
  }

  function showFeed(text, ok) {
    if (!feedEl) return;
    feedEl.textContent = text;
    feedEl.className = 'feedback-msg ' + (ok ? 'feedback-ok' : 'feedback-no');
    feedEl.style.display = 'block';
  }

  function endGame() {
    gameOver = true;
    optsEl.innerHTML = '';
    promptEl.textContent = lives <= 0 ? '💔' : '🏆';
    const best = saveBestScore(bestKey(), score, true);
    if (bestEl) bestEl.textContent = best;
    if (progressEl) progressEl.textContent = '¡Partida terminada!';
    if (feedEl) {
      feedEl.textContent = `${lives <= 0 ? 'Se acabaron tus vidas.' : '¡Completaste la ronda!'} Puntaje final: ${score}. Mejor puntaje: ${best}`;
      feedEl.className = 'feedback-msg feedback-ok';
      feedEl.style.display = 'block';
    }
    nextBtn.textContent = '🔄 Jugar de nuevo';
    nextBtn.dataset.finished = '1';
    nextBtn.disabled = false;
  }

  function reiniciar() {
    score = 0; streak = 0; lives = 3; round = 0; gameOver = false;
    if (scoreEl) scoreEl.textContent = 'Puntos: 0';
    if (streakEl) streakEl.textContent = '0';
    renderLives();
    nextBtn.textContent = 'Siguiente →';
    nextBtn.dataset.finished = '0';
    renderQuestion();
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (nextBtn.dataset.finished === '1') {
        reiniciar();
        return;
      }
      round++;
      if (round >= TOTAL_ROUNDS) {
        endGame();
      } else {
        renderQuestion();
      }
    });
  }

  catBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      catBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      category = btn.dataset.cat;
      if (bestEl) bestEl.textContent = getBestScore(bestKey());
      reiniciar();
    });
  });

  renderLives();
  if (bestEl) bestEl.textContent = getBestScore(bestKey());
  renderQuestion();
}

// Auto-inicializa los juegos clásicos si sus elementos existen en la página
document.addEventListener('DOMContentLoaded', () => {
  if (typeof LSB_DATA === 'undefined') return;
  if (document.getElementById('match-left')) initMatchGame();
  if (document.getElementById('guess-word'))  initGuessGame();
});
