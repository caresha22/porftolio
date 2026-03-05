/* ═══════════════════════════════════════════════════
   PLANNER — app.js
   All data management, rendering, and interactivity
═══════════════════════════════════════════════════ */

// ─── DATA LAYER ──────────────────────────────────────
const DB = {
  get: k => JSON.parse(localStorage.getItem('planner_' + k) || 'null'),
  set: (k, v) => localStorage.setItem('planner_' + k, JSON.stringify(v)),
};

let assignments = DB.get('assignments') || [];
let courses     = DB.get('courses')     || [];
let pomodoro    = DB.get('pomodoro')    || { sessionsToday: 0, minutesToday: 0, lastDate: null };
let wellness    = DB.get('wellness')    || { streak: 0, lastCheckin: null, mood: null };

let activeFilter = 'all';
let activeSort   = 'due';

function save() {
  DB.set('assignments', assignments);
  DB.set('courses',     courses);
  DB.set('pomodoro',    pomodoro);
  DB.set('wellness',    wellness);
}

// ─── UTILITIES ───────────────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseDate(str) {
  return str ? new Date(str + 'T00:00:00') : null;
}

function daysUntil(dateStr) {
  if (!dateStr) return Infinity;
  const diff = parseDate(dateStr) - new Date(today() + 'T00:00:00');
  return Math.round(diff / 86400000);
}

