const pool = require('../config/database');
const QRCode = require('qrcode');
const { logFromRequest } = require('../utils/auditLog');

/**
 * Lista todos os itens com filtros opcionais.
 * Rota: GET /api/items
 * Query params: status, category_id, search
 */
const getAllItems = async (req, res) => {
  try {
    const { status, category_id, search } = req.query;

    let query = `
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
        i.found_by_user_id,
        u_finder.name AS found_by_name,
        u_finder.email AS found_by_email,
        i.approved_by_user_id,
        u_approver.name AS approved_by_name,
        i.found_at,
        i.approved_at,
        i.created_at
      FROM items i
      LEFT JOIN categories c ON i.category_id = c.id
      JOIN users u_finder ON i.found_by_user_id = u_finder.id
      LEFT JOIN users u_approver ON i.approved_by_user_id = u_approver.id
      WHERE 1=1
    `;

    const params = [];

    if (status) {
      query += ' AND i.status = ?';
      params.push(status);
    }

    if (category_id) {
      query += ' AND i.category_id = ?';
      params.push(category_id);
    }

    if (search && search.trim() !== '') {
      query += ' AND (i.name LIKE ? OR i.description LIKE ? OR i.location_found LIKE ?)';
      const searchTerm = `%${search.trim()}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY i.created_at DESC';

    const [items] = await pool.query(query, params);
    return res.json(items);
  } catch (error) {
    console.error('Erro ao buscar itens:', error);
    return res.status(500).json({
      error: 'Erro interno ao consultar itens.'
    });
  }
};

/**
 * Retorna estatísticas gerais do sistema de achados e perdidos.
 * Rota: GET /api/items/stats
 * Retorna: { items_today: count, total_returns: count, resolved_percent: number }
 */
const getItemStats = async (req, res) => {
  try {
    // 1. Itens cadastrados hoje
    const [todayResult] = await pool.query(`
      SELECT COUNT(*) AS count 
      FROM items 
      WHERE DATE(created_at) = CURDATE()
    `);
    const itemsToday = Number(todayResult[0]?.count || 0);

    // 2. Total de devoluções (itens recolhidos com sucesso)
    const [returnsResult] = await pool.query(`
      SELECT COUNT(*) AS count 
      FROM items 
      WHERE status = 'collected'
    `);
    const totalReturns = Number(returnsResult[0]?.count || 0);

    // 3. Total de itens cadastrados (excluindo arquivados)
    const [totalItemsResult] = await pool.query(`
      SELECT COUNT(*) AS count 
      FROM items
    `);
    const totalItems = Number(totalItemsResult[0]?.count || 0);

    // Cálculo da porcentagem resolvida
    const resolvedPercent = totalItems > 0 
      ? Math.round((totalReturns / totalItems) * 100) 
      : 0;

    return res.json({
      items_today: itemsToday,
      total_returns: totalReturns,
      resolved_percent: resolvedPercent
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas de itens:', error);
    return res.status(500).json({
      error: 'Erro interno ao processar estatísticas.'
    });
  }
};

/**
 * Lista todas as categorias cadastradas.
 * Rota: GET /api/items/categories
 */
const getCategories = async (req, res) => {
  try {
    const [categories] = await pool.query('SELECT * FROM categories ORDER BY name ASC');
    return res.json(categories);
  } catch (error) {
    console.error('Erro ao obter categorias:', error);
    return res.status(500).json({
      error: 'Erro interno ao buscar categorias.'
    });
  }
};

/**
 * Obtém detalhes completos de um item específico por ID.
 * Rota: GET /api/items/:id
 */
const getItemById = async (req, res) => {
  try {
    const { id } = req.params;

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
        i.found_by_user_id,
        u_finder.name AS found_by_name,
        u_finder.email AS found_by_email,
        u_finder.department AS found_by_department,
        i.approved_by_user_id,
        u_approver.name AS approved_by_name,
        i.found_at,
        i.approved_at,
        i.created_at
      FROM items i
      LEFT JOIN categories c ON i.category_id = c.id
      JOIN users u_finder ON i.found_by_user_id = u_finder.id
      LEFT JOIN users u_approver ON i.approved_by_user_id = u_approver.id
      WHERE i.id = ?
    `;

    const [items] = await pool.query(query, [id]);

    if (items.length === 0) {
      return res.status(404).json({
        error: 'Item não encontrado.'
      });
    }

    return res.json(items[0]);
  } catch (error) {
    console.error('Erro ao buscar item por ID:', error);
    return res.status(500).json({
      error: 'Erro interno ao consultar item.'
    });
  }
};

/**
 * Cadastra um novo item encontrado.
 * Requer autenticação.
 * Rota: POST /api/items
 * Body: multipart/form-data (name, description, category_id, location_found, found_at, photo)
 */
const createItem = async (req, res) => {
  try {
    const { name, description, category_id, location_found, found_at } = req.body;

    if (!name || !location_found) {
      return res.status(400).json({
        error: 'Nome do item e local onde foi encontrado são obrigatórios.'
      });
    }

    // Salva o caminho relativo da foto se houver upload
    const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const foundByUserId = req.user.id;
    const status = 'pending_approval';
    const parsedCategoryId = category_id ? parseInt(category_id, 10) : null;
    const itemFoundAt = found_at ? new Date(found_at) : new Date();

    const [result] = await pool.query(
      `INSERT INTO items 
        (name, description, category_id, location_found, photo_url, status, found_by_user_id, found_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        description ? description.trim() : null,
        parsedCategoryId,
        location_found.trim(),
        photoUrl,
        status,
        foundByUserId,
        itemFoundAt
      ]
    );

    const newItemId = result.insertId;

    // Busca o item recém-criado com joins
    const [newItems] = await pool.query(
      `SELECT i.*, c.name AS category_name, c.icon AS category_icon 
       FROM items i 
       LEFT JOIN categories c ON i.category_id = c.id 
       WHERE i.id = ?`,
      [newItemId]
    );

    // Log de auditoria: cadastro de item
    await logFromRequest(req, 'CREATE_ITEM', 'item', newItemId,
      `Item "${name.trim()}" cadastrado - Local: ${location_found.trim()} - Categoria: ${parsedCategoryId || 'N/A'}`);

    return res.status(201).json({
      message: 'Item cadastrado com sucesso e enviado para aprovação.',
      item: newItems[0]
    });
  } catch (error) {
    console.error('Erro ao cadastrar item:', error);
    return res.status(500).json({
      error: 'Erro interno ao cadastrar item.'
    });
  }
};

/**
 * Aprova um item pendente.
 * Requer autenticação de funcionário.
 * Rota: PUT /api/items/:id/approve
 */
const approveItem = async (req, res) => {
  try {
    const { id } = req.params;
    const employeeId = req.user.id;

    // Verifica se o item existe
    const [existing] = await pool.query('SELECT * FROM items WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        error: 'Item não encontrado.'
      });
    }

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const qrCodeData = `${baseUrl}/item-detail.html?id=${id}`;

    await pool.query(
      `UPDATE items 
       SET status = 'approved', 
           approved_by_user_id = ?, 
           approved_at = NOW(), 
           qr_code_data = ? 
       WHERE id = ?`,
      [employeeId, qrCodeData, id]
    );

    // Retorna dados atualizados
    const [updatedItems] = await pool.query(
      `SELECT i.*, c.name AS category_name, c.icon AS category_icon, u.name AS approved_by_name 
       FROM items i 
       LEFT JOIN categories c ON i.category_id = c.id 
       LEFT JOIN users u ON i.approved_by_user_id = u.id 
       WHERE i.id = ?`,
      [id]
    );

    // Log de auditoria: aprovação de item
    await logFromRequest(req, 'APPROVE_ITEM', 'item', parseInt(id),
      `Item #${id} "${existing[0].name}" aprovado e publicado no feed`);

    return res.json({
      message: 'Item aprovado com sucesso.',
      item: updatedItems[0]
    });
  } catch (error) {
    console.error('Erro ao aprovar item:', error);
    return res.status(500).json({
      error: 'Erro interno ao aprovar item.'
    });
  }
};

/**
 * Rejeita/arquiva um item.
 * Requer autenticação de funcionário.
 * Rota: PUT /api/items/:id/reject
 */
const rejectItem = async (req, res) => {
  try {
    const { id } = req.params;

    // Verifica se o item existe
    const [existing] = await pool.query('SELECT * FROM items WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        error: 'Item não encontrado.'
      });
    }

    await pool.query(
      `UPDATE items SET status = 'archived' WHERE id = ?`,
      [id]
    );

    const [updatedItems] = await pool.query('SELECT * FROM items WHERE id = ?', [id]);

    // Log de auditoria: rejeição de item
    await logFromRequest(req, 'REJECT_ITEM', 'item', parseInt(id),
      `Item #${id} "${existing[0].name}" rejeitado e arquivado`);

    return res.json({
      message: 'Item rejeitado e arquivado com sucesso.',
      item: updatedItems[0]
    });
  } catch (error) {
    console.error('Erro ao rejeitar item:', error);
    return res.status(500).json({
      error: 'Erro interno ao rejeitar item.'
    });
  }
};

