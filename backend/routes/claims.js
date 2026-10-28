const express = require('express');
const router = express.Router();
const claimController = require('../controllers/claimController');
const { authenticate, requireEmployee } = require('../middleware/auth');

// Solicitar reivindicação de um item (usuário comum autenticado)
router.post('/', authenticate, claimController.createClaim);

// Listar reivindicações (apenas funcionários)
router.get('/', authenticate, requireEmployee, claimController.getClaims);

// Aprovar reivindicação e registrar retirada (apenas funcionários)
router.put('/:id/approve', authenticate, requireEmployee, claimController.approveClaim);

// Rejeitar reivindicação (apenas funcionários)
router.put('/:id/reject', authenticate, requireEmployee, claimController.rejectClaim);

module.exports = router;
