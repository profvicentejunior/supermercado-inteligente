const { dbOLTP, dbOLAP } = require('../config/database');
const { syncAllDimensions } = require('./dimensions');
const { syncAllFacts } = require('./facts');

async function main() {
    console.log('======================================');
    console.log(' ETL - SUPERMERCADO INTELIGENTE');
    console.log('======================================');

    try {
        console.log('\n[1/2] Sincronizando dimensões...');
        const dimensions = await syncAllDimensions();

        console.log('\n[2/2] Carregando tabelas de fatos...');
        const facts = await syncAllFacts();

        console.log('\n======================================');
        console.log(' RESULTADO DO ETL');
        console.log('======================================');
        console.table({ ...dimensions, ...facts });
        console.log('\nETL CONCLUÍDO COM SUCESSO!');
    } catch (error) {
        console.error('\nERRO DURANTE O ETL:');
        console.error(error);
        process.exitCode = 1;
    } finally {
        await Promise.allSettled([dbOLTP.destroy(), dbOLAP.destroy()]);
    }
}

main();
