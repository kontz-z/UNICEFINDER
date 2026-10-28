const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, requireEmployee } = require('../middleware/auth');

/**
 * GET /api/logs
 * Retorna os logs de auditoria do sistema.
 * Requer autenticação de funcionário.
 * Query params: action, user_id, entity_type, limit, offset, date_from, date_to
 */
router.get('/', authenticate, requireEmployee, async (req, res) => {
  try {
    const { action, user_id, entity_type, limit = 100, offset = 0, date_from, date_to } = req.query;

    let query = `
      SELECT 
        al.id,
        al.user_id,
        al.user_name,
        al.user_email,
        al.action,
        al.entity_type,
        al.entity_id,
        al.details,
        al.ip_address,
        al.created_at
      FROM audit_logs al
      WHERE 1=1
    `;
    const params = [];

    if (action) {
      query += ' AND al.action = ?';
      params.push(action);
    }

    if (user_id) {
      query += ' AND al.user_id = ?';
      params.push(user_id);
    }

    if (entity_type) {
      query += ' AND al.entity_type = ?';
      params.push(entity_type);
    }

    if (date_from) {
      query += ' AND al.created_at >= ?';
      params.push(date_from);
    }

    if (date_to) {
      query += ' AND al.created_at <= ?';
      params.push(date_to);
    }

    // Count total
    const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) AS total FROM');
    const [countResult] = await pool.query(countQuery, params);
    const total = countResult[0]?.total || 0;

    query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [logs] = await pool.query(query, params);

    return res.json({
      total,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      logs
    });
  } catch (error) {
    console.error('Erro ao buscar logs de auditoria:', error);
    return res.status(500).json({
      error: 'Erro interno ao consultar logs de auditoria.'
    });
  }
});

/**
 * GET /api/logs/actions
 * Retorna lista de tipos de ações disponíveis para filtro.
 */
router.get('/actions', authenticate, requireEmployee, async (req, res) => {
  try {
    const [actions] = await pool.query(
      'SELECT DISTINCT action FROM audit_logs ORDER BY action ASC'
    );
    return res.json(actions.map(a => a.action));
  } catch (error) {
    console.error('Erro ao buscar tipos de ações:', error);
    return res.status(500).json({ error: 'Erro interno.' });
  }
});

module.exports = router;
