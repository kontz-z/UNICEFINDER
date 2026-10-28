const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { logAction, getClientIp } = require('../utils/auditLog');

/**
 * Registra um novo usuário comum no sistema.
 * Rota: POST /api/auth/register
 */
const register = async (req, res) => {
  try {
    const { name, email, password, department } = req.body;

    // Validação de campos obrigatórios
    if (!name || !email || !password) {
      return res.status(400).json({
        error: 'Nome, e-mail e senha são obrigatórios.'
      });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    // Validação simples de formato de e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({
        error: 'Formato de e-mail inválido.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'A senha deve ter no mínimo 6 caracteres.'
      });
    }

    // Verifica se já existe usuário com o mesmo e-mail
    const [existingUsers] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [trimmedEmail]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        error: 'Este e-mail já está cadastrado no sistema.'
      });
    }

    // Hash da senha com salt rounds = 10
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const userDepartment = department ? department.trim() : null;
    const userRole = 'user';

    // Insere o novo usuário
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash, role, department) VALUES (?, ?, ?, ?, ?)',
      [trimmedName, trimmedEmail, passwordHash, userRole, userDepartment]
    );

    const userId = result.insertId;

    // Gera o token JWT com expiração de 24 horas
    const secret = process.env.JWT_SECRET || 'unicefinder_secret_key_2024_very_secure';
    const token = jwt.sign(
      { id: userId, email: trimmedEmail, role: userRole },
      secret,
      { expiresIn: '24h' }
    );

    // Log de auditoria: registro de novo usuário
    await logAction({
      userId: userId,
      userName: trimmedName,
      userEmail: trimmedEmail,
      action: 'REGISTER',
      entityType: 'user',
      entityId: userId,
      details: `Novo usuário cadastrado: ${trimmedName} (${trimmedEmail}) - Departamento: ${userDepartment || 'Não informado'}`,
      ipAddress: getClientIp(req)
    });

    return res.status(201).json({
      message: 'Usuário cadastrado com sucesso.',
      token,
      user: {
        id: userId,
        name: trimmedName,
        email: trimmedEmail,
        role: userRole,
        department: userDepartment
      }
    });
  } catch (error) {
    console.error('Erro no registro de usuário:', error);
    return res.status(500).json({
      error: 'Erro interno ao cadastrar o usuário. Tente novamente mais tarde.'
    });
  }
};

/**
 * Autentica um usuário existente (login).
 * Rota: POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validação de entrada
    if (!email || !password) {
      return res.status(400).json({
        error: 'E-mail e senha são obrigatórios.'
      });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Busca usuário pelo e-mail
    const [users] = await pool.query(
      'SELECT id, name, email, password_hash, role, department FROM users WHERE email = ?',
      [trimmedEmail]
    );

    if (users.length === 0) {
      return res.status(401).json({
        error: 'Credenciais inválidas. Verifique seu e-mail e senha.'
      });
    }

    const user = users[0];

    // Verifica a senha informada com o hash salvo
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Credenciais inválidas. Verifique seu e-mail e senha.'
      });
    }

    // Gera token JWT válido por 24 horas
    const secret = process.env.JWT_SECRET || 'unicefinder_secret_key_2024_very_secure';
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      secret,
      { expiresIn: '24h' }
    );

    // Log de auditoria: login
    await logAction({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      action: 'LOGIN',
      entityType: 'user',
      entityId: user.id,
      details: `Usuário ${user.name} (${user.email}) realizou login - Perfil: ${user.role}`,
      ipAddress: getClientIp(req)
    });

    return res.status(200).json({
      message: 'Login realizado com sucesso.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department
      }
    });
  } catch (error) {
    console.error('Erro no login:', error);
    return res.status(500).json({
      error: 'Erro interno ao realizar login. Tente novamente mais tarde.'
    });
  }
};

module.exports = {
  register,
  login
};
