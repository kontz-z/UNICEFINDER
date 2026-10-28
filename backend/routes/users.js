const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');

// Rotas do próprio usuário autenticado
router.get('/me', authenticate, userController.getCurrentUser);
router.get('/me/items', authenticate, userController.getMyItems);
router.get('/me/claims', authenticate, userController.getMyClaims);

// Estatísticas de um usuário específico por ID
router.get('/:id/stats', userController.getUserStats);

module.exports = router;
