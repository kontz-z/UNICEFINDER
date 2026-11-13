
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
    // Calcula a duração da sessão usando o JWT iat
    const tokenIat = req.user.iat;

    // Diagnóstico temporário
    console.log('DEBUG - JWT iat:', tokenIat);
    console.log('DEBUG - req.user:', req.user);

    let sessionDuration = null;

    if (tokenIat) {
      const loginTime = tokenIat * 1000;
      const now = Date.now();
      sessionDuration = now - loginTime;
    }

    await logFromRequest(
      req,
      'LOGOUT',
      'user',
      req.user.id,
      `Usuário ${req.user.name || req.user.email} realizou logout. Duração da sessão: ${formatDuration(sessionDuration)}`
    );

    return res.json({
      message: 'Logout registrado com sucesso.',
      sessionDuration
    });

  } catch (err) {
    console.error('Erro ao registrar logout:', err);
    return res.json({ message: 'Logout registrado.' });
  }
});

function formatDuration(ms) {
  if (ms === null || ms === undefined || ms < 0) {
    return 'desconhecida';
  }

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}min`;
  if (minutes > 0) return `${minutes}min ${seconds}s`;

  return `${seconds}s`;
}

module.exports = router;