/**
 * Gera e retorna a imagem PNG do QR Code correspondente ao item.
 * Rota: GET /api/items/:id/qrcode
 */
const getItemQrCode = async (req, res) => {
  try {
    const { id } = req.params;

    // Busca o item no banco
    const [items] = await pool.query('SELECT id, name, qr_code_data FROM items WHERE id = ?', [id]);
    if (items.length === 0) {
      return res.status(404).json({
        error: 'Item não encontrado.'
      });
    }

    const item = items[0];
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const targetUrl = item.qr_code_data || `${baseUrl}/item-detail.html?id=${item.id}`;

    // Gera o buffer PNG do QRCode
    const qrBuffer = await QRCode.toBuffer(targetUrl, {
      type: 'png',
      width: 320,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="qrcode-item-${id}.png"`);
    return res.send(qrBuffer);
  } catch (error) {
    console.error('Erro ao gerar QR Code do item:', error);
    return res.status(500).json({
      error: 'Erro interno ao gerar QR Code.'
    });
  }
};

/**
 * Retorna os dados de retirada/coleta de um item caso já tenha sido entregue.
 * Rota: GET /api/items/:id/collection
 */
const getItemCollection = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        col.id,
        col.item_id,
        col.claim_id,
        col.collected_at,
        col.notes,
        u_collector.id AS collected_by_user_id,
        u_collector.name AS collected_by_name,
        u_collector.email AS collected_by_email,
        u_collector.department AS collected_by_department,
        u_confirmer.id AS confirmed_by_user_id,
        u_confirmer.name AS confirmed_by_name,
        u_confirmer.email AS confirmed_by_email
      FROM collections col
      JOIN users u_collector ON col.collected_by_user_id = u_collector.id
      JOIN users u_confirmer ON col.confirmed_by_user_id = u_confirmer.id
      WHERE col.item_id = ?
      ORDER BY col.collected_at DESC
      LIMIT 1
    `;

    const [collections] = await pool.query(query, [id]);

    if (collections.length === 0) {
      return res.status(404).json({
        error: 'Registro de retirada não encontrado para este item.'
      });
    }

    return res.json(collections[0]);
  } catch (error) {
    console.error('Erro ao buscar dados de retirada do item:', error);
    return res.status(500).json({
      error: 'Erro interno ao buscar registro de retirada.'
    });
  }
};

module.exports = {
  getAllItems,
  getItemStats,
  getCategories,
  getItemById,
  createItem,
  approveItem,
  rejectItem,
  getItemQrCode,
  getItemCollection
};
