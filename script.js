// ============================================
// CONFIG - Obfuscated credentials (not plain text)
// ============================================
const AUTH_CONFIG = {
  _k: 0x5A,
  _u: [0x13, 0x7F, 0x16],
  _p: [0x7C, 0x1E, 0x1E, 0x1E, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C]
};

function _d(arr) {
  return String.fromCharCode(...arr.map(b => b ^ AUTH_CONFIG._k));
}
const ADMIN_USER = _d(AUTH_CONFIG._u);
const ADMIN_PASS = _d(AUTH_CONFIG._p);

const GITHUB_CONFIG = {
  owner: 'an-rock',
  repo: 'r-games',
  path: 'games.json',
  branch: 'main'
};

// ============================================
// DEVICE AUTH - Only allow admin on your GitHub Pages domain
// ============================================
function isTrustedDevice() {
  // Check 1: Hosted on your GitHub Pages domain
  const isOwnDomain = window.location.hostname === 'an-rock.github.io';

  // Check 2: localStorage flag (set once on your computer)
  const isTrusted = localStorage.getItem('trusted_device') === 'true';

  return isOwnDomain || isTrusted;
}

function markTrustedDevice() {
  localStorage.setItem('trusted_device', 'true');
}

// ============================================
// STATE
// ============================================
let allGames = [];
let currentFilter = 'all';
let isAdmin = false;
let editingGameId = null;
let deleteTargetId = null;

// ============================================
// DOM ELEMENTS
// ============================================
const grid = document.getElementById('games-grid');
const filterBtns = document.querySelectorAll('.filter-btn');
const adminBtn = document.getElementById('admin-btn');
const footerAdmin = document.getElementById('footer-admin');
const loginModal = document.getElementById('login-modal');
const adminModal = document.getElementById('admin-modal');
const confirmModal = document.getElementById('confirm-modal');
const loginForm = document.getElementById('login-form');
const loginCancel = document.getElementById('login-cancel');
const loginError = document.getElementById('login-error');
const adminClose = document.getElementById('admin-close');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');
const gameForm = document.getElementById('game-form');
const gameCancel = document.getElementById('game-cancel');
const gameSubmit = document.getElementById('game-submit');
const adminGamesList = document.getElementById('admin-games-list');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importFile = document.getElementById('import-file');
const importStatus = document.getElementById('import-status');
const pushBtn = document.getElementById('push-btn');
const pushStatus = document.getElementById('push-status');
const confirmYes = document.getElementById('confirm-yes');
const confirmNo = document.getElementById('confirm-no');
const confirmTitle = document.getElementById('confirm-title');
const confirmMessage = document.getElementById('confirm-message');

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  loadGames();
  checkAdminSession();
  setupAdminVisibility();
  bindEvents();
});

// ============================================
// EVENT BINDING (using delegation for dynamic elements)
// ============================================
function bindEvents() {
  // Filters
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      render();
    });
  });

  // Admin button
  adminBtn.addEventListener('click', showLogin);
  footerAdmin.addEventListener('click', (e) => { e.preventDefault(); showLogin(); });

  // Login
  loginForm.addEventListener('submit', handleLogin);
  loginCancel.addEventListener('click', hideLogin);

  // Admin modal
  adminClose.addEventListener('click', hideAdmin);

  // Tab delegation (static tabs)
  document.querySelector('.admin-tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (btn) switchTab(btn.dataset.tab);
  });

  // Game form
  gameForm.addEventListener('submit', handleGameSave);
  gameCancel.addEventListener('click', () => switchTab('games'));

  // Import/Export
  exportBtn.addEventListener('click', exportGames);
  importBtn.addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', handleImport);

  // Push to GitHub
  pushBtn.addEventListener('click', pushToGitHub);

  // Confirm modal
  confirmYes.addEventListener('click', confirmDelete);
  confirmNo.addEventListener('click', hideConfirm);

  // Admin games list delegation (dynamic buttons)
  adminGamesList.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.edit-btn');
    const deleteBtn = e.target.closest('.delete-btn');
    if (editBtn) editGame(editBtn.dataset.id);
    if (deleteBtn) showConfirmDelete(deleteBtn.dataset.id);
  });

  // Close modals on backdrop click
  [loginModal, adminModal, confirmModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        if (modal === loginModal) hideLogin();
        else if (modal === adminModal) hideAdmin();
        else hideConfirm();
      }
    });
  });

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!loginModal.classList.contains('hidden')) hideLogin();
      else if (!adminModal.classList.contains('hidden')) hideAdmin();
      else if (!confirmModal.classList.contains('hidden')) hideConfirm();
    }
  });
}

