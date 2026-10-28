const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Configuração do pool de conexões MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || '123',
  database: process.env.DB_NAME || 'achados_perdidos',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

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
