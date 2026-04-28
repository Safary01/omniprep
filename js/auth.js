// ============================================================
//  OmniPrep — js/auth.js
//  Page protection and session management.
//
//  Every protected page calls initPage() at the top.
//  It checks auth, loads the student profile, fills the
//  topbar and sidebar with real data, and returns the student.
//
//  Usage (in any protected page):
//    <script type="module">
//      import { initPage } from './js/auth.js';
//      const student = await initPage('dashboard');
//      // student is now the full Firestore profile object
//      // Page content renders after this line
//    </script>
// ============================================================

import {
  requireAuth,
  logout,
  daysUntilExam,
  formatDate,
} from './firebase.js';


// ============================================================
//  PAGE IDs — maps a page name to its sidebar nav item
// ============================================================
const PAGE_TITLES = {
  dashboard:    'Dashboard',
  simulator:    'CBT Simulator',
  mouscerciser: 'Mouscerciser',
  typing:       'Typing Tutor',
  results:      'Results & Correction Vault',
};


// ============================================================
//  initPage(pageId)
//  Call this at the top of every protected page.
//  Handles auth check, topbar, sidebar, and countdown.
//  Returns the student profile object.
// ============================================================
async function initPage(pageId) {

  // 1. Check auth + subscription. Redirects if invalid.
  const student = await requireAuth();
  if (!student) return null;  // redirect already happened

  // 2. Fill topbar
  fillTopbar(student, pageId);

  // 3. Fill sidebar
  fillSidebar(student, pageId);

  // 4. Start UTME countdown
  startCountdown(student.examDate);

  // 5. Wire logout buttons
  wireLogout();

  // 6. Wire mobile hamburger
  wireHamburger();

  return student;
}


// ============================================================
//  TOPBAR — fills title, subtitle, avatar, countdown
// ============================================================
function fillTopbar(student, pageId) {
  const titleEl = document.getElementById('topbar-title');
  const subEl   = document.getElementById('topbar-sub');
  const avatarEl = document.getElementById('topbar-avatar');

  if (titleEl) titleEl.textContent = PAGE_TITLES[pageId] || 'OmniPrep';

  if (subEl) {
    const hour   = new Date().getHours();
    const greet  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const first  = student.name ? student.name.split(' ')[0] : '';
    subEl.textContent = `${greet}, ${first}`;
  }

  if (avatarEl) {
    avatarEl.textContent = getInitials(student.name);
  }
}


// ============================================================
//  SIDEBAR — fills student name, role, active nav item
// ============================================================
function fillSidebar(student, pageId) {
  const nameEl = document.getElementById('sidebar-student-name');
  const roleEl = document.getElementById('sidebar-student-role');
  const avEl   = document.getElementById('sidebar-student-av');

  if (nameEl) nameEl.textContent = student.name || '—';
  if (roleEl) roleEl.textContent = `UTME ${student.examYear || ''} Candidate`;
  if (avEl)   avEl.textContent   = getInitials(student.name);

  // Mark the active nav item
  const activeItem = document.querySelector(`.sidebar__item[data-page="${pageId}"]`);
  if (activeItem) activeItem.classList.add('active');
}


// ============================================================
//  COUNTDOWN — updates the topbar countdown pill every minute
// ============================================================
function startCountdown(examDate) {
  updateCountdown(examDate);
  setInterval(() => updateCountdown(examDate), 60000);
}

function updateCountdown(examDate) {
  const pill    = document.getElementById('topbar-countdown');
  const textEl  = document.getElementById('countdown-text');
  if (!pill || !textEl) return;

  const days = daysUntilExam(examDate);

  if (days === null) {
    pill.style.display = 'none';
    return;
  }

  pill.style.display = 'flex';

  if (days > 0) {
    textEl.textContent = `UTME in ${days} day${days !== 1 ? 's' : ''}`;
    // Turn red when 7 days or fewer remain
    if (days <= 7) {
      pill.style.background   = 'var(--red-light)';
      pill.style.borderColor  = '#FCA5A5';
      pill.style.color        = 'var(--red)';
    }
  } else if (days === 0) {
    textEl.textContent      = 'UTME is TODAY!';
    pill.style.background   = 'var(--red-light)';
    pill.style.borderColor  = '#FCA5A5';
    pill.style.color        = 'var(--red)';
  } else {
    textEl.textContent = 'UTME passed';
    pill.style.display = 'none';
  }
}


