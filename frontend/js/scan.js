/**
 * UNICEFINDER - QR Code Scanner Logic
 */

let html5QrCode = null;
let isScannerRunning = false;

document.addEventListener('DOMContentLoaded', () => {
  if (!checkAuth()) return;
  setupBottomNav('scan');

  initScanner();

  // Stop scanner when user leaves page
  window.addEventListener('beforeunload', () => {
    stopScanner();
  });
});

/**
 * Initialize and start the QR Code camera scanner
 */
async function initScanner() {
  const readerElement = document.getElementById('reader');
  if (!readerElement) return;

  if (typeof Html5Qrcode === 'undefined') {
    showToast('Biblioteca do scanner não pôde ser carregada.', 'error');
    return;
  }

  html5QrCode = new Html5Qrcode('reader');

  const config = {
    fps: 10,
    qrbox: { width: 240, height: 240 },
    aspectRatio: 1.0
  };

  try {
    await html5QrCode.start(
      { facingMode: 'environment' },
      config,
      onScanSuccess,
      onScanFailure
    );
    isScannerRunning = true;
  } catch (err) {
    console.warn('Não foi possível iniciar a câmera traseira, tentando câmeras disponíveis...', err);
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        await html5QrCode.start(
          devices[0].id,
          config,
          onScanSuccess,
          onScanFailure
        );
        isScannerRunning = true;
      } else {
        throw new Error('Nenhuma câmera detectada neste dispositivo.');
      }
    } catch (innerErr) {
      console.error('Falha geral no acesso à câmera:', innerErr);
      const scannerBox = document.getElementById('scannerBox');
      if (scannerBox) {
        scannerBox.innerHTML = `
          <div style="padding: 24px; text-align: center; color: var(--white);">
            <div style="font-size: 2.2rem; margin-bottom: 8px;">📷❌</div>
            <div style="font-size: 0.95rem; font-weight: 700; margin-bottom: 4px;">Acesso à câmera indisponível</div>
            <p style="font-size: 0.8rem; color: #D1D5DB; margin-bottom: 12px;">
              Permita o acesso à câmera nas configurações do navegador ou utilize a busca manual pelo ID abaixo.
            </p>
          </div>
        `;
      }
      showToast('Acesso à câmera bloqueado ou indisponível.', 'warning');
    }
  }
}

/**
 * QR Code detected successfully
 */
async function onScanSuccess(decodedText) {
  console.log('QR Code detectado:', decodedText);

  // Extract Item ID from decoded text or URL
  const itemId = extractItemId(decodedText);

  if (!itemId) {
    showToast('QR Code não reconhecido como um item do UniceFinder.', 'warning');
    return;
  }

  // Pause scanner while showing results
  stopScanner();

  // Load and display scanned item
  await fetchAndDisplayScannedItem(itemId);
}

/**
 * Soft failure per frame (quiet)
 */
function onScanFailure(error) {
  // Common per-frame failure while hunting for QR, no need to spam console
}

/**
 * Parse item ID from numeric string or URL
 */
function extractItemId(text) {
  if (!text) return null;

  const trimmed = text.trim();

  // Direct number
  if (/^\d+$/.test(trimmed)) {
    return trimmed;
  }

  // Query param id=12
  const queryMatch = trimmed.match(/[?&]id=(\d+)/i);
  if (queryMatch) {
    return queryMatch[1];
  }

  // URL path ending with /items/12
  const pathMatch = trimmed.match(/\/items\/(\d+)/i);
  if (pathMatch) {
    return pathMatch[1];
  }

  // Format "item:12"
  const prefixMatch = trimmed.match(/item:(\d+)/i);
  if (prefixMatch) {
    return prefixMatch[1];
  }

  return null;
}

/**
 * Stop camera scanner safely
 */
function stopScanner() {
  if (html5QrCode && isScannerRunning) {
    html5QrCode.stop().then(() => {
      isScannerRunning = false;
      const scannerBox = document.getElementById('scannerBox');
      if (scannerBox) scannerBox.style.display = 'none';
    }).catch(err => {
      console.warn('Erro ao parar scanner:', err);
    });
  }
}

/**
 * Resume camera scanner
 */
function resumeScanner() {
  const resultCard = document.getElementById('scannedResultContainer');
  if (resultCard) resultCard.style.display = 'none';

  const scannerBox = document.getElementById('scannerBox');
  if (scannerBox) {
    scannerBox.style.display = 'flex';
    scannerBox.innerHTML = '<div id="reader"></div>';
  }

  initScanner();
}

/**
 * Manual search by item ID fallback
 */
async function handleManualSearch() {
  const input = document.getElementById('manualIdInput');
  if (!input) return;

  const val = input.value.trim();
  if (!val) {
    showToast('Digite o número do ID do item.', 'warning');
    return;
  }

  stopScanner();
  await fetchAndDisplayScannedItem(val);
}

