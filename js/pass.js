
// ─── CURSOR ───────────────────────────────────────────
const cursor = document.getElementById('cursor');
const ring = document.getElementById('cursorRing');
let mx=0,my=0,rx=0,ry=0;
document.addEventListener('mousemove', e=>{
  mx=e.clientX; my=e.clientY;
  cursor.style.transform=`translate(${mx-4}px,${my-4}px)`;
});
(function animRing(){
  rx+=(mx-rx-14)*0.13; ry+=(my-ry-14)*0.13;
  ring.style.transform=`translate(${rx}px,${ry}px)`;
  requestAnimationFrame(animRing);
})();
document.querySelectorAll('button,input').forEach(el=>{
  el.addEventListener('mouseenter',()=>{ring.style.width='40px';ring.style.height='40px';ring.style.borderColor='#7fff6e';});
  el.addEventListener('mouseleave',()=>{ring.style.width='28px';ring.style.height='28px';ring.style.borderColor='var(--accent)';});
});

// ─── TOGGLE VISIBILITY ────────────────────────────────
const pwInput = document.getElementById('pwInput');
const toggleBtn = document.getElementById('toggleBtn');
let visible = false;
toggleBtn.addEventListener('click', ()=>{
  visible = !visible;
  pwInput.type = visible ? 'text' : 'password';
  toggleBtn.textContent = visible ? '🙈' : '👁';
});

// ─── COMMON PASSWORDS (sample) ────────────────────────
const COMMON = new Set([
  'password','123456','password1','qwerty','abc123','letmein','monkey',
  'master','dragon','111111','baseball','iloveyou','trustno1','sunshine',
  'princess','welcome','shadow','superman','michael','football','password123',
  '123456789','12345678','1234567','1234567890','qwertyuiop','1q2w3e4r',
  'admin','login','hello','charlie','donald','password!','passw0rd','p@ssword',
  'p@ssw0rd','test','guest','root','toor','pass','changeme'
]);

// ─── PATTERN DETECTION ────────────────────────────────
function detectPatterns(pw) {
  const patterns = [];
  if (/^(.)\1+$/.test(pw)) patterns.push('All same character');
  if (/012|123|234|345|456|567|678|789|890|987|876|765|654|543|432|321|210/.test(pw)) patterns.push('Sequential numbers');
  if (/abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i.test(pw)) patterns.push('Sequential letters');
  if (/qwert|asdf|zxcv|qwerty|asdfg|dvorak/i.test(pw)) patterns.push('Keyboard pattern');
  if (/19\d{2}|20\d{2}/.test(pw)) patterns.push('Year pattern');
  if (/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(pw)) patterns.push('Month name');
  if (/(.)\1{2,}/.test(pw)) patterns.push('Repeated characters');
  if (COMMON.has(pw.toLowerCase())) patterns.push('Common password');
  return patterns;
}

// ─── ENTROPY CALCULATION ──────────────────────────────
function calcEntropy(pw) {
  let pool = 0;
  if (/[a-z]/.test(pw)) pool += 26;
  if (/[A-Z]/.test(pw)) pool += 26;
  if (/[0-9]/.test(pw)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(pw)) pool += 32;
  return pool === 0 ? 0 : Math.round(pw.length * Math.log2(pool));
}

// ─── CRACK TIME ESTIMATION ────────────────────────────
function crackTime(entropy) {
  // guesses per second for different attack types
  const scenarios = [
    { name: 'Online attack (throttled)', gps: 100 },
    { name: 'Online attack (unthrottled)', gps: 10_000 },
    { name: 'Offline (bcrypt)', gps: 100_000 },
    { name: 'Offline (MD5 hash)', gps: 1_000_000_000 },
    { name: 'GPU cluster attack', gps: 100_000_000_000 },
  ];
  const totalGuesses = Math.pow(2, entropy);
  return scenarios.map(s => {
    const secs = totalGuesses / s.gps / 2; // avg half keyspace
    return { name: s.name, time: formatTime(secs) };
  });
}

function formatTime(secs) {
  if (secs < 1) return { label: '< 1 second', color: 'var(--red)' };
  if (secs < 60) return { label: `${Math.round(secs)} seconds`, color: 'var(--red)' };
  if (secs < 3600) return { label: `${Math.round(secs/60)} minutes`, color: 'var(--orange)' };
  if (secs < 86400) return { label: `${Math.round(secs/3600)} hours`, color: 'var(--orange)' };
  if (secs < 2592000) return { label: `${Math.round(secs/86400)} days`, color: 'var(--yellow)' };
  if (secs < 31536000) return { label: `${Math.round(secs/2592000)} months`, color: 'var(--yellow)' };
  if (secs < 31536000*1000) return { label: `${Math.round(secs/31536000)} years`, color: 'var(--green)' };
  if (secs < 31536000*1e9) return { label: `${(secs/31536000/1000).toFixed(1)}k years`, color: 'var(--green)' };
  return { label: 'Centuries+', color: 'var(--green)' };
}

// ─── SCORE & GRADE ────────────────────────────────────
function getScore(pw) {
  if (pw.length === 0) return { score: 0, label: '', colorClass: '' };
  const entropy = calcEntropy(pw);
  const patterns = detectPatterns(pw);
  const patPenalty = patterns.length * 10;
  const adjusted = Math.max(0, entropy - patPenalty);

  let score, label, colorClass;
  if (COMMON.has(pw.toLowerCase())) {
    score = 1; label = 'Compromised'; colorClass = 'c-red';
  } else if (adjusted < 28) {
    score = 1; label = 'Very Weak'; colorClass = 'c-red';
  } else if (adjusted < 40) {
    score = 2; label = 'Weak'; colorClass = 'c-orange';
  } else if (adjusted < 55) {
    score = 3; label = 'Fair'; colorClass = 'c-yellow';
  } else if (adjusted < 70) {
    score = 4; label = 'Strong'; colorClass = 'c-lblue';
  } else {
    score = 5; label = 'Very Strong'; colorClass = 'c-green';
  }
  return { score, label, colorClass, entropy, adjusted };
}

