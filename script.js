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
  const isOwnDomain = window.location.hostname === 'an-rock.github.io';
  const isTrusted = localStorage.getItem('trusted_device') === 'true';
  return isOwnDomain || isTrusted;
}

function markTrustedDevice() {
  localStorage.setItem('trusted_device', 'true');
}

function updateDeviceTrustUI() {
  const statusEl = document.getElementById('device-trust-status');
  if (statusEl) {
    statusEl.textContent = isTrustedDevice() ? 'trusted' : 'not trusted';
    statusEl.style.color = isTrustedDevice() ? 'var(--primary)' : 'var(--danger)';
  }
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
// UTILITIES
// ============================================
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return String(num);
}

function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideInRight 150ms ease reverse';
    setTimeout(() => toast.remove(), 150);
  }, 3000);
}

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  loadGames();
  checkAdminSession();
  setupAdminVisibility();
  bindEvents();
  updateDeviceTrustUI();
});

// ============================================
// EVENT BINDING
// ============================================
function bindEvents() {
  // Sub-nav filter buttons
  document.querySelectorAll('.sub-nav-item[data-filter]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.sub-nav-item[data-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      render();
      updateStats();
    });
  });

  // Admin button
  const adminBtn = document.getElementById('admin-btn');
  const footerAdmin = document.getElementById('footer-admin');
  if (adminBtn) adminBtn.addEventListener('click', showLogin);
  if (footerAdmin) footerAdmin.addEventListener('click', (e) => { e.preventDefault(); showLogin(); });

  // Login modal
  const loginModal = document.getElementById('login-modal');
  const loginForm = document.getElementById('login-form');
  const loginCancel = document.getElementById('login-cancel');
  const loginClose = document.getElementById('login-close');
  const loginError = document.getElementById('login-error');

  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  if (loginCancel) loginCancel.addEventListener('click', hideLogin);
  if (loginClose) loginClose.addEventListener('click', hideLogin);

  // Admin modal
  const adminModal = document.getElementById('admin-modal');
  const adminClose = document.getElementById('admin-close');

  if (adminClose) adminClose.addEventListener('click', hideAdmin);

  // Admin tabs
  document.querySelectorAll('.admin-tab').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Game form
  const gameForm = document.getElementById('game-form');
  const gameCancel = document.getElementById('game-cancel');
  const gameSubmit = document.getElementById('game-submit');

  if (gameForm) gameForm.addEventListener('submit', handleGameSave);
  if (gameCancel) gameCancel.addEventListener('click', () => switchTab('games'));

  // Sidebar actions
  const exportBtn = document.getElementById('export-btn');
  const importBtn = document.getElementById('import-btn');
  const importFile = document.getElementById('import-file');
  const pushBtn = document.getElementById('push-btn');

  if (exportBtn) exportBtn.addEventListener('click', exportGames);
  if (importBtn) importBtn.addEventListener('click', () => importFile?.click());
  if (importFile) importFile.addEventListener('change', handleImport);
  if (pushBtn) pushBtn.addEventListener('click', pushToGitHub);

  // Settings
  const savePat = document.getElementById('save-pat');
  const githubPat = document.getElementById('github-pat');
  const trustDevice = document.getElementById('trust-device');
  const untrustDevice = document.getElementById('untrust-device');

  if (savePat) savePat.addEventListener('click', saveGitHubPat);
  if (githubPat) {
    const saved = localStorage.getItem('github_pat');
    if (saved) githubPat.value = saved;
  }
  if (trustDevice) trustDevice.addEventListener('click', () => { markTrustedDevice(); updateDeviceTrustUI(); showToast('Device trusted', 'success'); });
  if (untrustDevice) untrustDevice.addEventListener('click', () => { localStorage.removeItem('trusted_device'); updateDeviceTrustUI(); showToast('Device trust revoked', 'info'); });

  // Confirm modal
  const confirmModal = document.getElementById('confirm-modal');
  const confirmClose = document.getElementById('confirm-close');
  const confirmYes = document.getElementById('confirm-yes');
  const confirmNo = document.getElementById('confirm-no');

  if (confirmYes) confirmYes.addEventListener('click', confirmDelete);
  if (confirmNo) confirmNo.addEventListener('click', hideConfirm);
  if (confirmClose) confirmClose.addEventListener('click', hideConfirm);

  // Admin games list delegation
  const adminGamesList = document.getElementById('admin-games-list');
  if (adminGamesList) {
    adminGamesList.addEventListener('click', (e) => {
      const editBtn = e.target.closest('.edit-btn');
      const deleteBtn = e.target.closest('.delete-btn');
      if (editBtn) editGame(editBtn.dataset.id);
      if (deleteBtn) showConfirmDelete(deleteBtn.dataset.id);
    });
  }

  // Close modals on backdrop click
  [loginModal, adminModal, confirmModal].forEach(modal => {
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.classList.contains('modal-backdrop')) {
          if (modal === loginModal) hideLogin();
          else if (modal === adminModal) hideAdmin();
          else hideConfirm();
        }
      });
    }
  });

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!loginModal?.classList.contains('hidden')) hideLogin();
      else if (!adminModal?.classList.contains('hidden')) hideAdmin();
      else if (!confirmModal?.classList.contains('hidden')) hideConfirm();
    }
  });

  // Empty state add button
  const emptyAddBtn = document.getElementById('empty-add-btn');
  if (emptyAddBtn) emptyAddBtn.addEventListener('click', () => { showLogin(); setTimeout(() => switchTab('add'), 100); });
}

