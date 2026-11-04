const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Configuração do pool de conexões MySQL
// Suporta MYSQL_URL (Railway) ou variáveis individuais (local)
const dbConfig = process.env.MYSQL_URL
  ? { uri: process.env.MYSQL_URL, waitForConnections: true, connectionLimit: 10, queueLimit: 0, enableKeepAlive: true, keepAliveInitialDelay: 0 }
  : {
      host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
      port: parseInt(process.env.DB_PORT || process.env.MYSQLPORT, 10) || 3306,
      user: process.env.DB_USER || process.env.MYSQLUSER || 'admin',
      password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '123',
      database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'achados_perdidos',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    };

const pool = mysql.createPool(dbConfig);

// Teste inicial de conexão para registrar status no console
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('[Database] Conexão com o banco de dados MySQL estabelecida com sucesso.');
    connection.release();
  } catch (error) {
    console.error('[Database] Erro ao conectar ao banco de dados MySQL:', error.message);
  }
})();

module.exports = pool;
