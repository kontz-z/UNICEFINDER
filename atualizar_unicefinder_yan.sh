#!/usr/bin/env bash
# Atualiza o UNICEFINDER no GitHub Codespaces com o ZIP da versão do Yan.
# Não altera arquivos-fonte do Yan, não recria o banco, não faz commit e não executa build.
set -Eeuo pipefail
umask 077

REPO='/workspaces/UNICEFINDER'
ZIP="${1:-$REPO/unicefinder-yan.zip}"
if [[ ! -d "$REPO/.git" ]]; then
  echo 'ERRO: repositório Git do Codespaces não encontrado em /workspaces/UNICEFINDER.' >&2
  exit 1
fi
if [[ ! -f "$ZIP" ]]; then
  echo "ERRO: não encontrei o ZIP em: $ZIP" >&2
  echo 'Renomeie o ZIP do Yan para unicefinder-yan.zip e envie-o à raiz do UNICEFINDER.' >&2
  exit 1
fi
if [[ ! -f "$REPO/backend/.env" ]]; then
  echo 'ERRO: backend/.env atual não encontrado. Não vou substituir sem ter a conexão existente do MySQL.' >&2
  exit 1
fi
if ! command -v docker >/dev/null || ! docker ps -a --format '{{.Names}}' | grep -qx 'unicefinder-db'; then
  echo 'ERRO: contêiner MySQL unicefinder-db não encontrado. Nenhuma alteração feita.' >&2
  exit 1


  
fi

BACKUP="$HOME/unicefinder-backups/antes-yan-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP"
chmod 700 "$BACKUP"
cp "$REPO/backend/.env" "$BACKUP/backend.env"
chmod 600 "$BACKUP/backend.env"

echo '1/5: Ligando o MySQL e fazendo backup dos dados...'
docker start unicefinder-db >/dev/null
for n in $(seq 1 40); do
  if docker exec unicefinder-db sh -c 'mysqladmin ping -h 127.0.0.1 -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" --silent' >/dev/null 2>&1; then break; fi
  if [[ "$n" -eq 40 ]]; then echo 'ERRO: MySQL não ficou pronto.' >&2; exit 1; fi
  sleep 2
done
# As variáveis MYSQL_USER, MYSQL_PASSWORD e MYSQL_DATABASE são as do contêiner criado anteriormente.
docker exec unicefinder-db sh -c 'exec mysqldump --no-tablespaces -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' > "$BACKUP/banco.sql"
if [[ ! -s "$BACKUP/banco.sql" ]]; then
  echo 'ERRO: backup SQL vazio. Nada será substituído.' >&2
  exit 1
fi

