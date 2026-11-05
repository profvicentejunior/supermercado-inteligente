require('dotenv').config();
const { initializeOpenTelemetry, shutdownOpenTelemetry } = require('./observability/otel');

initializeOpenTelemetry();

const app = require('./app');
const port = Number(process.env.PORT || 3000);
const server = app.listen(port, () => console.log(`🛒 ${process.env.APP_NAME || 'Supermercado Inteligente'} disponível na porta ${port}`));

async function shutdown(signal) {
    console.log(`[Server] ${signal} recebido. Encerrando...`);
    server.close(async () => {
        try {
            await shutdownOpenTelemetry();
            process.exit(0);
        } catch (error) {
            console.error('[OpenTelemetry] Erro ao encerrar:', error.message);
            process.exit(1);
        }
    });
    setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