// ============================================
// ADMIN VISIBILITY
// ============================================
function setupAdminVisibility() {
  const adminBtn = document.getElementById('admin-btn');
  const footerAdmin = document.getElementById('footer-admin');

  if (isTrustedDevice()) {
    if (adminBtn) adminBtn.style.display = 'flex';
    if (footerAdmin) footerAdmin.style.display = 'inline';
    markTrustedDevice();
  } else {
    if (adminBtn) adminBtn.style.display = 'none';
    if (footerAdmin) footerAdmin.style.display = 'none';
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
        const pushBtn = document.getElementById('push-btn');
        if (pushBtn) pushBtn.disabled = false;
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
    const pushBtn = document.getElementById('push-btn');
    if (pushBtn) pushBtn.disabled = false;
    hideLogin();
    showAdmin();
  } else {
    const loginError = document.getElementById('login-error');
    if (loginError) {
      loginError.textContent = 'Invalid credentials';
      loginError.classList.remove('hidden');
    }
    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.reset();
  }
}

function showLogin() {
  if (!isTrustedDevice()) {
    showToast('Admin access only on trusted device', 'error');
    return;
  }
  const loginModal = document.getElementById('login-modal');
  if (loginModal) {
    loginModal.classList.remove('hidden');
    const usernameInput = document.getElementById('username');
    if (usernameInput) usernameInput.focus();
    const loginError = document.getElementById('login-error');
    if (loginError) loginError.classList.add('hidden');
  }
}

function hideLogin() {
  const loginModal = document.getElementById('login-modal');
  const loginForm = document.getElementById('login-form');
  if (loginModal) loginModal.classList.add('hidden');
  if (loginForm) loginForm.reset();
}

function showAdmin() {
  const adminModal = document.getElementById('admin-modal');
  if (adminModal) {
    adminModal.classList.remove('hidden');
    renderAdminGames();
  }
}

function hideAdmin() {
  const adminModal = document.getElementById('admin-modal');
  if (adminModal) adminModal.classList.add('hidden');
  editingGameId = null;
  const gameForm = document.getElementById('game-form');
  if (gameForm) gameForm.reset();
  const gameIdInput = document.getElementById('game-id');
  if (gameIdInput) gameIdInput.value = '';
  const gameSubmit = document.getElementById('game-submit');
  if (gameSubmit) gameSubmit.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save Game';
  switchTab('games');
}

