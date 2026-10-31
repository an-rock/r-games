const grid = document.getElementById('games-grid');
const filterBtns = document.querySelectorAll('.filter-btn');
let allGames = [];
let currentFilter = 'all';

async function loadGames() {
  try {
    const res = await fetch('games.json');
    allGames = await res.json();
    render();
  } catch (e) {
    grid.innerHTML = '<p style="text-align:center;color:var(--muted);padding:2rem;">Failed to load games.json</p>';
    console.error(e);
  }
}

function render() {
  const filtered = allGames.filter(g => currentFilter === 'all' || g.status === currentFilter);
  grid.innerHTML = filtered.map(game => `
    <article class="game-card">
      <img class="game-cover" src="${game.cover}" alt="${game.title} cover" loading="lazy">
      <div class="game-info">
        <h2 class="game-title"><a href="${game.robloxUrl}" target="_blank" rel="noopener">${game.title}</a></h2>
        <p class="game-desc">${game.description}</p>
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

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    render();
  });
});

loadGames();