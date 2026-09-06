// ============================================
// LSB Aprende — Juegos dinámicos con video aleatorio
// Requiere que js/videos-data.js y js/main.js (videoUrl)
// estén cargados antes que este archivo.
// ============================================

function shuffleArr(arr) { return [...arr].sort(() => Math.random() - 0.5); }
function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function getBest(key) {
  return parseInt(localStorage.getItem(key) || '0', 10);
}
function setBestIfHigher(key, value) {
  if (value > getBest(key)) localStorage.setItem(key, String(value));
  return getBest(key);
}

/* =====================================================
   JUEGO A — "Deletreo Relámpago"
   Se muestra un video aleatorio del alfabeto (muteado,
   en bucle). El usuario escribe la letra que cree que es.
   Ronda tras ronda, sin fin ("y así sucesivamente"),
   guardando racha y mejor puntaje.
   ===================================================== */
function initDeletreoGame() {
  const stageVideo   = document.getElementById('deletreo-video');
  const input        = document.getElementById('deletreo-input');
  const form         = document.getElementById('deletreo-form');
  const scoreEl       = document.getElementById('deletreo-score');
  const streakEl      = document.getElementById('deletreo-streak');
  const bestEl         = document.getElementById('deletreo-best');
  const feedbackEl    = document.getElementById('deletreo-feedback');
  if (!stageVideo || !input || !form) return;

  const BEST_KEY = 'lsb_deletreo_best';
  let score = 0;
  let streak = 0;
  let current = null;

  bestEl.textContent = getBest(BEST_KEY);

  function nextRound() {
    current = pickRandom(LSB_DATA.alfabeto);
    stageVideo.querySelector('source').src = videoUrl(current.file);
    stageVideo.muted = true;
    stageVideo.defaultMuted = true;
    stageVideo.load();
    stageVideo.play().catch(() => {});
    input.value = '';
    input.classList.remove('input-ok', 'input-no');
    input.focus();
    feedbackEl.style.display = 'none';
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!current) return;
    const guess = input.value.trim().toUpperCase();
    if (!guess) return;

    if (guess === current.label) {
      score++;
      streak++;
      input.classList.add('input-ok');
      feedbackEl.textContent = '✅ ¡Correcto! Letra: ' + current.label;
      feedbackEl.className = 'feedback-msg feedback-ok';
    } else {
      streak = 0;
      input.classList.add('input-no');
      feedbackEl.textContent = `❌ Era la letra "${current.label}"`;
      feedbackEl.className = 'feedback-msg feedback-no';
    }
    feedbackEl.style.display = 'block';
    scoreEl.textContent = score;
    streakEl.textContent = streak;
    bestEl.textContent = setBestIfHigher(BEST_KEY, score);

    setTimeout(nextRound, 900);
  });

  const resetBtn = document.getElementById('deletreo-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      score = 0; streak = 0;
      scoreEl.textContent = '0';
      streakEl.textContent = '0';
      nextRound();
    });
  }

  nextRound();
}

/* =====================================================
   JUEGO B — "Video Misterioso"
   Quiz de opción múltiple: aparece un video aleatorio de
   CUALQUIER categoría de vocabulario (saludos, colores,
   días, familia, expresiones...) y el usuario elige la
   respuesta correcta entre 4 opciones tomadas de la misma
   categoría. 10 rondas por partida.
   ===================================================== */
function initVideoMisteriosoGame() {
  const stageVideo = document.getElementById('vm-video');
  const optsEl      = document.getElementById('vm-options');
  const feedbackEl  = document.getElementById('vm-feedback');
  const scoreEl     = document.getElementById('vm-score');
  const progressEl  = document.getElementById('vm-progress');
  const nextBtn     = document.getElementById('vm-next');
  if (!stageVideo || !optsEl) return;

  const CATEGORIES = ['saludos', 'colores', 'dias', 'familia', 'expresiones', 'numeros'];
  const TOTAL_ROUNDS = 10;

  let round = 0;
  let score = 0;
  let answered = false;
  let currentAnswer = null;

  function buildQuestion() {
    const catName = pickRandom(CATEGORIES);
    const pool = LSB_DATA[catName];
    const shuffledPool = shuffleArr(pool);
    const correct = shuffledPool[0];
    const distractors = shuffledPool.slice(1, 4);
    // Si la categoría no tiene suficientes ítems, rellena con otra categoría
    while (distractors.length < 3) {
      const backupPool = LSB_DATA[pickRandom(CATEGORIES)];
      const candidate = pickRandom(backupPool);
      if (candidate.label !== correct.label && !distractors.find(d => d.label === candidate.label)) {
        distractors.push(candidate);
      }
    }
    return { correct, options: shuffleArr([correct, ...distractors]) };
  }

  function renderRound() {
    answered = false;
    const q = buildQuestion();
    currentAnswer = q.correct;

    stageVideo.querySelector('source').src = videoUrl(q.correct.file);
    stageVideo.muted = true;
    stageVideo.defaultMuted = true;
    stageVideo.load();
    stageVideo.play().catch(() => {});

    progressEl.textContent = `Video ${round + 1} de ${TOTAL_ROUNDS}`;
    feedbackEl.style.display = 'none';

    optsEl.innerHTML = '';
    q.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.textContent = opt.label;
      btn.addEventListener('click', () => checkAnswer(btn, opt.label));
      optsEl.appendChild(btn);
    });

    nextBtn.disabled = true;
  }

  function checkAnswer(btn, chosenLabel) {
    if (answered) return;
    answered = true;

    optsEl.querySelectorAll('.option-btn').forEach(b => {
      b.disabled = true;
      if (b.textContent === currentAnswer.label) b.classList.add('correct');
    });

    if (chosenLabel === currentAnswer.label) {
      btn.classList.add('correct');
      score++;
      feedbackEl.textContent = '✅ ¡Correcto!';
      feedbackEl.className = 'feedback-msg feedback-ok';
    } else {
      btn.classList.add('wrong');
      feedbackEl.textContent = `❌ Era: ${currentAnswer.label}`;
      feedbackEl.className = 'feedback-msg feedback-no';
    }
    feedbackEl.style.display = 'block';
    scoreEl.textContent = score;
    nextBtn.disabled = false;
  }

  function showFinal() {
    stageVideo.style.display = 'none';
    optsEl.innerHTML = '';
    feedbackEl.style.display = 'none';
    progressEl.innerHTML = `
      <div class="dynamic-final-screen">
        <span class="df-emoji">${score >= 8 ? '🏆' : score >= 5 ? '⭐' : '💪'}</span>
        <h4>¡Partida completa!</h4>
        <p>Acertaste ${score} de ${TOTAL_ROUNDS} videos.</p>
      </div>`;
    nextBtn.textContent = '🔄 Jugar de nuevo';
    nextBtn.disabled = false;
  }

  nextBtn.addEventListener('click', () => {
    round++;
    if (round >= TOTAL_ROUNDS) {
      showFinal();
      round = -1; // marca de "listo para reiniciar"
      return;
    }
    if (round === 0 && stageVideo.style.display === 'none') {
      // reinicio tras pantalla final
      stageVideo.style.display = '';
      score = 0;
      scoreEl.textContent = '0';
      nextBtn.textContent = 'Siguiente →';
    }
    renderRound();
  });

  renderRound();
}

