/**
 * UNICEFINDER - Employee Admin Panel Logic (com Logs de Auditoria)
 */

let currentTab = 'items'; // 'items' | 'claims' | 'logs'
let pendingItemsList = [];
let pendingClaimsList = [];
let auditLogsList = [];
let logsFilterAction = '';

document.addEventListener('DOMContentLoaded', () => {
  if (!checkAuth(true)) return;
  setupBottomNav('admin');

  const tabItemsBtn = document.getElementById('tabPendingItems');
  const tabClaimsBtn = document.getElementById('tabPendingClaims');
  const tabLogsBtn = document.getElementById('tabLogs');
  const refreshBtn = document.getElementById('refreshBtn');

  if (tabItemsBtn) tabItemsBtn.addEventListener('click', () => switchTab('items'));
  if (tabClaimsBtn) tabClaimsBtn.addEventListener('click', () => switchTab('claims'));
  if (tabLogsBtn) tabLogsBtn.addEventListener('click', () => switchTab('logs'));
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      showToast('Atualizando dados...', 'info');
      refreshAll();
    });
  }

  refreshAll();
});

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));

  if (tab === 'items') {
    document.getElementById('tabPendingItems').classList.add('active');
    renderPendingItems();
  } else if (tab === 'claims') {
    document.getElementById('tabPendingClaims').classList.add('active');
    renderPendingClaims();
  } else if (tab === 'logs') {
    document.getElementById('tabLogs').classList.add('active');
    fetchAndRenderLogs();
  }
}

async function refreshAll() {
  await Promise.all([fetchPendingItems(), fetchPendingClaims()]);
  if (currentTab === 'items') renderPendingItems();
  else if (currentTab === 'claims') renderPendingClaims();
  else if (currentTab === 'logs') fetchAndRenderLogs();
}

async function fetchPendingItems() {
  try {
    const items = await apiRequest('/api/items?status=pending_approval');
    pendingItemsList = Array.isArray(items) ? items : [];
    const badge = document.getElementById('itemsCountBadge');
    if (badge) {
      if (pendingItemsList.length > 0) { badge.textContent = pendingItemsList.length; badge.style.display = 'inline-block'; }
      else { badge.style.display = 'none'; }
    }
  } catch (err) { pendingItemsList = []; }
}

async function fetchPendingClaims() {
  try {
    const claims = await apiRequest('/api/claims?status=pending');
    pendingClaimsList = Array.isArray(claims) ? claims : [];
    const badge = document.getElementById('claimsCountBadge');
    if (badge) {
      if (pendingClaimsList.length > 0) { badge.textContent = pendingClaimsList.length; badge.style.display = 'inline-block'; }
      else { badge.style.display = 'none'; }
    }
  } catch (err) { pendingClaimsList = []; }
}

// ==================== LOGS ====================

const ACTION_LABELS = {
  'LOGIN': { label: '🔑 Login', color: '#3498db' },
  'LOGOUT': { label: '🚪 Logout', color: '#95a5a6' },
  'REGISTER': { label: '👤 Cadastro', color: '#2ecc71' },
  'CREATE_ITEM': { label: '📦 Item Cadastrado', color: '#9b59b6' },
  'APPROVE_ITEM': { label: '✅ Item Aprovado', color: '#27ae60' },
  'REJECT_ITEM': { label: '❌ Item Rejeitado', color: '#e74c3c' },
  'CREATE_CLAIM': { label: '🙋 Reivindicação', color: '#f39c12' },
  'APPROVE_CLAIM': { label: '✅ Devolução Aprovada', color: '#27ae60' },
  'REJECT_CLAIM': { label: '❌ Devolução Rejeitada', color: '#e74c3c' },
  'COLLECT_ITEM': { label: '📥 Coleta Registrada', color: '#1abc9c' },
};