// ─── CHECKS ───────────────────────────────────────────
function getChecks(pw) {
  return [
    { text: '12+ characters', pass: pw.length >= 12 },
    { text: 'Uppercase letter', pass: /[A-Z]/.test(pw) },
    { text: 'Lowercase letter', pass: /[a-z]/.test(pw) },
    { text: 'Number', pass: /[0-9]/.test(pw) },
    { text: 'Special character', pass: /[^a-zA-Z0-9]/.test(pw) },
    { text: 'Not a common password', pass: !COMMON.has(pw.toLowerCase()) },
    { text: 'No keyboard patterns', pass: !/qwert|asdf|zxcv/i.test(pw) },
    { text: 'No sequential numbers', pass: !/012|123|234|345|456|567|678|789/.test(pw) },
  ];
}

// ─── SUGGESTIONS ──────────────────────────────────────
function getSuggestions(pw, checks, patterns) {
  const tips = [];
  if (pw.length < 12) tips.push(`Add ${12 - pw.length} more characters (aim for 16+)`);
  if (!/[A-Z]/.test(pw)) tips.push('Include at least one uppercase letter');
  if (!/[a-z]/.test(pw)) tips.push('Include at least one lowercase letter');
  if (!/[0-9]/.test(pw)) tips.push('Add numbers to increase character pool');
  if (!/[^a-zA-Z0-9]/.test(pw)) tips.push('Use special characters like !@#$%^&*');
  if (patterns.includes('Keyboard pattern')) tips.push('Avoid keyboard walks like "qwerty" or "asdf"');
  if (patterns.includes('Sequential numbers')) tips.push('Avoid sequential numbers like "123" or "456"');
  if (patterns.includes('Common password')) tips.push('This password appears in breach databases — never use it');
  if (patterns.includes('Repeated characters')) tips.push('Avoid repeating the same character multiple times');
  if (tips.length === 0 && pw.length >= 16) tips.push('Consider using a passphrase for maximum memorability');
  return tips.slice(0, 4);
}

// ─── SEGMENT COLORS ───────────────────────────────────
const segClass = ['', 'seg-red', 'seg-orange', 'seg-yellow', 'seg-lblue', 'seg-green'];

// ─── RENDER ───────────────────────────────────────────
function render(pw) {
  const results = document.getElementById('results');

  if (!pw) {
    results.innerHTML = `<div class="empty"><div class="empty-icon">🔐</div>Start typing to analyze your password</div>`;
    return;
  }

  const { score, label, colorClass, entropy } = getScore(pw);
  const checks = getChecks(pw);
  const patterns = detectPatterns(pw);
  const suggestions = getSuggestions(pw, checks, patterns);
  const attacks = crackTime(entropy);

  // Meter segments
  const segs = Array.from({length: 5}, (_, i) =>
    `<div class="meter-seg ${i < score ? segClass[score] + ' lit' : ''}"></div>`
  ).join('');

  // Checks HTML
  const checksHtml = checks.map(c => `
    <div class="check-item ${c.pass ? 'pass' : 'fail'}">
      <span class="check-icon">${c.pass ? '✓' : '✗'}</span>
      <span class="check-text">${c.text}</span>
    </div>
  `).join('');

  // Attack rows
  const attackHtml = attacks.map(a => `
    <div class="attack-row">
      <span class="attack-name">${a.name}</span>
      <span class="attack-time" style="color:${a.time.color}">${a.time.label}</span>
    </div>
  `).join('');

  // Patterns
  const patternHtml = patterns.length > 0
    ? `<div class="pattern-section">
        <div class="pattern-label">// Detected Patterns</div>
        ${patterns.map(p => `<span class="pattern-tag">⚠ ${p}</span>`).join('')}
      </div>`
    : '';

  // Suggestions
  const suggHtml = suggestions.length > 0
    ? `<div class="suggestions">
        <div class="suggestions-label">// Recommendations</div>
        <ul class="suggestion-list">
          ${suggestions.map(s => `<li>${s}</li>`).join('')}
        </ul>
      </div>`
    : `<div class="suggestions" style="border-color:rgba(127,255,110,.3);background:rgba(127,255,110,.04);">
        <div class="suggestions-label" style="color:var(--green);">// All Checks Passed</div>
        <ul class="suggestion-list"><li style="color:var(--green)">This password meets all security criteria ✓</li></ul>
      </div>`;

  results.innerHTML = `
    <div class="strength-section">
      <div class="strength-header">
        <span class="strength-label">// Strength Score</span>
        <span class="strength-word ${colorClass}">${label}</span>
      </div>
      <div class="meter-track">${segs}</div>
      <div class="entropy-line">Entropy: <span class="entropy-val">${entropy} bits</span> &nbsp;·&nbsp; Length: <span class="entropy-val">${pw.length}</span> chars</div>
    </div>

    ${patternHtml}

    <div class="checks-section">
      <div class="checks-label">// Security Checks</div>
      <div class="checks-grid">${checksHtml}</div>
    </div>

    <div class="attack-section">
      <div class="attack-label">// Time to Crack</div>
      <div class="attack-rows">${attackHtml}</div>
    </div>

    ${suggHtml}
  `;
}

// ─── EVENT ────────────────────────────────────────────
pwInput.addEventListener('input', e => render(e.target.value));