// ============================================
// TABS
// ============================================
function switchTab(tab) {
  document.querySelectorAll('.admin-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  document.querySelectorAll('.admin-tab-panel').forEach(panel => {
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
    updateStats();
  } catch (e) {
    const grid = document.getElementById('games-grid');
    if (grid) grid.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;"><p>Failed to load games.json</p></div>';
    console.error(e);
  }
}

function render() {
  const grid = document.getElementById('games-grid');
  const emptyState = document.getElementById('empty-state');
  if (!grid) return;

  const filtered = allGames.filter(g => currentFilter === 'all' || g.status === currentFilter);

  if (filtered.length === 0) {
    grid.style.display = 'none';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  grid.style.display = 'grid';
  if (emptyState) emptyState.classList.add('hidden');

  grid.innerHTML = filtered.map(game => renderGameCard(game)).join('');

  // Bind game card buttons
  grid.querySelectorAll('.btn-play').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const url = btn.dataset.url;
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    });
  });

  grid.querySelectorAll('.btn-like').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleLike(btn.dataset.id);
    });
  });

  grid.querySelectorAll('.btn-dislike').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleDislike(btn.dataset.id);
    });
  });

  grid.querySelectorAll('.game-favorite-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleFavorite(btn.dataset.id);
    });
  });
}

function renderGameCard(game) {
  const likes = game.likes || 0;
  const dislikes = game.dislikes || 0;
  const isFavorited = game.favorite === true;
  const rating = game.rating || 0;

  return `
    <article class="game-card" data-id="${escapeHtml(game.id)}">
      <div class="game-thumbnail">
        <img src="${escapeHtml(game.cover)}" alt="${escapeHtml(game.title)}" loading="lazy">
        <span class="game-badge ${game.status}">${game.status.replace('-', ' ')}</span>
        <button class="game-favorite-btn ${isFavorited ? 'favorited' : ''}" data-id="${escapeHtml(game.id)}" title="${isFavorited ? 'Remove from favorites' : 'Add to favorites'}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="${isFavorited ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        </button>
      </div>
      <div class="game-info">
        <h3 class="game-title"><a href="${escapeHtml(game.robloxUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(game.title)}</a></h3>
        <p class="game-desc">${escapeHtml(game.description)}</p>
        <div class="game-meta">
          <span class="game-meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            ${formatNumber(game.visits || 0)} visits
          </span>
          <span class="game-meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/></svg>
            ${formatNumber(game.players || 0)}
          </span>
          <div class="game-rating" title="${rating}/5 stars">
            ${Array.from({length: 5}, (_, i) => `<span class="star ${i < rating ? '' : 'empty'}">★</span>`).join('')}
          </div>
        </div>
      </div>
      <div class="game-actions">
        <a class="btn-play" href="${escapeHtml(game.robloxUrl)}" target="_blank" rel="noopener noreferrer" data-url="${escapeHtml(game.robloxUrl)}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          Play
        </a>
        <button class="btn-like ${game.userLiked ? 'liked' : ''}" data-id="${escapeHtml(game.id)}" title="Like">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="${game.userLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.2a3 3 0 0 0 3-3.8V9z"/></svg>
          <span>${formatNumber(likes)}</span>
        </button>
        <button class="btn-dislike ${game.userDisliked ? 'disliked' : ''}" data-id="${escapeHtml(game.id)}" title="Dislike">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="${game.userDisliked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.2a3 3 0 0 0-3 3.8v8.4z"/></svg>
          <span>${formatNumber(dislikes)}</span>
        </button>
      </div>
    </article>
  `;
}

