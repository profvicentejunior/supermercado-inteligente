
const { dbOLTP, dbOLAP } = require('../config/database');

// Nomes em português para o calendário.
const MONTHS = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril',
    'Maio', 'Junho', 'Julho', 'Agosto',
    'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const DAYS = [
    'Domingo', 'Segunda-feira', 'Terça-feira',
    'Quarta-feira', 'Quinta-feira', 'Sexta-feira',
    'Sábado'
];

// Divide cargas grandes em lotes menores.
async function upsertInChunks(tableName, rows, uniqueColumn) {
    const chunkSize = 200;

    for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);

        await dbOLAP(tableName)
            .insert(chunk)
            .onConflict(uniqueColumn)
            .merge();
    }

    return rows.length;
}

// Gera a dimensão de datas.
async function syncDateDimension() {
    // Calendário analítico fixo para exercícios e comparações históricas.
    const start = new Date('2024-01-01T00:00:00.000Z');
    const end = new Date('2030-12-31T00:00:00.000Z');

    const rows = [];

    for (
        const current = new Date(start);
        current <= end;
        current.setUTCDate(current.getUTCDate() + 1)
    ) {
        const year = current.getUTCFullYear();
        const month = current.getUTCMonth() + 1;
        const day = current.getUTCDate();
        const weekday = current.getUTCDay();

        const dateValue = [
            year,
            String(month).padStart(2, '0'),
            String(day).padStart(2, '0')
        ].join('-');

        const dateKey = Number(
            `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`
        );

        rows.push({
            date_key: dateKey,
            date_value: dateValue,
            calendar_year: year,
            quarter: Math.ceil(month / 3),
            month_number: month,
            month_name: MONTHS[month - 1],
            day_of_month: day,
            day_of_week: weekday,
            day_name: DAYS[weekday],
            is_weekend: weekday === 0 || weekday === 6
        });
    }

    await upsertInChunks('dim_date', rows, 'date_key');

    return rows.length;
}

// Produtos e suas categorias.
async function syncProducts() {
    const products = await dbOLTP('products as p')
        .leftJoin('categories as c', 'c.id', 'p.category_id')
        .select(
            'p.id',
            'p.sku',
            'p.name',
            'p.price',
            'p.unit',
            'p.active',
            'c.name as category_name'
        );

    const rows = products.map(product => ({
        source_product_id: product.id,
        sku: product.sku,
        product_name: product.name,
        category_name: product.category_name,
        unit: product.unit,
        current_price: product.price || '0.00',
        active: Boolean(product.active)
    }));

    return upsertInChunks(
        'dim_product',
        rows,
        'source_product_id'
    );
}

// Clientes.
async function syncCustomers() {
    const customers = await dbOLTP('customers')
        .select('id', 'name');

    const rows = customers.map(customer => ({
        source_customer_id: customer.id,
        customer_name: customer.name

        // Não replicamos e-mail ou documento pessoal
        // sem necessidade analítica definida.
    }));

    return upsertInChunks(
        'dim_customer',
        rows,
        'source_customer_id'
    );
}

// Fornecedores.
async function syncSuppliers() {
    const suppliers = await dbOLTP('suppliers')
        .select('id', 'name', 'approved', 'active');

    const rows = suppliers.map(supplier => ({
        source_supplier_id: supplier.id,
        supplier_name: supplier.name,
        approved: Boolean(supplier.approved),
        active: Boolean(supplier.active)
    }));

    return upsertInChunks(
        'dim_supplier',
        rows,
        'source_supplier_id'
    );
}

async function syncAllDimensions() {
    console.log('\nIniciando sincronização das dimensões...');

    const dates = await syncDateDimension();
    console.log(`✔ dim_date: ${dates} datas processadas`);

    const products = await syncProducts();
    console.log(`✔ dim_product: ${products} produtos processados`);

    const customers = await syncCustomers();
    console.log(`✔ dim_customer: ${customers} clientes processados`);

    const suppliers = await syncSuppliers();
    console.log(`✔ dim_supplier: ${suppliers} fornecedores processados`);

    return {
        dates,
        products,
        customers,
        suppliers
    };
}

module.exports = {
    syncAllDimensions
};

