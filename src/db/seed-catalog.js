/**
 * Script de Seed de Catálogo — Supermercado Inteligente
 * Cadastra 20 categorias e ~2.000 produtos fictícios e realistas.
 * 
 * Compatível com MySQL 5.7 e Knex.js.
 * Idempotente: pode ser executado múltiplas vezes sem duplicar registros.
 */

const { dbOLTP } = require('../config/database');

const CATEGORIES_SPEC = [
  { name: 'Mercearia', prefix: 'MER', description: 'Alimentos básicos, grãos, farinhas, açúcares e secos' },
  { name: 'Bebidas', prefix: 'BEB', description: 'Refrigerantes, sucos, águas, cervejas e destilados' },
  { name: 'Laticínios', prefix: 'LAT', description: 'Leites, queijos, iogurtes, manteigas e requeijões' },
  { name: 'Hortifruti', prefix: 'HOR', description: 'Frutas, legumes, verduras e ervas frescas' },
  { name: 'Açougue', prefix: 'ACO', description: 'Carnes bovinas, suínas, aves e cortes especiais' },
  { name: 'Peixaria', prefix: 'PEI', description: 'Peixes inteiros, filés, frutos do mar e pescados' },
  { name: 'Padaria', prefix: 'PAD', description: 'Pães, bolos, tortas, salgados e torradas' },
  { name: 'Congelados', prefix: 'CON', description: 'Pratos prontos, pizzas, vegetais congelados e sorvetes' },
  { name: 'Limpeza', prefix: 'LIM', description: 'Detergentes, sabões, desinfetantes e utensílios de limpeza' },
  { name: 'Higiene Pessoal', prefix: 'HIG', description: 'Sabonetes, shampoos, condicionadores, cremes e desodorantes' },
  { name: 'Higiene Bucal', prefix: 'BUC', description: 'Escovas, pastas de dente, fios dentais e enxaguantes' },
  { name: 'Bebê', prefix: 'KID', description: 'Fraldas, lenços umedecidos, fórmulas infantis e papinhas' },
  { name: 'Pet Shop', prefix: 'PET', description: 'Rações, petiscos, areias sanitárias e acessórios para pets' },
  { name: 'Frios e Embutidos', prefix: 'FRI', description: 'Presuntos, salames, peitos de peru, mortadelas e queijos fatiados' },
  { name: 'Doces e Chocolates', prefix: 'DOC', description: 'Chocolates, bombons, balas, chicletes e sobremesas' },
  { name: 'Biscoitos e Snacks', prefix: 'BIS', description: 'Biscoitos doces, salgados, recheados, batatas e salgadinhos' },
  { name: 'Temperos e Condimentos', prefix: 'TEM', description: 'Sal, pimentas, molhos, vinagres, azeites e caldos' },
  { name: 'Enlatados e Conservas', prefix: 'ENL', description: 'Milho, ervilha, azeitonas, atum, sardinha e molhos de tomate' },
  { name: 'Utilidades Domésticas', prefix: 'UTI', description: 'Descartáveis, sacos de lixo, papel alumínio, lâmpadas e fósforos' },
  { name: 'Alimentos Saudáveis', prefix: 'SAU', description: 'Produtos integrais, sem glúten, sem lactose, orgânicos e diet/light' }
];

