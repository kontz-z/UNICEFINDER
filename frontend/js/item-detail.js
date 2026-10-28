/**
 * UNICEFINDER - Item Details Logic
 */

let currentItem = null;

document.addEventListener('DOMContentLoaded', () => {
  if (!checkAuth()) return;
  setupBottomNav();

  const urlParams = new URLSearchParams(window.location.search);
  const itemId = urlParams.get('id');

  if (!itemId) {
    showToast('Identificador de item inválido.', 'error');
    setTimeout(() => {
      window.location.href = 'home.html';
    }, 1500);
    return;
  }

  loadItemDetails(itemId);
});

/**
 * Load and render item details
 */
async function loadItemDetails(itemId) {
  const container = document.getElementById('itemDetailContainer');
  const headerStatusBadge = document.getElementById('headerStatusBadge');

  try {
    const item = await apiRequest(`/api/items/${itemId}`);
    currentItem = item;

    // Update Header Status Badge
    if (headerStatusBadge) {
      headerStatusBadge.innerHTML = getStatusBadge(item.status);
    }

    // Determine photo or placeholder
    const photoUrl = formatPhotoUrl(item.photo_url);
    const photoMarkup = photoUrl
      ? `<img src="${escapeHtml(photoUrl)}" alt="${escapeHtml(item.name)}" class="detail-photo" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'detail-photo-placeholder\\'>📦</div>';">`
      : `<div class="detail-photo-placeholder">📦</div>`;

    // Category tag
    const categoryText = (item.category_icon ? `${item.category_icon} ` : '') + (item.category_name || 'Geral');

    // Found by info
    const foundByName = item.found_by_name || 'Usuário UniceFinder';
    const foundByInitials = getInitials(foundByName);

    // Formatted Dates
    const formattedFoundAt = formatDate(item.found_at || item.created_at, true);
    const relativeTime = timeAgo(item.found_at || item.created_at);

    // QR Code URL
    const qrCodeUrl = `/api/items/${item.id}/qrcode`;

    // Check if user can claim
    const currentUser = getUser();
    const isOwner = currentUser && (currentUser.id === item.found_by_user_id);
    const canClaim = item.status === 'approved' && !isOwner;

    // Check if employee actions needed
    const isEmp = isEmployee();
    const canModerate = isEmp && item.status === 'pending_approval';

    // Build HTML
    let html = `
      <div class="detail-hero-photo-wrap">
        ${photoMarkup}
      </div>

      <div class="detail-body fade-in">
        <!-- Main Title Header -->
        <div class="detail-main-header">
          <span class="detail-category-tag">${escapeHtml(categoryText)}</span>
          <h2 class="detail-item-title">${escapeHtml(item.name || 'Item sem nome')}</h2>
        </div>

        <!-- Section: Local -->
        <div class="detail-section-card">
          <div class="detail-section-label">
            <span>📍</span> Local onde foi encontrado
          </div>
          <div class="detail-section-value">${escapeHtml(item.location_found || 'Local não informado')}</div>
        </div>

        <!-- Section: Data -->
        <div class="detail-section-card">
          <div class="detail-section-label">
            <span>📅</span> Data e Horário do Achado
          </div>
          <div class="detail-section-value">
            ${escapeHtml(formattedFoundAt)}
            <span style="font-size: 0.8rem; color: var(--text-light); margin-left: 6px;">(${escapeHtml(relativeTime)})</span>
          </div>
        </div>

        <!-- Section: Descrição -->
        <div class="detail-section-card">
          <div class="detail-section-label">
            <span>📝</span> Descrição Detalhada
          </div>
          <div class="detail-section-value description-text">
            ${escapeHtml(item.description || 'Nenhuma descrição adicional foi fornecida para este item.')}
          </div>
        </div>

        <!-- Section: Publicado Por -->
        <div class="detail-section-card">
          <div class="detail-section-label">
            <span>👤</span> Publicado Por
          </div>
          <div class="user-profile-row">
            <div class="avatar-initials-md">${escapeHtml(foundByInitials)}</div>
            <div class="user-profile-info">
              <div class="user-name">${escapeHtml(foundByName)}</div>
              <div class="user-role">${isOwner ? 'Você registrou este item' : 'Membro da Instituição'}</div>
            </div>
          </div>
        </div>

        <!-- Section: Collection Info (if collected) -->
        <div id="collectionInfoContainer"></div>

        <!-- Section: QR Code -->
        <div class="qr-container">
          <div class="detail-section-label" style="justify-content: center;">
            <span>📱</span> QR Code de Identificação
          </div>
          <p style="font-size: 0.8rem; color: var(--text-light); margin-bottom: 10px;">
            Este código é exclusivo deste item e pode ser usado em etiquetas.
          </p>
          <img 
            src="${qrCodeUrl}" 
            alt="QR Code do Item ${item.id}" 
            class="qr-image" 
            onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='block';"
          >
          <p style="display: none; color: var(--danger); font-size: 0.8rem;">Não foi possível carregar a imagem do QR Code.</p>
          
          <button type="button" class="btn btn-outline btn-sm" id="downloadQrBtn" style="margin-top: 6px;">
            <span>⬇️ Baixar QR Code</span>
          </button>
        </div>

        <!-- Employee Moderation Actions (if pending) -->
        ${canModerate ? `
          <div class="admin-actions" style="margin-top: 10px;">
            <button type="button" class="btn btn-secondary" id="empApproveBtn">✓ Aprovar Item</button>
            <button type="button" class="btn btn-danger" id="empRejectBtn">✗ Rejeitar</button>
          </div>
        ` : ''}

        <!-- Claim Action Button -->
        ${canClaim ? `
          <div class="claim-actions">
            <button type="button" class="btn btn-secondary btn-block" id="claimItemBtn" style="font-size: 1.05rem; padding: 14px;">
              <span>✋ Este item é meu</span>
            </button>
            <p class="claim-hint">Você passará por uma verificação rápida para confirmar.</p>
          </div>
        ` : ''}

        ${isOwner && item.status === 'approved' ? `
          <div style="text-align: center; padding: 12px; background: #FAF5FF; border-radius: var(--radius-md); font-size: 0.82rem; color: var(--primary);">
            ℹ️ Você foi quem cadastrou este item. Aguarde o proprietário legítimo identificá-lo!
          </div>
        ` : ''}

      </div>
    `;

    container.innerHTML = html;

    // Attach QR Download Handler
    const downloadQrBtn = document.getElementById('downloadQrBtn');
    if (downloadQrBtn) {
      downloadQrBtn.addEventListener('click', () => downloadQrCode(qrCodeUrl, item.id));
    }

    // Attach Claim Handler
    const claimBtn = document.getElementById('claimItemBtn');
    if (claimBtn) {
      claimBtn.addEventListener('click', () => handleClaimItem(item.id));
    }

    // Attach Employee Moderation Handlers
    const empApproveBtn = document.getElementById('empApproveBtn');
    if (empApproveBtn) {
      empApproveBtn.addEventListener('click', () => handleEmployeeAction(item.id, 'approve'));
    }

    const empRejectBtn = document.getElementById('empRejectBtn');
    if (empRejectBtn) {
      empRejectBtn.addEventListener('click', () => handleEmployeeAction(item.id, 'reject'));
    }

    // If collected, load collection info
    if (item.status === 'collected') {
      loadCollectionInfo(item.id);
    }

  } catch (err) {
    console.error('Erro ao carregar detalhes:', err);
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-state-icon">⚠️</span>
        <h3 class="empty-state-title">Item não encontrado</h3>
        <p class="empty-state-desc">${escapeHtml(err.message || 'O item solicitado pode ter sido removido ou não existe.')}</p>
        <a href="home.html" class="btn btn-primary btn-sm">Voltar ao Início</a>
      </div>
    `;
  }
}

/**
 * Fetch and render collection info if item is marked as collected
 */
async function loadCollectionInfo(itemId) {
  const container = document.getElementById('collectionInfoContainer');
  if (!container) return;

  try {
    const col = await apiRequest(`/api/items/${itemId}/collection`);
    if (!col) return;

    container.innerHTML = `
      <div class="collection-card fade-in">
        <div class="collection-card-title">
          <span>✓</span> Informações da Devolução
        </div>
        <div class="collection-grid">
          <div class="grid-item">
            <span>Entregue a</span>
            <span>${escapeHtml(col.collected_by_name || 'Não registrado')}</span>
          </div>
          <div class="grid-item">
            <span>Data da Entrega</span>
            <span>${escapeHtml(formatDate(col.collected_at, true))}</span>
          </div>
          <div class="grid-item" style="grid-column: span 2;">
            <span>Confirmado pelo Funcionário</span>
            <span>${escapeHtml(col.confirmed_by_name || 'Funcionário')}</span>
          </div>
          ${col.notes ? `
          <div class="grid-item" style="grid-column: span 2;">
            <span>Observações</span>
            <span style="font-weight: normal;">${escapeHtml(col.notes)}</span>
          </div>
          ` : ''}
        </div>
      </div>
    `;
  } catch (err) {
    // 404 or no collection record is normal if not registered yet
    console.info('Registro detalhado de coleta não disponível:', err.message);
  }
}

/**
 * Handle "Este item é meu" claim submission
 */
function handleClaimItem(itemId) {
  showModal({
    title: 'Confirmar Reivindicação',
    message: 'Você tem certeza de que este item pertence a você? Sua solicitação será enviada aos funcionários para conferência e validação.',
    confirmText: 'Sim, é meu',
    cancelText: 'Cancelar',
    onConfirm: async () => {
      try {
        await apiRequest('/api/claims', {
          method: 'POST',
          body: { item_id: Number(itemId) }
        });

        showToast('Solicitação de reivindicação enviada com sucesso!', 'success');
        setTimeout(() => {
          loadItemDetails(itemId);
        }, 1000);
      } catch (err) {
        showToast(err.message || 'Falha ao reivindicar item.', 'error');
      }
    }
  });
}

/**
 * Handle Employee moderation on detail page
 */
function handleEmployeeAction(itemId, action) {
  const isApprove = action === 'approve';
  showModal({
    title: isApprove ? 'Aprovar Item' : 'Rejeitar Item',
    message: isApprove 
      ? 'Deseja aprovar e publicar este item no feed público?' 
      : 'Deseja rejeitar este item? Ele não aparecerá no feed.',
    confirmText: isApprove ? 'Aprovar' : 'Rejeitar',
    isDanger: !isApprove,
    onConfirm: async () => {
      try {
        const endpoint = `/api/items/${itemId}/${action}`;
        await apiRequest(endpoint, { method: 'PUT' });
        showToast(`Item ${isApprove ? 'aprovado' : 'rejeitado'} com sucesso!`, 'success');
        setTimeout(() => {
          loadItemDetails(itemId);
        }, 800);
      } catch (err) {
        showToast(err.message || `Erro ao ${action} item.`, 'error');
      }
    }
  });
}

/**
 * Trigger download of QR Code PNG image
 */
async function downloadQrCode(url, itemId) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Não foi possível obter imagem do QR Code.');
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `unicefinder-qrcode-item-${itemId}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
    showToast('Download do QR Code iniciado!', 'success');
  } catch (err) {
    showToast('Erro ao baixar QR Code: ' + err.message, 'error');
  }
}
