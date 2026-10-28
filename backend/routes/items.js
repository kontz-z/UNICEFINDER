const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');
const { authenticate, requireEmployee } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Rotas específicas (devem ser declaradas antes de rotas com parâmetros como :id)
router.get('/', itemController.getAllItems);
router.get('/stats', itemController.getItemStats);
router.get('/categories', itemController.getCategories);

// Cadastro de novo item com upload opcional de foto (requer autenticação)
router.post('/', authenticate, upload.single('photo'), itemController.createItem);

// Rotas por ID
router.get('/:id', itemController.getItemById);
router.get('/:id/qrcode', itemController.getItemQrCode);
router.get('/:id/collection', itemController.getItemCollection);

// Ações restritas a funcionários
router.put('/:id/approve', authenticate, requireEmployee, itemController.approveItem);
router.put('/:id/reject', authenticate, requireEmployee, itemController.rejectItem);

module.exports = router;