const PRODUCT_TEMPLATES = {
  Mercearia: {
    items: ['Arroz Branco', 'Arroz Integral', 'Feijão Carioca', 'Feijão Preto', 'Açúcar Cristal', 'Açúcar Refinado', 'Óleo de Soja', 'Macarrão Espaguete', 'Macarrão Parafuso', 'Farinha de Trigo', 'Fubá de Milho', 'Flocão de Milho', 'Amido de Milho', 'Mistura para Bolo', 'Leite em Pó', 'Leite Condensado', 'Creme de Leite', 'Farofa Pronta', 'Polvilho Azedo', 'Aveia em Flocos'],
    brands: ['Camil', 'Tio João', 'Kicaldo', 'União', 'Liza', 'Barilla', 'Dona Benta', 'Yoki', 'Ninho', 'Moça'],
    variations: ['5kg', '1kg', '500g', '900ml', '200g'],
    units: ['PCT', 'UN'],
    basePrice: 8.50
  },
  Bebidas: {
    items: ['Refrigerante Cola', 'Refrigerante Guaraná', 'Água Mineral', 'Água com Gás', 'Suco de Uva', 'Suco de Laranja', 'Água de Coco', 'Cerveja Pilsen', 'Cerveja Puramalt', 'Vinho Tinto', 'Energético', 'Isotônico', 'Chá Gelado', 'Vodka', 'Whisky'],
    brands: ['Coca-Cola', 'Antarctica', 'Crystal', 'Maguary', 'Heineken', 'Amstel', 'Red Bull', 'Gatorade', 'Del Valle', 'Perdigao'],
    variations: ['350ml', '473ml', '1L', '1.5L', '2L'],
    units: ['UN'],
    basePrice: 6.90
  },
  Laticínios: {
    items: ['Leite Integral', 'Leite Desnatado', 'Iogurte Natural', 'Iogurte Morango', 'Queijo Mussarela', 'Queijo Prato', 'Queijo Coalho', 'Requeijão', 'Manteiga com Sal', 'Margarina', 'Creme de Leite Fresco', 'Nata', 'Cream Cheese', 'Parmesão Ralado', 'Bebida Láctea'],
    brands: ['Itambé', 'Piracanjuba', 'Nestlé', 'Danone', 'Vigor', 'Qualitá', 'Batavo', 'President', 'Tirol', 'Elegê'],
    variations: ['1L', '170g', '200g', '400g', '500g'],
    units: ['UN', 'PCT'],
    basePrice: 10.40
  },
  Hortifruti: {
    items: ['Banana Prata', 'Maçã Fuji', 'Tomate Italiano', 'Batata Inglesa', 'Cenoura', 'Cebola Branca', 'Alface Crespa', 'Rúcula', 'Abacaxi', 'Melancia', 'Mamão', 'Laranja Pera', 'Limão Taiti', 'Abacate', 'Pimentão'],
    brands: ['Seleção', 'Orgânico', 'HortiFresh', 'Natural', 'Fazenda', 'Sítio Verde', 'Do Pomar', 'Frescor', 'Do Campo', 'AgroNatural'],
    variations: ['kg', 'Bandeja 500g', 'Unidade', 'Saco 1kg', 'Maço'],
    units: ['KG', 'PCT', 'UN'],
    basePrice: 5.80
  },
  Açougue: {
    items: ['Picanha Bovina', 'Alcatra', 'Contrafilé', 'Maminha', 'Fraldinha', 'Cupim', 'Coxão Mole', 'Patinho Moído', 'Costela', 'Filé Mignon', 'Peito de Frango', 'Coxa de Frango', 'Sobrecoxa', 'Coração', 'Lombo Suíno', 'Costelinha Suína', 'Linguiça', 'Bacon'],
    brands: ['Friboi', 'Seara', 'Sadia', 'Perdigão', 'Swift', 'Maturatta', 'Minerva', 'Plena', 'Pamplona', 'Korin'],
    variations: ['kg', 'Bandeja 500g', 'Bandeja 1kg', 'Pacote 800g'],
    units: ['KG', 'PCT'],
    basePrice: 29.90
  },
  Peixaria: {
    items: ['Filé de Tilápia', 'Filé de Salmão', 'Filé de Merluza', 'Cação em Postas', 'Camarão Limpo', 'Polvo', 'Lula em Anéis', 'Bacalhau Desfiado', 'Tambaqui', 'Sardinha', 'Kani Kama', 'Mexilhão', 'Robalo', 'Panga'],
    brands: ['Costa Sul', 'Frescatto', 'Gomes da Costa', 'DellMar', 'Marpesca', 'SeaFoods', 'Qualitá', 'Pescanova', 'Swift', 'Oceano'],
    variations: ['500g', '1kg', 'Bandeja 400g', 'kg'],
    units: ['PCT', 'KG'],
    basePrice: 39.00
  },
  Padaria: {
    items: ['Pão Francês', 'Pão de Forma', 'Pão Integral', 'Pão de Hambúrguer', 'Bisnaguinha', 'Pão de Queijo', 'Bolo de Fubá', 'Bolo de Chocolate', 'Torrada', 'Croissant', 'Pão Sírio', 'Sonho', 'Broa de Milho', 'Baguete'],
    brands: ['Wickbold', 'Pullman', 'Nutrella', 'Bauducco', 'Visconti', 'Padaria Própria', 'Plus Vita', 'Seven Boys', 'Kim', 'Panco'],
    variations: ['kg', '400g', '500g', '300g', '200g'],
    units: ['KG', 'PCT', 'UN'],
    basePrice: 7.90
  },
  Congelados: {
    items: ['Pizza Calabresa', 'Pizza Mussarela', 'Lasanha Bolognesa', 'Nuggets de Frango', 'Hambúrguer', 'Batata Palito', 'Anéis de Cebola', 'Sorvete Creme', 'Sorvete Chocolate', 'Açaí', 'Vegetais Mistos', 'Ervilha', 'Pão de Alho', 'Escondidinho'],
    brands: ['Sadia', 'Seara', 'Perdigão', 'McCain', 'Kibon', 'Nestlé', 'Friboi', 'Bratz', 'Dely', 'Ouro Real'],
    variations: ['460g', '600g', '300g', '2kg', '1.5L', '1L'],
    units: ['UN', 'PCT'],
    basePrice: 18.50
  },
  Limpeza: {
    items: ['Detergente Neutro', 'Detergente Coco', 'Sabão em Pó', 'Sabão Líquido', 'Amaciante', 'Água Sanitária', 'Desinfetante Lavanda', 'Lustra Móveis', 'Multiuso', 'Esponja', 'Lã de Aço', 'Saco de Lixo', 'Álcool 70%', 'Limpa Vidros', 'Pedra Sanitária'],
    brands: ['Ipê', 'Ypê', 'Omo', 'Brilhante', 'Comfort', 'Downy', 'Veja', 'Pinho Sol', 'QBoa', 'Limpol'],
    variations: ['500ml', '800g', '1.6kg', '2L', '1L', '500g'],
    units: ['UN', 'PCT'],
    basePrice: 9.20
  },
  'Higiene Pessoal': {
    items: ['Sabonete Barra', 'Sabonete Líquido', 'Shampoo', 'Condicionador', 'Máscara Capilar', 'Desodorante Roll-on', 'Desodorante Aerosol', 'Creme Corporal', 'Protetor Solar', 'Creme de Pentear', 'Algodão', 'Hastes Flexíveis', 'Absorvente', 'Sabonete Íntimo', 'Lâmina de Barbear'],
    brands: ['Dove', 'Rexona', 'Nivea', 'Pantene', 'Seda', 'Elseve', 'Palmolive', 'Lux', 'Gillette', 'Sundown'],
    variations: ['85g', '250ml', '400ml', '150ml', '200g'],
    units: ['UN', 'PCT'],
    basePrice: 12.80
  },
  'Higiene Bucal': {
    items: ['Creme Dental', 'Creme Dental Branqueador', 'Escova Dental Macia', 'Escova Dental Média', 'Fio Dental', 'Enxaguante Bucal', 'Fixador de Dentadura', 'Raspador de Língua', 'Gel Dental Infantil', 'Kit Escovas'],
    brands: ['Colgate', 'Oral-B', 'Sensodyne', 'Close Up', 'Corochita', 'Listerine', 'Plax', 'Fixodent', 'Jade', 'Bitufo'],
    variations: ['90g', '70g', '500ml', '250ml', '50m', 'Unidade'],
    units: ['UN', 'PCT'],
    basePrice: 10.50
  },
  Bebê: {
    items: ['Fralda Descartável P', 'Fralda Descartável M', 'Fralda Descartável G', 'Fralda Descartável XG', 'Lenço Umedecido', 'Pomada Assadura', 'Fórmula Infantil', 'Papinha Frutas', 'Shampoo Bebê', 'Sabonete Bebê', 'Colônia Bebê', 'Mamadeira'],
    brands: ['Pampers', 'Huggies', 'HIPO', 'Mustela', 'Johnson\'s', 'NAN', 'Aptamil', 'Mucilon', 'Granado', 'Bpantol'],
    variations: ['Pacote 40un', 'Pacote 32un', '120g', '800g', '200ml'],
    units: ['PCT', 'UN'],
    basePrice: 35.90
  },
  'Pet Shop': {
    items: ['Ração Cães Adultos', 'Ração Cães Filhotes', 'Ração Gatos Adultos', 'Ração Gatos Filhotes', 'Sachê Cães', 'Sachê Gatos', 'Petisco Biscoito', 'Bifinho Cães', 'Areia Sanitária', 'Shampoo Pet', 'Tapete Higiênico', 'Antipulgas', 'Osso Pet'],
    brands: ['Pedigree', 'Whiskas', 'Royal Canin', 'Premier', 'Golden', 'Friskies', 'Magnus', 'Champi', 'Pipicat', 'Baw Waw'],
    variations: ['1kg', '3kg', '10.1kg', '85g', '4kg', '30un'],
    units: ['PCT', 'UN'],
    basePrice: 25.50
  },
  'Frios e Embutidos': {
    items: ['Presunto Fatiado', 'Peito de Peru', 'Salame', 'Mortadela', 'Muçarela Fatiada', 'Queijo Prato Fatiado', 'Queijo Gouda', 'Provolone', 'Gorgonzola', 'Lombo Defumado', 'Salsicha', 'Calabresa'],
    brands: ['Sadia', 'Seara', 'Perdigão', 'Ceratti', 'Pamplona', 'Vigor', 'Tirolez', 'Rocca', 'Polenghi'],
    variations: ['200g', '150g', 'kg', '500g', '100g'],
    units: ['PCT', 'KG'],
    basePrice: 14.90
  },
  'Doces e Chocolates': {
    items: ['Chocolate Ao Leite', 'Chocolate Meio Amargo', 'Chocolate Branco', 'Bombons Sortidos', 'Sonho de Valsa', 'Balas de Goma', 'Chiclete', 'Doce de Leite', 'Goiabada', 'Paçoca', 'M&M\'s', 'Barra de Cereal', 'Achocolatado', 'Bis'],
    brands: ['Nestlé', 'Garoto', 'Lacta', 'Hershey\'s', 'Ferrero', 'Fini', 'Arcor', 'Toddynho', 'Nescau'],
    variations: ['90g', '250g', '400g', '100g', '126g'],
    units: ['UN', 'PCT', 'CX'],
    basePrice: 6.90
  },
  'Biscoitos e Snacks': {
    items: ['Biscoito Recheado', 'Wafer Chocolate', 'Cream Cracker', 'Água e Sal', 'Maizena', 'Biscoito Maria', 'Batata Chips', 'Salgadinho Milho', 'Amendoim Salgado', 'Castanha de Caju', 'Pipoca Micro-ondas', 'Cookies'],
    brands: ['Bauducco', 'MDI', 'Nestlé', 'Mabel', 'Adria', 'Lays', 'Ruffles', 'Doritos', 'Cheetos', 'Yoki'],
    variations: ['130g', '200g', '400g', '100g', '80g'],
    units: ['PCT'],
    basePrice: 4.90
  },
  'Temperos e Condimentos': {
    items: ['Sal Refinado', 'Sal Grosso', 'Pimenta do Reino', 'Orégano', 'Azeite Extra Virgem', 'Vinagre de Maçã', 'Ketchup', 'Maionese', 'Mostarda', 'Molho Shoyu', 'Molho Inglês', 'Caldo de Carne', 'Colorau', 'Cominho'],
    brands: ['Cica', 'Hellmann\'s', 'Heinz', 'Arisco', 'Knorr', 'Kitano', 'Gallo', 'Borges', 'Castelo', 'Sakura'],
    variations: ['1kg', '500ml', '200g', '150ml', '50g'],
    units: ['PCT', 'UN'],
    basePrice: 8.90
  },
  'Enlatados e Conservas': {
    items: ['Milho Verde', 'Ervilha', 'Seleta de Legumes', 'Azeitona Verde', 'Atum Sólido', 'Sardinha em Óleo', 'Molho de Tomate', 'Extrato de Tomate', 'Passata', 'Champignon', 'Palmito', 'Picles', 'Tomate Pelado'],
    brands: ['Quero', 'Fugini', 'Elefante', 'Gomes da Costa', 'Coqueiro', 'Oderich', 'Hemmer', 'Predilecta', 'Bonduelle', 'Camil'],
    variations: ['170g', '200g', '300g', '340g', '500g'],
    units: ['UN'],
    basePrice: 5.90
  },
  'Utilidades Domésticas': {
    items: ['Papel Higiênico', 'Papel Toalha', 'Guardanapo', 'Papel Alumínio', 'Filme PVC', 'Saco para Congelar', 'Filtro de Café', 'Fósforo', 'Lâmpada LED', 'Vela', 'Copo Descartável', 'Prato Descartável', 'Luva de Borracha', 'Pano Multiuso', 'Pilha AA'],
    brands: ['Neve', 'Personal', 'Snob', 'Wyda', 'Melitta', 'Rayovac', 'Duracell', 'Tramontina', 'Fiat Lux'],
    variations: ['Pack', 'Unidade', 'Rolo', 'Caixa', 'Pacote'],
    units: ['PCT', 'UN', 'CX'],
    basePrice: 11.50
  },
  'Alimentos Saudáveis': {
    items: ['Aveia Integral', 'Granola com Mel', 'Semente de Chia', 'Linhaça Dourada', 'Quinoa em Grãos', 'Rice Cake', 'Pão Sem Glúten', 'Leite de Amêndoas', 'Açúcar de Coco', 'Adoçante Stévia', 'Pasta de Amendoim', 'Proteína de Soja', 'Whey Protein', 'Barra de Proteína', 'Chips Batata Doce'],
    brands: ['Quaker', 'Mãe Terra', 'Jasmine', 'Taeq', 'Vitao', 'Natural Life', 'Nutry', 'Max Titanium', 'Growth', 'La Pianezza'],
    variations: ['200g', '500g', '1kg', '1L', '150g', '900g'],
    units: ['PCT', 'UN'],
    basePrice: 16.50
  }
};