/**
 * Fetch item details and render inline
 */
async function fetchAndDisplayScannedItem(itemId) {
  const container = document.getElementById('scannedResultContainer');
  if (!container) return;

  container.style.display = 'block';
  container.innerHTML = `
    <div class="loading-container">
      <div class="spinner"></div>
      <div class="loading-text">Buscando informações do item #${itemId}...</div>
    </div>
  `;

  try {
    const item = await apiRequest(`/api/items/${itemId}`);
    const currentUser = getUser();
    const isOwner = currentUser && (currentUser.id === item.found_by_user_id);
    const canClaim = item.status === 'approved' && !isOwner;

    const photoUrl = formatPhotoUrl(item.photo_url);
    const photoMarkup = photoUrl 
      ? `<img src="${escapeHtml(photoUrl)}" class="admin-card-thumb" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'admin-card-thumb\\' style=\\'display:flex;align-items:center;justify-content:center;font-size:1.5rem;\\'>📦</div>';">`
      : `<div class="admin-card-thumb" style="display:flex;align-items:center;justify-content:center;font-size:1.5rem;">📦</div>`;

    let collectionHtml = '';
    if (item.status === 'collected') {
      try {
        const col = await apiRequest(`/api/items/${item.id}/collection`);
        if (col) {
          collectionHtml = `
            <div class="collection-card" style="margin-top: 10px; padding: 12px;">
              <div class="collection-card-title" style="font-size: 0.85rem;">
                <span>✓</span> Item já entregue ao dono
              </div>
              <div style="font-size: 0.8rem; color: #1F2937;">
                <div><strong>Entregue a:</strong> ${escapeHtml(col.collected_by_name || 'Proprietário')}</div>
                <div><strong>Data:</strong> ${escapeHtml(formatDate(col.collected_at, true))}</div>
                <div><strong>Confirmado por:</strong> ${escapeHtml(col.confirmed_by_name || 'Funcionário')}</div>
              </div>
            </div>
          `;
        }
      } catch (colErr) {
        // quiet
      }
    }

    container.innerHTML = `
      <div class="scanned-result-card">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
          <span style="font-size: 0.8rem; font-weight: 700; color: var(--secondary-dark);">
            ✓ ITEM ENCONTRADO #${item.id}
          </span>
          ${getStatusBadge(item.status)}
        </div>

        <div class="admin-card-header">
          ${photoMarkup}
          <div class="admin-card-info">
            <h4 class="admin-card-title">${escapeHtml(item.name || 'Item sem nome')}</h4>
            <div class="admin-card-sub">📍 ${escapeHtml(item.location_found || 'Local não informado')}</div>
            <div class="admin-card-sub">📅 ${escapeHtml(formatDate(item.found_at || item.created_at, true))}</div>
            <div class="admin-card-sub">👤 Encontrado por: ${escapeHtml(item.found_by_name || 'Usuário')}</div>
          </div>
        </div>

        ${item.description ? `
          <div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 8px; line-height: 1.4;">
            ${escapeHtml(item.description)}
          </div>
        ` : ''}

        ${collectionHtml}

        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 14px;">
          ${canClaim ? `
            <button type="button" class="btn btn-secondary btn-block" onclick="claimScannedItem(${item.id})">
              <span>✋ Este item é meu</span>
            </button>
          ` : ''}

          <a href="item-detail.html?id=${item.id}" class="btn btn-primary btn-block">
            <span>Ver Detalhes Completos</span>
          </a>

          <button type="button" class="btn btn-outline btn-block" onclick="resumeScanner()">
            <span>📷 Escanear Outro Código</span>
          </button>
        </div>
      </div>
    `;

    container.scrollIntoView({ behavior: 'smooth' });

  } catch (err) {
    container.innerHTML = `
      <div class="scanned-result-card" style="border-color: var(--danger);">
        <h4 style="color: var(--danger); font-size: 1rem; margin-bottom: 6px;">Item não localizado</h4>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 12px;">
          ${escapeHtml(err.message || 'Nenhum item foi encontrado com o código fornecido.')}
        </p>
        <button type="button" class="btn btn-outline btn-block btn-sm" onclick="resumeScanner()">
          Tentar Novamente
        </button>
      </div>
    `;
  }
}

/**
 * Handle quick claim from scan result
 */
function claimScannedItem(itemId) {
  showModal({
    title: 'Confirmar Reivindicação',
    message: 'Deseja solicitar a reivindicação deste item escaneado? Os funcionários farão a verificação de posse.',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    onConfirm: async () => {
      try {
        await apiRequest('/api/claims', {
          method: 'POST',
          body: { item_id: Number(itemId) }
        });
        showToast('Solicitação de reivindicação enviada!', 'success');
        fetchAndDisplayScannedItem(itemId);
      } catch (err) {
        showToast(err.message || 'Erro ao reivindicar item.', 'error');
      }
    }
  });
}
