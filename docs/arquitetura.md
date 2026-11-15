# Arquitetura do UNICEFINDER

## Visão geral

O UNICEFINDER é organizado em três partes principais: backend/API, interface desktop e interface mobile. As duas interfaces utilizam os serviços disponibilizados pelo backend.

## Componentes

### backend/

Aplicação Node.js com Express, responsável pela API REST, autenticação, regras de autorização, gerenciamento de usuários, itens e reivindicações, além da comunicação com o banco MySQL.

O ponto de entrada é `backend/server.js`. As rotas ficam em `backend/routes/` e a lógica de negócio em `backend/controllers/`.

### database/

Contém `schema.sql`, utilizado para criar o banco de dados, suas tabelas e categorias iniciais.

### desktop/

Interface desktop desenvolvida com React e Vite. O código-fonte fica em `desktop/src/` e o build é gerado em `desktop/dist/`.

### frontend/

Interface mobile desenvolvida com HTML, CSS e JavaScript.

Também contém os recursos do PWA:

- `manifest.json`: configurações de instalação e ícones.
- `sw.js`: cache de recursos estáticos e tratamento de requisições.
- `js/pwa.js`: registro e integração do Service Worker.

O acesso offline é limitado aos recursos estáticos armazenados em cache. Operações da API exigem conexão.

### .github/, nixpacks.toml e railway.json

Contêm configurações de automação e implantação.

### scripts/maintenance/

Contém scripts auxiliares de manutenção e configuração do ambiente.

## Fluxo de funcionamento

1. O navegador acessa o servidor Express.
2. O backend identifica a interface e entrega os arquivos correspondentes.
3. A interface realiza requisições HTTP para `/api/`.
4. As rotas encaminham as operações aos controllers.
5. Os controllers acessam o banco MySQL.
6. Os resultados são retornados à interface em JSON.

## Tecnologias

- Node.js e Express
- MySQL
- React e Vite
- HTML, CSS e JavaScript
- Web App Manifest e Service Worker
