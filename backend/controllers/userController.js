const pool = require('../config/database');

/**
 * Obtém as informações do perfil do usuário atualmente autenticado.
 * Rota: GET /api/users/me
 */
const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id;

    const [users] = await pool.query(
      'SELECT id, name, email, role, department, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        error: 'Usuário não encontrado.'
      });
    }

    return res.json(users[0]);
  } catch (error) {
    console.error('Erro ao buscar dados do usuário atual:', error);
    return res.status(500).json({
      error: 'Erro interno ao consultar perfil do usuário.'
    });
  }
};

/**
 * Retorna todos os itens encontrados e cadastrados pelo usuário autenticado.
 * Rota: GET /api/users/me/items
 */
const getMyItems = async (req, res) => {
  try {
    const userId = req.user.id;

    const query = `
      SELECT 
        i.id,
        i.name,
        i.description,
        i.category_id,
        c.name AS category_name,
        c.icon AS category_icon,
        i.location_found,
        i.photo_url,
        i.qr_code_data,
        i.status,
        i.found_at,
        i.approved_at,
        i.created_at
      FROM items i
      LEFT JOIN categories c ON i.category_id = c.id
      WHERE i.found_by_user_id = ?
      ORDER BY i.created_at DESC
    `;

    const [items] = await pool.query(query, [userId]);
    return res.json(items);
  } catch (error) {
    console.error('Erro ao buscar itens do usuário:', error);
    return res.status(500).json({
      error: 'Erro interno ao buscar seus itens.'
    });
  }
};

/**
 * Retorna todas as reivindicações feitas pelo usuário autenticado.
 * Rota: GET /api/users/me/claims
 */
const getMyClaims = async (req, res) => {
  try {
    const userId = req.user.id;

    const query = `
      SELECT 
        c.id,
        c.item_id,
        c.status,
        c.claimed_at,
        c.approved_at,
        i.name AS item_name,
        i.description AS item_description,
        i.location_found,
        i.photo_url,
        i.status AS item_status,
        cat.name AS category_name,
        cat.icon AS category_icon
      FROM claims c
      JOIN items i ON c.item_id = i.id
      LEFT JOIN categories cat ON i.category_id = cat.id
      WHERE c.claimed_by_user_id = ?
      ORDER BY c.claimed_at DESC
    `;

    const [claims] = await pool.query(query, [userId]);
    return res.json(claims);
  } catch (error) {
    console.error('Erro ao buscar reivindicações do usuário:', error);
    return res.status(500).json({
      error: 'Erro interno ao buscar suas reivindicações.'
    });
  }
};

/**
 * Retorna estatísticas de publicações e devoluções de um usuário específico.
 * Rota: GET /api/users/:id/stats
 * Retorna: { published: count, returned: count }
 */
const getUserStats = async (req, res) => {
  try {
    const userId = req.params.id;

    // Total de itens encontrados e cadastrados pelo usuário
    const [publishedResult] = await pool.query(
      'SELECT COUNT(*) AS count FROM items WHERE found_by_user_id = ?',
      [userId]
    );
    const publishedCount = Number(publishedResult[0]?.count || 0);

    // Total de itens encontrados por este usuário que já foram devolvidos ao dono (status 'collected')
    const [returnedResult] = await pool.query(
      'SELECT COUNT(*) AS count FROM items WHERE found_by_user_id = ? AND status = "collected"',
      [userId]
    );
    const returnedCount = Number(returnedResult[0]?.count || 0);

    return res.json({
      published: publishedCount,
      returned: returnedCount
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas do usuário:', error);
    return res.status(500).json({
      error: 'Erro interno ao processar estatísticas do usuário.'
    });
  }
};

module.exports = {
  getCurrentUser,
  getMyItems,
  getMyClaims,
  getUserStats
};
