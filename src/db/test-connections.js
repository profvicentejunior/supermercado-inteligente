
const { dbOLTP, dbOLAP } = require('../config/database');

async function testConnection(name, db) {
  try {
    const result = await db.raw(`
      SELECT
        VERSION() AS server_version,
        DATABASE() AS database_name
    `);

    const rows = result[0];

    console.log(`\n✅ ${name}: CONECTADO`);
    console.log(`Banco: ${rows[0].database_name}`);
    console.log(`Servidor: ${rows[0].server_version}`);

    return true;
  } catch (error) {
    console.error(`\n❌ ${name}: FALHA NA CONEXÃO`);
    console.error(`Código: ${error.code || 'Não informado'}`);
    console.error(`Mensagem: ${error.message}`);

    return false;
  }
}

async function main() {
  console.log('====================================');
  console.log(' TESTE DE CONEXÕES - SUPERMERCADO');
  console.log('====================================');

  const results = await Promise.all([
    testConnection('OLTP', dbOLTP),
    testConnection('OLAP', dbOLAP)
  ]);

  await Promise.all([
    dbOLTP.destroy(),
    dbOLAP.destroy()
  ]);

  console.log('\n====================================');
  console.log(' RESULTADO FINAL');
  console.log('====================================');

  console.log(`OLTP: ${results[0] ? 'OK' : 'FALHOU'}`);
  console.log(`OLAP: ${results[1] ? 'OK' : 'FALHOU'}`);

  if (!results.every(Boolean)) {
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error('Erro inesperado:', error);
  process.exitCode = 1;
});

