/**
 * UNICEFINDER - Home Feed Logic
 */

let currentFilters = {
  status: '',
  category_id: '',
  search: ''
};

let searchDebounceTimeout = null;

document.addEventListener('DOMContentLoaded', () => {
  // Authenticate user
  if (!checkAuth()) return;

  // Setup bottom navigation
  setupBottomNav('home');

  // Load initial statistics and items
  loadStats();
  loadItems();

  // Attach search listener
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchDebounceTimeout);
      searchDebounceTimeout = setTimeout(() => {
        currentFilters.search = e.target.value.trim();
        loadItems();
      }, 350);
    });
  }

  // Attach status tab filters
  const statusTabs = document.querySelectorAll('#statusFilterTabs .filter-tab');
  statusTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      statusTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilters.status = tab.dataset.status || '';
      loadItems();
    });
  });

  // Attach category chips
  const categoryChips = document.querySelectorAll('#categoryChips .chip');
  categoryChips.forEach(chip => {
    chip.addEventListener('click', () => {
      categoryChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilters.category_id = chip.dataset.category || '';
      loadItems();
    });
  });
});

/**
 * Fetch and display quick stats
 */
async function loadStats() {
  try {
    const stats = await apiRequest('/api/items/stats');
    const todayEl = document.getElementById('statToday');
    const returnsEl = document.getElementById('statReturns');
    const resolvedEl = document.getElementById('statResolved');

    if (todayEl) todayEl.textContent = stats.items_today ?? '0';
    if (returnsEl) returnsEl.textContent = stats.total_returns ?? '0';
    if (resolvedEl) {
      const pct = stats.resolved_percent != null ? Math.round(stats.resolved_percent) : 0;
      resolvedEl.textContent = `${pct}%`;
    }
  } catch (err) {
    console.warn('Não foi possível carregar as estatísticas no momento:', err);
    // Graceful fallback values
    const todayEl = document.getElementById('statToday');
    const returnsEl = document.getElementById('statReturns');
    const resolvedEl = document.getElementById('statResolved');
    if (todayEl && todayEl.textContent === '-') todayEl.textContent = '0';
    if (returnsEl && returnsEl.textContent === '-') returnsEl.textContent = '0';
    if (resolvedEl && resolvedEl.textContent === '-') resolvedEl.textContent = '0%';
  }
}

/**
 * Fetch and render items list with active filters
 */
async function loadItems() {
  const feed = document.getElementById('itemsFeed');
  if (!feed) return;

  feed.innerHTML = `
    <div class="loading-container">
      <div class="spinner"></div>
      <div class="loading-text">Buscando itens...</div>
    </div>
  `;

  try {
    const params = new URLSearchParams();
    if (currentFilters.status) params.append('status', currentFilters.status);
    if (currentFilters.category_id) params.append('category_id', currentFilters.category_id);
    if (currentFilters.search) params.append('search', currentFilters.search);

    const queryStr = params.toString() ? `?${params.toString()}` : '';
    const items = await apiRequest(`/api/items${queryStr}`);

    if (!Array.isArray(items) || items.length === 0) {
      renderEmptyState(feed);
      return;
    }

    renderItemsList(feed, items);
  } catch (err) {
    console.error('Erro ao buscar itens:', err);
    feed.innerHTML = `
      <div class="empty-state">
        <span class="empty-state-icon">⚠️</span>
        <h3 class="empty-state-title">Erro ao carregar itens</h3>
        <p class="empty-state-desc">${escapeHtml(err.message || 'Verifique sua conexão com o servidor.')}</p>
        <button type="button" class="btn btn-outline btn-sm" onclick="loadItems()">Tentar novamente</button>
      </div>
    `;
  }
}

/**
 * Render items cards into DOM
 */
function renderItemsList(container, items) {
  container.innerHTML = '';

  items.forEach(item => {
    const card = document.createElement('article');
    card.className = 'item-card fade-in';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');

    // Photo or placeholder
    const photoUrl = formatPhotoUrl(item.photo_url);
    const photoMarkup = photoUrl
      ? `<img src="${escapeHtml(photoUrl)}" alt="${escapeHtml(item.name)}" class="item-card-thumb" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'item-card-placeholder\\'>📦</div>';">`
      : `<div class="item-card-placeholder">📦</div>`;

    const statusBadge = getStatusBadge(item.status);
    const relativeTime = timeAgo(item.found_at || item.created_at);
    const initials = getInitials(item.found_by_name || 'Usuário');

    card.innerHTML = `
      <div class="item-card-thumb-wrap">
        ${photoMarkup}
      </div>
      <div class="item-card-body">
        <div>
          <div class="item-card-header">
            <h3 class="item-card-title">${escapeHtml(item.name || 'Item sem nome')}</h3>
            ${statusBadge}
          </div>
          <div class="item-card-location">
            <span>📍</span>
            <span>${escapeHtml(item.location_found || 'Local não informado')}</span>
          </div>
        </div>

        <div class="item-card-footer">
          <div class="user-badge-small" title="Encontrado por ${escapeHtml(item.found_by_name || 'Anônimo')}">
            <div class="avatar-initials-xs">${escapeHtml(initials)}</div>
            <span>${escapeHtml(item.found_by_name || 'Anônimo')}</span>
          </div>
          <span>${escapeHtml(relativeTime)}</span>
        </div>
      </div>
    `;

    // Navigate to details on click
    card.addEventListener('click', () => {
      window.location.href = `item-detail.html?id=${item.id}`;
    });

    // Keyboard accessibility
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        window.location.href = `item-detail.html?id=${item.id}`;
      }
    });

    container.appendChild(card);
  });
}

/**
 * Render pleasant empty state
 */
function renderEmptyState(container) {
  let title = 'Nenhum item encontrado';
  let desc = 'Não foram encontrados itens com os filtros selecionados no momento.';

  if (currentFilters.search) {
    desc = `Nenhum resultado para "${escapeHtml(currentFilters.search)}". Tente outras palavras-chave.`;
  } else if (currentFilters.status === 'collected') {
    desc = 'Ainda não há itens devolvidos listados nesta categoria.';
  }

  container.innerHTML = `
    <div class="empty-state fade-in">
      <span class="empty-state-icon">🔍</span>
      <h3 class="empty-state-title">${title}</h3>
      <p class="empty-state-desc">${desc}</p>
      <a href="new-item.html" class="btn btn-secondary btn-sm">
        <span>+ Cadastrar Novo Item</span>
      </a>
    </div>
  `;
}
