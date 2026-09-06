// ============================================
// LSB Aprende — Juego con Cámara: "Practica tu Seña"
// Usa MediaPipe Hands (cargado por CDN en juegos.html)
// para detectar en vivo la mano del usuario y confirmar
// que hubo movimiento real mientras practica la seña
// mostrada en el video de referencia.
//
// IMPORTANTE — honestidad técnica:
// Esto NO reconoce automáticamente CUÁL letra/seña hizo
// el usuario (eso requeriría un modelo entrenado
// específicamente con el alfabeto de LSB). Lo que sí hace
// de verdad es: conectarse a la cámara, detectar la mano
// en tiempo real, dibujar su esqueleto sobre el video y
// medir si hubo movimiento/gesto real durante la ventana
// de práctica. Combinado con la autoevaluación del propio
// usuario, esto da un modo de práctica guiada honesto.
// ============================================

function initCameraGame() {
  const startBtn      = document.getElementById('cam-start');
  const stopBtn        = document.getElementById('cam-stop');
  const refVideo       = document.getElementById('cam-ref-video');
  const refLabel       = document.getElementById('cam-ref-label');
  const camVideo       = document.getElementById('cam-user-video');
  const camCanvas      = document.getElementById('cam-canvas');
  const statusEl       = document.getElementById('cam-status');
  const handIndicator  = document.getElementById('cam-hand-indicator');
  const scoreEl        = document.getElementById('cam-score');
  const streakEl       = document.getElementById('cam-streak');
  const bestEl         = document.getElementById('cam-best');
  const permissionNote = document.getElementById('cam-permission-note');
  const selfBtnGood    = document.getElementById('cam-self-good');
  const selfBtnRepeat  = document.getElementById('cam-self-repeat');
  const countdownEl    = document.getElementById('cam-countdown');

  if (!startBtn || !refVideo || !camVideo || typeof LSB_DATA === 'undefined') return;

  const BEST_KEY = 'lsb_camara_best';
  const PRACTICE_SECONDS = 4;
  const POOL = ['alfabeto', 'saludos', 'colores', 'dias', 'familia', 'expresiones'];

  let score = 0;
  let streak = 0;
  let currentItem = null;
  let stream = null;
  let hands = null;
  let rafId = null;
  let handsReady = false;
  let handDetectedFrames = 0;
  let totalFrames = 0;
  let movementScore = 0;
  let lastLandmarks = null;
  let phase = 'idle'; // idle | countdown | practicing | evaluating
  let ctx = camCanvas ? camCanvas.getContext('2d') : null;

  bestEl.textContent = getBestScore(BEST_KEY);

  function pickNext() {
    const pool = LSB_DATA[POOL[Math.floor(Math.random() * POOL.length)]];
    currentItem = pool[Math.floor(Math.random() * pool.length)];
    refVideo.querySelector('source').src = videoUrl(currentItem.file);
    refVideo.muted = true;
    refVideo.load();
    refVideo.play().catch(() => {});
    refLabel.textContent = currentItem.label;
  }

  function setStatus(text) { if (statusEl) statusEl.textContent = text; }

  function setHandDetected(on) {
    if (!handIndicator) return;
    handIndicator.classList.toggle('detected', on);
    handIndicator.querySelector('.hi-text') && (handIndicator.querySelector('.hi-text').textContent = on ? 'Mano detectada' : 'Buscando mano...');
  }

  // ---------- Conexión a la cámara ----------
  async function startCamera() {
    startBtn.disabled = true;
    startBtn.textContent = '⏳ Conectando cámara...';

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      permissionNote.innerHTML = '⚠️ <strong>Tu navegador no soporta acceso a cámara</strong>, o esta página no se está sirviendo por HTTPS/localhost (requisito de seguridad de los navegadores). Prueba abrir el sitio con un servidor local o súbelo a un hosting con HTTPS.';
      permissionNote.style.display = 'block';
      startBtn.disabled = false;
      startBtn.textContent = '📷 Activar cámara';
      return;
    }

    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 360 }, audio: false });
      camVideo.srcObject = stream;
      await camVideo.play();
      permissionNote.style.display = 'none';
    } catch (err) {
      permissionNote.innerHTML = `⚠️ <strong>No pudimos acceder a tu cámara.</strong> Revisa que hayas dado permiso al navegador y que ningún otro programa la esté usando. (${err.name})`;
      permissionNote.style.display = 'block';
      startBtn.disabled = false;
      startBtn.textContent = '📷 Activar cámara';
      return;
    }

    setupHandTracking();

    startBtn.style.display = 'none';
    stopBtn.style.display = '';
    setStatus('¡Cámara conectada! Preparando ronda...');
    score = 0; streak = 0;
    scoreEl.textContent = '0';
    streakEl.textContent = '0';
    nextRound();
  }

  function stopCamera() {
    phase = 'idle';
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    handsReady = false;
    if (stream) stream.getTracks().forEach(t => t.stop());
    stream = null;
    startBtn.style.display = '';
    startBtn.disabled = false;
    startBtn.textContent = '📷 Activar cámara';
    stopBtn.style.display = 'none';
    setStatus('Cámara desconectada.');
    if (ctx) ctx.clearRect(0, 0, camCanvas.width, camCanvas.height);
  }

  // ---------- MediaPipe Hands ----------
  function setupHandTracking() {
    if (typeof Hands === 'undefined') {
      setStatus('⚠️ No se pudo cargar el detector de manos (revisa tu conexión a internet). Puedes seguir practicando y autoevaluarte manualmente.');
      handsReady = false;
      return;
    }

    hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });
    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.5
    });
    hands.onResults(onHandResults);
    handsReady = true;

    const loop = async () => {
      if (!stream) return;
      if (camVideo.readyState >= 2) {
        try { await hands.send({ image: camVideo }); } catch (e) { /* frame skip */ }
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
  }

  function onHandResults(results) {
    if (!ctx) return;
    camCanvas.width = camVideo.videoWidth || 480;
    camCanvas.height = camVideo.videoHeight || 360;
    ctx.clearRect(0, 0, camCanvas.width, camCanvas.height);

    const hasHand = results.multiHandLandmarks && results.multiHandLandmarks.length > 0;
    setHandDetected(hasHand);

    if (hasHand) {
      const landmarks = results.multiHandLandmarks[0];

      if (typeof drawConnectors === 'function') {
        drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { color: '#22C55E', lineWidth: 3 });
      }
      if (typeof drawLandmarks === 'function') {
        drawLandmarks(ctx, landmarks, { color: '#3B82F6', lineWidth: 1, radius: 3 });
      }

      // Mide movimiento comparando con el frame anterior (solo durante la práctica)
      if (phase === 'practicing') {
        totalFrames++;
        handDetectedFrames++;
        if (lastLandmarks) {
          let delta = 0;
          for (let i = 0; i < landmarks.length; i++) {
            delta += Math.abs(landmarks[i].x - lastLandmarks[i].x) + Math.abs(landmarks[i].y - lastLandmarks[i].y);
          }
          movementScore += delta;
        }
        lastLandmarks = landmarks;
      }
    } else if (phase === 'practicing') {
      totalFrames++;
    }
  }

  // ---------- Flujo de rondas ----------
  function nextRound() {
    pickNext();
    handDetectedFrames = 0;
    totalFrames = 0;
    movementScore = 0;
    lastLandmarks = null;
    phase = 'countdown';

    let count = 3;
    countdownEl.style.display = 'block';
    countdownEl.textContent = count;
    setStatus('Observa el video de referencia y prepárate...');

    const countdownTimer = setInterval(() => {
      count--;
      if (count > 0) {
        countdownEl.textContent = count;
      } else {
        clearInterval(countdownTimer);
        countdownEl.textContent = '¡AHORA!';
        setTimeout(() => startPracticeWindow(), 500);
      }
    }, 700);
  }

  function startPracticeWindow() {
    phase = 'practicing';
    countdownEl.style.display = 'none';
    let timeLeft = PRACTICE_SECONDS;
    setStatus(`🖐️ ¡Haz la seña de "${currentItem.label}" frente a la cámara! (${timeLeft}s)`);

    const practiceTimer = setInterval(() => {
      timeLeft--;
      if (timeLeft > 0) {
        setStatus(`🖐️ ¡Haz la seña de "${currentItem.label}" frente a la cámara! (${timeLeft}s)`);
      } else {
        clearInterval(practiceTimer);
        evaluateRound();
      }
    }, 1000);
  }

  function evaluateRound() {
    phase = 'evaluating';
    const handPresenceRatio = totalFrames > 0 ? handDetectedFrames / totalFrames : 0;
    const movedEnough = movementScore > 0.6; // umbral de movimiento acumulado

    const autoSuccess = handPresenceRatio > 0.4 && movedEnough;

    if (autoSuccess) {
      setStatus(`✅ ¡Detectamos tu mano en movimiento haciendo la seña "${currentItem.label}"!`);
      registerResult(true);
    } else {
      setStatus(`🖐️ No detectamos suficiente movimiento de tu mano. ¿Quieres marcarlo tú mismo?`);
      selfBtnGood.style.display = '';
      selfBtnRepeat.style.display = '';
    }
  }

  function registerResult(success, manual = false) {
    selfBtnGood.style.display = 'none';
    selfBtnRepeat.style.display = 'none';

    if (success) {
      score++;
      streak++;
      setStatus(`🎉 ¡Muy bien! ${manual ? 'Marcado por ti.' : ''} Siguiente seña en un momento...`);
    } else {
      streak = 0;
      setStatus('🔁 Sin problema, vamos con otra. ¡Sigue practicando!');
    }

    scoreEl.textContent = score;
    streakEl.textContent = streak;
    bestEl.textContent = saveBestScore(BEST_KEY, score, true);

    setTimeout(() => {
      if (phase !== 'idle') nextRound();
    }, 1400);
  }

  selfBtnGood.addEventListener('click', () => registerResult(true, true));
  selfBtnRepeat.addEventListener('click', () => registerResult(false, true));

  startBtn.addEventListener('click', startCamera);
  stopBtn.addEventListener('click', stopCamera);
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('cam-start')) initCameraGame();
});
