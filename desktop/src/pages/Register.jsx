import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import './Login.css';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    department: 'Acadêmico / Aluno'
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.name || !formData.email || !formData.password) {
      setErrorMessage('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (formData.password.length < 6) {
      setErrorMessage('A senha deve conter pelo menos 6 caracteres.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('As senhas digitadas não coincidem.');
      return;
    }

    setSubmitting(true);
    try {
      await register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        department: formData.department.trim()
      });
      showToast('Conta criada com sucesso! Seja bem-vindo(a).', 'success');
      navigate('/', { replace: true });
    } catch (err) {
      const msg = err.message || 'Erro ao realizar cadastro. Tente outro e-mail.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card register-card">
        <div className="auth-brand-header">
          <div className="auth-logo-wrapper">
            <img
              src="/assets/logo.jpeg"
              alt="UniceFinder"
              className="auth-logo-img"
              onError={(e) => {
                e.target.style.display = 'none';
                const fb = e.target.nextElementSibling;
                if (fb) fb.style.display = 'flex';
              }}
            />
            <div className="auth-logo-fallback" style={{ display: 'none' }}>
              UF
            </div>
          </div>
          <h1 className="auth-title">Criar Conta</h1>
          <p className="auth-subtitle">
            Cadastre-se para registrar e reivindicar itens no UniceFinder
          </p>
        </div>

        {errorMessage && (
          <div className="auth-alert-error" role="alert">
            <span className="alert-icon">⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="name">Nome Completo *</label>
            <div className="input-with-icon">
              <span className="input-icon">👤</span>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="Ex.: Maria Eduarda Santos"
                value={formData.name}
                onChange={handleChange}
                required
                autoFocus
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">E-mail Institucional *</label>
            <div className="input-with-icon">
              <span className="input-icon">✉️</span>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="seu.nome@unice.br"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="department">Departamento / Curso / Setor</label>
            <div className="input-with-icon">
              <span className="input-icon">🏛️</span>
              <input
                id="department"
                name="department"
                type="text"
                placeholder="Ex.: Engenharia de Software, Bloco B, Biblioteca..."
                value={formData.department}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-row-two-col">
            <div className="form-group">
              <label htmlFor="password">Senha *</label>
              <div className="input-with-icon">
                <span className="input-icon">🔒</span>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirmar Senha *</label>
              <div className="input-with-icon">
                <span className="input-icon">🔑</span>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Repita a senha"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={submitting}
          >
            {submitting ? (
              <span className="btn-loading">
                <span className="spinner-small"></span> Registrando...
              </span>
            ) : (
              'Finalizar Cadastro'
            )}
          </button>
        </form>

        <div className="auth-footer-links">
          <p>
            Já possui uma conta ativa?{' '}
            <Link to="/login" className="auth-link">
              Acesse aqui
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