function generateProductsForCategory(categoryName, categoryId, prefix) {
  const spec = PRODUCT_TEMPLATES[categoryName] || PRODUCT_TEMPLATES['Mercearia'];
  const products = [];
  let count = 1;

  for (let i = 0; i < spec.items.length; i++) {
    for (let j = 0; j < 7; j++) {
      if (count > 100) break;

      const item = spec.items[i];
      const brand = spec.brands[(i + j) % spec.brands.length];
      const variation = spec.variations[j % spec.variations.length];
      const unit = spec.units[j % spec.units.length];

      const skuNumber = String(count).padStart(6, '0');
      const sku = `${prefix}-${skuNumber}`;
      
      const fullName = `${item} ${brand} ${variation}`;
      const description = `${item} da marca ${brand}, embalagem ${variation}.`;
      
      const priceFactor = 0.80 + (j * 0.25) + ((i % 3) * 0.1);
      const calculatedPrice = parseFloat((spec.basePrice * priceFactor).toFixed(2));

      products.push({
        category_id: categoryId,
        sku: sku,
        name: fullName.substring(0, 180),
        description: description,
        price: calculatedPrice,
        unit: unit,
        active: true,
        updated_at: null
      });

      count++;
    }
    if (count > 100) break;
  }

  // Se por acaso faltar pra bater exatamente 100 por categoria, completa o lote
  while (count <= 100) {
    const skuNumber = String(count).padStart(6, '0');
    const sku = `${prefix}-${skuNumber}`;
    products.push({
      category_id: categoryId,
      sku: sku,
      name: `Produto Especial ${categoryName} ${count}`,
      description: `Item exclusivo da categoria ${categoryName}.`,
      price: 15.00,
      unit: 'UN',
      active: true,
      updated_at: null
    });
    count++;
  }

  return products;
}

