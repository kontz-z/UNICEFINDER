const pool = require('../config/database');
const { logFromRequest } = require('../utils/auditLog');

/**
 * Cria uma nova reivindicação de item perdido.
 * Rota: POST /api/claims
 */
const createClaim = async (req, res) => {
  try {
    const { item_id } = req.body;
    const userId = req.user.id;

    if (!item_id) {
      return res.status(400).json({ error: 'O ID do item (item_id) é obrigatório.' });
    }

    const [items] = await pool.query('SELECT * FROM items WHERE id = ?', [item_id]);
    if (items.length === 0) {
      return res.status(404).json({ error: 'Item não encontrado.' });
    }

    const item = items[0];
    if (item.status !== 'approved') {
      return res.status(400).json({ error: 'Este item não está disponível para reivindicação no momento.' });
    }

    const [existingClaims] = await pool.query(
      'SELECT id FROM claims WHERE item_id = ? AND claimed_by_user_id = ? AND status = "pending"',
      [item_id, userId]
    );
    if (existingClaims.length > 0) {
      return res.status(400).json({ error: 'Você já possui uma solicitação pendente para este item.' });
    }

    const [claimResult] = await pool.query(
      'INSERT INTO claims (item_id, claimed_by_user_id, status) VALUES (?, ?, "pending")',
      [item_id, userId]
    );

    await pool.query('UPDATE items SET status = "claimed" WHERE id = ?', [item_id]);

    const [newClaims] = await pool.query(
      `SELECT c.*, i.name AS item_name FROM claims c JOIN items i ON c.item_id = i.id WHERE c.id = ?`,
      [claimResult.insertId]
    );

    await logFromRequest(req, 'CREATE_CLAIM', 'claim', claimResult.insertId,
      `Reivindicação do item #${item_id} "${item.name}" criada`);

    return res.status(201).json({
      message: 'Reivindicação realizada com sucesso! Aguarde a confirmação de um funcionário.',
      claim: newClaims[0]
    });
  } catch (error) {
    console.error('Erro ao criar reivindicação:', error);
    return res.status(500).json({ error: 'Erro interno ao criar reivindicação.' });
  }
};

/**
 * Lista as reivindicações do sistema.
 * Rota: GET /api/claims
 */
const getClaims = async (req, res) => {
  try {
    const status = req.query.status || 'pending';
    let query = `
      SELECT c.id, c.item_id, c.claimed_by_user_id, c.status, c.approved_by_user_id,
        c.claimed_at, c.approved_at,
        i.name AS item_name, i.description AS item_description, i.location_found,
        i.photo_url, i.status AS item_status,
        u_claimant.name AS claimant_name, u_claimant.email AS claimant_email,
        u_claimant.department AS claimant_department,
        u_approver.name AS approved_by_name
      FROM claims c
      JOIN items i ON c.item_id = i.id
      JOIN users u_claimant ON c.claimed_by_user_id = u_claimant.id
      LEFT JOIN users u_approver ON c.approved_by_user_id = u_approver.id
    `;
    const params = [];
    if (status !== 'all') { query += ' WHERE c.status = ?'; params.push(status); }
    query += ' ORDER BY c.claimed_at DESC';

    const [claims] = await pool.query(query, params);
    return res.json(claims);
  } catch (error) {
    console.error('Erro ao buscar reivindicações:', error);
    return res.status(500).json({ error: 'Erro interno ao consultar reivindicações.' });
  }
};

/**
 * Aprova reivindicação e registra coleta.
 * Rota: PUT /api/claims/:id/approve
 */