function formatDue(dateStr) {
  if (!dateStr) return '';
  const d = daysUntil(dateStr);
  if (d < 0)  return `${Math.abs(d)} day${Math.abs(d) !== 1 ? 's' : ''} overdue`;
  if (d === 0) return 'Due today';
  if (d === 1) return 'Due tomorrow';
  if (d < 7)  return `Due in ${d} days`;
  const date = parseDate(dateStr);
  return `Due ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

function isDueClass(dateStr, completed) {
  if (completed) return '';
  const d = daysUntil(dateStr);
  if (d < 0)  return 'overdue';
  if (d <= 2) return 'soon';
  return '';
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

// ─── COLOR MAP ───────────────────────────────────────
const COLORS = {
  sage: { bg: 'var(--sage-bg)', mid: 'var(--sage-mid)', main: 'var(--sage)' },
  rust: { bg: 'var(--rust-bg)', mid: 'var(--rust-mid)', main: 'var(--rust)' },
  sky:  { bg: 'var(--sky-bg)',  mid: 'var(--sky-mid)',  main: 'var(--sky)'  },
  lav:  { bg: 'var(--lav-bg)', mid: 'var(--lav-mid)',  main: 'var(--lavender)' },
  gold: { bg: 'var(--gold-bg)', mid: 'rgba(196,154,42,.4)', main: 'var(--gold)' },
};

const BADGE_MAP = { sage: 'badge-sage', rust: 'badge-rust', sky: 'badge-sky', lav: 'badge-lav', gold: 'badge-gold' };

function courseColor(cId) {
  const c = courses.find(x => x.id === cId);
  return c ? (COLORS[c.color] || COLORS.sage) : COLORS.sage;
}

function courseName(cId) {
  const c = courses.find(x => x.id === cId);
  return c ? c.name : 'Unknown';
}

function getCourse(cId) {
  return courses.find(x => x.id === cId);
}

// ─── NAVIGATION ──────────────────────────────────────
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.querySelector(`[data-page="${page}"]`).classList.add('active');
  updateTopbarTitle(page);
  refreshPage(page);
}

function updateTopbarTitle(page) {
  const titles = {
    dashboard:   `Good ${getTimeOfDay()}, <em>Scholar</em> ✦`,
    assignments: 'My <em>Assignments</em>',
    courses:     'My <em>Courses</em>',
    pomodoro:    'Focus <em>Timer</em>',
    wellness:    '<em>Wellness</em> Hub',
  };
  document.getElementById('topbarTitle').innerHTML = titles[page] || '';
}

document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => navigate(btn.dataset.page));
});

// ─── MODAL ───────────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  if (id === 'assignmentModal') resetAssignmentForm();
  if (id === 'courseModal')     resetCourseForm();
}

document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) closeModal(m.id); });
});

// ─── TOAST ───────────────────────────────────────────
function toast(msg, type = '') {
  const wrap = document.getElementById('toastWrap');
  const el   = document.createElement('div');
  el.className = 'toast' + (type ? ' ' + type : '');
  el.innerHTML = `<span>${type === 'success' ? '✓' : type === 'warning' ? '⚠' : 'ℹ'}</span> ${msg}`;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ─── COURSES ─────────────────────────────────────────
function resetCourseForm() {
  document.getElementById('editCourseId').value   = '';
  document.getElementById('courseName').value     = '';
  document.getElementById('courseCode').value     = '';
  document.getElementById('courseColor').value    = 'sage';
  document.getElementById('courseInstructor').value = '';
  document.getElementById('courseModalTitle').textContent = 'Add Course';
}

function saveCourse() {
  const name = document.getElementById('courseName').value.trim();
  if (!name) { toast('Please enter a course name', 'warning'); return; }

  const editId = document.getElementById('editCourseId').value;
  const course = {
    id:          editId || uid(),
    name,
    code:        document.getElementById('courseCode').value.trim(),
    color:       document.getElementById('courseColor').value,
    instructor:  document.getElementById('courseInstructor').value.trim(),
    createdAt:   editId ? courses.find(c => c.id === editId)?.createdAt : Date.now(),
  };

  if (editId) {
    courses = courses.map(c => c.id === editId ? course : c);
    toast('Course updated', 'success');
  } else {
    courses.push(course);
    toast('Course added', 'success');
  }

  save();
  closeModal('courseModal');
  refreshPage('courses');
  refreshPage('dashboard');
  populateCourseSelects();
}

function editCourse(id) {
  const c = courses.find(x => x.id === id);
  if (!c) return;
  document.getElementById('editCourseId').value     = c.id;
  document.getElementById('courseName').value       = c.name;
  document.getElementById('courseCode').value       = c.code || '';
  document.getElementById('courseColor').value      = c.color || 'sage';
  document.getElementById('courseInstructor').value = c.instructor || '';
  document.getElementById('courseModalTitle').textContent = 'Edit Course';
  openModal('courseModal');
}

function deleteCourse(id) {
  if (!confirm('Delete this course? Assignments linked to it will remain.')) return;
  courses = courses.filter(c => c.id !== id);
  save();
  refreshPage('courses');
  populateCourseSelects();
  toast('Course removed');
}

function renderCourses() {
  const el = document.getElementById('coursesList');
  if (!courses.length) {
    el.innerHTML = `<div class="empty" style="grid-column:1/-1">
      <div class="empty-icon">📚</div>
      <div class="empty-title">No courses yet</div>
      <div class="empty-sub">Add your first course to get started</div>
    </div>`;
    return;
  }

  el.innerHTML = courses.map(c => {
    const col   = COLORS[c.color] || COLORS.sage;
    const total = assignments.filter(a => a.courseId === c.id).length;
    const done  = assignments.filter(a => a.courseId === c.id && a.completed).length;
    const pct   = total ? Math.round(done / total * 100) : 0;

    return `<div class="course-card">
      <div class="course-color-bar" style="background:${col.main}"></div>
      <div class="course-name">${c.name}</div>
      <div class="course-code">${c.code || 'No code'} ${c.instructor ? '· ' + c.instructor : ''}</div>
      <div class="course-stats">
        <div class="course-stat">
          <div class="course-stat-num">${total}</div>
          <div class="course-stat-label">Tasks</div>
        </div>
        <div class="course-stat">
          <div class="course-stat-num" style="color:${col.main}">${done}</div>
          <div class="course-stat-label">Done</div>
        </div>
        <div class="course-stat">
          <div class="course-stat-num">${pct}%</div>
          <div class="course-stat-label">Progress</div>
        </div>
      </div>
      <div class="course-progress-track">
        <div class="course-progress-fill" style="width:${pct}%;background:${col.main}"></div>
      </div>
      <div class="course-actions">
        <button class="btn btn-ghost btn-sm" onclick="editCourse('${c.id}')">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteCourse('${c.id}')">Remove</button>
      </div>
    </div>`;
  }).join('');
}

function populateCourseSelects() {
  const assignSel = document.getElementById('assignCourse');
  assignSel.innerHTML = '<option value="">Select course...</option>' +
    courses.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

  const pomSel = document.getElementById('pomoTaskSelect');
  pomSel.innerHTML = '<option value="">— Select an assignment —</option>' +
    assignments
      .filter(a => !a.completed)
      .map(a => `<option value="${a.id}">${a.title} (${courseName(a.courseId)})</option>`)
      .join('');
}

// ─── ASSIGNMENTS ─────────────────────────────────────
function resetAssignmentForm() {
  document.getElementById('editAssignId').value   = '';
  document.getElementById('assignTitle').value    = '';
  document.getElementById('assignCourse').value   = '';
  document.getElementById('assignType').value     = 'Assignment';
  document.getElementById('assignDue').value      = '';
  document.getElementById('assignPriority').value = 'medium';
  document.getElementById('assignNotes').value    = '';
  document.getElementById('assignModalTitle').textContent = 'Add Assignment';
}

function saveAssignment() {
  const title    = document.getElementById('assignTitle').value.trim();
  const due      = document.getElementById('assignDue').value;
  const courseId = document.getElementById('assignCourse').value;

  if (!title)    { toast('Please enter a title', 'warning');       return; }
  if (!due)      { toast('Please set a due date', 'warning');       return; }
  if (!courseId) { toast('Please select a course', 'warning');      return; }

  const editId = document.getElementById('editAssignId').value;
  const a = {
    id:        editId || uid(),
    title,
    courseId,
    type:      document.getElementById('assignType').value,
    due,
    priority:  document.getElementById('assignPriority').value,
    notes:     document.getElementById('assignNotes').value.trim(),
    completed: editId ? (assignments.find(x => x.id === editId)?.completed || false) : false,
    createdAt: editId ? (assignments.find(x => x.id === editId)?.createdAt)          : Date.now(),
  };

  if (editId) {
    assignments = assignments.map(x => x.id === editId ? a : x);
    toast('Assignment updated', 'success');
  } else {
    assignments.push(a);
    toast('Assignment added ✓', 'success');
  }

  save();
  closeModal('assignmentModal');
  refreshAll();
}

function editAssignment(id) {
  const a = assignments.find(x => x.id === id);
  if (!a) return;
  document.getElementById('editAssignId').value   = a.id;
  document.getElementById('assignTitle').value    = a.title;
  document.getElementById('assignCourse').value   = a.courseId;
  document.getElementById('assignType').value     = a.type || 'Assignment';
  document.getElementById('assignDue').value      = a.due;
  document.getElementById('assignPriority').value = a.priority || 'medium';
  document.getElementById('assignNotes').value    = a.notes || '';
  document.getElementById('assignModalTitle').textContent = 'Edit Assignment';
  openModal('assignmentModal');
}

function toggleComplete(id) {
  assignments = assignments.map(a => a.id === id ? { ...a, completed: !a.completed } : a);
  save();
  refreshAll();
}

function deleteAssignment(id) {
  assignments = assignments.filter(a => a.id !== id);
  save();
  refreshAll();
  toast('Assignment removed');
}

function getFilteredAssignments() {
  const t = today();
  let list = [...assignments];

  if (activeFilter === 'pending')   list = list.filter(a => !a.completed);
  if (activeFilter === 'completed') list = list.filter(a =>  a.completed);
  if (activeFilter === 'overdue')   list = list.filter(a => !a.completed && a.due < t);
  if (activeFilter === 'high')      list = list.filter(a =>  a.priority === 'high');

  list.sort((a, b) => {
    if (activeSort === 'due')      return (a.due || '9999') < (b.due || '9999') ? -1 : 1;
    if (activeSort === 'priority') {
      const p = { high: 0, medium: 1, low: 2 };
      return (p[a.priority] || 1) - (p[b.priority] || 1);
    }
    if (activeSort === 'course') return courseName(a.courseId).localeCompare(courseName(b.courseId));
    return b.createdAt - a.createdAt;
  });

  return list;
}

function renderAssignmentCard(a) {
  const col      = courseColor(a.courseId);
  const cn       = courseName(a.courseId);
  const dueClass = isDueClass(a.due, a.completed);
  const dueStr   = formatDue(a.due);
  const c        = getCourse(a.courseId);
  const badgeCls = c ? (BADGE_MAP[c.color] || 'badge-sage') : 'badge-ink';

  return `<div class="assignment-card ${a.completed ? 'completed' : ''}">
    <div class="checkbox ${a.completed ? 'checked' : ''}" onclick="toggleComplete('${a.id}')"></div>
    <div class="assign-body">
      <div class="assign-top">
        <span class="prio prio-${a.priority || 'medium'}"></span>
        <span class="assign-title">${a.title}</span>
        <span class="badge ${badgeCls}">${cn}</span>
        ${a.type && a.type !== 'Assignment' ? `<span class="badge badge-ink">${a.type}</span>` : ''}
      </div>
      ${a.notes ? `<div class="assign-desc">${a.notes}</div>` : ''}
      <div class="assign-footer">
        <span class="assign-due ${dueClass}">${a.completed ? '✓ Completed' : dueStr}</span>
        <div class="assign-actions">
          <button class="btn-icon" onclick="editAssignment('${a.id}')" title="Edit">✎</button>
          <button class="btn-icon" onclick="deleteAssignment('${a.id}')" title="Delete" style="color:var(--rust)">✕</button>
        </div>
      </div>
    </div>
  </div>`;
}

function renderAssignments() {
  const list = getFilteredAssignments();
  const el   = document.getElementById('assignmentsList');
  const t    = today();

  document.getElementById('assignCount').textContent =
    `${assignments.length} assignment${assignments.length !== 1 ? 's' : ''} · ${assignments.filter(a => a.completed).length} completed`;

  const overdue = assignments.filter(a => !a.completed && a.due < t).length;
  document.getElementById('overdueBanner').style.display = overdue > 0 ? 'block' : 'none';

  if (!list.length) {
    el.innerHTML = `<div class="empty">
      <div class="empty-icon">📝</div>
      <div class="empty-title">Nothing here</div>
      <div class="empty-sub">${activeFilter === 'all' ? 'Add your first assignment' : 'No assignments match this filter'}</div>
    </div>`;
    return;
  }

  // Grouped view for default sort
  if (activeSort === 'due' && activeFilter === 'all') {
    const groups = { overdue: [], today: [], thisWeek: [], later: [], done: [] };
    list.forEach(a => {
      if (a.completed) { groups.done.push(a); return; }
      const d = daysUntil(a.due);
      if (d < 0)       groups.overdue.push(a);
      else if (d === 0) groups.today.push(a);
      else if (d <= 7)  groups.thisWeek.push(a);
      else              groups.later.push(a);
    });

    const renderGroup = (label, items) => {
      if (!items.length) return '';
      return `<div class="section-group">
        <div class="section-group-title">${label} (${items.length})</div>
        <div class="assignments-list">${items.map(renderAssignmentCard).join('')}</div>
      </div>`;
    };

    const html = [
      renderGroup('⚠️ Overdue',    groups.overdue),
      renderGroup('📅 Due Today',   groups.today),
      renderGroup('📆 This Week',   groups.thisWeek),
      renderGroup('🗓️ Upcoming',    groups.later),
      renderGroup('✓ Completed',    groups.done),
    ].join('');

    el.innerHTML = html || `<div class="empty"><div class="empty-icon">✓</div><div class="empty-title">All caught up!</div></div>`;
  } else {
    el.innerHTML = `<div class="assignments-list">${list.map(renderAssignmentCard).join('')}</div>`;
  }
}

// ─── QUOTES & CONTENT ────────────────────────────────
const QUOTES = [
  { q: "You don't have to be great to start, but you have to start to be great.", a: "Zig Ziglar" },
  { q: "Believe you can and you're halfway there.",                                a: "Theodore Roosevelt" },
  { q: "The secret of getting ahead is getting started.",                          a: "Mark Twain" },
  { q: "Success is the sum of small efforts repeated day in and day out.",         a: "Robert Collier" },
  { q: "It always seems impossible until it's done.",                              a: "Nelson Mandela" },
  { q: "Education is the passport to the future.",                                 a: "Malcolm X" },
  { q: "The expert in anything was once a beginner.",                              a: "Helen Hayes" },
  { q: "Push yourself because no one else is going to do it for you.",             a: "Unknown" },
  { q: "Little by little, a little becomes a lot.",                                a: "Tanzanian Proverb" },
  { q: "You are braver than you believe, stronger than you seem.",                 a: "A.A. Milne" },
];

let quoteIdx = Math.floor(Math.random() * QUOTES.length);

function rotateQuote() {
  quoteIdx = (quoteIdx + 1) % QUOTES.length;
  const q = QUOTES[quoteIdx];
  document.getElementById('wellnessQuote').textContent = `"${q.q}"`;
  document.getElementById('wellnessAuthor').textContent = `— ${q.a}`;
}

// ─── DASHBOARD ───────────────────────────────────────
function renderDashboard() {
  const t         = today();
  const pending   = assignments.filter(a => !a.completed);
  const completed = assignments.filter(a =>  a.completed);
  const dueWeek   = pending.filter(a => { const d = daysUntil(a.due); return d >= 0 && d <= 7; });
  const overdue   = pending.filter(a => a.due < t);

  // Stat cards
  document.getElementById('stat-total').textContent      = assignments.length;
  document.getElementById('stat-due').textContent        = dueWeek.length;
  document.getElementById('stat-done').textContent       = completed.length;
  document.getElementById('stat-courses').textContent    = courses.length;
  const pct = assignments.length ? Math.round(completed.length / assignments.length * 100) : 0;
  document.getElementById('stat-done-pct').textContent   = pct ? `${pct}% done` : '';
  document.getElementById('stat-due-sub').textContent    = overdue.length ? `${overdue.length} overdue` : '';
  document.getElementById('stat-total-trend').textContent = pending.length ? `${pending.length} pending` : 'All done!';
  document.getElementById('stat-courses-sub').textContent = courses.length ? 'active' : 'add some';

  // Upcoming list
  const upcoming = [...pending].sort((a, b) => (a.due || '9999') < (b.due || '9999') ? -1 : 1).slice(0, 5);
  const upEl = document.getElementById('upcomingList');

  if (!upcoming.length) {
    upEl.innerHTML = `<div style="padding:20px 0;text-align:center;font-family:'DM Mono',monospace;font-size:11px;color:var(--ink4)">No pending assignments ✓</div>`;
  } else {
    upEl.innerHTML = upcoming.map(a => {
      const col    = courseColor(a.courseId);
      const d      = daysUntil(a.due);
      const dColor = d < 0 ? 'var(--rust)' : d <= 2 ? 'var(--gold)' : 'var(--ink4)';
      return `<div class="upcoming-item" onclick="navigate('assignments')">
        <div class="upcoming-course-dot" style="background:${col.main}"></div>
        <div class="upcoming-info">
          <div class="upcoming-title">${a.title}</div>
          <div class="upcoming-meta">${courseName(a.courseId)} · ${a.type || 'Assignment'}</div>
        </div>
        <div class="upcoming-due" style="color:${dColor}">${formatDue(a.due)}</div>
      </div>`;
    }).join('');
  }

  // Week grid
  const weekEl  = document.getElementById('weekGrid');
  const today2  = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  weekEl.innerHTML = Array.from({ length: 7 }, (_, i) => {
    const d  = new Date(today2);
    d.setDate(today2.getDate() - today2.getDay() + i);
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dayTasks = assignments.filter(a => a.due === ds && !a.completed);
    const isToday  = ds === t;
    const dots     = dayTasks.slice(0, 3).map(a => {
      const col = courseColor(a.courseId);
      return `<div class="week-dot" style="background:${col.main}"></div>`;
    }).join('');
    return `<div class="week-day">
      <div class="week-day-name">${dayNames[i]}</div>
      <div class="week-day-num ${isToday ? 'today' : ''} ${dayTasks.length && !isToday ? 'has-tasks' : ''}">${d.getDate()}</div>
      <div class="week-dots">${dots}</div>
    </div>`;
  }).join('');

  // Course progress
  const cpEl = document.getElementById('courseProgressList');
  if (!courses.length) {
    cpEl.innerHTML = `<div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--ink4)">Add courses to see progress</div>`;
  } else {
    cpEl.innerHTML = courses.map(c => {
      const total = assignments.filter(a => a.courseId === c.id).length;
      const done  = assignments.filter(a => a.courseId === c.id && a.completed).length;
      const pct   = total ? Math.round(done / total * 100) : 0;
      const col   = COLORS[c.color] || COLORS.sage;
      return `<div style="margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px">
          <span style="font-size:12px;color:var(--ink)">${c.name}</span>
          <span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--ink4)">${done}/${total}</span>
        </div>
        <div style="height:5px;background:var(--border);border-radius:3px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${col.main};border-radius:3px;transition:width .5s ease"></div>
        </div>
      </div>`;
    }).join('');
  }

  // Quote
  const q = QUOTES[quoteIdx % QUOTES.length];
  document.getElementById('dashQuote').textContent      = `"${q.q}"`;
  document.getElementById('dashQuoteAuthor').textContent = `— ${q.a}`;

  // Greeting
  const now = new Date();
  document.getElementById('greetingHello').innerHTML = `Good ${getTimeOfDay()}, <em>Scholar</em> ✦`;
  document.getElementById('greetingSub').textContent =
    `${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} — ${pending.length} pending, ${dueWeek.length} due this week`;

  // Stress bar
  const score      = Math.min(100, overdue.length * 25 + dueWeek.length * 10 + pending.length * 3);
  const stressColor = score < 30 ? 'var(--sage)' : score < 60 ? 'var(--gold)' : 'var(--rust)';
  const stressDesc  = score < 30 ? 'Workload looks manageable 🌿' : score < 60 ? 'Stay on top of things 📅' : 'Heavy week — take breaks 🫧';
  document.getElementById('stressBarFill').style.width      = score + '%';
  document.getElementById('stressBarFill').style.background = stressColor;
  document.getElementById('stressDesc').textContent         = stressDesc;

  // Nav badge
  const badge = document.getElementById('pendingBadge');
  badge.textContent    = pending.length;
  badge.style.display  = pending.length ? '' : 'none';

  // Topbar date
  document.getElementById('topbarDate').textContent =
    now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── POMODORO ────────────────────────────────────────