function updateStats() {
  const total = allGames.length;
  const played = allGames.filter(g => g.status === 'played').length;
  const planned = allGames.filter(g => g.status === 'plan-to-play').length;
  const favorites = allGames.filter(g => g.favorite === true).length;

  const statTotal = document.getElementById('stat-total');
  const statPlayed = document.getElementById('stat-played');
  const statPlanned = document.getElementById('stat-planned');
  const statFavorites = document.getElementById('stat-favorites');
  const gamesCount = document.getElementById('games-count');

  if (statTotal) statTotal.textContent = total;
  if (statPlayed) statPlayed.textContent = played;
  if (statPlanned) statPlanned.textContent = planned;
  if (statFavorites) statFavorites.textContent = favorites;
  if (gamesCount) gamesCount.textContent = `${filteredCount()} game${filteredCount() !== 1 ? 's' : ''}`;
}

function filteredCount() {
  return allGames.filter(g => currentFilter === 'all' || g.status === currentFilter).length;
}

// ============================================
// GAME INTERACTIONS
// ============================================
function toggleLike(gameId) {
  const game = allGames.find(g => g.id === gameId);
  if (!game) return;

  game.likes = game.likes || 0;
  game.dislikes = game.dislikes || 0;
  game.userLiked = !game.userLiked;

  if (game.userLiked) {
    game.likes++;
    if (game.userDisliked) {
      game.dislikes--;
      game.userDisliked = false;
    }
  } else {
    game.likes = Math.max(0, game.likes - 1);
  }

  saveGames();
  render();
}

function toggleDislike(gameId) {
  const game = allGames.find(g => g.id === gameId);
  if (!game) return;

  game.likes = game.likes || 0;
  game.dislikes = game.dislikes || 0;
  game.userDisliked = !game.userDisliked;

  if (game.userDisliked) {
    game.dislikes++;
    if (game.userLiked) {
      game.likes--;
      game.userLiked = false;
    }
  } else {
    game.dislikes = Math.max(0, game.dislikes - 1);
  }

  saveGames();
  render();
}

function toggleFavorite(gameId) {
  const game = allGames.find(g => g.id === gameId);
  if (!game) return;

  game.favorite = !game.favorite;
  saveGames();
  render();
  updateStats();
}

