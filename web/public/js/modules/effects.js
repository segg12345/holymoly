/* ============================================================
   NHÀ HÀNG SEN VÀNG — MODULE: VISUAL EFFECTS & CHOREOGRAPHY
   ============================================================ */
import { $, $$, debounce, fmt, num, VN_TZ } from './core.js';

export function startClock() {
  const update = () => {
    const now = new Date();
    const str = now.toLocaleTimeString('vi-VN', {
      timeZone: VN_TZ,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const clockEl = $('#top-clock');
    if (clockEl) clockEl.textContent = str;
  };
  update();
  setInterval(update, 1000);
}

export function initAmbientCanvas() {
  const canvas = $('#ambient-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width;
  let height;
  const particles = [];
  const PARTICLE_COUNT = 24;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', debounce(resize, 200));

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 2.5 + 1.2,
      vx: (Math.random() - 0.5) * 0.35,
      vy: -Math.random() * 0.45 - 0.15,
      opacity: Math.random() * 0.45 + 0.15,
      pulseSpeed: Math.random() * 0.02 + 0.01,
      color: Math.random() > 0.4 ? 'rgba(217, 138, 12,' : 'rgba(51, 156, 117,',
    });
  }

  let animId;
  function loop() {
    ctx.clearRect(0, 0, width, height);

    const grad = ctx.createRadialGradient(width * 0.85, height * 0.15, 10, width * 0.85, height * 0.15, width * 0.55);
    grad.addColorStop(0, 'rgba(217, 138, 12, 0.045)');
    grad.addColorStop(1, 'rgba(5, 25, 17, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.opacity += Math.sin(Date.now() * p.pulseSpeed * 0.05) * 0.005;

      if (p.y < -10) {
        p.y = height + 10;
        p.x = Math.random() * width;
      }
      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `${p.color} ${Math.max(0.05, Math.min(0.6, p.opacity))})`;
      ctx.shadowBlur = 8;
      ctx.shadowColor = 'rgba(217, 138, 12, 0.4)';
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    if (!document.hidden && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      animId = requestAnimationFrame(loop);
    }
  }
  loop();

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) loop();
    else cancelAnimationFrame(animId);
  });
}

export function initCustomCursor() {
  if (window.matchMedia('(pointer: coarse)').matches) return;
  const dot = $('#cursor-dot');
  const aura = $('#cursor-aura');
  if (!dot || !aura) return;

  let mouseX = -100;
  let mouseY = -100;
  let auraX = -100;
  let auraY = -100;

  window.addEventListener(
    'mousemove',
    (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
    },
    { passive: true }
  );

  function renderAura() {
    auraX += (mouseX - auraX) * 0.16;
    auraY += (mouseY - auraY) * 0.16;
    aura.style.transform = `translate3d(${auraX}px, ${auraY}px, 0) translate(-50%, -50%)`;
    requestAnimationFrame(renderAura);
  }
  renderAura();

  document.addEventListener('mouseover', (e) => {
    const target = e.target.closest('button, a, .table-card, input, select, .nav-item, .brand-emblem');
    if (target) aura.classList.add('hovered');
  });
  document.addEventListener('mouseout', (e) => {
    const target = e.target.closest('button, a, .table-card, input, select, .nav-item, .brand-emblem');
    if (target) aura.classList.remove('hovered');
  });
}

export function initCardTilt() {
  if (window.matchMedia('(pointer: coarse)').matches) return;
  let ticking = false;

  document.addEventListener(
    'mousemove',
    (e) => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const cards = $$('.card, .kpi-card, .table-card');
        for (const card of cards) {
          const rect = card.getBoundingClientRect();
          if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);

            const isLarge = rect.width > 500;
            const maxDeg = isLarge ? 0.08 : 0.35;
            const scale = isLarge ? 1 : 1.001;
            const perspective = isLarge ? 3200 : 2400;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = (((y - centerY) / centerY) * -maxDeg).toFixed(2);
            const rotateY = (((x - centerX) / centerX) * maxDeg).toFixed(2);

            card.style.transform = `perspective(${perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${scale}, ${scale}, ${scale})`;
          } else if (card.style.transform) {
            card.style.transform = '';
          }
        }
      });
    },
    { passive: true }
  );
}

export function animateHeaderLotus() {
  if (!window.anime) return;
  const visual = $('#hero-lotus-visual');
  if (!visual) return;

  window.anime({
    targets: '.lotus-ring-inner',
    rotate: '1turn',
    duration: 32000,
    loop: true,
    easing: 'linear',
  });

  window.anime({
    targets: '.lotus-ring-outer',
    rotate: '-1turn',
    duration: 48000,
    loop: true,
    easing: 'linear',
  });

  window.anime({
    targets: '.lotus-petal',
    strokeDashoffset: [window.anime.setDashoffset, 0],
    easing: 'easeInOutSine',
    duration: 1800,
    delay: (el, i) => i * 90,
  });
}

export function animateNumberCounter(el, targetVal, isCurrency = true) {
  if (!window.anime) {
    el.textContent = isCurrency ? fmt(targetVal) : num(targetVal);
    return;
  }
  const obj = { val: 0 };
  window.anime({
    targets: obj,
    val: targetVal,
    round: 1,
    duration: 1200,
    easing: 'easeOutExpo',
    update: () => {
      el.textContent = isCurrency ? fmt(obj.val) : num(obj.val);
    },
  });
}
