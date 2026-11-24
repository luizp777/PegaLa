import type { CategoryId } from '../types';

/**
 * Catálogo amplo e prático (~370+ itens) organizado por corredor para inclusão rápida via touchscreen.
 * Isolado em módulo próprio para carregamento sob demanda junto ao {@link QuickCatalogDrawer}.
 */
export const CATALOG_BY_CATEGORY: Record<Exclude<CategoryId, 'outros'>, string[]> = {
  hortifruti: [
    'Banana prata', 'Banana nanica', 'Maçã', 'Laranja', 'Limão', 'Mamão', 'Melancia', 'Melão',
    'Uva', 'Morango', 'Abacaxi', 'Abacate', 'Manga', 'Pera', 'Kiwi', 'Maracujá',
    'Tomate', 'Tomate cereja', 'Cebola', 'Alho', 'Batata inglesa', 'Batata doce', 'Mandioquinha',
    'Cenoura', 'Beterraba', 'Alface', 'Rúcula', 'Couve', 'Espinafre', 'Brócolis', 'Couve-flor',
    'Repolho', 'Pepino', 'Pimentão', 'Abobrinha', 'Berinjela', 'Chuchu', 'Mandioca',
    'Milho verde', 'Cheiro verde', 'Gengibre', 'Cogumelo', 'Ovos brancos', 'Ovos caipira',
  ],
  padaria: [
    'Pão francês', 'Pão de forma', 'Pão integral', 'Bisnaguinha', 'Pão de queijo', 'Croissant',
    'Torrada', 'Bolo', 'Café moído', 'Café em cápsula', 'Café solúvel', 'Cappuccino',
    'Chá de camomila', 'Achocolatado', 'Granola', 'Aveia', 'Cereal matinal', 'Biscoito doce',
    'Bolacha água e sal', 'Cream cracker', 'Cookie', 'Tapioca', 'Mel', 'Geleia', 'Pasta de amendoim',
  ],
  laticinios: [
    'Leite integral', 'Leite desnatado', 'Leite sem lactose', 'Leite em pó', 'Leite de aveia',
    'Leite de amêndoas', 'Iogurte natural', 'Iogurte grego', 'Leite fermentado', 'Manteiga',
    'Margarina', 'Requeijão', 'Cream cheese', 'Queijo mussarela', 'Queijo prato', 'Queijo minas',
    'Parmesão', 'Ricota', 'Cottage', 'Presunto', 'Peito de peru', 'Salame', 'Mortadela',
    'Creme de leite', 'Leite condensado', 'Chantilly', 'Massa de pastel',
  ],
  acougue: [
    'Peito de frango', 'Filé de frango', 'Coxa e sobrecoxa', 'Asa de frango', 'Carne moída',
    'Patinho', 'Alcatra', 'Contrafilé', 'Picanha', 'Filé mignon', 'Costela bovina', 'Acém',
    'Músculo', 'Carne seca', 'Lombo suíno', 'Bisteca suína', 'Costelinha suína', 'Bacon',
    'Linguiça toscana', 'Linguiça calabresa', 'Salsicha', 'Hambúrguer', 'Tilápia', 'Salmão',
    'Merluza', 'Bacalhau', 'Camarão', 'Atum em lata', 'Sardinha em lata',
  ],
  mercearia: [
    'Arroz branco', 'Arroz integral', 'Feijão carioca', 'Feijão preto', 'Lentilha', 'Grão-de-bico',
    'Macarrão espaguete', 'Macarrão penne', 'Macarrão parafuso', 'Miojo', 'Massa de lasanha',
    'Farinha de trigo', 'Farinha de mandioca', 'Farinha de rosca', 'Farofa', 'Fubá',
    'Amido de milho', 'Polvilho', 'Flocão de milho', 'Açúcar refinado', 'Açúcar cristal',
    'Açúcar mascavo', 'Adoçante', 'Sal refinado', 'Sal grosso', 'Azeite de oliva', 'Óleo de soja',
    'Vinagre', 'Molho de tomate', 'Extrato de tomate', 'Ketchup', 'Mostarda', 'Maionese',
    'Shoyu', 'Orégano', 'Páprica', 'Pimenta-do-reino', 'Azeitona', 'Milho em conserva',
    'Ervilha', 'Palmito', 'Fermento em pó', 'Chocolate', 'Chocolate em pó', 'Pipoca',
    'Amendoim', 'Castanha de caju', 'Batata palha', 'Salgadinho', 'Leite de coco', 'Coco ralado', 'Gelatina',
  ],
  congelados: [
    'Pizza congelada', 'Batata frita congelada', 'Nuggets', 'Lasanha congelada', 'Hambúrguer congelado',
    'Pão de alho', 'Legumes congelados', 'Polpa de fruta', 'Sorvete', 'Açaí', 'Picolé', 'Gelo',
  ],
  bebidas: [
    'Água mineral', 'Água com gás', 'Água de coco', 'Água tônica', 'Suco de laranja',
    'Suco de uva', 'Refrigerante cola', 'Guaraná', 'Refrigerante limão', 'Chá gelado',
    'Isotônico', 'Energético', 'Cerveja', 'Cerveja zero', 'Vinho tinto', 'Vinho branco',
    'Espumante', 'Gin', 'Vodka',
  ],
  limpeza: [
    'Detergente', 'Sabão em pó', 'Sabão líquido', 'Sabão em barra', 'Amaciante', 'Tira-manchas',
    'Água sanitária', 'Alvejante', 'Desinfetante', 'Multiuso', 'Desengordurante', 'Limpa-vidros',
    'Álcool 70%', 'Esponja de louça', 'Palha de aço', 'Pano de chão', 'Flanela',
    'Saco de lixo 30L', 'Saco de lixo 50L', 'Saco de lixo 100L', 'Papel toalha', 'Guardanapo',
    'Inseticida', 'Odorizador de ambiente', 'Pastilha sanitária', 'Lustra-móveis', 'Luva de limpeza',
  ],
  utilidades: [
    'Papel alumínio', 'Filme PVC', 'Papel manteiga', 'Saco freezer', 'Filtro de café',
    'Palito de dente', 'Fósforo', 'Isqueiro', 'Carvão', 'Acendedor', 'Vela', 'Pilha AA',
    'Pilha AAA', 'Lâmpada LED', 'Fita adesiva', 'Super cola', 'Prendedor de roupa',
    'Copo descartável', 'Cabide',
  ],
  higiene: [
    'Papel higiênico', 'Sabonete em barra', 'Sabonete líquido', 'Shampoo', 'Condicionador',
    'Máscara capilar', 'Creme de pentear', 'Pasta de dente', 'Escova de dente', 'Fio dental',
    'Enxaguante bucal', 'Desodorante aerosol', 'Desodorante roll-on', 'Absorvente',
    'Protetor diário', 'Cotonete', 'Algodão', 'Lenço de papel', 'Aparelho de barbear',
    'Lâmina de barbear', 'Espuma de barbear', 'Álcool em gel', 'Repelente',
  ],
  dermocosmeticos: [
    'Protetor solar facial', 'Protetor solar corporal', 'Hidratante corporal', 'Hidratante facial',
    'Hidratante labial', 'Água micelar', 'Sabonete facial', 'Gel de limpeza facial',
    'Sérum vitamina C', 'Ácido hialurônico', 'Retinol', 'Niacinamida', 'Demaquilante',
    'Óleo corporal', 'Creme para mãos', 'Acetona', 'Esmalte', 'Lixa de unha', 'Pinça',
    'Cortador de unha', 'Perfume',
  ],
  medicamentos: [
    'Dipirona 500mg', 'Dipirona 1g', 'Dipirona gotas', 'Paracetamol', 'Ibuprofeno', 'Dorflex',
    'Neosaldina', 'Buscopan', 'Omeprazol', 'Pantoprazol', 'Sal de frutas', 'Antiácido',
    'Antigripal', 'Xarope para tosse', 'Pastilha garganta', 'Spray nasal', 'Descongestionante',
    'Loratadina', 'Antialérgico', 'Colírio lubrificante', 'Dramin', 'Probiótico',
    'Pomada anti-inflamatória', 'Pomada antibiótica', 'Vitamina C', 'Vitamina D', 'Complexo B',
    'Magnésio', 'Ômega 3', 'Melatonina', 'Creatina', 'Whey protein', 'Colágeno',
    'Losartana', 'Metformina', 'Sinvastatina',
  ],
  primeiros_socorros: [
    'Band-aid', 'Curativo transparente', 'Esparadrapo', 'Micropore', 'Gaze estéril', 'Atadura',
    'Soro fisiológico', 'Água oxigenada', 'Antisséptico spray', 'Clorexidina',
    'Termômetro digital', 'Seringa', 'Luva descartável', 'Máscara cirúrgica',
    'Bolsa térmica', 'Preservativo', 'Teste de gravidez', 'Teste covid',
  ],
  bebe: [
    'Fralda P', 'Fralda M', 'Fralda G', 'Fralda XG', 'Lenço umedecido bebê',
    'Pomada de assadura', 'Fórmula infantil', 'Papinha', 'Sabonete bebê', 'Shampoo bebê',
    'Mamadeira', 'Chupeta', 'Cotonete bebê', 'Soro nasal bebê',
  ],
  pet: [
    'Ração cachorro', 'Ração gato', 'Sachê gato', 'Sachê cachorro', 'Petisco cachorro',
    'Ossinho', 'Areia de gato', 'Tapete higiênico', 'Shampoo pet', 'Antipulgas',
    'Saquinho cata-caca',
  ],
};
