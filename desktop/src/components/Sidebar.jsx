import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import './Sidebar.css';

export default function Sidebar() {
  const { user, isEmployee, logout } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleLogout = async () => {
    try {
      await logout();
      showToast('Sessão encerrada com sucesso.', 'info');
      navigate('/login');
    } catch (err) {
      console.error(err);
      navigate('/login');
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <aside className="app-sidebar">
      {/* Top Header / Logo */}
      <div className="sidebar-brand">
        <div className="brand-logo-container">
          <img
            src="/assets/logo.jpeg"
            alt="UniceFinder Logo"
            className="brand-logo"
            onError={(e) => {
              e.target.style.display = 'none';
              const fallback = e.target.nextElementSibling;
              if (fallback) fallback.style.display = 'flex';
            }}
          />
          <div className="brand-logo-fallback" style={{ display: 'none' }}>
            <span>UF</span>
          </div>
        </div>
        <div className="brand-text">
          <h1 className="brand-title">UniceFinder</h1>
          <span className="brand-subtitle">Achados & Perdidos</span>
        </div>
      </div>

      {/* Quick Action Button */}
      <div className="sidebar-action-wrap">
        <NavLink to="/new-item" className="btn-new-item-action">
          <span className="action-icon">➕</span>
          <span>Cadastrar Item</span>
        </NavLink>
      </div>

      {/* Navigation Links */}
      <nav className="sidebar-nav">
        <div className="nav-group-title">MENU PRINCIPAL</div>

        <NavLink
          to="/"
          end
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <span className="link-icon">🏠</span>
          <span className="link-label">Dashboard</span>
        </NavLink>

        <NavLink
          to="/my-items"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <span className="link-icon">📦</span>
          <span className="link-label">Meus Itens</span>
        </NavLink>

        <NavLink
          to="/scanner"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <span className="link-icon">📷</span>
          <span className="link-label">Escanear QR</span>
        </NavLink>

        <NavLink
          to="/profile"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <span className="link-icon">👤</span>
          <span className="link-label">Perfil</span>
        </NavLink>

        {/* Employee Only Section */}
        {isEmployee && (
          <>
            <div className="nav-group-title employee-section-title">
              ADMINISTRAÇÃO
            </div>

            <NavLink
              to="/admin"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <span className="link-icon">🛡️</span>
              <span className="link-label">Painel Admin</span>
            </NavLink>

            <NavLink
              to="/logs"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <span className="link-icon">📋</span>
              <span className="link-label">Logs do Sistema</span>
            </NavLink>
          </>
        )}
      </nav>

      {/* User Info & Logout at Bottom */}
      <div className="sidebar-footer">
        <div className="sidebar-user-card">
          <div className="user-avatar-circle">
            {getInitials(user?.name)}
          </div>
          <div className="user-details">
            <span className="user-name" title={user?.name || 'Usuário'}>
              {user?.name || 'Usuário'}
            </span>
            <span className="user-dept" title={user?.department || 'Geral'}>
              {user?.department || 'Departamento'}
            </span>
            <span className={`user-badge ${isEmployee ? 'badge-employee' : 'badge-regular'}`}>
              {isEmployee ? '🛡️ Funcionário' : '👤 Usuário'}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="sidebar-logout-btn"
            title="Encerrar Sessão"
            aria-label="Logout"
          >
            🚪
          </button>
        </div>
      </div>
    </aside>
  );
}