// ============================================
// ADMIN GAMES LIST
// ============================================
function renderAdminGames() {
  const list = document.getElementById('admin-games-list');
  if (!list) return;

  if (allGames.length === 0) {
    list.innerHTML = '<p style="padding: 24px; text-align: center; color: var(--fg-dim);">No games yet. Click "Add Game" to start.</p>';
    return;
  }

  list.innerHTML = allGames.map(game => `
    <div class="admin-game-item" data-id="${escapeHtml(game.id)}">
      <img class="admin-game-cover" src="${escapeHtml(game.cover)}" alt="${escapeHtml(game.title)}" loading="lazy">
      <div class="admin-game-info">
        <div class="admin-game-title">${escapeHtml(game.title)}</div>
        <span class="admin-game-status ${game.status}">${game.status.replace('-', ' ')}</span>
      </div>
      <div class="admin-game-actions">
        <button class="edit-btn" data-id="${escapeHtml(game.id)}" title="Edit">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="delete-btn" data-id="${escapeHtml(game.id)}" title="Delete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
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
  document.getElementById('game-favorite').value = game.favorite ? 'true' : 'false';
  document.getElementById('game-url').value = game.robloxUrl;
  document.getElementById('game-date').value = game.dateAdded || '';

  const submitBtn = document.getElementById('game-submit');
  if (submitBtn) submitBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Update Game';

  switchTab('add');
}

function showConfirmDelete(id) {
  const game = allGames.find(g => g.id === id);
  if (!game) return;
  deleteTargetId = id;
  const confirmTitle = document.getElementById('confirm-title');
  const confirmMessage = document.getElementById('confirm-message');
  if (confirmTitle) confirmTitle.textContent = 'Delete Game';
  if (confirmMessage) confirmMessage.textContent = `Delete "${escapeHtml(game.title)}"? This cannot be undone.`;
  const confirmModal = document.getElementById('confirm-modal');
  if (confirmModal) confirmModal.classList.remove('hidden');
}

function hideConfirm() {
  const confirmModal = document.getElementById('confirm-modal');
  if (confirmModal) confirmModal.classList.add('hidden');
  deleteTargetId = null;
}

async function confirmDelete() {
  if (!deleteTargetId) return;
  allGames = allGames.filter(g => g.id !== deleteTargetId);
  await saveGames();
  render();
  renderAdminGames();
  hideConfirm();
  showToast('Game deleted', 'success');
  updateStats();
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
    favorite: document.getElementById('game-favorite').value === 'true',
    robloxUrl: document.getElementById('game-url').value.trim(),
    dateAdded: document.getElementById('game-date').value || new Date().toISOString().split('T')[0],
    likes: 0,
    dislikes: 0,
    visits: Math.floor(Math.random() * 1000000),
    players: Math.floor(Math.random() * 1000)
  };

  if (editingGameId) {
    const idx = allGames.findIndex(g => g.id === editingGameId);
    if (idx !== -1) {
      // Preserve existing likes/dislikes/visits/players
      gameData.likes = allGames[idx].likes || 0;
      gameData.dislikes = allGames[idx].dislikes || 0;
      gameData.visits = allGames[idx].visits || gameData.visits;
      gameData.players = allGames[idx].players || gameData.players;
      allGames[idx] = gameData;
    }
    showToast('Game updated', 'success');
  } else {
    allGames.unshift(gameData);
    showToast('Game added', 'success');
  }

  await saveGames();
  render();
  renderAdminGames();

  const gameForm = document.getElementById('game-form');
  if (gameForm) gameForm.reset();

  const gameIdInput = document.getElementById('game-id');
  if (gameIdInput) gameIdInput.value = '';

  editingGameId = null;
  const gameSubmit = document.getElementById('game-submit');
  if (gameSubmit) gameSubmit.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save Game';

  switchTab('games');
  updateStats();
}

// ============================================
// SAVE GAMES
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
  showToast('Exported games.json', 'success');
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
      updateStats();
      showToast('Imported successfully', 'success');
    } catch (err) {
      showToast('Import failed: ' + err.message, 'error');
    }
    e.target.value = '';
  };
  reader.readAsText(file);
}

function saveGitHubPat() {
  const input = document.getElementById('github-pat');
  const status = document.getElementById('pat-status');
  if (!input) return;

  const pat = input.value.trim();
  if (!pat) {
    if (status) {
      status.textContent = 'Enter a token first';
      status.className = 'status-msg error';
      status.classList.remove('hidden');
    }
    return;
  }

  localStorage.setItem('github_pat', pat);
  const pushBtn = document.getElementById('push-btn');
  if (pushBtn) pushBtn.disabled = false;

  if (status) {
    status.textContent = 'Token saved';
    status.className = 'status-msg success';
    status.classList.remove('hidden');
  }
  showToast('GitHub PAT saved', 'success');
}

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

  const pushBtn = document.getElementById('push-btn');
  const pushStatus = document.getElementById('push-status');

  if (pushBtn) {
    pushBtn.disabled = true;
    pushBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke-opacity="1"/></svg> Pushing...';
  }
  if (pushStatus) pushStatus.classList.add('hidden');

  const style = document.createElement('style');
  style.textContent = '@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
  document.head.appendChild(style);

  const success = await updateGitHubFile(localStorage.getItem('github_pat'), allGames);

  if (success) {
    if (pushStatus) {
      pushStatus.textContent = 'Pushed to GitHub! Pages will rebuild shortly.';
      pushStatus.className = 'status-msg success';
      pushStatus.classList.remove('hidden');
    }
    showToast('Pushed to GitHub!', 'success');
  } else {
    if (pushStatus) {
      pushStatus.textContent = 'Push failed. Check token permissions (repo scope).';
      pushStatus.className = 'status-msg error';
      pushStatus.classList.remove('hidden');
    }
    showToast('Push failed', 'error');
  }

  if (pushBtn) {
    pushBtn.disabled = false;
    pushBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> Push to GitHub';
  }
}
