# Instalação e execução

Guia para preparar um ambiente local de desenvolvimento do UNICEFINDER.

## Requisitos

- Node.js e npm.
- MySQL em execução.
- Git.

## 1. Obter o projeto

\`\`\`bash
git clone https://github.com/kontz-z/UNICEFINDER.git
cd UNICEFINDER
\`\`\`

## 2. Configurar o backend

Crie o arquivo de ambiente:

\`\`\`bash
cp backend/.env.example backend/.env
\`\`\`

Edite `backend/.env` com os dados do seu MySQL. Configure também um segredo JWT longo, aleatório e exclusivo.

O arquivo `.env` contém informações privadas e não deve ser enviado ao Git.

## 3. Preparar o banco

Com o MySQL em execução:

\`\`\`bash
mysql -u SEU_USUARIO -p < database/schema.sql
\`\`\`

O esquema utiliza o banco `achados_perdidos`.

## 4. Instalar dependências e gerar o desktop

\`\`\`bash
cd backend
npm ci

cd ../desktop
npm ci
npm run build
\`\`\`

O build será gerado em `desktop/dist/`.

## 5. Iniciar o sistema

\`\`\`bash
cd ../backend
npm start
\`\`\`

Por padrão, o servidor utiliza a porta `3000`.

Acesse `http://localhost:3000`.

O endpoint `/api/health` permite verificar o estado da API.

## Interfaces

- `/`: seleciona a interface conforme o dispositivo detectado.
- `/desktop`: interface desktop.
- `/mobile`: interface mobile.

## PWA e acesso offline

A interface mobile pode ser instalada em dispositivos e navegadores compatíveis.

O Service Worker armazena recursos estáticos em cache para permitir a abertura da interface sem conexão. Autenticação, consultas, cadastros e operações que dependem da API precisam de conexão com o servidor.

## Observações

- Não publique `backend/.env` ou credenciais.
- Não execute scripts de inicialização do banco em ambientes com dados importantes sem revisar seus efeitos.
- `node_modules/` e `desktop/dist/` são diretórios gerados localmente.
