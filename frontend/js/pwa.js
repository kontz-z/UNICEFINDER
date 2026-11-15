/**
 * UNICEFINDER - PWA Service Worker Registration
 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('[PWA] Service Worker registrado com sucesso. Scope:', registration.scope);
        
        // Check for updates periodically
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              // Show update notification if there's an existing controller
              if (navigator.serviceWorker.controller) {
                if (typeof showToast === 'function') {
                  showToast('Nova versão disponível! Recarregue a página.', 'info');
                }
              }
            }
          });
        });
      })
      .catch((error) => {
        console.error('[PWA] Erro ao registrar Service Worker:', error);
      });
  });
}

// Listen for online/offline events
window.addEventListener('online', () => {
  if (typeof showToast === 'function') {
    showToast('Conexão restabelecida!', 'success');
  }
  document.body.classList.remove('app-offline');
});

window.addEventListener('offline', () => {
  if (typeof showToast === 'function') {
    showToast('Você está offline. Algumas funções podem não funcionar.', 'warning');
  }
  document.body.classList.add('app-offline');
});

// PWA Install Prompt Banner
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  // Don't show if dismissed recently
  if (sessionStorage.getItem('pwa_prompt_dismissed')) return;

  const banner = document.createElement('div');
  banner.className = 'pwa-install-banner';
  banner.id = 'pwaInstallBanner';
  banner.innerHTML = `
    <span class="pwa-text">📲 Instale o <strong>UniceFinder</strong> no seu celular!</span>
    <div style="display:flex;align-items:center;gap:8px;">
      <button class="pwa-btn" id="pwaInstallBtn">Instalar</button>
      <button class="pwa-close" id="pwaCloseBtn" aria-label="Fechar">&times;</button>
    </div>
  `;
  document.body.appendChild(banner);

  document.getElementById('pwaInstallBtn')?.addEventListener('click', async () => {
    banner.remove();
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log('[PWA] Escolha do usuário:', outcome);
      deferredPrompt = null;
    }
  });

  document.getElementById('pwaCloseBtn')?.addEventListener('click', () => {
    banner.remove();
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
  });
});
