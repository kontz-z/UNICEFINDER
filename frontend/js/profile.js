/**
 * UNICEFINDER - User Profile Logic
 */

let currentUserData = null;

document.addEventListener('DOMContentLoaded', () => {
  if (!checkAuth()) return;
  setupBottomNav('profile');

  loadUserProfile();

  // Menu items bindings
  const menuMyItems = document.getElementById('menuMyItems');
  if (menuMyItems) {
    menuMyItems.addEventListener('click', loadUserItems);
  }

  const menuMyClaims = document.getElementById('menuMyClaims');
  if (menuMyClaims) {
    menuMyClaims.addEventListener('click', loadUserClaims);
  }

  const menuSettings = document.getElementById('menuSettings');
  if (menuSettings) {
    menuSettings.addEventListener('click', showSettingsModal);
  }

  const menuLogout = document.getElementById('menuLogout');
  if (menuLogout) {
    menuLogout.addEventListener('click', handleLogout);
  }

  const closeSectionBtn = document.getElementById('closeSectionBtn');
  if (closeSectionBtn) {
    closeSectionBtn.addEventListener('click', () => {
      const section = document.getElementById('profileDetailsSection');
      if (section) section.style.display = 'none';
    });
  }
});

/**
 * Load user information and personal stats
 */
async function loadUserProfile() {
  const nameEl = document.getElementById('profileName');
  const deptEl = document.getElementById('profileDept');
  const initialsEl = document.getElementById('profileInitials');
  const publishedEl = document.getElementById('statPublished');
  const returnedEl = document.getElementById('statReturned');

  // Load from local storage initially
  const localUser = getUser();
  if (localUser) {
    if (nameEl) nameEl.textContent = localUser.name || 'Usuário';
    if (deptEl) deptEl.textContent = localUser.department || 'Departamento Geral';
    if (initialsEl) initialsEl.textContent = getInitials(localUser.name);
  }

  try {
    const user = await apiRequest('/api/users/me');
    currentUserData = user;
    setAuth(getToken(), user);

    if (nameEl) nameEl.textContent = user.name || 'Usuário';
    if (deptEl) deptEl.textContent = user.department || 'Departamento Geral';
    if (initialsEl) initialsEl.textContent = getInitials(user.name);

    // Fetch user stats
    if (user.id) {
      const stats = await apiRequest(`/api/users/${user.id}/stats`);
      if (publishedEl) publishedEl.textContent = stats.published ?? '0';
      if (returnedEl) returnedEl.textContent = stats.returned ?? '0';
    }
  } catch (err) {
    console.error('Erro ao carregar perfil do usuário:', err);
    if (publishedEl && publishedEl.textContent === '-') publishedEl.textContent = '0';
    if (returnedEl && returnedEl.textContent === '-') returnedEl.textContent = '0';
  }
}

/**
 * Load items registered by this user
 */