const CIRCUMFERENCE = 2 * Math.PI * 96; // ≈603

let timer = {
  interval: null,
  running:  false,
  seconds:  25 * 60,
  total:    25 * 60,
  mode:     'work',
  sessions: 0,
};

function updateTimerDisplay() {
  const m   = Math.floor(timer.seconds / 60);
  const s   = timer.seconds % 60;
  document.getElementById('timerDisplay').textContent =
    `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  const progress = 1 - timer.seconds / timer.total;
  const offset   = CIRCUMFERENCE * (1 - progress);
  const ring     = document.getElementById('timerRing');
  ring.setAttribute('stroke-dashoffset', offset);
  const col = timer.mode === 'work' ? 'var(--sage)' : timer.mode === 'short' ? 'var(--sky)' : 'var(--lavender)';
  ring.style.stroke = col;
}

function toggleTimer() {
  if (timer.running) {
    clearInterval(timer.interval);
    timer.running = false;
    document.getElementById('startStopBtn').textContent = '▶';
    document.getElementById('timerLabel').textContent   = 'Paused';
  } else {
    timer.running = true;
    document.getElementById('startStopBtn').textContent = '⏸';
    const labels = { work: 'Focus session active...', short: 'Short break', long: 'Long break' };
    document.getElementById('timerLabel').textContent = labels[timer.mode];
    timer.interval = setInterval(() => {
      timer.seconds--;
      updateTimerDisplay();
      if (timer.seconds <= 0) timerComplete();
    }, 1000);
  }
}

function timerComplete() {
  clearInterval(timer.interval);
  timer.running = false;
  document.getElementById('startStopBtn').textContent = '▶';

  if (timer.mode === 'work') {
    timer.sessions++;
    const t2 = today();
    if (pomodoro.lastDate !== t2) {
      pomodoro.sessionsToday = 0;
      pomodoro.minutesToday  = 0;
      pomodoro.lastDate      = t2;
    }
    pomodoro.sessionsToday++;
    pomodoro.minutesToday += Math.round(timer.total / 60);
    save();
    document.getElementById('pomoDoneCount').textContent = pomodoro.sessionsToday;
    document.getElementById('pomoMinutes').textContent   = pomodoro.minutesToday;

    for (let i = 0; i < 4; i++) {
      document.getElementById('s' + i).classList.toggle('done', i < timer.sessions % 5);
    }
    toast('Focus session complete! Take a break 🎉', 'success');
  } else {
    toast('Break over — back to work!');
  }
  document.getElementById('timerLabel').textContent = 'Session complete ✓';
}

function resetTimer() {
  clearInterval(timer.interval);
  timer.running = false;
  timer.seconds = timer.total;
  document.getElementById('startStopBtn').textContent = '▶';
  document.getElementById('timerLabel').textContent   = 'Ready to focus';
  updateTimerDisplay();
}

function skipTimer() {
  timer.seconds = 0;
  updateTimerDisplay();
  timerComplete();
}

document.querySelectorAll('.pomo-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    clearInterval(timer.interval);
    timer.running = false;
    document.querySelectorAll('.pomo-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    timer.mode    = tab.dataset.mode;
    timer.total   = tab.dataset.duration * 60;
    timer.seconds = timer.total;
    document.getElementById('startStopBtn').textContent = '▶';
    document.getElementById('timerLabel').textContent   = 'Ready';
    updateTimerDisplay();
  });
});

function renderPomodoro() {
  const t2 = today();
  if (pomodoro.lastDate !== t2) {
    pomodoro.sessionsToday = 0;
    pomodoro.minutesToday  = 0;
  }
  document.getElementById('pomoDoneCount').textContent = pomodoro.sessionsToday;
  document.getElementById('pomoMinutes').textContent   = pomodoro.minutesToday;
  populateCourseSelects();
  updateTimerDisplay();
}

// ─── WELLNESS ────────────────────────────────────────
const TIPS = [
  "Take a 5-minute walk between study sessions — movement resets focus.",
  "Drink water regularly. Dehydration makes concentration harder.",
  "The Pomodoro technique: 25 min focus, 5 min break. Repeat.",
  "Write tomorrow's plan tonight — reduces morning anxiety.",
  "Break large assignments into smaller tasks. Start with the smallest.",
  "It's okay to say no to extra commitments during exam season.",
  "Sleep is when your brain consolidates learning. Protect it.",
  "Study in natural light when possible — it boosts mood.",
  "Talk to your professor during office hours. They want to help.",
  "Celebrate small wins. Finishing one task is still progress.",
];

let breathRunning  = false;
let breathInterval = null;
let bPhase         = 0;

const breathPhases = [
  { label: 'Inhale...', scale: 1.5, color: 'var(--sage-bg)',   border: 'var(--sage)',    dur: 4 },
  { label: 'Hold...',   scale: 1.5, color: 'var(--sky-bg)',    border: 'var(--sky)',     dur: 4 },
  { label: 'Exhale...', scale: 1.0, color: 'var(--lav-bg)',    border: 'var(--lav-mid)', dur: 4 },
  { label: 'Hold...',   scale: 1.0, color: 'var(--warm)',       border: 'var(--border2)', dur: 4 },
];

function toggleBreath() {
  if (breathRunning) {
    clearTimeout(breathInterval);
    breathRunning = false;
    document.getElementById('breathBtn').textContent    = 'Start Exercise';
    document.getElementById('breathLabel').textContent  = '';
    const c = document.getElementById('breathCircle');
    c.style.transform   = 'scale(1)';
    c.style.background  = 'var(--sage-bg)';
    c.style.borderColor = 'var(--sage-mid)';
    c.textContent = 'START';
  } else {
    breathRunning = true;
    document.getElementById('breathBtn').textContent = 'Stop Exercise';
    nextBreathPhase();
  }
}

function nextBreathPhase() {
  if (!breathRunning) return;
  const p = breathPhases[bPhase % 4];
  const c = document.getElementById('breathCircle');
  c.style.transition  = `transform ${p.dur}s ease, background ${p.dur * .5}s ease, border-color ${p.dur * .5}s ease`;
  c.style.transform   = `scale(${p.scale})`;
  c.style.background  = p.color;
  c.style.borderColor = p.border;
  c.textContent = p.label.replace('...', '');
  document.getElementById('breathLabel').textContent = p.label;
  bPhase++;
  breathInterval = setTimeout(nextBreathPhase, p.dur * 1000);
}

document.querySelectorAll('.mood-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    wellness.mood = btn.dataset.label;
    save();
    const msgs = {
      Great:    "That's wonderful! Channel that energy into your studies. 🌟",
      Good:     "Good days are a gift. Keep that momentum going! ✨",
      Okay:     "That's okay — every day doesn't have to be amazing. You're doing fine. 🌿",
      Low:      "It's okay to not feel okay. Be gentle with yourself today. Maybe take a short walk. 💙",
      Stressed: "Take a breath. Break your work into tiny steps. You can only do one thing at a time. 🫧",
    };
    const msgEl = document.getElementById('moodMessage');
    msgEl.textContent    = msgs[btn.dataset.label] || '';
    msgEl.style.display  = 'block';
  });
});

function checkInToday() {
  const t = today();
  if (wellness.lastCheckin === t) { toast('Already checked in today!'); return; }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yd = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

  if (wellness.lastCheckin === yd) {
    wellness.streak++;
  } else {
    wellness.streak = 1;
  }
  wellness.lastCheckin = t;
  save();
  document.getElementById('streakNum').textContent = wellness.streak;
  toast(`Day ${wellness.streak} streak! Keep going! 🔥`, 'success');
}

function renderWellness() {
  document.getElementById('streakNum').textContent = wellness.streak;
  const shuffled = [...TIPS].sort(() => Math.random() - .5).slice(0, 4);
  document.getElementById('tipsList').innerHTML = shuffled.map(t => `<li>${t}</li>`).join('');
  const q = QUOTES[quoteIdx % QUOTES.length];
  document.getElementById('wellnessQuote').textContent  = `"${q.q}"`;
  document.getElementById('wellnessAuthor').textContent = `— ${q.a}`;
}

// ─── FILTER / SORT EVENTS ────────────────────────────
document.querySelectorAll('.filter-chip').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    renderAssignments();
  });
});

document.getElementById('sortSelect').addEventListener('change', e => {
  activeSort = e.target.value;
  renderAssignments();
});

// ─── REFRESH HELPERS ─────────────────────────────────
function refreshPage(page) {
  if (page === 'dashboard')   renderDashboard();
  if (page === 'assignments') renderAssignments();
  if (page === 'courses')     renderCourses();
  if (page === 'pomodoro')    renderPomodoro();
  if (page === 'wellness')    renderWellness();
}

function refreshAll() {
  populateCourseSelects();
  renderDashboard();
  renderAssignments();
  renderCourses();
}

// ─── SEED DATA (first run only) ──────────────────────
function seedIfEmpty() {
  if (courses.length > 0) return;

  courses = [
    { id: 'c1', name: 'Introduction to Psychology', code: 'PSYC 101', color: 'sky',  instructor: 'Prof. Williams', createdAt: Date.now() },
    { id: 'c2', name: 'Calculus II',                code: 'MATH 152', color: 'rust', instructor: 'Prof. Chen',     createdAt: Date.now() },
    { id: 'c3', name: 'English Composition',        code: 'ENGL 110', color: 'sage', instructor: 'Prof. Davis',    createdAt: Date.now() },
    { id: 'c4', name: 'Intro to Computer Science',  code: 'CSCI 101', color: 'lav',  instructor: 'Prof. Kim',      createdAt: Date.now() },
  ];

  function futureDue(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  assignments = [
    { id: 'a1', title: 'Personality Theories Essay',         courseId: 'c1', type: 'Essay',      due: futureDue(2),   priority: 'high',   notes: '2000 words, APA format',     completed: false, createdAt: Date.now() },
    { id: 'a2', title: 'Integration Techniques Problem Set', courseId: 'c2', type: 'Assignment', due: futureDue(4),   priority: 'high',   notes: 'Chapter 7–8',                 completed: false, createdAt: Date.now() },
    { id: 'a3', title: 'Argumentative Essay Draft',          courseId: 'c3', type: 'Essay',      due: futureDue(6),   priority: 'medium', notes: 'First draft only',            completed: false, createdAt: Date.now() },
    { id: 'a4', title: 'Midterm Exam',                       courseId: 'c2', type: 'Exam',       due: futureDue(7),   priority: 'high',   notes: 'Covers all material so far',  completed: false, createdAt: Date.now() },
    { id: 'a5', title: 'Python Basics Lab',                  courseId: 'c4', type: 'Lab',        due: futureDue(1),   priority: 'medium', notes: 'Submit via course portal',    completed: false, createdAt: Date.now() },
    { id: 'a6', title: 'Literature Review',                  courseId: 'c1', type: 'Reading',    due: futureDue(10),  priority: 'low',    notes: 'Chapters 1–3',                completed: false, createdAt: Date.now() },
    { id: 'a7', title: 'Hello World Program',                courseId: 'c4', type: 'Assignment', due: futureDue(-2),  priority: 'medium', notes: '',                            completed: true,  createdAt: Date.now() - 86400000 * 3 },
    { id: 'a8', title: 'Grammar Workshop',                   courseId: 'c3', type: 'Assignment', due: futureDue(-5),  priority: 'low',    notes: '',                            completed: true,  createdAt: Date.now() - 86400000 * 7 },
  ];

  save();
}

// ─── INIT ────────────────────────────────────────────
seedIfEmpty();
populateCourseSelects();
refreshAll();
renderWellness();
updateTimerDisplay();

// Keep date current
setInterval(() => {
  const now = new Date();
  document.getElementById('topbarDate').textContent =
    now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}, 60000);
