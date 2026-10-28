import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email || !password) {
      setErrorMessage('Por favor, informe seu e-mail e senha.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await login(email, password);
      showToast(`Bem-vindo de volta, ${res.user?.name || 'usuário'}!`, 'success');
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err.message || 'Falha ao autenticar. Verifique suas credenciais.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFillDemo = (type) => {
    if (type === 'admin') {
      setEmail('admin@unice.br');
      setPassword('admin123');
    } else {
      setEmail('aluno@unice.br');
      setPassword('aluno123');
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        {/* Brand Header */}
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
          <h1 className="auth-title">UniceFinder Desktop</h1>
          <p className="auth-subtitle">
            Sistema Integrado de Gestão de Achados e Perdidos
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
            <label htmlFor="email">E-mail Institucional</label>
            <div className="input-with-icon">
              <span className="input-icon">✉️</span>
              <input
                id="email"
                type="email"
                placeholder="seu.email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                autoFocus
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Senha de Acesso</label>
            <div className="input-with-icon">
              <span className="input-icon">🔒</span>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={submitting}
          >
            {submitting ? (
              <span className="btn-loading">
                <span className="spinner-small"></span> Entrando...
              </span>
            ) : (
              'Acessar Sistema'
            )}
          </button>
        </form>

        <div className="auth-footer-links">
          <p>
            Não possui uma conta?{' '}
            <Link to="/register" className="auth-link">
              Cadastre-se aqui
            </Link>
          </p>
        </div>

        {/* Quick Demo Assist */}
        <div className="demo-credentials-box">
          <span className="demo-title">Atalhos para testes rápidos:</span>
          <div className="demo-buttons">
            <button
              type="button"
              className="demo-btn"
              onClick={() => handleFillDemo('admin')}
            >
              🛡️ Demo Funcionário
            </button>
            <button
              type="button"
              className="demo-btn"
              onClick={() => handleFillDemo('user')}
            >
              👤 Demo Aluno/Usuário
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