async function loadUserItems() {
  const section = document.getElementById('profileDetailsSection');
  const title = document.getElementById('sectionTitle');
  const content = document.getElementById('sectionContent');

  if (!section || !title || !content) return;

  section.style.display = 'block';
  title.textContent = 'Meus Itens Publicados';
  content.innerHTML = `
    <div class="loading-container">
      <div class="spinner"></div>
      <div class="loading-text">Carregando seus itens...</div>
    </div>
  `;

  // Scroll to section
  section.scrollIntoView({ behavior: 'smooth' });

  try {
    const items = await apiRequest('/api/users/me/items');

    if (!Array.isArray(items) || items.length === 0) {
      content.innerHTML = `
        <div class="empty-state" style="padding: 24px 10px;">
          <span class="empty-state-icon">📦</span>
          <h4 class="empty-state-title">Nenhum item publicado</h4>
          <p class="empty-state-desc">Você ainda não registrou nenhum item encontrado no sistema.</p>
          <a href="new-item.html" class="btn btn-secondary btn-sm">+ Novo Item</a>
        </div>
      `;
      return;
    }

    content.innerHTML = items.map(item => {
      const photoUrl = formatPhotoUrl(item.photo_url);
      const photoMarkup = photoUrl 
        ? `<img src="${escapeHtml(photoUrl)}" class="admin-card-thumb" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'admin-card-thumb\\' style=\\'display:flex;align-items:center;justify-content:center;font-size:1.5rem;\\'>📦</div>';">`
        : `<div class="admin-card-thumb" style="display:flex;align-items:center;justify-content:center;font-size:1.5rem;">📦</div>`;

      return `
        <div class="admin-card fade-in" style="margin-bottom: 10px; cursor: pointer;" onclick="window.location.href='item-detail.html?id=${item.id}'">
          <div class="admin-card-header">
            ${photoMarkup}
            <div class="admin-card-info">
              <div class="admin-card-title">${escapeHtml(item.name || 'Item sem nome')}</div>
              <div class="admin-card-sub">📍 ${escapeHtml(item.location_found || 'Local não informado')}</div>
              <div class="admin-card-sub">📅 ${escapeHtml(formatDate(item.found_at || item.created_at))}</div>
              <div style="margin-top: 4px;">
                ${getStatusBadge(item.status)}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    content.innerHTML = `
      <div class="empty-state">
        <p class="empty-state-desc" style="color: var(--danger);">${escapeHtml(err.message || 'Erro ao carregar itens.')}</p>
      </div>
    `;
  }
}

/**
 * Load claims made by this user
 */
async function loadUserClaims() {
  const section = document.getElementById('profileDetailsSection');
  const title = document.getElementById('sectionTitle');
  const content = document.getElementById('sectionContent');

  if (!section || !title || !content) return;

  section.style.display = 'block';
  title.textContent = 'Minhas Reivindicações';
  content.innerHTML = `
    <div class="loading-container">
      <div class="spinner"></div>
      <div class="loading-text">Carregando histórico...</div>
    </div>
  `;

  section.scrollIntoView({ behavior: 'smooth' });

  try {
    const claims = await apiRequest('/api/users/me/claims');

    if (!Array.isArray(claims) || claims.length === 0) {
      content.innerHTML = `
        <div class="empty-state" style="padding: 24px 10px;">
          <span class="empty-state-icon">🤝</span>
          <h4 class="empty-state-title">Nenhuma reivindicação</h4>
          <p class="empty-state-desc">Você ainda não reivindicou a posse de nenhum item.</p>
        </div>
      `;
      return;
    }

    content.innerHTML = claims.map(claim => {
      const photoUrl = formatPhotoUrl(claim.item_photo_url || claim.photo_url);
      const photoMarkup = photoUrl 
        ? `<img src="${escapeHtml(photoUrl)}" class="admin-card-thumb" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'admin-card-thumb\\' style=\\'display:flex;align-items:center;justify-content:center;font-size:1.5rem;\\'>📦</div>';">`
        : `<div class="admin-card-thumb" style="display:flex;align-items:center;justify-content:center;font-size:1.5rem;">📦</div>`;

      const claimStatusMap = {
        pending: { label: 'Em análise', class: 'badge-pending' },
        approved: { label: 'Reivindicação Aprovada', class: 'badge-collected' },
        rejected: { label: 'Rejeitada', class: 'badge-archived' }
      };

      const statusInfo = claimStatusMap[claim.status] || { label: claim.status || 'Pendente', class: 'badge-pending' };

      return `
        <div class="admin-card fade-in" style="margin-bottom: 10px; cursor: pointer;" onclick="window.location.href='item-detail.html?id=${claim.item_id}'">
          <div class="admin-card-header">
            ${photoMarkup}
            <div class="admin-card-info">
              <div class="admin-card-title">${escapeHtml(claim.item_name || 'Item')}</div>
              <div class="admin-card-sub">📅 Reivindicado em: ${escapeHtml(formatDate(claim.claimed_at || claim.created_at, true))}</div>
              <div style="margin-top: 6px;">
                <span class="badge ${statusInfo.class}">${escapeHtml(statusInfo.label)}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    content.innerHTML = `
      <div class="empty-state">
        <p class="empty-state-desc" style="color: var(--danger);">${escapeHtml(err.message || 'Erro ao carregar reivindicações.')}</p>
      </div>
    `;
  }
}

/**
 * Show account settings dialog
 */
function showSettingsModal() {
  const user = currentUserData || getUser() || {};
  showModal({
    title: 'Informações da Conta',
    message: `Nome: ${user.name || 'Não informado'}\nE-mail: ${user.email || 'Não informado'}\nDepartamento: ${user.department || 'Geral'}\nFunção: ${user.role === 'employee' ? 'Funcionário' : 'Usuário Padrão'}`,
    confirmText: 'Fechar',
    cancelText: 'Voltar'
  });
}

/**
 * Handle logout
 */
function handleLogout() {
  showModal({
    title: 'Sair da Conta',
    message: 'Tem certeza de que deseja encerrar sua sessão no UniceFinder?',
    confirmText: 'Sair',
    cancelText: 'Cancelar',
    isDanger: true,
    onConfirm: async () => {
      try {
        await apiRequest('/api/auth/logout', { method: 'POST' });
      } catch (e) { /* ignora erro de logout */ }
      clearAuth();
      showToast('Sessão encerrada com sucesso.', 'info');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 600);
    }
  });
}
