const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Importação das rotas da API
const authRoutes = require('./routes/auth');
const itemRoutes = require('./routes/items');
const claimRoutes = require('./routes/claims');
const userRoutes = require('./routes/users');
const logRoutes = require('./routes/logs');

// Inicialização do aplicativo Express
const app = express();
const PORT = process.env.PORT || 3000;

// Garante que o diretório de uploads exista
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
  console.log('[Server] Diretório de uploads criado com sucesso.');
}

// Configuração de middlewares globais
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos de uploads publicamente sob a rota /uploads
app.use('/uploads', express.static(uploadsPath));

// Rotas da API (antes dos arquivos estáticos)
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/users', userRoutes);
app.use('/api/logs', logRoutes);

// Rota de status da API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'UniceFinder Backend API'
  });
});

// Middleware para tratamento de rotas não encontradas na API
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint da API não encontrado.'
  });
});

// ============================================================
// DETECÇÃO AUTOMÁTICA DE DISPOSITIVO (Mobile vs Desktop)
// ============================================================
const mobilePath = path.join(__dirname, '../frontend');
const desktopPath = path.join(__dirname, '../desktop/dist');

/**
 * Detecta se o User-Agent é de um dispositivo móvel
 */
function isMobileDevice(userAgent) {
  if (!userAgent) return false;
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i;
  return mobileRegex.test(userAgent);
}

// Servir arquivos estáticos do desktop (React build)
if (fs.existsSync(desktopPath)) {
  app.use('/desktop', express.static(desktopPath));
}

// Servir arquivos estáticos do mobile
if (fs.existsSync(mobilePath)) {
  app.use('/mobile', express.static(mobilePath));
}

// Rota raiz: detecta dispositivo e redireciona
app.get('/', (req, res) => {
  const ua = req.headers['user-agent'] || '';

  if (isMobileDevice(ua)) {
    // Mobile → servir versão HTML/CSS/JS
    return res.sendFile(path.join(mobilePath, 'index.html'));
  } else {
    // Desktop → servir versão React
    if (fs.existsSync(path.join(desktopPath, 'index.html'))) {
      return res.sendFile(path.join(desktopPath, 'index.html'));
    }
    // Fallback para mobile se desktop não estiver buildado
    return res.sendFile(path.join(mobilePath, 'index.html'));
  }
});

// Para todas as outras rotas sem extensão (SPA do React e páginas mobile)
app.get('*', (req, res) => {
  const ua = req.headers['user-agent'] || '';
  const requestedPath = req.path;

  // Se pede explicitamente um arquivo mobile (.html)
  if (requestedPath.startsWith('/mobile')) {
    const filePath = path.join(mobilePath, requestedPath.replace('/mobile', ''));
    if (fs.existsSync(filePath)) return res.sendFile(filePath);
  }

  // Se pede explicitamente o desktop
  if (requestedPath.startsWith('/desktop')) {
    return res.sendFile(path.join(desktopPath, 'index.html'));
  }

  // Se é um arquivo com extensão (css, js, img, etc.), tentar servir dos dois
  if (path.extname(requestedPath)) {
    // Primeiro tenta no mobile
    const mobileFile = path.join(mobilePath, requestedPath);
    if (fs.existsSync(mobileFile)) return res.sendFile(mobileFile);
    // Depois no desktop
    const desktopFile = path.join(desktopPath, requestedPath);
    if (fs.existsSync(desktopFile)) return res.sendFile(desktopFile);
  }

  // Páginas sem extensão: detectar dispositivo
  if (isMobileDevice(ua)) {
    // Mobile: se existe o .html, servir
    const htmlFile = path.join(mobilePath, requestedPath.endsWith('.html') ? requestedPath : requestedPath + '.html');
    if (fs.existsSync(htmlFile)) return res.sendFile(htmlFile);
    // Fallback: index.html do mobile
    return res.sendFile(path.join(mobilePath, 'index.html'));
  } else {
    // Desktop: sempre servir index.html (React Router cuida das rotas)
    if (fs.existsSync(path.join(desktopPath, 'index.html'))) {
      return res.sendFile(path.join(desktopPath, 'index.html'));
    }
    return res.sendFile(path.join(mobilePath, 'index.html'));
  }
});

// Middleware global para tratamento de erros
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);

  if (err.message && err.message.includes('permitidos')) {
    return res.status(400).json({ error: err.message });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'O arquivo enviado excede o limite máximo permitido (10MB).' });
  }

  res.status(500).json({
    error: 'Ocorreu um erro interno no servidor. Por favor, tente novamente mais tarde.'
  });
});

// Inicialização do servidor HTTP
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  UniceFinder Backend rodando na porta ${PORT}`);
  console.log(`  URL: http://localhost:${PORT}`);
  console.log(`  📱 Mobile: http://localhost:${PORT}/mobile`);
  console.log(`  💻 Desktop: http://localhost:${PORT}/desktop`);
  console.log(`  🔄 Auto-detect na raiz: http://localhost:${PORT}`);
  console.log(`  Uploads: ${uploadsPath}`);
  console.log(`=======================================================`);
});

module.exports = app;
