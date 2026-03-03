/* =============================================
   Rajan Mehta — Security Researcher Portfolio
   script.js
   ============================================= */

(function () {
  'use strict';

  /* ── 1. PARTICLE CANVAS ───────────────────────────────── */
  // Drifting hex/network particles in the background. Not overdone —
  // just enough to give the bg some life without being distracting.

  const canvas  = document.getElementById('particle-canvas');
  const ctx     = canvas.getContext('2d');
  let W, H, particles = [];

  const PARTICLE_COUNT = 55;
  const COLORS = [
    'rgba(249,115,22,',   // orange
    'rgba(56,189,248,',   // blue
    'rgba(74,222,128,',   // green
  ];

  function resize () {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function randBetween (a, b) {
    return a + Math.random() * (b - a);
  }

  function makeParticle () {
    return {
      x:    randBetween(0, W),
      y:    randBetween(0, H),
      vx:   randBetween(-0.18, 0.18),
      vy:   randBetween(-0.22, 0.22),
      size: randBetween(1, 2.2),
      col:  COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: randBetween(0.07, 0.28),
      // occasionally show a tiny hex label
      label: Math.random() > 0.78
        ? '0x' + Math.floor(Math.random() * 0xFFFF).toString(16).padStart(4, '0').toUpperCase()
        : null,
    };
  }

  function initParticles () {
    particles = Array.from({ length: PARTICLE_COUNT }, makeParticle);
  }

  function drawConnections () {
    const DIST = 120;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < DIST) {
          const opacity = (1 - d / DIST) * 0.12;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(249,115,22,${opacity})`;
          ctx.lineWidth   = 0.6;
          ctx.stroke();
        }
      }
    }
  }

  function animateParticles () {
    ctx.clearRect(0, 0, W, H);

    drawConnections();

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;

      // wrap
      if (p.x < -20)  p.x = W + 20;
      if (p.x > W + 20) p.x = -20;
      if (p.y < -20)  p.y = H + 20;
      if (p.y > H + 20) p.y = -20;

      // dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.col + p.alpha + ')';
      ctx.fill();

      // label
      if (p.label) {
        ctx.font      = '9px JetBrains Mono, monospace';
        ctx.fillStyle = p.col + (p.alpha * 0.7) + ')';
        ctx.fillText(p.label, p.x + 4, p.y - 4);
      }
    });

    requestAnimationFrame(animateParticles);
  }

  resize();
  initParticles();
  animateParticles();
  window.addEventListener('resize', () => { resize(); initParticles(); });


  /* ── 2. TERMINAL TYPEWRITER ───────────────────────────── */
  // Types the terminal content in the hero section line by line.
  // Tries to feel like a real session, not a demo.

  const termBody = document.getElementById('termBody');

  const LINES = [
    { type: 'prompt', cmd: 'cat bounty_stats.json' },
    { type: 'out',    text: '{',                        cls: '' },
    { type: 'out',    text: '  "platform": "HackerOne + Bugcrowd",', cls: 'hi' },
    { type: 'out',    text: '  "reports_valid": 80,',  cls: '' },
    { type: 'out',    text: '  "p1_critical": 9,',     cls: '' },
    { type: 'out',    text: '  "hall_of_fames": 14,',  cls: '' },
    { type: 'out',    text: '  "focus": ["SSRF", "IDOR", "auth-bypass", "cloud"]', cls: 'ok' },
    { type: 'out',    text: '}',                        cls: '' },
    { type: 'prompt', cmd: 'cat current_scope.txt' },
    { type: 'out',    text: '>> shopify VDP  [ACTIVE]',    cls: 'warn' },
    { type: 'out',    text: '>> github bounty  [ACTIVE]',  cls: 'warn' },
    { type: 'out',    text: '>> h1-ctf  [this weekend]',   cls: '' },
    { type: 'end' },
  ];

  let lineIdx  = 0;
  let charIdx  = 0;
  let typing   = false;
  let cursorEl = null;

  function appendCursor () {
    if (cursorEl) cursorEl.remove();
    cursorEl = document.createElement('span');
    cursorEl.className = 't-cursor';
    termBody.appendChild(cursorEl);
  }

  function typeNextLine () {
    if (lineIdx >= LINES.length) {
      appendCursor();
      return;
    }

    const line = LINES[lineIdx];

    if (line.type === 'end') {
      // show idle prompt + blinking cursor
      const row = document.createElement('div');
      row.style.display = 'flex';
      const prompt = document.createElement('span');
      prompt.className = 't-prompt';
      prompt.textContent = 'rajan@kali:~$ ';
      row.appendChild(prompt);
      appendCursor();
      row.appendChild(cursorEl);
      termBody.appendChild(row);
      return;
    }

    if (line.type === 'out') {
      const span = document.createElement('span');
      span.className = 't-out' + (line.cls ? ' ' + line.cls : '');
      span.textContent = line.text;
      termBody.appendChild(span);
      lineIdx++;
      setTimeout(typeNextLine, 60 + Math.random() * 60);
      return;
    }

    if (line.type === 'prompt') {
      if (!typing) {
        // start new prompt row
        const row = document.createElement('div');
        row.style.display = 'flex';
        const prompt = document.createElement('span');
        prompt.className = 't-prompt';
        prompt.textContent = 'rajan@kali:~$ ';
        const cmdSpan = document.createElement('span');
        cmdSpan.className = 't-cmd';
        row.appendChild(prompt);
        row.appendChild(cmdSpan);
        termBody.appendChild(row);
        typing   = true;
        charIdx  = 0;
        // store reference
        row._cmdSpan = cmdSpan;
      }

      const row     = termBody.lastElementChild;
      const cmdSpan = row._cmdSpan;

      if (charIdx < line.cmd.length) {
        cmdSpan.textContent += line.cmd[charIdx];
        charIdx++;
        setTimeout(typeNextLine, 55 + Math.random() * 50);
      } else {
        // done typing this command
        typing = false;
        lineIdx++;
        setTimeout(typeNextLine, 200 + Math.random() * 150);
      }
      return;
    }
  }

  // slight delay before starting
  setTimeout(typeNextLine, 900);


  /* ── 3. NAV SCROLL BEHAVIOUR ─────────────────────────── */

  const navbar = document.getElementById('navbar');

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 30);
  }, { passive: true });


  /* ── 4. MOBILE NAV TOGGLE ────────────────────────────── */

  const navToggle = document.getElementById('navToggle');

  navToggle.addEventListener('click', () => {
    navbar.classList.toggle('menu-open');
  });

  // close menu when a link is clicked
  document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
      navbar.classList.remove('menu-open');
    });
  });


  /* ── 5. SCROLL REVEAL ────────────────────────────────── */
  // IntersectionObserver for .reveal elements with staggered delay.

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        // small stagger per sibling
        const siblings = Array.from(entry.target.parentElement.children);
        const idx      = siblings.indexOf(entry.target);
        const delay    = idx * 80;

        setTimeout(() => {
          entry.target.classList.add('visible');
        }, delay);

        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.reveal').forEach(el => {
    revealObserver.observe(el);
  });


  /* ── 6. SKILL BARS ───────────────────────────────────── */
  // Animate width on intersection. Data-w attribute holds target %.

  const barObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const bar = entry.target.querySelector('.skill-bar');
        if (!bar) return;
        const target = bar.dataset.w || '0';
        // small random jitter to feel human
        const jitter = Math.floor(Math.random() * 3) - 1;
        setTimeout(() => {
          bar.style.width = (parseInt(target) + jitter) + '%';
        }, 200);
        barObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  document.querySelectorAll('.skill-block').forEach(el => {
    barObserver.observe(el);
  });


  /* ── 7. COUNTER ANIMATION ────────────────────────────── */
  // Runs on .stat-n elements once the stats strip enters view.
  // Uses easing so it decelerates near the final number.

  const statsEl = document.querySelector('.hero-stats');

  function easeOutCubic (t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function animateCounter (el) {
    const target   = parseInt(el.dataset.target, 10);
    const duration = 1600;
    let   start    = null;

    function step (timestamp) {
      if (!start) start = timestamp;
      const elapsed  = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased    = easeOutCubic(progress);

      el.textContent = Math.floor(eased * target);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = target;
      }
    }

    requestAnimationFrame(step);
  }

  let countersRun = false;

  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !countersRun) {
        countersRun = true;
        document.querySelectorAll('.stat-n').forEach(el => {
          animateCounter(el);
        });
      }
    });
  }, { threshold: 0.5 });

  if (statsEl) counterObserver.observe(statsEl);


  /* ── 8. ACTIVE NAV HIGHLIGHT ─────────────────────────── */
  // Highlights the correct nav link based on scroll position.

  const sections  = document.querySelectorAll('section[id]');
  const navAnchors = document.querySelectorAll('.nav-links a');

  function updateActiveNav () {
    const scrollY = window.scrollY;

    sections.forEach(sec => {
      const top    = sec.offsetTop - 80;
      const bottom = top + sec.offsetHeight;

      if (scrollY >= top && scrollY < bottom) {
        navAnchors.forEach(a => {
          a.classList.remove('active-link');
          if (a.getAttribute('href') === '#' + sec.id) {
            a.classList.add('active-link');
          }
        });
      }
    });
  }

  window.addEventListener('scroll', updateActiveNav, { passive: true });
  updateActiveNav();


  /* ── 9. FINDING CARD EXPAND (optional detail toggle) ─── */
  // Clicking a finding card slightly expands it in place for
  // better readability on mobile.  Nothing flashy.

  document.querySelectorAll('.finding-card').forEach(card => {
    card.style.cursor = 'default';
  });


  /* ── 10. SUBTLE TYPING GLITCH ON NAME ───────────────── */
  // Occasionally scrambles and re-renders the hero name for a
  // subtle "signal interference" feel. Not constant — just rare
  // enough to surprise.

  const nameEl = document.querySelector('.hero-name');
  const origLine1 = 'Rajan';
  const origLine2 = 'Mehta';
  const GLITCH_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz01!@#$%^&*';

  function glitchText (original) {
    let out = '';
    for (let i = 0; i < original.length; i++) {
      if (original[i] === ' ') { out += ' '; continue; }
      out += Math.random() > 0.45
        ? GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
        : original[i];
    }
    return out;
  }

  function runGlitch () {
    if (!nameEl) return;
    const line1El = nameEl.querySelector('.line1');
    const line2El = nameEl.querySelector('.line2');
    if (!line1El || !line2El) return;

    let step  = 0;
    const MAX = 8;

    const interval = setInterval(() => {
      if (step < MAX) {
        line1El.textContent = glitchText(origLine1);
        line2El.textContent = glitchText(origLine2);
        step++;
      } else {
        clearInterval(interval);
        line1El.textContent = origLine1;
        // restore line2 with dot-accent
        line2El.textContent = origLine2;
        const dot = document.createElement('span');
        dot.className   = 'dot-accent';
        dot.textContent = '.';
        line2El.appendChild(dot);
      }
    }, 55);
  }

  // First glitch after 3.5s, then random every 18–35s
  setTimeout(() => {
    runGlitch();
    setInterval(runGlitch, 18000 + Math.random() * 17000);
  }, 3500);


  /* ── 11. CURSOR BLINK CLASS FOR NAV ─────────────────── */
  const blinkEl = document.querySelector('.blink');
  // already handled by CSS animation — nothing extra needed here


  /* ── 12. PREVENT OUTLINE ON MOUSE CLICK ─────────────── */
  // Keeps focus rings for keyboard nav but removes them for
  // mouse users. Small UX touch.

  document.body.addEventListener('mousedown', () => {
    document.body.classList.add('mouse-nav');
  });

  document.body.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      document.body.classList.remove('mouse-nav');
    }
  });

})();
