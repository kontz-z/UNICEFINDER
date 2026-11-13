#!/usr/bin/env bash
set -euo pipefail
cd /workspaces/UNICEFINDER

# Garante que o arquivo local com senhas não será publicado no GitHub.
if git ls-files --error-unmatch backend/.env >/dev/null 2>&1 || ! git check-ignore -q backend/.env; then
  echo 'ERRO: backend/.env precisa estar fora do Git e coberto pelo .gitignore.'
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo 'ERRO: Docker não está funcionando neste Codespace. Não foi feita nenhuma alteração.'
  exit 1
fi
if docker ps -a --format '{{.Names}}' | grep -qx 'unicefinder-db'; then
  echo 'O contêiner unicefinder-db já existe. Não rode a configuração duas vezes.'
  exit 1
fi
if docker volume ls --format '{{.Name}}' | grep -qx 'unicefinder_mysql_data'; then
  echo 'O volume unicefinder_mysql_data já existe. Pare e confira antes de reutilizar.'
  exit 1
fi

umask 077
if [[ -f backend/.env ]]; then
  cp backend/.env "$HOME/unicefinder-env-backup-$(date +%Y%m%d%H%M%S)"
fi
root_password="$(openssl rand -hex 24)"
app_password="$(openssl rand -hex 24)"
admin_password="$(openssl rand -hex 16)"
jwt_secret="$(openssl rand -hex 32)"
base_url="http://localhost:3000"
if [[ -n "${CODESPACE_NAME:-}" ]]; then
  base_url="https://${CODESPACE_NAME}-3000.app.github.dev"
fi
cat > backend/.env <<EOF
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=unicefinder
DB_PASSWORD=$app_password
DB_NAME=achados_perdidos
JWT_SECRET=$jwt_secret
PORT=3000
BASE_URL=$base_url
ADMIN_LOGIN_EMAIL=admin@unicefinder.com
ADMIN_LOGIN_PASSWORD=$admin_password
EOF
chmod 600 backend/.env

docker volume create unicefinder_mysql_data >/dev/null
docker run -d --name unicefinder-db --restart unless-stopped \
  -p 127.0.0.1:3306:3306 \
  -v unicefinder_mysql_data:/var/lib/mysql \
  -v "$PWD/database/schema.sql:/docker-entrypoint-initdb.d/10-schema.sql:ro" \
  -e MYSQL_ROOT_PASSWORD="$root_password" \
  -e MYSQL_DATABASE=achados_perdidos \
  -e MYSQL_USER=unicefinder \
  -e MYSQL_PASSWORD="$app_password" \
  mysql:8.0 >/dev/null

echo 'Iniciando MySQL e importando database/schema.sql...'
ready=0
for i in $(seq 1 90); do
  if docker exec -e MYSQL_PWD="$app_password" unicefinder-db \
     mysql -h 127.0.0.1 -u unicefinder -D achados_perdidos \
     -N -e 'SELECT COUNT(*) FROM categories;' >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 2
done
if [[ "$ready" != 1 ]]; then
  echo 'O MySQL não concluiu a inicialização; últimas mensagens:'
  docker logs --tail 40 unicefinder-db
  exit 1
fi

npm ci --prefix backend
npm ci --prefix desktop
npm run build --prefix desktop

# A tabela audit_logs não está presente no schema inicial.
# O script create-logs-table.js tem uma senha fixa; por isso NÃO o usamos.
node <<'NODE'
require('dotenv').config({path: 'backend/.env'});
const mysql = require('./backend/node_modules/mysql2/promise');
const bcrypt = require('./backend/node_modules/bcryptjs');
(async () => {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS audit_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT, user_name VARCHAR(100), user_email VARCHAR(150),
      action VARCHAR(50) NOT NULL, entity_type VARCHAR(50), entity_id INT,
      details TEXT, ip_address VARCHAR(45),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )`);
    const hash = await bcrypt.hash(process.env.ADMIN_LOGIN_PASSWORD, 12);
    const [result] = await db.execute(
      'UPDATE users SET password_hash = ?, role = ? WHERE email = ?',
      [hash, 'employee', process.env.ADMIN_LOGIN_EMAIL]
    );
    if (result.affectedRows !== 1) throw new Error('Conta admin não encontrada no banco');
    const [[row]] = await db.query('SELECT COUNT(*) AS n FROM categories');
    console.log('Banco configurado. Categorias:', row.n);
  } finally {
    await db.end();
  }
})().catch(err => { console.error('Falha ao finalizar o banco:', err.message); process.exit(1); });
NODE

echo ''
echo 'CONFIGURAÇÃO CONCLUÍDA.'
echo 'Credenciais do administrador: guardadas SOMENTE em backend/.env.'
echo 'Para consultar, execute: grep "^ADMIN_LOGIN" backend/.env'
echo 'Para iniciar o site: cd /workspaces/UNICEFINDER/backend && npm start'
echo 'Na aba PORTAS, abra a porta 3000 e deixe a visibilidade como PRIVATE.'