const approveClaim = async (req, res) => {
  try {
    const { id } = req.params;
    const employeeId = req.user.id;
    const notes = req.body.notes || 'Retirada realizada e confirmada no balcão.';

    const [claims] = await pool.query('SELECT * FROM claims WHERE id = ?', [id]);
    if (claims.length === 0) {
      return res.status(404).json({ error: 'Reivindicação não encontrada.' });
    }
    const claim = claims[0];
    if (claim.status !== 'pending') {
      return res.status(400).json({ error: `Esta reivindicação não pode ser aprovada (status: ${claim.status}).` });
    }

    const [itemInfo] = await pool.query('SELECT name FROM items WHERE id = ?', [claim.item_id]);
    const [claimantInfo] = await pool.query('SELECT name, email FROM users WHERE id = ?', [claim.claimed_by_user_id]);

    await pool.query(
      `UPDATE claims SET status = 'approved', approved_by_user_id = ?, approved_at = NOW() WHERE id = ?`,
      [employeeId, id]
    );

    const [collectionResult] = await pool.query(
      `INSERT INTO collections (item_id, claim_id, collected_by_user_id, confirmed_by_user_id, collected_at, notes) VALUES (?, ?, ?, ?, NOW(), ?)`,
      [claim.item_id, claim.id, claim.claimed_by_user_id, employeeId, notes]
    );

    await pool.query(`UPDATE items SET status = 'collected' WHERE id = ?`, [claim.item_id]);

    const [collections] = await pool.query(
      `SELECT col.*, u.name AS collected_by_name, emp.name AS confirmed_by_name 
       FROM collections col JOIN users u ON col.collected_by_user_id = u.id
       JOIN users emp ON col.confirmed_by_user_id = emp.id WHERE col.id = ?`,
      [collectionResult.insertId]
    );

    const itemName = itemInfo[0]?.name || `#${claim.item_id}`;
    const claimantName = claimantInfo[0]?.name || 'Desconhecido';
    await logFromRequest(req, 'APPROVE_CLAIM', 'claim', parseInt(id),
      `Reivindicação #${id} aprovada - Item "${itemName}" devolvido para ${claimantName}`);
    await logFromRequest(req, 'COLLECT_ITEM', 'collection', collectionResult.insertId,
      `Coleta registrada - Item "${itemName}" retirado por ${claimantName}`);

    return res.json({ message: 'Reivindicação aprovada e retirada registrada com sucesso.', collection: collections[0] });
  } catch (error) {
    console.error('Erro ao aprovar reivindicação:', error);
    return res.status(500).json({ error: 'Erro interno ao aprovar reivindicação.' });
  }
};

/**
 * Rejeita reivindicação.
 * Rota: PUT /api/claims/:id/reject
 */
const rejectClaim = async (req, res) => {
  try {
    const { id } = req.params;
    const employeeId = req.user.id;

    const [claims] = await pool.query('SELECT * FROM claims WHERE id = ?', [id]);
    if (claims.length === 0) {
      return res.status(404).json({ error: 'Reivindicação não encontrada.' });
    }
    const claim = claims[0];

    const [itemInfo] = await pool.query('SELECT name FROM items WHERE id = ?', [claim.item_id]);
    const [claimantInfo] = await pool.query('SELECT name FROM users WHERE id = ?', [claim.claimed_by_user_id]);

    await pool.query(
      `UPDATE claims SET status = 'rejected', approved_by_user_id = ?, approved_at = NOW() WHERE id = ?`,
      [employeeId, id]
    );
    await pool.query(`UPDATE items SET status = 'approved' WHERE id = ?`, [claim.item_id]);

    await logFromRequest(req, 'REJECT_CLAIM', 'claim', parseInt(id),
      `Reivindicação #${id} rejeitada - Item "${itemInfo[0]?.name || claim.item_id}" - Solicitante: ${claimantInfo[0]?.name || 'Desconhecido'}`);

    return res.json({ message: 'Reivindicação rejeitada com sucesso. O item voltou a ficar disponível.' });
  } catch (error) {
    console.error('Erro ao rejeitar reivindicação:', error);
    return res.status(500).json({ error: 'Erro interno ao rejeitar reivindicação.' });
  }
};

module.exports = { createClaim, getClaims, approveClaim, rejectClaim };
