const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function initDatabase() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT, 10) || 3306;
  const user = process.env.DB_USER || 'admin';
  const password = process.env.DB_PASSWORD || '123';
  const dbName = process.env.DB_NAME || 'achados_perdidos';

  console.log('-------------------------------------------------------');
  console.log(`[Init-DB] Iniciando configuração do banco de dados MySQL...`);
  console.log(`[Init-DB] Conectando a ${user}@${host}:${port}`);
  console.log('-------------------------------------------------------');

  let connection;

  try {
    // 1. Conecta ao MySQL sem selecionar o banco de dados inicialmente
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      multipleStatements: true
    });

    console.log('[Init-DB] Conexão com o servidor MySQL realizada com sucesso.');

    // 2. Lê o arquivo schema.sql
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Arquivo de esquema não encontrado em: ${schemaPath}`);
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    console.log(`[Init-DB] Executando comandos do arquivo schema.sql...`);

    // Executa as instruções do schema
    await connection.query(schemaSql);
    console.log('[Init-DB] Banco de dados e tabelas criados com sucesso.');

    // 3. Garante o uso do banco criado
    await connection.query(`USE \`${dbName}\`;`);

    // 4. Cria ou atualiza a conta padrão do Administrador com hash real de 'admin123'
    console.log('[Init-DB] Configurando conta de administrador padrão...');
    const adminEmail = 'admin@unicefinder.com';
    const adminPasswordPlain = 'admin123';
    const saltRounds = 10;
    const adminPasswordHash = await bcrypt.hash(adminPasswordPlain, saltRounds);

    const [adminCheck] = await connection.query(
      'SELECT id FROM users WHERE email = ?',
      [adminEmail]
    );

    if (adminCheck.length === 0) {
      await connection.query(
        `INSERT INTO users (name, email, password_hash, role, department) 
         VALUES ('Administrador', ?, ?, 'employee', 'Administração')`,
        [adminEmail, adminPasswordHash]
      );
      console.log(`[Init-DB] Conta de Administrador criada com sucesso!`);
    } else {
      await connection.query(
        `UPDATE users 
         SET password_hash = ?, role = 'employee', department = 'Administração' 
         WHERE email = ?`,
        [adminPasswordHash, adminEmail]
      );
      console.log(`[Init-DB] Conta de Administrador existente atualizada com a senha padrão.`);
    }

    console.log('-------------------------------------------------------');
    console.log('[Init-DB] Inicialização do banco de dados concluída com sucesso!');
    console.log(`  E-mail: ${adminEmail}`);
    console.log(`  Senha : ${adminPasswordPlain}`);
    console.log('-------------------------------------------------------');
  } catch (error) {
    console.error('[Init-DB] Erro durante a inicialização do banco de dados:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initDatabase();
