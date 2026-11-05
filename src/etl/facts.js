const { dbOLTP, dbOLAP } = require('../config/database');

async function syncSalesFacts() {
    console.log('\nCarregando fact_sales...');

    const rows = await dbOLTP('order_items as oi')
        .join('orders as o', 'o.id', 'oi.order_id')
        .join('customers as c', 'c.id', 'o.customer_id')
        .join('products as p', 'p.id', 'oi.product_id')
        .join('dim_product as dp', 'dp.source_product_id', 'p.id')
        .join('dim_customer as dc', 'dc.source_customer_id', 'c.id')
        .select(
            dbOLTP.raw("CAST(DATE_FORMAT(COALESCE(o.placed_at, o.created_at), '%Y%m%d') AS UNSIGNED) AS date_key"),
            'dp.product_key',
            'dc.customer_key',
            'o.id as source_order_id',
            'oi.id as source_order_item_id',
            'o.order_number',
            'oi.quantity',
            'oi.unit_price',
            dbOLTP.raw('(oi.quantity * oi.unit_price) AS gross_amount'),
            'oi.discount as discount_amount',
            'oi.line_total as net_amount'
        );

    const chunkSize = 250;
    for (let i = 0; i < rows.length; i += chunkSize) {
        await dbOLAP('fact_sales')
            .insert(rows.slice(i, i + chunkSize))
            .onConflict('source_order_item_id')
            .merge([
                'date_key', 'product_key', 'customer_key', 'source_order_id',
                'order_number', 'quantity', 'unit_price', 'gross_amount',
                'discount_amount', 'net_amount'
            ]);
        console.log(`fact_sales: ${Math.min(i + chunkSize, rows.length)}/${rows.length}`);
    }

    return rows.length;
}

async function syncInventoryFacts() {
    console.log('\nCarregando snapshot em fact_inventory...');

    const dateResult = await dbOLTP.raw(
        "SELECT CAST(DATE_FORMAT(CURDATE(), '%Y%m%d') AS UNSIGNED) AS date_key"
    );
    const dateKey = Number(dateResult[0][0].date_key);

    const inventory = await dbOLTP('inventory as i')
        .join('products as p', 'p.id', 'i.product_id')
        .join('dim_product as dp', 'dp.source_product_id', 'p.id')
        .select(
            dbOLTP.raw('? AS date_key', [dateKey]),
            'dp.product_key',
            'i.quantity',
            'i.minimum_quantity',
            dbOLTP.raw('(i.quantity < i.minimum_quantity) AS below_minimum')
        );

    for (let i = 0; i < inventory.length; i += 250) {
        await dbOLAP('fact_inventory')
            .insert(inventory.slice(i, i + 250))
            .onConflict(['date_key', 'product_key'])
            .merge(['quantity', 'minimum_quantity', 'below_minimum', 'loaded_at']);
    }

    return inventory.length;
}

async function syncAllFacts() {
    const sales = await syncSalesFacts();
    console.log(`✔ fact_sales: ${sales} itens processados`);

    const inventory = await syncInventoryFacts();
    console.log(`✔ fact_inventory: ${inventory} produtos fotografados`);

    return { sales, inventory };
}

module.exports = { syncAllFacts, syncSalesFacts, syncInventoryFacts };