async function fetchAndRenderLogs() {
  const container = document.getElementById('adminContent');
  container.innerHTML = `<div class="loading-container"><div class="spinner"></div><div class="loading-text">Carregando logs...</div></div>`;

  try {
    const url = logsFilterAction
      ? `/api/logs?limit=200&action=${encodeURIComponent(logsFilterAction)}`
      : '/api/logs?limit=200';
    const data = await apiRequest(url);
    auditLogsList = data.logs || [];
    renderLogs();
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><span class="empty-state-icon">⚠️</span><h3>Erro ao carregar logs</h3><p>${escapeHtml(err.message)}</p></div>`;
  }
}

function renderLogs() {
  const container = document.getElementById('adminContent');

  // Filter bar
  let filterHtml = `
    <div style="padding: 12px; background: #f8f9fa; border-radius: 8px; margin-bottom: 12px;">
      <label style="font-size: 0.82rem; font-weight: 600; color: var(--text-light); display: block; margin-bottom: 6px;">Filtrar por ação:</label>
      <select id="logActionFilter" style="width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: 6px; font-size: 0.85rem;">
        <option value="">Todas as ações</option>
        <option value="LOGIN" ${logsFilterAction === 'LOGIN' ? 'selected' : ''}>🔑 Login</option>
        <option value="LOGOUT" ${logsFilterAction === 'LOGOUT' ? 'selected' : ''}>🚪 Logout</option>
        <option value="REGISTER" ${logsFilterAction === 'REGISTER' ? 'selected' : ''}>👤 Cadastro</option>
        <option value="CREATE_ITEM" ${logsFilterAction === 'CREATE_ITEM' ? 'selected' : ''}>📦 Item Cadastrado</option>
        <option value="APPROVE_ITEM" ${logsFilterAction === 'APPROVE_ITEM' ? 'selected' : ''}>✅ Item Aprovado</option>
        <option value="REJECT_ITEM" ${logsFilterAction === 'REJECT_ITEM' ? 'selected' : ''}>❌ Item Rejeitado</option>
        <option value="CREATE_CLAIM" ${logsFilterAction === 'CREATE_CLAIM' ? 'selected' : ''}>🙋 Reivindicação</option>
        <option value="APPROVE_CLAIM" ${logsFilterAction === 'APPROVE_CLAIM' ? 'selected' : ''}>✅ Devolução Aprovada</option>
        <option value="REJECT_CLAIM" ${logsFilterAction === 'REJECT_CLAIM' ? 'selected' : ''}>❌ Devolução Rejeitada</option>
        <option value="COLLECT_ITEM" ${logsFilterAction === 'COLLECT_ITEM' ? 'selected' : ''}>📥 Coleta Registrada</option>
      </select>
      <div style="margin-top: 8px; font-size: 0.78rem; color: var(--text-light);">
        Total: <strong>${auditLogsList.length}</strong> registros
      </div>
    </div>
  `;

  if (auditLogsList.length === 0) {
    container.innerHTML = filterHtml + `
      <div class="empty-state fade-in">
        <span class="empty-state-icon">📋</span>
        <h3 class="empty-state-title">Nenhum log encontrado</h3>
        <p class="empty-state-desc">Não há registros de auditoria para o filtro selecionado.</p>
      </div>
    `;
    setupLogFilter();
    return;
  }

  const logsHtml = auditLogsList.map(log => {
    const actionInfo = ACTION_LABELS[log.action] || { label: log.action, color: '#777' };
    const initials = getInitials(log.user_name || 'Sistema');
    const dateStr = formatDate(log.created_at, true);
    const ago = timeAgo(log.created_at);

    return `
      <div class="admin-card fade-in" style="margin-bottom: 8px; padding: 12px;">
        <div style="display: flex; align-items: flex-start; gap: 10px;">
          <div style="width: 36px; height: 36px; border-radius: 50%; background: ${actionInfo.color}; color: white; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 700; flex-shrink: 0;">
            ${escapeHtml(initials)}
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-size: 0.75rem; font-weight: 700; color: ${actionInfo.color}; background: ${actionInfo.color}15; padding: 2px 8px; border-radius: 4px;">
                ${actionInfo.label}
              </span>
              <span style="font-size: 0.7rem; color: var(--text-light);">${escapeHtml(ago)}</span>
            </div>
            <div style="font-size: 0.82rem; font-weight: 600; color: var(--text);">
              ${escapeHtml(log.user_name || 'Sistema')}
              <span style="font-weight: 400; color: var(--text-light); font-size: 0.75rem;">
                ${log.user_email ? '(' + escapeHtml(log.user_email) + ')' : ''}
              </span>
            </div>
            <div style="font-size: 0.78rem; color: var(--text-light); margin-top: 2px;">
              ${escapeHtml(log.details || '')}
            </div>
            <div style="font-size: 0.7rem; color: #aaa; margin-top: 4px; display: flex; gap: 12px;">
              <span>📅 ${escapeHtml(dateStr)}</span>
              <span>🌐 IP: ${escapeHtml(log.ip_address || 'N/A')}</span>
              ${log.entity_type ? `<span>🏷️ ${escapeHtml(log.entity_type)} #${log.entity_id || ''}</span>` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = filterHtml + logsHtml;
  setupLogFilter();
}

function setupLogFilter() {
  const select = document.getElementById('logActionFilter');
  if (select) {
    select.addEventListener('change', (e) => {
      logsFilterAction = e.target.value;
      fetchAndRenderLogs();
    });
  }
}

// ==================== PENDING ITEMS ====================

function renderPendingItems() {
  const container = document.getElementById('adminContent');
  if (pendingItemsList.length === 0) {
    container.innerHTML = `<div class="empty-state fade-in"><span class="empty-state-icon">✅</span><h3 class="empty-state-title">Nenhum item pendente</h3><p class="empty-state-desc">Todos os itens já foram processados!</p></div>`;
    return;
  }
  container.innerHTML = pendingItemsList.map(item => {
    const photoUrl = formatPhotoUrl(item.photo_url);
    const photoMarkup = photoUrl
      ? `<img src="${escapeHtml(photoUrl)}" class="admin-card-thumb" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'admin-card-thumb\\' style=\\'display:flex;align-items:center;justify-content:center;font-size:1.5rem;\\'>📦</div>';">`
      : `<div class="admin-card-thumb" style="display:flex;align-items:center;justify-content:center;font-size:1.5rem;">📦</div>`;
    return `
      <article class="admin-card fade-in" id="item-card-${item.id}">
        <div class="admin-card-header">
          ${photoMarkup}
          <div class="admin-card-info">
            <h4 class="admin-card-title">${escapeHtml(item.name || 'Item sem nome')}</h4>
            <div class="admin-card-sub">📍 ${escapeHtml(item.location_found || 'Local não informado')}</div>
            <div class="admin-card-sub">👤 Encontrado por: <strong>${escapeHtml(item.found_by_name || 'Usuário')}</strong></div>
            <div class="admin-card-sub">📅 ${escapeHtml(formatDate(item.found_at || item.created_at, true))}</div>
          </div>
        </div>
        ${item.description ? `<div style="font-size:0.82rem;color:var(--text-muted);background:#F9FAFB;padding:8px;border-radius:var(--radius-sm);">${escapeHtml(item.description)}</div>` : ''}
        <div class="admin-actions">
          <button type="button" class="btn btn-secondary btn-sm" onclick="approveItem(${item.id})">✓ Aprovar</button>
          <button type="button" class="btn btn-danger btn-sm" onclick="rejectItem(${item.id})">✗ Rejeitar</button>
        </div>
      </article>`;
  }).join('');
}

// ==================== PENDING CLAIMS ====================

function renderPendingClaims() {
  const container = document.getElementById('adminContent');
  if (pendingClaimsList.length === 0) {
    container.innerHTML = `<div class="empty-state fade-in"><span class="empty-state-icon">✅</span><h3 class="empty-state-title">Nenhuma reivindicação pendente</h3><p class="empty-state-desc">Não há reivindicações aguardando análise.</p></div>`;
    return;
  }
  container.innerHTML = pendingClaimsList.map(claim => {
    const photoUrl = formatPhotoUrl(claim.item_photo_url || claim.photo_url);
    const photoMarkup = photoUrl
      ? `<img src="${escapeHtml(photoUrl)}" class="admin-card-thumb" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'admin-card-thumb\\' style=\\'display:flex;align-items:center;justify-content:center;font-size:1.5rem;\\'>📦</div>';">`
      : `<div class="admin-card-thumb" style="display:flex;align-items:center;justify-content:center;font-size:1.5rem;">📦</div>`;
    return `
      <article class="admin-card fade-in" id="claim-card-${claim.id}">
        <div class="admin-card-header">
          ${photoMarkup}
          <div class="admin-card-info">
            <h4 class="admin-card-title">${escapeHtml(claim.item_name || 'Item Reivindicado')}</h4>
            <div class="admin-card-sub">👤 Reivindicado por: <strong>${escapeHtml(claim.claimant_name || 'Aluno/Servidor')}</strong></div>
            <div class="admin-card-sub">📅 ${escapeHtml(formatDate(claim.claimed_at || claim.created_at, true))}</div>
            <div style="margin-top:4px;"><a href="item-detail.html?id=${claim.item_id}" style="font-size:0.78rem;font-weight:600;">Ver detalhes →</a></div>
          </div>
        </div>
        <div class="admin-actions">
          <button type="button" class="btn btn-secondary btn-sm" onclick="approveClaim(${claim.id})">✓ Aprovar Devolução</button>
          <button type="button" class="btn btn-danger btn-sm" onclick="rejectClaim(${claim.id})">✗ Rejeitar</button>
        </div>
      </article>`;
  }).join('');
}

// ==================== ACTIONS ====================

function approveItem(itemId) {
  showModal({ title: 'Aprovar Item', message: 'Confirmar a aprovação deste item para publicação?', confirmText: 'Aprovar',
    onConfirm: async () => {
      try { await apiRequest(`/api/items/${itemId}/approve`, { method: 'PUT' }); showToast('Item aprovado!', 'success'); await refreshAll(); }
      catch (err) { showToast(err.message || 'Erro ao aprovar.', 'error'); }
    }
  });
}

function rejectItem(itemId) {
  showModal({ title: 'Rejeitar Item', message: 'Tem certeza de que deseja rejeitar este item?', confirmText: 'Rejeitar', isDanger: true,
    onConfirm: async () => {
      try { await apiRequest(`/api/items/${itemId}/reject`, { method: 'PUT' }); showToast('Item rejeitado.', 'info'); await refreshAll(); }
      catch (err) { showToast(err.message || 'Erro ao rejeitar.', 'error'); }
    }
  });
}

function approveClaim(claimId) {
  showModal({ title: 'Aprovar Devolução', message: 'Confirma a devolução do item ao solicitante?', confirmText: 'Aprovar Devolução',
    onConfirm: async () => {
      try { await apiRequest(`/api/claims/${claimId}/approve`, { method: 'PUT' }); showToast('Devolução confirmada!', 'success'); await refreshAll(); }
      catch (err) { showToast(err.message || 'Erro ao aprovar.', 'error'); }
    }
  });
}

function rejectClaim(claimId) {
  showModal({ title: 'Rejeitar Reivindicação', message: 'Deseja rejeitar este pedido de devolução?', confirmText: 'Rejeitar', isDanger: true,
    onConfirm: async () => {
      try { await apiRequest(`/api/claims/${claimId}/reject`, { method: 'PUT' }); showToast('Reivindicação rejeitada.', 'info'); await refreshAll(); }
      catch (err) { showToast(err.message || 'Erro ao rejeitar.', 'error'); }
    }
  });
}
