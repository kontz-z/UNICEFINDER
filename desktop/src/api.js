/**
 * UNICEFINDER Desktop - API Utility & Storage Helpers
 */

export const TOKEN_KEY = 'token';
export const USER_KEY = 'user';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('Erro ao ler usuário do localStorage', err);
    return null;
  }
}

export function setAuth(token, user) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isLoggedIn() {
  return !!getToken();
}

export function isEmployeeUser(user) {
  if (!user) return false;
  const role = (user.role || '').toLowerCase();
  return role === 'employee' || role === 'admin' || role === 'funcionario' || !!user.is_employee;
}

export function isEmployee() {
  return isEmployeeUser(getUser());
}

/**
 * Wrapper universal para chamadas à API com token JWT automático
 */
export async function apiRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : endpoint;
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
      // Não redirecionamos agressivamente aqui para dar controle ao AuthContext
      throw new Error('Sessão expirada. Por favor, faça login novamente.');
    }

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

// ==================== AUTH ====================

export async function login(email, password) {
  const data = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: { email, password }
  });
  if (data.token && data.user) {
    setAuth(data.token, data.user);
  }
  return data;
}

export async function register(userData) {
  const data = await apiRequest('/api/auth/register', {
    method: 'POST',
    body: userData
  });
  if (data.token && data.user) {
    setAuth(data.token, data.user);
  }
  return data;
}

export async function logout() {
  try {
    await apiRequest('/api/auth/logout', { method: 'POST' });
  } catch (err) {
    console.warn('Logout silencioso no backend:', err);
  } finally {
    clearAuth();
  }
}

// ==================== USUÁRIOS ====================

export async function getCurrentUser() {
  const user = await apiRequest('/api/users/me');
  if (user) {
    const currentToken = getToken();
    setAuth(currentToken, user);
  }
  return user;
}

export async function getMyItems() {
  return await apiRequest('/api/users/me/items');
}

export async function getMyClaims() {
  return await apiRequest('/api/users/me/claims');
}

export async function getUserStats(id) {
  return await apiRequest(`/api/users/${id}/stats`);
}

// ==================== ITENS ====================

export async function getItems({ status = '', category_id = '', search = '' } = {}) {
  const params = new URLSearchParams();
  if (status && status !== 'all') params.append('status', status);
  if (category_id && category_id !== 'all') params.append('category_id', category_id);
  if (search && search.trim()) params.append('search', search.trim());

  const query = params.toString() ? `?${params.toString()}` : '';
  return await apiRequest(`/api/items${query}`);
}

export async function getItemStats() {
  return await apiRequest('/api/items/stats');
}

export async function getCategories() {
  return await apiRequest('/api/items/categories');
}

export async function getItemById(id) {
  return await apiRequest(`/api/items/${id}`);
}

export async function createItem(formData) {
  return await apiRequest('/api/items', {
    method: 'POST',
    body: formData
  });
}

export async function approveItem(id) {
  return await apiRequest(`/api/items/${id}/approve`, {
    method: 'PUT'
  });
}

export async function rejectItem(id) {
  return await apiRequest(`/api/items/${id}/reject`, {
    method: 'PUT'
  });
}

export function getItemQrCodeUrl(id) {
  return `/api/items/${id}/qrcode?t=${Date.now()}`;
}

export async function getItemCollection(id) {
  return await apiRequest(`/api/items/${id}/collection`);
}

// ==================== REIVINDICAÇÕES (CLAIMS) ====================

export async function createClaim(itemId) {
  return await apiRequest('/api/claims', {
    method: 'POST',
    body: { item_id: itemId }
  });
}

export async function getClaims(status = 'all') {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return await apiRequest(`/api/claims${query}`);
}

export async function approveClaim(id, notes = '') {
  return await apiRequest(`/api/claims/${id}/approve`, {
    method: 'PUT',
    body: { notes }
  });
}

export async function rejectClaim(id) {
  return await apiRequest(`/api/claims/${id}/reject`, {
    method: 'PUT'
  });
}

// ==================== LOGS ====================

export async function getLogs({ action = '', limit = 50, offset = 0 } = {}) {
  const params = new URLSearchParams();
  if (action && action !== 'all') params.append('action', action);
  params.append('limit', limit);
  params.append('offset', offset);

  return await apiRequest(`/api/logs?${params.toString()}`);
}

export async function getLogActions() {
  return await apiRequest('/api/logs/actions');
}