// ============================================
// ADMIN VISIBILITY - Only show on trusted device
// ============================================
function setupAdminVisibility() {
  if (isTrustedDevice()) {
    adminBtn.style.display = 'flex';
    footerAdmin.style.display = 'inline';
    markTrustedDevice(); // Remember this device
  } else {
    adminBtn.style.display = 'none';
    footerAdmin.style.display = 'none';
  }
}

// ============================================
// AUTH
// ============================================
function checkAdminSession() {
  const session = localStorage.getItem('admin_session');
  if (session) {
    try {
      const data = JSON.parse(session);
      if (data.expires > Date.now()) {
        isAdmin = true;
        adminBtn.textContent = '⚙️';
        adminBtn.title = 'Admin Panel';
        pushBtn.disabled = false;
      } else {
        localStorage.removeItem('admin_session');
      }
    } catch {
      localStorage.removeItem('admin_session');
    }
  }
}

function handleLogin(e) {
  e.preventDefault();
  const user = document.getElementById('username').value;
  const pass = document.getElementById('password').value;

  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    isAdmin = true;
    localStorage.setItem('admin_session', JSON.stringify({
      expires: Date.now() + 24 * 60 * 60 * 1000
    }));
    adminBtn.textContent = '⚙️';
    adminBtn.title = 'Admin Panel';
    pushBtn.disabled = false;
    hideLogin();
    showAdmin();
  } else {
    loginError.textContent = 'Invalid credentials';
    loginError.classList.remove('hidden');
    loginForm.reset();
  }
}

function showLogin() {
  if (!isTrustedDevice()) {
    alert('Admin access only available on trusted device.');
    return;
  }
  loginModal.classList.remove('hidden');
  document.getElementById('username').focus();
  loginError.classList.add('hidden');
}

function hideLogin() {
  loginModal.classList.add('hidden');
  loginForm.reset();
}

function showAdmin() {
  adminModal.classList.remove('hidden');
  renderAdminGames();
}

function hideAdmin() {
  adminModal.classList.add('hidden');
  editingGameId = null;
  gameForm.reset();
  document.getElementById('game-id').value = '';
  gameSubmit.textContent = 'Save Game';
  switchTab('games');
}

// ============================================
// TABS
// ============================================
function switchTab(tab) {
  tabBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  tabPanels.forEach(panel => {
    panel.classList.toggle('hidden', panel.id !== `tab-${tab}`);
  });
  if (tab === 'games') renderAdminGames();
}

// ============================================
// LOAD & RENDER GAMES
// ============================================
async function loadGames() {
  try {
    const res = await fetch('games.json?v=' + Date.now());
    allGames = await res.json();
    render();
  } catch (e) {
    grid.innerHTML = '<p style="text-align:center;color:var(--muted);padding:2rem;">Failed to load games.json</p>';
    console.error(e);
  }
}

