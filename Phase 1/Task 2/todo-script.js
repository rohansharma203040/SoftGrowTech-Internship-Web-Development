/* =====================================
   Taskr — To-Do App
   todo-script.js
   ===================================== */

(function () {
  'use strict';

  /* ─────────────────────────────────────
     STATE
  ───────────────────────────────────── */
  let tasks      = [];
  let filter     = 'all';    // 'all' | 'active' | 'completed'
  let catFilter  = 'all';    // 'all' | 'work' | 'personal' | 'learning' | 'health'
  let sortBy     = 'created'; // 'created' | 'priority'
  let editingId  = null;


  /* ─────────────────────────────────────
     PRIORITY ORDER (for sort)
  ───────────────────────────────────── */
  const PRI_ORDER = { high: 0, normal: 1, low: 2 };

  const PRI_COLORS = {
    high:   'var(--accent)',
    normal: 'transparent',
    low:    'var(--blue)',
  };


  /* ─────────────────────────────────────
     DOM REFS
  ───────────────────────────────────── */
  const taskInput   = document.getElementById('taskInput');
  const addBtn      = document.getElementById('addBtn');
  const taskList    = document.getElementById('taskList');
  const emptyState  = document.getElementById('emptyState');
  const emptyIcon   = document.getElementById('emptyIcon');
  const emptyTitle  = document.getElementById('emptyTitle');
  const emptySub    = document.getElementById('emptySub');
  const catSelect   = document.getElementById('catSelect');
  const priSelect   = document.getElementById('priSelect');
  const charCount   = document.getElementById('charCount');
  const ringFill    = document.getElementById('ringFill');
  const ringPct     = document.getElementById('ringPct');
  const totalN      = document.getElementById('totalN');
  const leftN       = document.getElementById('leftN');
  const doneN       = document.getElementById('doneN');
  const listTitle   = document.getElementById('listTitle');
  const themeToggle = document.getElementById('themeToggle');
  const greeting    = document.getElementById('greeting');
  const dateDay     = document.getElementById('dateDay');
  const dateFull    = document.getElementById('dateFull');
  const clearDone   = document.getElementById('clearDone');
  const clearAll    = document.getElementById('clearAll');
  const modalOverlay = document.getElementById('modalOverlay');
  const modalInput  = document.getElementById('modalInput');
  const modalSave   = document.getElementById('modalSave');
  const modalCancel = document.getElementById('modalCancel');


  /* ─────────────────────────────────────
     1. STORAGE — read/write localStorage
  ───────────────────────────────────── */
  const STORAGE_KEY = 'taskr_v2_tasks';
  const THEME_KEY   = 'taskr_theme';

  function saveTasks () {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (e) {
      // localStorage unavailable (private browsing etc.) — silent fail
    }
  }

  function loadTasks () {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      tasks = raw ? JSON.parse(raw) : [];
    } catch (e) {
      tasks = [];
    }
  }

  function saveTheme (isDark) {
    try {
      localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
    } catch (e) {}
  }

  function loadTheme () {
    try {
      return localStorage.getItem(THEME_KEY) || 'light';
    } catch (e) {
      return 'light';
    }
  }


  /* ─────────────────────────────────────
     2. DATE & GREETING
  ───────────────────────────────────── */
  function setDateAndGreeting () {
    const now  = new Date();
    const h    = now.getHours();
    let greet  = 'good morning.';
    if (h >= 12 && h < 17) greet = 'good afternoon.';
    else if (h >= 17)       greet = 'good evening.';

    greeting.textContent = greet;

    dateDay.textContent  = now.toLocaleDateString('en-GB', { weekday: 'long' });
    dateFull.textContent = now.toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }


  /* ─────────────────────────────────────
     3. THEME TOGGLE
  ───────────────────────────────────── */
  function applyTheme (theme) {
    document.body.classList.toggle('dark', theme === 'dark');
  }

  themeToggle.addEventListener('click', () => {
    const isDark = !document.body.classList.contains('dark');
    applyTheme(isDark ? 'dark' : 'light');
    saveTheme(isDark);
  });


  /* ─────────────────────────────────────
     4. ADD TASK
  ───────────────────────────────────── */
  function addTask () {
    const text = taskInput.value.trim();
    if (!text) {
      taskInput.classList.add('shake');
      taskInput.addEventListener('animationend', () => taskInput.classList.remove('shake'), { once: true });
      return;
    }

    const task = {
      id:        Date.now(),
      text,
      category:  catSelect.value,
      priority:  priSelect.value,
      done:      false,
      createdAt: new Date().toISOString(),
      // show a human-readable short time e.g. "09:42"
      timeLabel: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    };

    tasks.unshift(task);
    saveTasks();

    taskInput.value = '';
    charCount.textContent = '0 / 140';
    charCount.classList.remove('warn');
    priSelect.value = 'normal'; // reset priority, keep category

    render();
    // scroll list into view on mobile
    taskList.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  addBtn.addEventListener('click', addTask);

  taskInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') addTask();
  });

  // char counter
  taskInput.addEventListener('input', () => {
    const len = taskInput.value.length;
    charCount.textContent = `${len} / 140`;
    charCount.classList.toggle('warn', len > 110);
  });


  /* ─────────────────────────────────────
     5. TOGGLE DONE
  ───────────────────────────────────── */
  function toggleDone (id) {
    const t = tasks.find(t => t.id === id);
    if (!t) return;
    t.done = !t.done;
    saveTasks();
    render();
  }


  /* ─────────────────────────────────────
     6. DELETE TASK
  ───────────────────────────────────── */
  function deleteTask (id) {
    const el = taskList.querySelector(`[data-id="${id}"]`);
    if (el) {
      el.classList.add('removing');
      el.addEventListener('animationend', () => {
        tasks = tasks.filter(t => t.id !== id);
        saveTasks();
        render();
      }, { once: true });
    }
  }


  /* ─────────────────────────────────────
     7. EDIT TASK (modal)
  ───────────────────────────────────── */
  function openEdit (id) {
    const t = tasks.find(t => t.id === id);
    if (!t) return;
    editingId = id;
    modalInput.value = t.text;
    modalOverlay.hidden = false;
    modalInput.focus();
    modalInput.select();
  }

  function closeEdit () {
    editingId = null;
    modalOverlay.hidden = true;
    modalInput.value = '';
  }

  function saveEdit () {
    const text = modalInput.value.trim();
    if (!text || !editingId) return;
    const t = tasks.find(t => t.id === editingId);
    if (t) {
      t.text = text;
      saveTasks();
      render();
    }
    closeEdit();
  }

  modalSave.addEventListener('click', saveEdit);
  modalCancel.addEventListener('click', closeEdit);
  modalInput.addEventListener('keydown', e => {
    if (e.key === 'Enter')  saveEdit();
    if (e.key === 'Escape') closeEdit();
  });

  modalOverlay.addEventListener('click', e => {
    if (e.target === modalOverlay) closeEdit();
  });


  /* ─────────────────────────────────────
     8. CLEAR ACTIONS
  ───────────────────────────────────── */
  clearDone.addEventListener('click', () => {
    tasks = tasks.filter(t => !t.done);
    saveTasks();
    render();
  });

  clearAll.addEventListener('click', () => {
    if (tasks.length === 0) return;
    if (!confirm('delete all tasks? this can\'t be undone.')) return;
    tasks = [];
    saveTasks();
    render();
  });


  /* ─────────────────────────────────────
     9. FILTERS & SORT
  ───────────────────────────────────── */
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      filter = btn.dataset.filter;
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      render();
    });
  });

  document.querySelectorAll('.cat-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      catFilter = pill.dataset.cat;
      document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      render();
    });
  });

  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      sortBy = btn.dataset.sort;
      document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      render();
    });
  });


  /* ─────────────────────────────────────
     10. STATS + RING UPDATE
  ───────────────────────────────────── */
  function updateStats () {
    const total = tasks.length;
    const done  = tasks.filter(t => t.done).length;
    const left  = total - done;
    const pct   = total ? Math.round((done / total) * 100) : 0;

    totalN.textContent = total;
    leftN.textContent  = left;
    doneN.textContent  = done;
    ringPct.textContent = pct + '%';

    // ring: stroke-dashoffset = CIRCUMFERENCE * (1 - pct/100)
    const C = 251.2;
    ringFill.style.strokeDashoffset = C - (C * pct / 100);
  }


  /* ─────────────────────────────────────
     11. BUILD TASK ITEM HTML
  ───────────────────────────────────── */
  function buildItem (t) {
    const li = document.createElement('li');
    li.className = 'task-item' + (t.done ? ' is-done' : '');
    li.dataset.id = t.id;
    li.style.setProperty('--pri-color', PRI_COLORS[t.priority] || 'transparent');

    // checkbox
    const check = document.createElement('button');
    check.className = 'task-check';
    check.setAttribute('aria-label', t.done ? 'Mark incomplete' : 'Mark complete');
    check.innerHTML = `<svg viewBox="0 0 12 9"><polyline points="1,5 4,8 11,1"/></svg>`;
    check.addEventListener('click', () => toggleDone(t.id));

    // body
    const body = document.createElement('div');
    body.className = 'task-body';

    const textEl = document.createElement('p');
    textEl.className = 'task-text';
    textEl.textContent = t.text;

    const badges = document.createElement('div');
    badges.className = 'task-badges';

    const catBadge = document.createElement('span');
    catBadge.className = `badge badge-${t.category}`;
    catBadge.textContent = t.category;

    const priBadge = document.createElement('span');
    priBadge.className = `badge badge-${t.priority}`;
    priBadge.textContent = t.priority;

    badges.appendChild(catBadge);
    if (t.priority !== 'normal') badges.appendChild(priBadge);

    body.appendChild(textEl);
    body.appendChild(badges);

    // time
    const timeEl = document.createElement('span');
    timeEl.className = 'task-time';
    timeEl.textContent = t.timeLabel || '';

    // actions
    const actions = document.createElement('div');
    actions.className = 'task-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'icon-btn';
    editBtn.setAttribute('aria-label', 'Edit task');
    editBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
    editBtn.addEventListener('click', () => openEdit(t.id));

    const delBtn = document.createElement('button');
    delBtn.className = 'icon-btn del';
    delBtn.setAttribute('aria-label', 'Delete task');
    delBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>`;
    delBtn.addEventListener('click', () => deleteTask(t.id));

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    li.appendChild(check);
    li.appendChild(body);
    li.appendChild(timeEl);
    li.appendChild(actions);

    return li;
  }


  /* ─────────────────────────────────────
     12. RENDER
  ───────────────────────────────────── */
  function render () {
    updateStats();

    // filter
    let visible = tasks.slice();

    if (filter === 'active')    visible = visible.filter(t => !t.done);
    if (filter === 'completed') visible = visible.filter(t => t.done);

    if (catFilter !== 'all') {
      visible = visible.filter(t => t.category === catFilter);
    }

    // sort
    if (sortBy === 'priority') {
      visible.sort((a, b) => {
        const pd = (PRI_ORDER[a.priority] ?? 1) - (PRI_ORDER[b.priority] ?? 1);
        if (pd !== 0) return pd;
        // secondary: undone first
        return (a.done ? 1 : 0) - (b.done ? 1 : 0);
      });
    } else {
      // newest first (default) — tasks are already unshifted on add
      // but re-sort by id (timestamp) to be safe
      visible.sort((a, b) => b.id - a.id);
    }

    // update list title
    const titles = {
      all:       'all tasks',
      active:    'active tasks',
      completed: 'done',
    };
    listTitle.textContent = catFilter !== 'all'
      ? `${catFilter} — ${titles[filter] || 'all'}`
      : titles[filter] || 'all tasks';

    // empty state
    const isEmpty = visible.length === 0;
    emptyState.hidden = !isEmpty;

    if (isEmpty) {
      if (tasks.length === 0) {
        emptyIcon.textContent  = '✦';
        emptyTitle.textContent = 'nothing here yet';
        emptySub.textContent   = 'add a task above to get going';
      } else if (filter === 'completed') {
        emptyIcon.textContent  = '○';
        emptyTitle.textContent = 'nothing done yet';
        emptySub.textContent   = 'complete a task and it\'ll show up here';
      } else {
        emptyIcon.textContent  = '✓';
        emptyTitle.textContent = 'all clear';
        emptySub.textContent   = 'everything is done. nice.';
      }
    }

    // clear and rebuild list
    // keep existing DOM nodes that haven't changed to avoid flash
    const existing = {};
    taskList.querySelectorAll('.task-item').forEach(el => {
      existing[el.dataset.id] = el;
    });

    // remove items not in visible
    const visibleIds = new Set(visible.map(t => String(t.id)));
    Object.keys(existing).forEach(id => {
      if (!visibleIds.has(id)) existing[id].remove();
    });

    // insert / update in correct order
    visible.forEach((t, i) => {
      const existing_el = taskList.querySelector(`[data-id="${t.id}"]`);
      if (existing_el) {
        // update done state without full re-render
        existing_el.classList.toggle('is-done', t.done);
        const txt = existing_el.querySelector('.task-text');
        if (txt && txt.textContent !== t.text) txt.textContent = t.text;
        // move to correct position if needed
        const currentIdx = Array.from(taskList.children).indexOf(existing_el);
        if (currentIdx !== i) taskList.insertBefore(existing_el, taskList.children[i] || null);
      } else {
        const newEl = buildItem(t);
        taskList.insertBefore(newEl, taskList.children[i] || null);
      }
    });
  }


  /* ─────────────────────────────────────
     INIT
  ───────────────────────────────────── */
  function init () {
    setDateAndGreeting();
    applyTheme(loadTheme());
    loadTasks();
    render();
  }

  init();

})();
