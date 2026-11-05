
const {
    dbOLTP,
    dbOLAP
} = require('../config/database');

const {
    syncAllDimensions
} = require('./dimensions');

async function main() {
    console.log('======================================');
    console.log(' ETL - SUPERMERCADO INTELIGENTE');
    console.log('======================================');

    try {
        const result = await syncAllDimensions();

        console.log('\n======================================');
        console.log(' RESULTADO DO ETL');
        console.log('======================================');

        console.table(result);

        console.log('\nETL CONCLUÍDO COM SUCESSO!');
    } catch (error) {
        console.error('\nERRO DURANTE O ETL:');
        console.error(error);

        process.exitCode = 1;
    } finally {
        await Promise.all([
            dbOLTP.destroy(),
            dbOLAP.destroy()
        ]);
    }
}

main();

