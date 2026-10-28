/**
 * UNICEFINDER - Authentication Logic (Login & Register)
 */

document.addEventListener('DOMContentLoaded', () => {
  // If user is already logged in, redirect straight to home
  if (isLoggedIn()) {
    const currentPath = window.location.pathname;
    if (currentPath.endsWith('index.html') || currentPath.endsWith('register.html') || currentPath === '/') {
      window.location.href = 'home.html';
      return;
    }
  }

  // Setup Login Form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  // Setup Register Form
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }

  // "Esqueci minha senha" modal / alert
  const forgotPasswordLink = document.getElementById('forgotPasswordLink');
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', (e) => {
      e.preventDefault();
      showModal({
        title: 'Recuperação de Senha',
        message: 'Para redefinir sua senha institucional do UniceFinder, dirija-se à coordenação ou envie um e-mail para suporte@unice.br com seu documento de identificação.',
        confirmText: 'Entendido',
        cancelText: 'Fechar'
      });
    });
  }
});

/**
 * Handle user login
 */
async function handleLogin(e) {
  e.preventDefault();

  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const submitBtn = document.getElementById('loginBtn');

  const email = emailInput ? emailInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';

  if (!email) {
    showToast('Por favor, informe seu e-mail institucional.', 'warning');
    if (emailInput) emailInput.focus();
    return;
  }

  if (!password) {
    showToast('Por favor, informe sua senha.', 'warning');
    if (passwordInput) passwordInput.focus();
    return;
  }

  if (password.length < 8) {
    showToast('A senha deve conter no mínimo 8 caracteres.', 'warning');
    if (passwordInput) passwordInput.focus();
    return;
  }

  // Button loading state
  const originalBtnText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = `
    <div class="spinner spinner-sm"></div>
    <span>Entrando...</span>
  `;

  try {
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { email, password }
    });

    if (data.token && data.user) {
      setAuth(data.token, data.user);
      showToast(`Bem-vindo, ${data.user.name || 'usuário'}!`, 'success');
      setTimeout(() => {
        window.location.href = 'home.html';
      }, 700);
    } else {
      throw new Error('Resposta de autenticação inválida do servidor.');
    }
  } catch (err) {
    showToast(err.message || 'Falha ao realizar login. Verifique suas credenciais.', 'error');
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;
  }
}

/**
 * Handle user registration
 */
async function handleRegister(e) {
  e.preventDefault();

  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const departmentInput = document.getElementById('department');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const submitBtn = document.getElementById('registerBtn');

  const name = nameInput ? nameInput.value.trim() : '';
  const email = emailInput ? emailInput.value.trim() : '';
  const department = departmentInput ? departmentInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';
  const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : '';

  // Validation
  if (!name) {
    showToast('Por favor, preencha seu nome completo.', 'warning');
    if (nameInput) nameInput.focus();
    return;
  }

  if (!email) {
    showToast('Por favor, preencha seu e-mail institucional.', 'warning');
    if (emailInput) emailInput.focus();
    return;
  }

  if (!department) {
    showToast('Por favor, informe seu departamento ou curso.', 'warning');
    if (departmentInput) departmentInput.focus();
    return;
  }

  if (!password || password.length < 8) {
    showToast('A senha deve ter no mínimo 8 caracteres.', 'warning');
    if (passwordInput) passwordInput.focus();
    return;
  }

  if (password !== confirmPassword) {
    showToast('As senhas digitadas não coincidem.', 'error');
    if (confirmPasswordInput) confirmPasswordInput.focus();
    return;
  }

  // Button loading state
  const originalBtnText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = `
    <div class="spinner spinner-sm"></div>
    <span>Criando conta...</span>
  `;

  try {
    const data = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: {
        name,
        email,
        password,
        department
      }
    });

    if (data.token && data.user) {
      setAuth(data.token, data.user);
      showToast('Conta criada com sucesso! Redirecionando...', 'success');
      setTimeout(() => {
        window.location.href = 'home.html';
      }, 700);
    } else {
      showToast('Cadastro realizado! Faça login com suas novas credenciais.', 'success');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 900);
    }
  } catch (err) {
    showToast(err.message || 'Falha ao criar conta. Tente novamente mais tarde.', 'error');
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;
  }
}
