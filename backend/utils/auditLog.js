const pool = require('../config/database');

/**
 * Registra uma ação no log de auditoria.
 * 
 * @param {Object} params
 * @param {number|null} params.userId - ID do usuário que realizou a ação
 * @param {string|null} params.userName - Nome do usuário
 * @param {string|null} params.userEmail - Email do usuário
 * @param {string} params.action - Tipo da ação (LOGIN, LOGOUT, CREATE_ITEM, APPROVE_ITEM, etc.)
 * @param {string|null} params.entityType - Tipo da entidade afetada (user, item, claim, collection)
 * @param {number|null} params.entityId - ID da entidade afetada
 * @param {string|null} params.details - Detalhes descritivos da ação
 * @param {string|null} params.ipAddress - Endereço IP do usuário
 */
async function logAction({
  userId = null,
  userName = null,
  userEmail = null,
  action,
  entityType = null,
  entityId = null,
  details = null,
  ipAddress = null
}) {
  try {
    await pool.query(
      `INSERT INTO audit_logs 
        (user_id, user_name, user_email, action, entity_type, entity_id, details, ip_address) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, userName, userEmail, action, entityType, entityId, details, ipAddress]
    );
  } catch (error) {
    // Nunca deixar erro de log interromper o fluxo principal
    console.error('[AuditLog] Erro ao registrar log:', error.message);
  }
}

/**
 * Helper para extrair IP do request
 */
function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() 
    || req.connection?.remoteAddress 
    || req.socket?.remoteAddress 
    || req.ip 
    || 'desconhecido';
}

/**
 * Helper para criar log a partir do req (quando o usuário está autenticado)
 */
async function logFromRequest(req, action, entityType = null, entityId = null, details = null) {
  const user = req.user || {};
  await logAction({
    userId: user.id || null,
    userName: user.name || null,
    userEmail: user.email || null,
    action,
    entityType,
    entityId,
    details,
    ipAddress: getClientIp(req)
  });
}

module.exports = { logAction, logFromRequest, getClientIp };