/* =====================================================
   JUEGO C — "Contrarreloj LSB"
   60 segundos. Video aleatorio (letras y vocabulario
   mezclados), el usuario escribe la respuesta lo más
   rápido posible. Cuenta cuántas acierta antes de que
   se acabe el tiempo. Guarda su mejor puntaje.
   ===================================================== */
function initContrarrelojGame() {
  const stageVideo  = document.getElementById('cr-video');
  const input       = document.getElementById('cr-input');
  const form        = document.getElementById('cr-form');
  const scoreEl     = document.getElementById('cr-score');
  const bestEl      = document.getElementById('cr-best');
  const timeEl      = document.getElementById('cr-time');
  const barFill     = document.getElementById('cr-bar');
  const startBtn    = document.getElementById('cr-start');
  const feedbackEl  = document.getElementById('cr-feedback');
  if (!stageVideo || !form) return;

  const BEST_KEY = 'lsb_contrarreloj_best';
  const DURATION = 60;
  const POOLS = ['alfabeto', 'saludos', 'colores', 'dias', 'familia', 'expresiones', 'numeros'];

  let score = 0;
  let timeLeft = DURATION;
  let timerId = null;
  let current = null;
  let running = false;

  bestEl.textContent = getBest(BEST_KEY);

  function nextItem() {
    const pool = LSB_DATA[pickRandom(POOLS)];
    current = pickRandom(pool);
    stageVideo.querySelector('source').src = videoUrl(current.file);
    stageVideo.muted = true;
    stageVideo.defaultMuted = true;
    stageVideo.load();
    stageVideo.play().catch(() => {});
    input.value = '';
    input.classList.remove('input-ok', 'input-no');
  }

  function tick() {
    timeLeft--;
    timeEl.textContent = timeLeft;
    barFill.style.width = (timeLeft / DURATION * 100) + '%';
    if (timeLeft <= 0) endGame();
  }

  function startGame() {
    score = 0;
    timeLeft = DURATION;
    running = true;
    scoreEl.textContent = '0';
    timeEl.textContent = DURATION;
    barFill.style.width = '100%';
    feedbackEl.style.display = 'none';
    startBtn.textContent = '⏳ Jugando…';
    startBtn.disabled = true;
    input.disabled = false;
    input.focus();
    nextItem();
    timerId = setInterval(tick, 1000);
  }

  function endGame() {
    running = false;
    clearInterval(timerId);
    input.disabled = true;
    startBtn.disabled = false;
    startBtn.textContent = '🔄 Jugar de nuevo';
    const best = setBestIfHigher(BEST_KEY, score);
    bestEl.textContent = best;
    feedbackEl.textContent = `⏱️ ¡Tiempo! Lograste ${score} aciertos.` + (score >= best ? ' ¡Nuevo mejor puntaje! 🏆' : '');
    feedbackEl.className = 'feedback-msg feedback-ok';
    feedbackEl.style.display = 'block';
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!running || !current) return;
    const guess = input.value.trim().toUpperCase();
    if (!guess) return;

    if (guess === current.label.toUpperCase()) {
      score++;
      scoreEl.textContent = score;
      input.classList.remove('input-no');
      input.classList.add('input-ok');
    } else {
      input.classList.remove('input-ok');
      input.classList.add('input-no');
    }
    setTimeout(() => {
      if (running) nextItem();
    }, 250);
  });

  startBtn.addEventListener('click', startGame);
  input.disabled = true;
}

// Auto-inicializa los juegos dinámicos si sus elementos existen en la página
document.addEventListener('DOMContentLoaded', () => {
  if (typeof LSB_DATA === 'undefined') return;
  if (document.getElementById('deletreo-video'))   initDeletreoGame();
  if (document.getElementById('vm-video'))         initVideoMisteriosoGame();
  if (document.getElementById('cr-video'))         initContrarrelojGame();
});
