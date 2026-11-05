require('dotenv').config();
const app = require('./app');
const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`🛒 ${process.env.APP_NAME || 'Supermercado Inteligente'} disponível em http://localhost:${port}`));
