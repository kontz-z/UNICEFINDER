const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { logFromRequest } = require('../utils/auditLog');

// Rotas públicas de autenticação
router.post('/register', authController.register);
router.post('/login', authController.login);

// Rota de logout (registra no log)
router.post('/logout', authenticate, async (req, res) => {
  try {
    await logFromRequest(req, 'LOGOUT', 'user', req.user.id,
      `Usuário ${req.user.name || req.user.email} realizou logout`);
    return res.json({ message: 'Logout registrado com sucesso.' });
  } catch (err) {
    return res.json({ message: 'Logout registrado.' });
  }
});

module.exports = router;
