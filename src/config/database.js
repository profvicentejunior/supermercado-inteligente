
const knexFactory = require('knex');
const config = require('../../knexfile');

const env = process.env.NODE_ENV || 'development';

// Conexão transacional
const dbOLTP = knexFactory(config[env].oltp);

// Conexão analítica
const dbOLAP = knexFactory(config[env].olap);

// Testa conexão individualmente
async function checkOLTP() {
    await dbOLTP.raw('SELECT 1 AS connected');
    return true;
}

async function checkOLAP() {
    await dbOLAP.raw('SELECT 1 AS connected');
    return true;
}

// Testa as duas conexões
async function checkDatabase() {
    const results = await Promise.all([
        checkOLTP(),
        checkOLAP()
    ]);

    return {
        oltp: results[0],
        olap: results[1]
    };
}

module.exports = {
    dbOLTP,
    dbOLAP,
    checkOLTP,
    checkOLAP,
    checkDatabase
};

