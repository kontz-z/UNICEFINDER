const jwt = require('jsonwebtoken');

/**
 * Middleware para autenticação via JWT Bearer Token.
 * Extrai o token do cabeçalho 'Authorization', valida-o e anexa os dados decodificados em req.user.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];

  if (!authHeader) {
    return res.status(401).json({
      error: 'Token de autenticação não fornecido. Por favor, faça login.'
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      error: 'Formato de token inválido. O formato esperado é: Bearer <token>'
    });
  }

  const token = parts[1];
  const secret = process.env.JWT_SECRET || 'unicefinder_secret_key_2024_very_secure';

  try {
    const decoded = jwt.verify(token, secret);
    // Anexa as informações básicas do usuário na requisição
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Sua sessão expirou. Por favor, faça login novamente.'
      });
    }
    return res.status(401).json({
      error: 'Token inválido ou não autorizado.'
    });
  }
};

/**
 * Middleware para autorização de funcionários.
 * Garante que apenas usuários com a role 'employee' acessem o recurso.
 */
const requireEmployee = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Usuário não autenticado.'
    });
  }

  if (req.user.role !== 'employee') {
    return res.status(403).json({
      error: 'Acesso negado. Apenas funcionários têm permissão para realizar esta operação.'
    });
  }

  next();
};

module.exports = {
  authenticate,
  requireEmployee
};
