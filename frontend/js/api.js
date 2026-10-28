/**
 * UNICEFINDER - API Utility & Common Helpers
 */

const API_BASE = '';

/**
 * Get JWT token from localStorage
 */
function getToken() {
  return localStorage.getItem('token');
}

/**
 * Get logged-in user object from localStorage
 */
function getUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('Erro ao ler usuário do localStorage', err);
    return null;
  }
}

/**
 * Save auth token and user in localStorage
 */
function setAuth(token, user) {
  if (token) localStorage.setItem('token', token);
  if (user) localStorage.setItem('user', JSON.stringify(user));
}

/**
 * Clear authentication from localStorage
 */
function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

/**
 * Check if a user is logged in
 */
function isLoggedIn() {
  return !!getToken();
}

/**
 * Check if the logged-in user has an employee or admin role
 */
function isEmployee() {
  const user = getUser();
  if (!user) return false;
  const role = (user.role || '').toLowerCase();
  return role === 'employee' || role === 'admin' || role === 'funcionario' || !!user.is_employee;
}

/**
 * Redirect user if not authenticated (or if not employee when required)
 */
function checkAuth(requireEmployee = false) {
  if (!isLoggedIn()) {
    window.location.href = 'index.html';
    return false;
  }

  if (requireEmployee && !isEmployee()) {
    showToast('Acesso restrito a funcionários do sistema.', 'error');
    setTimeout(() => {
      window.location.href = 'home.html';
    }, 1200);
    return false;
  }

  return true;
}

/**
 * API fetch wrapper with automatic JWT and JSON handling
 */
async function apiRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const headers = options.headers ? { ...options.headers } : {};

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const isFormData = options.body instanceof FormData;
  if (!isFormData && options.body && typeof options.body === 'object') {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    if (response.status === 401) {
      clearAuth();
      const currentPath = window.location.pathname;
      if (!currentPath.endsWith('index.html') && !currentPath.endsWith('register.html') && currentPath !== '/') {
        window.location.href = 'index.html';
      }
      throw new Error('Sessão expirada. Por favor, faça login novamente.');
    }

    // Handle responses that might be empty or blob
    const contentType = response.headers.get('content-type') || '';
    let data;
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      let errMsg = 'Erro na requisição';
      if (typeof data === 'object' && data !== null) {
        errMsg = data.error || data.message || errMsg;
      } else if (typeof data === 'string' && data.length > 0) {
        errMsg = data;
      }
      throw new Error(errMsg);
    }

    return data;
  } catch (err) {
    console.error(`Erro em apiRequest [${endpoint}]:`, err);
    throw err;
  }
}

/**
 * Display a toast notification
 */
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconMap = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  const icon = iconMap[type] || 'ℹ';
  toast.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3500);
}

/**
 * Convert date string to Portuguese relative time ("há 2 horas", "ontem", etc.)
 */
function timeAgo(dateString) {
  if (!dateString) return 'Data desconhecida';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) {
    return 'agora mesmo';
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return minutes === 1 ? 'há 1 minuto' : `há ${minutes} minutos`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return hours === 1 ? 'há 1 hora' : `há ${hours} horas`;
  }

  const days = Math.floor(hours / 24);
  if (days === 1) {
    const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `ontem às ${timeStr}`;
  }
  if (days < 7) {
    return `há ${days} dias`;
  }

  const weeks = Math.floor(days / 7);
  if (weeks < 4) {
    return weeks === 1 ? 'há 1 semana' : `há ${weeks} semanas`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return months === 1 ? 'há 1 mês' : `há ${months} meses`;
  }

  const years = Math.floor(days / 365);
  return years === 1 ? 'há 1 ano' : `há ${years} anos`;
}

/**
 * Format date string into DD/MM/YYYY or DD/MM/YYYY às HH:mm
 */