// ============================================================
//  LOGOUT — wires all elements with data-action="logout"
// ============================================================
function wireLogout() {
  document.querySelectorAll('[data-action="logout"]').forEach(el => {
    el.addEventListener('click', async (e) => {
      e.preventDefault();
      await logout();
    });
  });
}


// ============================================================
//  HAMBURGER — mobile sidebar toggle
// ============================================================
function wireHamburger() {
  const hamburger = document.getElementById('hamburger');
  const sidebar   = document.getElementById('sidebar');
  if (!hamburger || !sidebar) return;

  hamburger.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });

  // Close sidebar when clicking outside on mobile
  document.addEventListener('click', (e) => {
    if (
      window.innerWidth <= 900 &&
      sidebar.classList.contains('open') &&
      !sidebar.contains(e.target) &&
      e.target !== hamburger &&
      !hamburger.contains(e.target)
    ) {
      sidebar.classList.remove('open');
    }
  });
}


// ============================================================
//  SHARED TOPBAR + SIDEBAR HTML
//  Call renderShell() in any protected page to inject the
//  topbar and sidebar HTML before calling initPage().
//
//  This keeps topbar/sidebar HTML in one place.
//  Pages only need an empty <div id="shell"></div>.
// ============================================================
function renderShell() {
  const shell = document.getElementById('shell');
  if (!shell) return;

  shell.innerHTML = `

    <!-- SIDEBAR -->
    <aside class="sidebar" id="sidebar">
      <div class="sidebar__logo">
        <a href="dashboard.html" class="logo logo--sm">
          <div class="logo__mark">OP</div>
          <div class="logo__name">Omni<span>Prep</span></div>
        </a>
      </div>

      <nav class="sidebar__nav">

        <div class="sidebar__section-label">Main</div>
        <a href="dashboard.html" class="sidebar__item" data-page="dashboard">
          <svg class="item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
          </svg>
          Dashboard
        </a>

        <div class="sidebar__section-label">Skill Training</div>
        <a href="mouscerciser.html" class="sidebar__item" data-page="mouscerciser">
          <svg class="item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
          </svg>
          Mouscerciser
        </a>
        <a href="typing.html" class="sidebar__item" data-page="typing">
          <svg class="item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="7" width="20" height="14" rx="2"/>
            <path d="M16 3H8M12 3v4"/>
          </svg>
          Typing Tutor
        </a>

        <div class="sidebar__section-label">Exam</div>
        <a href="simulator.html" class="sidebar__item" data-page="simulator">
          <svg class="item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          CBT Simulator
          <span class="item-badge">Go</span>
        </a>
        <a href="results.html" class="sidebar__item" data-page="results">
          <svg class="item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          Results & Vault
        </a>

        <div class="sidebar__section-label">Account</div>
        <a href="#" class="sidebar__item" data-action="logout">
          <svg class="item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Logout
        </a>

      </nav>

      <div class="sidebar__footer">
        <div class="sidebar__student">
          <div class="sidebar__student-av" id="sidebar-student-av">?</div>
          <div>
            <div class="sidebar__student-name" id="sidebar-student-name">Loading...</div>
            <div class="sidebar__student-role" id="sidebar-student-role">UTME Candidate</div>
          </div>
        </div>
      </div>
    </aside>

    <!-- TOPBAR -->
    <div class="topbar" id="topbar">
      <div class="topbar__left">
        <button class="topbar__hamburger" id="hamburger" aria-label="Open menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="6"  x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <div>
          <div class="topbar__title" id="topbar-title">OmniPrep</div>
          <div class="text-xs" id="topbar-sub"></div>
        </div>
      </div>

      <div class="topbar__right">
        <div class="topbar__countdown" id="topbar-countdown" style="display:none">
          <div class="pulse"></div>
          <span id="countdown-text"></span>
        </div>
        <button class="topbar__avatar" id="topbar-avatar" data-action="logout" title="Logout">?</button>
      </div>
    </div>

  `;
}


// ============================================================
//  UTILITY
// ============================================================

/**
 * Returns uppercase initials from a full name.
 * "Usman Ibrahim" → "UI"
 */
function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .map(w => w[0].toUpperCase())
    .slice(0, 2)
    .join('');
}


// ============================================================
//  EXPORTS
// ============================================================
export {
  initPage,
  renderShell,
  getInitials,
  updateCountdown,
};
