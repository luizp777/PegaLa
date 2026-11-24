/**
 * Tipo operacional da lista de compras, usado para priorizar sugestões e ícones.
 */
export type ListType = 'mercado' | 'farmacia' | 'geral';

/**
 * Identificador único de um corredor/categoria de produtos.
 */
export type CategoryId =
  | 'hortifruti'
  | 'laticinios'
  | 'padaria'
  | 'acougue'
  | 'mercearia'
  | 'bebidas'
  | 'congelados'
  | 'limpeza'
  | 'utilidades'
  | 'higiene'
  | 'dermocosmeticos'
  | 'medicamentos'
  | 'primeiros_socorros'
  | 'bebe'
  | 'pet'
  | 'outros';

/**
 * Metadados visuais e de ordenação de uma categoria/corredor.
 */
export interface CategoryDefinition {
  /** Identificador único da categoria. */
  id: CategoryId;
  /** Nome legível exibido na interface. */
  label: string;
  /** Ordem de exibição do corredor na lista. */
  order: number;
  /** Classes Tailwind de cor do cabeçalho da categoria. */
  colorClass: string;
}

/**
 * Representa uma lista de compras armazenada localmente e sincronizável na nuvem.
 */
export interface ShoppingList {
  /** Identificador UUID da lista. */
  id: string;
  /** Nome definido pelo usuário (ex.: Mercado, Farmácia). */
  name: string;
  /** Tipo da lista para contextualização de catálogo e ícones. */
  type: ListType;
  /** Código curto compartilhável (ex.: `PEGA-8K4M2P`). */
  shareCode: string;
  /** UUID do usuário criador no Supabase Auth, ou `null` no modo local. */
  ownerId: string | null;
  /** Indica se a lista já foi enviada com sucesso ao backend remoto. */
  isSynced: boolean;
  /** Indica se a lista é compartilhada (convite aceito ou compartilhada pelo dono). */
  isShared?: boolean;
  /** Timestamp ISO 8601 de criação da lista. */
  createdAt: string;
  /** Timestamp ISO 8601 da última atualização da lista. */
  updatedAt: string;
}

/**
 * Representa um item pertencente a uma lista de compras.
 */
export interface ShoppingItem {
  /** Identificador UUID do item. */
  id: string;
  /** UUID da lista à qual o item pertence. */
  listId: string;
  /** Nome de exibição do item (capitalizado). */
  name: string;
  /** Nome normalizado (sem acentos e em minúsculas) para deduplicação e busca. */
  normalizedName: string;
  /** Quantidade numérica do item (ex.: `2`, `500`, `1.5`). */
  quantity: number;
  /** Unidade de medida do item (ex.: `un`, `g`, `kg`, `cx`, `L`). */
  unit: string;
  /** Categoria/corredor ao qual o item pertence. */
  categoryId: CategoryId;
  /** Indica se o item já foi colocado no carrinho. */
  isChecked: boolean;
  /** Timestamp ISO 8601 em que o item foi marcado como pego, ou `null`. */
  checkedAt: string | null;
  /** Timestamp ISO 8601 de criação do item. */
  createdAt: string;
  /** Timestamp ISO 8601 da última modificação do item. */
  updatedAt: string;
}

/**
 * Registro de aprendizado e frequência do dicionário pessoal do usuário.
 */
export interface UserDictionaryEntry {
  /** Chave primária autoincremental no IndexedDB. */
  id?: number;
  /** Termo normalizado usado como chave única de busca. */
  normalizedTerm: string;
  /** Nome formatado exibido nas sugestões rápidas. */
  displayName: string;
  /** Categoria preferida ou aprendida para este termo. */
  categoryId: CategoryId;
  /** Quantidade de vezes em que o item foi adicionado. */
  usageCount: number;
  /** Timestamp ISO 8601 do último uso do termo. */
  lastUsedAt: string;
}

/**
 * Tipo de operação enfileirada para sincronização offline-first.
 */
export type SyncActionType =
  | 'upsert_list'
  | 'delete_list'
  | 'leave_list'
  | 'upsert_item'
  | 'delete_item';

/**
 * Mutação pendente na fila local de sincronização com o Supabase.
 */
export interface PendingSyncMutation {
  /** Chave primária autoincremental que preserva a ordem cronológica da fila. */
  id?: number;
  /** Tipo de operação a ser executada remotamente. */
  action: SyncActionType;
  /** UUID da entidade afetada (lista ou item). */
  entityId: string;
  /** UUID da lista associada à mutação. */
  listId: string;
  /** Dados serializados necessários para aplicar a mutação na nuvem. */
  payload: Record<string, unknown>;
  /** Timestamp ISO 8601 de enfileiramento. */
  createdAt: string;
}

/**
 * Resultado estruturado da análise textual de uma linha digitada ou colada.
 */
export interface ParsedItemInput {
  /** Nome limpo e capitalizado do item. */
  name: string;
  /** Nome normalizado para deduplicação e categorização. */
  normalizedName: string;
  /** Quantidade extraída (padrão `1`). */
  quantity: number;
  /** Unidade de medida extraída (padrão `un`). */
  unit: string;
}