function formatDate(dateString, includeTime = false) {
  if (!dateString) return 'Não informada';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  if (includeTime) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} às ${hours}:${minutes}`;
  }

  return `${day}/${month}/${year}`;
}

/**
 * Extract up to 2 initials from a user's full name
 */
function getInitials(name) {
  if (!name || typeof name !== 'string') return 'UF';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'UF';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Format photo URL or return standard placeholder
 */
function formatPhotoUrl(photoUrl) {
  if (!photoUrl) return null;
  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://') || photoUrl.startsWith('data:')) {
    return photoUrl;
  }
  if (photoUrl.startsWith('/')) {
    return photoUrl;
  }
  return `/${photoUrl}`;
}

/**
 * Get status label and CSS badge HTML
 */
function getStatusBadge(status) {
  const map = {
    pending_approval: { label: 'Aguardando aprovação', class: 'badge-pending' },
    approved: { label: 'Aguardando resposta', class: 'badge-approved' },
    claimed: { label: 'Reivindicado', class: 'badge-claimed' },
    collected: { label: 'Devolvido', class: 'badge-collected' },
    archived: { label: 'Arquivado', class: 'badge-archived' }
  };

  const item = map[status] || { label: status || 'Desconhecido', class: 'badge-archived' };
  return `<span class="badge ${item.class}">${item.label}</span>`;
}

/**
 * Render standard Bottom Navigation bar on pages
 */
function setupBottomNav(activePage = 'home') {
  const container = document.getElementById('bottomNav');
  if (!container) return;

  const isEmp = isEmployee();

  container.innerHTML = `
    <nav class="bottom-nav">
      <a href="home.html" class="nav-link-item ${activePage === 'home' ? 'active' : ''}">
        <span class="nav-icon">🏠</span>
        <span class="nav-label">Início</span>
      </a>
      <a href="scan.html" class="nav-link-item ${activePage === 'scan' ? 'active' : ''}">
        <span class="nav-icon">📷</span>
        <span class="nav-label">Escanear</span>
      </a>
      ${isEmp ? `
      <a href="admin.html" class="nav-link-item ${activePage === 'admin' ? 'active' : ''}">
        <span class="nav-icon">🛡️</span>
        <span class="nav-label">Painel</span>
      </a>
      ` : ''}
      <a href="profile.html" class="nav-link-item ${activePage === 'profile' ? 'active' : ''}">
        <span class="nav-icon">👤</span>
        <span class="nav-label">Perfil</span>
      </a>
    </nav>
  `;
}

/**
 * Universal confirmation modal helper
 */
function showModal({ title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', isDanger = false, onConfirm }) {
  let modalEl = document.getElementById('globalModal');
  if (!modalEl) {
    modalEl = document.createElement('div');
    modalEl.id = 'globalModal';
    modalEl.className = 'modal-backdrop';
    document.body.appendChild(modalEl);
  }

  modalEl.innerHTML = `
    <div class="modal-card">
      <div class="modal-icon ${isDanger ? 'danger' : ''}">
        ${isDanger ? '⚠' : '✨'}
      </div>
      <h3 class="modal-title">${escapeHtml(title)}</h3>
      <p class="modal-message">${escapeHtml(message)}</p>
      <div class="modal-actions">
        <button type="button" class="btn btn-outline" id="modalCancelBtn">${escapeHtml(cancelText)}</button>
        <button type="button" class="btn ${isDanger ? 'btn-danger' : 'btn-primary'}" id="modalConfirmBtn">${escapeHtml(confirmText)}</button>
      </div>
    </div>
  `;

  modalEl.classList.add('active');

  const close = () => {
    modalEl.classList.remove('active');
  };

  document.getElementById('modalCancelBtn').onclick = close;
  modalEl.onclick = (e) => {
    if (e.target === modalEl) close();
  };

  document.getElementById('modalConfirmBtn').onclick = async () => {
    close();
    if (typeof onConfirm === 'function') {
      try {
        await onConfirm();
      } catch (err) {
        console.error('Erro no callback onConfirm do modal:', err);
      }
    }
  };
}

/**
 * Simple HTML sanitizer
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