function render() {
  const filtered = allGames.filter(g => currentFilter === 'all' || g.status === currentFilter);
  grid.innerHTML = filtered.map((game, i) => `
    <article class="game-card" style="--r: ${(i % 2 === 0 ? -1.5 : 1.5) + (i % 3 === 0 ? 1 : 0)}deg;">
      <div class="game-cover-bg" style="background-image: url('${escapeHtml(game.cover)}')"></div>
      <div class="game-info">
        <h2 class="game-title"><a href="${escapeHtml(game.robloxUrl)}" target="_blank" rel="noopener">${escapeHtml(game.title)}</a></h2>
        <p class="game-desc">${escapeHtml(game.description)}</p>
        <div class="game-meta">
          <span class="status ${game.status}">${game.status.replace('-', ' ')}</span>
          ${game.rating ? `<span class="rating">${'★'.repeat(game.rating)}${'☆'.repeat(5 - game.rating)}</span>` : ''}
          <span class="date">${formatDate(game.dateAdded)}</span>
        </div>
      </div>
    </article>
  `).join('');
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({'&':'&','<':'<','>':'>','"':'"',"'":'''}[c]));
}

// ============================================
// ADMIN GAMES LIST
// ============================================
function renderAdminGames() {
  adminGamesList.innerHTML = allGames.map((game) => `
    <div class="admin-game-item" data-id="${escapeHtml(game.id)}">
      <img class="admin-game-cover" src="${escapeHtml(game.cover)}" alt="" loading="lazy">
      <div class="admin-game-info">
        <div class="admin-game-title">${escapeHtml(game.title)}</div>
        <span class="admin-game-status ${game.status}">${game.status.replace('-', ' ')}</span>
      </div>
      <div class="admin-game-actions">
        <button class="edit-btn" data-id="${escapeHtml(game.id)}" title="Edit">✏️</button>
        <button class="delete-btn" data-id="${escapeHtml(game.id)}" title="Delete">🗑️</button>
      </div>
    </div>
  `).join('');
}

// ============================================
// GAME EDIT/DELETE
// ============================================
function editGame(id) {
  const game = allGames.find(g => g.id === id);
  if (!game) return;

  editingGameId = id;
  document.getElementById('game-id').value = id;
  document.getElementById('game-title').value = game.title;
  document.getElementById('game-desc').value = game.description;
  document.getElementById('game-cover').value = game.cover;
  document.getElementById('game-status').value = game.status;
  document.getElementById('game-rating').value = game.rating || 0;
  document.getElementById('game-url').value = game.robloxUrl;
  document.getElementById('game-date').value = game.dateAdded || '';
  gameSubmit.textContent = 'Update Game';
  switchTab('add');
}

function showConfirmDelete(id) {
  const game = allGames.find(g => g.id === id);
  if (!game) return;
  deleteTargetId = id;
  confirmTitle.textContent = 'Delete Game';
  confirmMessage.textContent = `Delete "${escapeHtml(game.title)}"? This cannot be undone.`;
  confirmModal.classList.remove('hidden');
}

function hideConfirm() {
  confirmModal.classList.add('hidden');
  deleteTargetId = null;
}

async function confirmDelete() {
  if (!deleteTargetId) return;
  allGames = allGames.filter(g => g.id !== deleteTargetId);
  await saveGames();
  render();
  renderAdminGames();
  hideConfirm();
  showStatus('Game deleted', 'success');
}

// ============================================
// GAME FORM
// ============================================
async function handleGameSave(e) {
  e.preventDefault();

  const gameData = {
    id: editingGameId || Date.now().toString(),
    title: document.getElementById('game-title').value.trim(),
    description: document.getElementById('game-desc').value.trim(),
    cover: document.getElementById('game-cover').value.trim(),
    status: document.getElementById('game-status').value,
    rating: parseInt(document.getElementById('game-rating').value, 10),
    robloxUrl: document.getElementById('game-url').value.trim(),
    dateAdded: document.getElementById('game-date').value || new Date().toISOString().split('T')[0]
  };

  if (editingGameId) {
    const idx = allGames.findIndex(g => g.id === editingGameId);
    if (idx !== -1) allGames[idx] = gameData;
    showStatus('Game updated', 'success');
  } else {
    allGames.unshift(gameData);
    showStatus('Game added', 'success');
  }

  await saveGames();
  render();
  renderAdminGames();
  gameForm.reset();
  document.getElementById('game-id').value = '';
  editingGameId = null;
  gameSubmit.textContent = 'Save Game';
  switchTab('games');
}

// ============================================
// SAVE GAMES (localStorage + GitHub API)
// ============================================
async function saveGames() {
  localStorage.setItem('games_backup', JSON.stringify(allGames, null, 2));

  const pat = localStorage.getItem('github_pat');
  if (pat) {
    await updateGitHubFile(pat, allGames);
  }
}

async function updateGitHubFile(pat, games) {
  try {
    const getRes = await fetch(`https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.path}?ref=${GITHUB_CONFIG.branch}`, {
      headers: { 'Authorization': `token ${pat}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    if (!getRes.ok) throw new Error('Failed to fetch file');
    const fileData = await getRes.json();

    const content = btoa(unescape(encodeURIComponent(JSON.stringify(games, null, 2))));
    const putRes = await fetch(`https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.path}`, {
      method: 'PUT',
      headers: { 'Authorization': `token ${pat}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Update games.json - ${new Date().toISOString()}`,
        content,
        sha: fileData.sha,
        branch: GITHUB_CONFIG.branch
      })
    });
    if (!putRes.ok) throw new Error('Failed to update file');
    return true;
  } catch (e) {
    console.warn('GitHub push failed:', e);
    return false;
  }
}

// ============================================
// IMPORT/EXPORT
// ============================================
function exportGames() {
  const blob = new Blob([JSON.stringify(allGames, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'games.json';
  a.click();
  URL.revokeObjectURL(url);
  showStatus('Exported games.json', 'success');
}

function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const imported = JSON.parse(event.target.result);
      if (!Array.isArray(imported)) throw new Error('Invalid format');
      allGames = imported;
      await saveGames();
      render();
      renderAdminGames();
      showImportStatus('Imported successfully', 'success');
    } catch (err) {
      showImportStatus('Import failed: ' + err.message, 'error');
    }
    importFile.value = '';
  };
  reader.readAsText(file);
}

function showImportStatus(msg, type) {
  importStatus.textContent = msg;
  importStatus.className = `status-msg ${type}`;
  importStatus.classList.remove('hidden');
}

function showStatus(msg, type) {
  const toast = document.createElement('div');
  toast.className = `status-msg ${type}`;
  toast.style.cssText = 'position:fixed;bottom:2rem;right:2rem;z-index:2000;animation:slideIn 0.3s ease;max-width:300px;';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Toast animations
const style = document.createElement('style');
style.textContent = `
@keyframes slideIn { from { opacity: 0; transform: translateX(100px); } to { opacity: 1; transform: translateX(0); } }
@keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
`;
document.head.appendChild(style);

// ============================================
// PUSH TO GITHUB
// ============================================
async function pushToGitHub() {
  const pat = localStorage.getItem('github_pat');
  if (!pat) {
    const entered = prompt('Enter GitHub Personal Access Token (repo scope):');
    if (!entered) return;
    localStorage.setItem('github_pat', entered);
  }

  pushBtn.disabled = true;
  pushBtn.textContent = 'Pushing...';
  pushStatus.classList.add('hidden');

  const success = await updateGitHubFile(localStorage.getItem('github_pat'), allGames);

  if (success) {
    pushStatus.textContent = 'Pushed to GitHub! Pages will rebuild shortly.';
    pushStatus.className = 'status-msg success';
  } else {
    pushStatus.textContent = 'Push failed. Check token permissions (repo scope).';
    pushStatus.className = 'status-msg error';
  }
  pushStatus.classList.remove('hidden');
  pushBtn.disabled = false;
  pushBtn.textContent = 'Push to GitHub';
}