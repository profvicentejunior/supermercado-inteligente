const { dbOLTP, dbOLAP } = require('../config/database');

function toDateKey(value) {
    const valueText = value instanceof Date
        ? value.toISOString().slice(0, 10)
        : String(value).slice(0, 10);
    return Number(valueText.replace(/-/g, ''));
}

async function syncSalesFacts() {
    console.log('\nCarregando fact_sales...');

    // As dimensões pertencem ao banco OLAP; não devem ser consultadas via OLTP.
    const [products, customers] = await Promise.all([
        dbOLAP('dim_product').select('source_product_id', 'product_key'),
        dbOLAP('dim_customer').select('source_customer_id', 'customer_key')
    ]);

    const productKeys = new Map(products.map(row => [Number(row.source_product_id), row.product_key]));
    const customerKeys = new Map(customers.map(row => [Number(row.source_customer_id), row.customer_key]));

    const sourceRows = await dbOLTP('order_items as oi')
        .join('orders as o', 'o.id', 'oi.order_id')
        .select(
            'oi.id as source_order_item_id',
            'oi.product_id',
            'oi.quantity',
            'oi.unit_price',
            'oi.discount as discount_amount',
            'oi.line_total as net_amount',
            'o.id as source_order_id',
            'o.customer_id',
            'o.order_number',
            'o.placed_at',
            'o.created_at'
        );

    const rows = sourceRows
        .map(row => {
            const productKey = productKeys.get(Number(row.product_id));
            const customerKey = customerKeys.get(Number(row.customer_id));
            if (!productKey || !customerKey) return null;

            return {
                date_key: toDateKey(row.placed_at || row.created_at),
                product_key: productKey,
                customer_key: customerKey,
                source_order_id: row.source_order_id,
                source_order_item_id: row.source_order_item_id,
                order_number: row.order_number,
                quantity: row.quantity,
                unit_price: row.unit_price,
                gross_amount: Number(row.quantity) * Number(row.unit_price),
                discount_amount: row.discount_amount,
                net_amount: row.net_amount
            };
        })
        .filter(Boolean);

    for (let i = 0; i < rows.length; i += 250) {
        await dbOLAP('fact_sales')
            .insert(rows.slice(i, i + 250))
            .onConflict('source_order_item_id')
            .merge([
                'date_key', 'product_key', 'customer_key', 'source_order_id',
                'order_number', 'quantity', 'unit_price', 'gross_amount',
                'discount_amount', 'net_amount'
            ]);
        console.log(`fact_sales: ${Math.min(i + 250, rows.length)}/${rows.length}`);
    }

    return rows.length;
}

async function syncInventoryFacts() {
    console.log('\nCarregando snapshot em fact_inventory...');

    const dateResult = await dbOLTP.raw(
        "SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS today"
    );
    const dateKey = toDateKey(dateResult[0][0].today);

    const inventory = await dbOLTP('inventory as i')
        .join('products as p', 'p.id', 'i.product_id')
        .select(
            'p.id as source_product_id',
            'i.quantity',
            'i.minimum_quantity'
        );

    const productDimensions = await dbOLAP('dim_product')
        .select('source_product_id', 'product_key');
    const productKeys = new Map(productDimensions.map(row => [
        Number(row.source_product_id), row.product_key
    ]));

    const rows = inventory
        .map(row => {
            const productKey = productKeys.get(Number(row.source_product_id));
            if (!productKey) return null;
            return {
                date_key: dateKey,
                product_key: productKey,
                quantity: row.quantity,
                minimum_quantity: row.minimum_quantity,
                below_minimum: Number(row.quantity) < Number(row.minimum_quantity) ? 1 : 0
            };
        })
        .filter(Boolean);

    // Substitui o snapshot do dia em uma transação para evitar fotografia parcial.
    await dbOLAP.transaction(async trx => {
        await trx('fact_inventory').where({ date_key: dateKey }).del();

        for (let i = 0; i < rows.length; i += 250) {
            await trx('fact_inventory').insert(rows.slice(i, i + 250));
        }
    });

    return rows.length;
}

async function syncAllFacts() {
    const sales = await syncSalesFacts();
    console.log(`✔ fact_sales: ${sales} itens processados`);

    const inventory = await syncInventoryFacts();
    console.log(`✔ fact_inventory: ${inventory} produtos fotografados`);

    return { sales, inventory };
}

module.exports = { syncAllFacts, syncSalesFacts, syncInventoryFacts };