echo '2/5: Validando ZIP e fazendo backup dos arquivos atuais...'
python3 - "$REPO" "$ZIP" "$BACKUP" <<'PY'
import sys, zipfile, pathlib, stat
repo, zip_path, backup = map(pathlib.Path, sys.argv[1:])
roots = ('backend','frontend','desktop','database')
with zipfile.ZipFile(zip_path) as archive:
    paths = {name.replace('\\','/') for name in archive.namelist()}
    candidates = [p[:-len('backend/server.js')] for p in paths if p.endswith('backend/server.js')]
    bases = [pre for pre in candidates if all(pre + req in paths for req in ('frontend/index.html','desktop/package.json','database/schema.sql','desktop/dist/index.html'))]
    if len(bases) != 1:
        raise SystemExit('ERRO: ZIP não contém uma única versão completa (backend, frontend, database e desktop/dist). Nada foi substituído.')
    prefix = bases[0]
    for info in archive.infolist():
        name = info.filename.replace('\\','/')
        if name.startswith('/') or '..' in pathlib.PurePosixPath(name).parts or (info.external_attr >> 16) & 0o170000 == stat.S_IFLNK:
            raise SystemExit('ERRO: ZIP contém caminho inseguro. Nenhuma substituição feita.')
    # Backup dos códigos sem segredos/dependências/pastas .git
    with zipfile.ZipFile(backup/'codigo-anterior.zip','w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as out:
        for part in roots:
            src=repo/part
            if not src.exists(): continue
            for path in src.rglob('*'):
                if not path.is_file(): continue
                rel=path.relative_to(repo)
                if '.git' in rel.parts or 'node_modules' in rel.parts or 'uploads' in rel.parts or path.name == '.env' or path.name.startswith('.env.'): continue
                out.write(path, arcname=str(rel))
        for name in ('.gitignore','nixpacks.toml','railway.json'):
            if (repo/name).is_file(): out.write(repo/name, arcname=name)
    (backup/'zip-base.txt').write_text(prefix)
print('ZIP validado; cópia de segurança do código concluída.')
PY

echo '3/5: Substituindo arquivos da aplicação pelo conteúdo exato do Yan...'
python3 - "$REPO" "$ZIP" "$BACKUP" <<'PY'
import sys,zipfile,pathlib,shutil,stat
repo,zip_path,backup=map(pathlib.Path,sys.argv[1:])
prefix=(backup/'zip-base.txt').read_text()
roots={'backend','frontend','desktop','database'}
root_files={'.gitignore','nixpacks.toml','railway.json'}
def skip(parts):
    return any(x in ('.git','node_modules','__MACOSX','.venv','__pycache__') for x in parts) or any(x == '.env' or (x.startswith('.env.') and x != '.env.example') for x in parts) or (len(parts)>1 and parts[0]=='backend' and parts[1]=='uploads')
with zipfile.ZipFile(zip_path) as z:
    desired={}
    for info in z.infolist():
        name=info.filename.replace('\\','/')
        if info.is_dir() or not name.startswith(prefix): continue
        rel=name[len(prefix):]
        pp=pathlib.PurePosixPath(rel)
        if not pp.parts or skip(pp.parts): continue
        if pp.parts[0] in roots or rel in root_files:
            desired[str(pp)] = info
    if not desired: raise SystemExit('ERRO: nenhum arquivo elegível foi encontrado.')
    # Excluir código antigo que não pertence à versão do Yan, protegendo dados locais.
    for root in roots:
        folder=repo/root
        if not folder.exists(): continue
        for old in folder.rglob('*'):
            if not old.is_file():continue
            pp=old.relative_to(repo)
            if skip(pp.parts):continue
            if str(pp) not in desired:old.unlink()
    for rel,info in desired.items():
        dest=repo/rel
        dest.parent.mkdir(parents=True,exist_ok=True)
        with z.open(info) as src, open(dest,'wb') as dst:shutil.copyfileobj(src,dst)
print('Arquivos novos copiados:',len(desired))
print('desktop/dist foi copiado como veio; nenhum build foi realizado.')
PY

echo '4/5: Criando audit_logs, sem alterar usuários ou senhas...'
(
  cd "$REPO/backend"
  node <<'NODE'
require('dotenv').config();
const mysql = require('mysql2/promise');
(async () => {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || process.env.MYSQLHOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306),
    user: process.env.DB_USER || process.env.MYSQLUSER,
    password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD,
    database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'achados_perdidos'
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
    console.log('Tabela audit_logs verificada.');
  } finally {
    await db.end();
  }
})().catch(e => { console.error(e.message); process.exit(1); });
NODE
)

echo '5/5: Verificações finais...'
if [[ -f "$REPO/desktop/dist/index.html" ]]; then
  echo 'Interface desktop pré-compilada do Yan: presente.'
else
  echo 'AVISO: desktop/dist/index.html está ausente!' >&2
fi
if git -C "$REPO" check-ignore -q backend/.env; then
  echo 'backend/.env: ignorado pelo Git (correto).'
else
  echo 'ALERTA: backend/.env NÃO está ignorado pelo Git. NÃO execute git add . até corrigir isso.' >&2
fi
if [[ "$ZIP" == "$REPO/"* ]]; then
  mv "$ZIP" "$BACKUP/versao-yan.zip"
fi
cat <<EOF

VERSÃO DO YAN INSTALADA NO CODESPACES.
- Código do Yan copiado sem edições nem recompilação.
- MySQL atual preservado (com backup).
- Conta administrativa e credenciais atuais preservadas.
- Backup: $BACKUP
- Nenhum commit ou push foi feito.

Para iniciar em um terminal:
  cd /workspaces/UNICEFINDER/backend && npm start

As credenciais administrativas atuais foram preservadas.
EOF