async function seedCatalog() {
  console.log('🚀 Iniciando o Seed de Catálogo — Supermercado Inteligente...');
  const startTime = Date.now();

  try {
    console.log('📦 Passo 1: Processando Categorias...');
    for (const cat of CATEGORIES_SPEC) {
      const existing = await dbOLTP('categories').select('id').where({ name: cat.name }).first();
      if (!existing) {
        await dbOLTP('categories').insert({
          name: cat.name,
          description: cat.description,
          active: true
        });
      }
    }

    const dbCategories = await dbOLTP('categories').select('id', 'name');
    const categoryIdMap = {};
    dbCategories.forEach(c => {
      categoryIdMap[c.name] = c.id;
    });

    console.log(`✅ Categorias prontas no banco (${dbCategories.length} registradas).`);

    console.log('🛒 Passo 2: Gerando catálogo de ~2.000 produtos...');
    let allProducts = [];
    for (const catSpec of CATEGORIES_SPEC) {
      const catId = categoryIdMap[catSpec.name];
      if (!catId) {
        throw new Error(`Categoria '${catSpec.name}' não foi encontrada no banco!`);
      }
      const catProducts = generateProductsForCategory(catSpec.name, catId, catSpec.prefix);
      allProducts = allProducts.concat(catProducts);
    }

    console.log(`📊 Total de produtos gerados em memória: ${allProducts.length}`);

    console.log('💾 Passo 3: Inserindo/Atualizando produtos em lotes de 250 registros...');
    const BATCH_SIZE = 250;
    let insertedOrUpdatedCount = 0;

    for (let i = 0; i < allProducts.length; i += BATCH_SIZE) {
      const batch = allProducts.slice(i, i + BATCH_SIZE);

      const valuesSql = batch.map(p => {
        const escDescription = p.description ? `'${p.description.replace(/'/g, "''")}'` : 'NULL';
        const escName = `'${p.name.replace(/'/g, "''")}'`;
        const escSku = `'${p.sku}'`;
        const escUnit = `'${p.unit}'`;
        const escActive = p.active ? 1 : 0;
        
        return `(${p.category_id}, ${escSku}, ${escName}, ${escDescription}, ${p.price}, ${escUnit}, ${escActive}, NULL)`;
      }).join(',\n');

      const query = `
        INSERT INTO products (category_id, sku, name, description, price, unit, active, updated_at)
        VALUES ${valuesSql}
        ON DUPLICATE KEY UPDATE
          category_id = VALUES(category_id),
          name = VALUES(name),
          description = VALUES(description),
          price = VALUES(price),
          unit = VALUES(unit),
          active = VALUES(active),
          updated_at = NOW();
      `;

      await dbOLTP.raw(query);
      insertedOrUpdatedCount += batch.length;
      console.log(`   ↳ Lote de ${batch.length} produtos processado (${insertedOrUpdatedCount}/${allProducts.length})`);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`🎉 Seed concluído com sucesso em ${duration}s! Total de produtos processados: ${insertedOrUpdatedCount}.`);

  } catch (error) {
    console.error('❌ Erro durante a execução do seed-catalog:', error);
    process.exitCode = 1;
  } finally {
    await dbOLTP.destroy();
    console.log('🔌 Conexão com o banco finalizada.');
  }
}

seedCatalog();