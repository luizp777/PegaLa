# Status — Planos de Melhoria do PegaLá

---

## Ciclo 7 — Code Review Geral (Foco em Modais, Integridade de Sync/Realtime, Hardening SQL & UX)

> **Status**: Concluído (10/10 concluídos)
> **Data de conclusão**: 2026-11-24

### P0 — Alta Prioridade (Integridade de Sync, Realtime, Segurança SQL e Foco)
- [x] **C7-01. Corrigir perda de foco em modais em re-renders do pai** (`useModalAccessibility.ts`): `onClose` mantido via `useRef`, eliminando re-execução do focus-trap/scroll-lock com callbacks inline.
- [x] **C7-02. Deduplicar por `normalizedName` no Realtime e recuperar exclusão da última lista** (`syncEngine.ts`, `useActiveList.ts`).
- [x] **C7-03. Limpar mutações `upsert_item` substituídas em erro permanente e drenar `delete_item` em `syncListNow`** (`syncEngine.ts`).
- [x] **C7-04. Constraints `CHECK` de comprimento em `lists`/`list_items` e limpeza global de `join_attempts`** (`supabase/schema.sql`).

### P1 — Média Prioridade (Atomicidade Local, Convidados Offline e Acessibilidade)
- [x] **C7-05. Transações atômicas completas em `runEnsureDefaultLists` (com Web Lock), `renameList`, `uncheckAllItems` e validação em `setItemExactQuantityAndUnit`** (`localDb.ts`).
- [x] **C7-06. Proteção de ação destrutiva no `Header` antes da hidratação da sessão** (`Header.tsx`).
- [x] **C7-07. Reset do filtro em `CheckedSection` por lista, listeners sob demanda e foco/ARIA no menu do `Header`** (`App.tsx`, `Header.tsx`).
- [x] **C7-08. Refs síncronas no gesto de swipe e limpeza de `suppressClickRef` no `touchcancel`** (`ShoppingItemRow.tsx`).

### P2 — Baixa Prioridade (Polimento de UI, Limpeza e Testes)
- [x] **C7-09. Offset do `PwaUpdatePrompt`, `aria-live` na voz, `useMemo` em nomes duplicados e helper `isSpeechRecognitionSupported`** (`PwaUpdatePrompt.tsx`, `QuickAddBar.tsx`, `speechParser.ts`, `App.tsx`).
- [x] **C7-10. Testes de regressão do Ciclo 7** (`syncEngine.test.ts`, `localDb.test.ts`, `uiComponents.test.tsx`).

---

## Ciclo 6 — Design Review Geral (PWA iOS, Acessibilidade WCAG AA & Fluxos Mobile)

> **Status**: Concluído (12/12 concluídos)
> **Data de conclusão**: 2026-11-24

### P0 — Alta Prioridade (Mobile/iOS PWA, Sobreposições e Bloqueios de UX)
- [x] **C6-01. Safe areas no iOS Standalone** (`index.css`, `Header.tsx`, `ShareModal.tsx`, `CreateListModal.tsx`, `CategoryPickerSheet.tsx`): `.pt-safe` no `<header>` e `pb-safe` + `max-h-[90dvh] overflow-y-auto` + drag handle unificado nos 3 Bottom Sheets.
- [x] **C6-02. Sincronização de `<meta name="theme-color">`** (`index.html`, `theme-init.js`, `useTheme.ts`): atualização dinâmica entre `#ffffff` (claro) e `#09090b` (escuro).
- [x] **C6-03. Toasts e `PwaUpdatePrompt` sem bloqueio de cliques ou colisão** (`App.tsx`, `PwaUpdatePrompt.tsx`): `pointer-events-none` no container externo, toast com offset de safe-area e `PwaUpdatePrompt` ancorado acima do dock inferior.
- [x] **C6-04. Exclusão acessível no mobile e `Enter` para salvar no `CategoryPickerSheet`** (`CategoryPickerSheet.tsx`, `App.tsx`): `<form onSubmit>` para salvar com `Enter` e botão explícito `"Excluir item"`.

### P1 — Média Prioridade (Acessibilidade WCAG AA, Alvos de Toque e Clareza de Fluxos)
- [x] **C6-05. Focus trap, retorno de foco, scroll-lock e `<label htmlFor>` nos modais** (`useModalAccessibility.ts`, `CategoryPickerSheet.tsx`, `ShareModal.tsx`, `CreateListModal.tsx`).
- [x] **C6-06. Semântica ARIA e HTML válido** (`CategoryGroup.tsx`, `ShoppingItemRow.tsx`, `Header.tsx`, `QuickAddBar.tsx`, `CheckedSection.tsx`, `QuickCatalogDrawer.tsx`, `index.css`).
- [x] **C6-07. Contraste WCAG AA em cores claras e ícones secundários** (`dictionaryPtBr.ts`, `Header.tsx`, `PwaInstallBanner.tsx`).
- [x] **C6-08. Alvos de toque mínimos confortáveis (≥ 36–44px)** (`App.tsx`, `QuickCatalogDrawer.tsx`, `ActiveListToolbar.tsx`, `CheckedSection.tsx`, `PwaUpdatePrompt.tsx`, `Header.tsx`).
- [x] **C6-09. Clareza nos fluxos de compra** (`ShoppingItemRow.tsx`, `PwaInstallBanner.tsx`, `App.tsx`, `ShoppingCompleteCard.tsx`, `CheckedSection.tsx`, `ActiveListToolbar.tsx`): quantidade em itens marcados, `line-clamp-2` no iOS, fallback de colar no empty state, grid responsivo em 320px, persistência de `viewMode` e busca unificada em `>= 8` itens.

### P2 — Baixa Prioridade (Micro-interações, Reduced Motion & Testes)
- [x] **C6-10. Feedback háptico e visual no limiar do Swipe** (`ShoppingItemRow.tsx`).
- [x] **C6-11. Cobertura de `prefers-reduced-motion`, system UI font e placeholder atemporal** (`index.css`, `QuickCatalogDrawer.tsx`).
- [x] **C6-12. Testes de acessibilidade e UX** (`uiComponents.test.tsx`).

---

## Ciclo 5 — Segurança SQL/CSP, Integridade de Sync, Bundle & Acessibilidade

> **Status**: Concluído (13/13 concluídos)
> **Data de conclusão**: 2026-11-24

### Alta Prioridade — Segurança, Integridade & Sincronização
- [x] **C5-01. Revogar `EXECUTE` de `PUBLIC` nas funções `SECURITY DEFINER`** (`supabase/schema.sql`).
- [x] **C5-02. Ordenar `delete_item` antes de `upsert_item` na Phase 2** (`syncEngine.ts`).
- [x] **C5-03. Unificar chunking (`upsertItemsInChunks`), corrigir `failedListIds`/`ownerId` e proteger `syncListNow`** (`syncEngine.ts`).
- [x] **C5-04. Reconciliação atômica em `pullListFromCloud` via transação Dexie** (`syncEngine.ts`).
- [x] **C5-05. Eliminar re-subscribe duplicado do Realtime e renovar token WebSocket** (`useActiveList.ts`, `syncEngine.ts`).

### Média Prioridade — Offline, Parser & Segurança Web
- [x] **C5-06. Preservar `?join=` em erro de conexão e validar sessão/reconciliar itens em `joinSharedListByCode`** (`useActiveList.ts`, `syncEngine.ts`).
- [x] **C5-07. Transação atômica em `runEnsureDefaultLists` e remoção de deletes redundantes** (`localDb.ts`).
- [x] **C5-08. Proteger expressões com `"e"` (`vitamina e`, `água e sal`, `coxa e sobrecoxa`) na voz** (`speechParser.ts`).
- [x] **C5-09. Extrair `theme-init.js` e remover `'unsafe-inline'` de `script-src` na CSP** (`public/theme-init.js`, `index.html`, `vercel.json`, `vite.config.ts`).
- [x] **C5-10. Expor feedback de erro ao falhar `useWakeLock`** (`wakeLock.ts`, `App.tsx`).

### Baixa Prioridade — Bundle, Acessibilidade & Testes
- [x] **C5-11. Corrigir chunking de `react`/`react-dom`/`scheduler` no Vite** (`vite.config.ts`).
- [x] **C5-12. Polimento de acessibilidade (`role="menu"`, `aria-expanded`, `aria-pressed`, `Escape`)** (`Header.tsx`, `ShareModal.tsx`, `ActiveListToolbar.tsx`, `QuickCatalogDrawer.tsx`).
- [x] **C5-13. Corrigir teste do `Header` e adicionar testes de ordem de sync, `pullListFromCloud` e `speechParser`** (`uiComponents.test.tsx`, `syncEngine.test.ts`, `itemParser.test.ts`).

---

## Ciclo 4 — Design, UI/UX, Performance, Escalabilidade & Estabilidade

> **Status**: Concluído (10/10 concluídos)
> **Data de conclusão**: 2026-11-24

### Design & UI/UX (Ergonomia no Mercado)
- [x] **U01. Skeleton de carregamento inicial** (`App.tsx`): 3 cards skeleton minimalistas substituindo tela em branco durante carregamento.
- [x] **U02. Busca rápida e pílulas de corredor na lista ativa** (`ActiveListToolbar.tsx`, `App.tsx`): busca instantânea (`10+` itens), pílulas por corredor (`2+` corredores) com reset automático ao trocar de lista ou concluir corredor.
- [x] **U03. Persistência de corredores recolhidos + Recolher/Expandir todos** (`CategoryGroup.tsx`, `App.tsx`, `ActiveListToolbar.tsx`).

### Performance & Bundle
- [x] **P01. Extrair `CATALOG_BY_CATEGORY` para chunk lazy** (`catalogPtBr.ts`, `dictionaryPtBr.ts`, `QuickCatalogDrawer.tsx`).
- [x] **P02. Lookup O(1) de ícones + memoização** (`itemIconMap.ts`, `ItemIcon.tsx`, `ShoppingItemRow.tsx`, `App.tsx`).

### Escalabilidade de Sincronização
- [x] **S01. Batching de mutações por lista** (`syncEngine.ts`): lotes de até 100 itens com deduplicação por `normalizedName` (evitando erro `21000`) e fallback individual para erros permanentes.
- [x] **S02. Debounce de `pullListFromCloud` no Realtime** (`syncEngine.ts`).

### Estabilidade, Multi-aba & Testes
- [x] **E01. Coordenação multi-aba via Web Locks API** (`syncEngine.ts`).
- [x] **E02. Gatilho manual de sincronização no `Header`** (`Header.tsx`, `App.tsx`).
- [x] **E03. Suíte de testes de componentes React** (`uiComponents.test.tsx`, `syncEngine.test.ts`).

---

## Ciclo 3 — Code Review Geral (Sincronização, Segurança, Transações & Bundle)

> **Status**: Concluído (14/14 concluídos)
> **Data de conclusão**: 2026-11-24

### Alta Prioridade — Sincronização, Autenticação & Segurança Supabase
- [x] **R01. Erro real após 3 colisões `23505`** (`syncEngine.ts`): `upsertListWithCodeRetry` retorna o último `PostgrestError` em vez de `null`.
- [x] **R02. Serialização de `ensureSupabaseSession`** (`supabase.ts`): lock de promise em voo evita criação concorrente de sessões anônimas.
- [x] **R03. Preservar erro de rate limit `P0001`** (`syncEngine.ts`): `joinSharedListByCode` retorna a mensagem da RPC sem cair no fallback genérico.
- [x] **R04. Eliminar upsert duplicado no seed e backoff de `42501`** (`syncEngine.ts`): limpa mutações satisfeitas no seed e limita retentativas de `42501`.
- [x] **R05. Reconciliação de `lists` e proteção no Realtime** (`syncEngine.ts`, `useActiveList.ts`): reconcilia exclusões/edições de lista, protege `DELETE`/`UPDATE` contra edições pendentes e observa `activeList?.id`.
- [x] **R06. Endurecimento do schema PostgreSQL/RLS** (`supabase/schema.sql`): `search_path = public` em todas as funções, `owner_id = auth.uid()` no insert, proteção de `role = 'owner'`, `check (quantity > 0)`, remoção de índice redundante e grants restritos a `authenticated`.

### Média Prioridade — Integridade Local, Hooks & UX Mobile
- [x] **R07. Transações atômicas no Dexie e deduplicação ao renomear** (`localDb.ts`): `db.transaction('rw', ...)` nas operações de escrita e mesclagem limpa em `updateItemDetails`.
- [x] **R08. Estado de erro no `useWakeLock` e callbacks estáveis** (`wakeLock.ts`, `useActiveList.ts`).
- [x] **R09. Ciclo de vida, feedback OAuth e input anti-zoom iOS** (`PwaUpdatePrompt.tsx`, `ShareModal.tsx`, `Header.tsx`, `CheckedSection.tsx`).
- [x] **R10. Eliminar FOUC de tema escuro** (`index.html`, `useTheme.ts`).
- [x] **R11. Hoist de regex/unidades e proteção de `"meia"` na voz** (`itemParser.ts`, `speechParser.ts`).

### Baixa Prioridade — Bundle, Limpeza PWA/CSP & Testes
- [x] **R12. Logger leve sem `tslog` e lazy load do `QuickCatalogDrawer`** (`logger.ts`, `package.json`, `vite.config.ts`, `QuickAddBar.tsx`).
- [x] **R13. Limpeza de regras mortas de Google Fonts** (`vite.config.ts`, `vercel.json`).
- [x] **R14. Ampliação da suíte de testes** (`syncEngine.test.ts`, `localDb.test.ts`, `itemParser.test.ts`, `supabase.test.ts`).

---

## Ciclo 2 — Design Review Geral (UI, UX Mobile & Acessibilidade)

> **Status**: Concluído (10/10 concluídos)
> **Data de conclusão**: 2026-11-24

### Alta Prioridade — Ergonomia Mobile e Fluxos Essenciais
- [x] **D01. Edição completa de item** (`localDb.ts`, `CategoryPickerSheet.tsx`, `ShoppingItemRow.tsx`, `App.tsx`): `updateItemDetails` + Bottom Sheet editando nome, quantidade, unidade e corredor em um único lugar.
- [x] **D02. Layout responsivo do `Header` em 360px** (`Header.tsx`): badge `Compartilhada`/`Privada` movido para a linha secundária no mobile (`< sm`), liberando largura total para o título.
- [x] **D03. Renomear lista inline no menu** (`localDb.ts`, `Header.tsx`, `App.tsx`): `renameList` + edição inline no dropdown `Suas Listas` (`w-72` animado) sincronizada via Realtime.
- [x] **D04. Viewport acessível (WCAG 2.1 AA)** (`index.html`): removido `maximum-scale=1.0, user-scalable=no` e mantido `text-base` (`16px`) nos inputs.

### Média Prioridade — Clareza, Feedback e Navegação
- [x] **D05. Rótulos curtos (`shortLabel`) no Catálogo Rápido** (`types/index.ts`, `dictionaryPtBr.ts`, `QuickCatalogDrawer.tsx`): `shortLabel` dedicado (ex.: `"1º Socorros"`, `"Dermocosm."`) substituindo `split(' ')[0]`.
- [x] **D06. Corredores recolhíveis** (`CategoryGroup.tsx`): cabeçalho clicável com `ChevronDown` para recolher/expandir corredores em compras longas.
- [x] **D07. Feedback de cópia e placeholder no `ShareModal`** (`ShareModal.tsx`): estado `copiedTarget: 'code' | 'link' | null` e placeholder `Ex: PEGA-ABCD1234`.
- [x] **D08. Reposicionar `PwaUpdatePrompt`** (`PwaUpdatePrompt.tsx`): ancorado em `top-16` com `role="status" aria-live="polite"`, sem colidir com o catálogo aberto.

### Baixa Prioridade — Consistência Visual e Acessibilidade Fina
- [x] **D09. Animações unificadas nos modais** (`ShareModal.tsx`, `CreateListModal.tsx`, `CategoryPickerSheet.tsx`): aplicada classe `.animate-drawer-up`.
- [x] **D10. Acessibilidade e contraste WCAG AA** (`App.tsx`, `index.css`, `Header.tsx`, `QuickCatalogDrawer.tsx`): `role="status" aria-live="polite"` em toasts, `focus-visible` global, contraste `text-zinc-500` no modo claro e badge `text-[11px]` no catálogo.

---

## Ciclo 1 — Code Review Geral (Concluído)

> **Status**: Concluído (20/20 concluídos)
> **Data de conclusão**: 2026-11-24

### Alta Prioridade — Segurança no Supabase
- [x] **01. Fechar RLS de `list_members`** (`supabase/schema.sql`)
- [x] **02. Proteger `owner_id` e `share_code` em `lists`** (`supabase/schema.sql`)
- [x] **03. Proteger código de convite contra força bruta** (`supabase/schema.sql`, `src/db/localDb.ts`)

### Média Prioridade — Sincronização e Dados
- [x] **04. Tratar colisão de `share_code` (`23505`)** (`src/db/syncEngine.ts`)
- [x] **05. Deduplicar itens criados offline entre dispositivos** (`supabase/schema.sql`, `src/db/syncEngine.ts`)
- [x] **06. Timestamp `updated_at` autoritativo no servidor** (`supabase/schema.sql`)
- [x] **07. Propagar alterações e exclusões de `lists` em tempo real** (`supabase/schema.sql`, `src/db/syncEngine.ts`)
- [x] **08. Diferenciar "Apagar para todos" (dono) vs. "Sair da lista" (convidado)** (`Header.tsx`, `localDb.ts`, `syncEngine.ts`, `App.tsx`)
- [x] **09. Evitar chamadas duplicadas de `syncListNow` no `ShareModal`** (`ShareModal.tsx`)

### Média Prioridade — Parser e Regras de Quantidade
- [x] **10. Evitar falsos positivos de quantidade em nomes/marcas** (`itemParser.ts`)
- [x] **11. Tratar quantidades inválidas (`0` ou negativas)** (`itemParser.ts`)
- [x] **12. Tornar simétrico o passo de gramas/ml no stepper** (`localDb.ts`)

### Baixa Prioridade — Qualidade, PWA e Infraestrutura
- [x] **13. Expandir suíte de testes** (`localDb.test.ts`, `syncEngine.test.ts`, `itemParser.test.ts`)
- [x] **14. Transporte remoto opcional no `tslog`** (`logger.ts`)
- [x] **15. Gerar ícones PNG para PWA e iOS** (`public/icons/*.png`, `index.html`, `vite.config.ts`)
- [x] **16. Adicionar cabeçalhos HTTP de segurança** (`vercel.json`)
- [x] **17. Auditar e corrigir vulnerabilidades de dependências** (`package.json`, `package-lock.json`)
- [x] **18. Aumentar legibilidade dos badges `Privada` / `Compartilhada`** (`Header.tsx`, `QuickAddBar.tsx`, `ShareModal.tsx`)
- [x] **19. Remover código morto `clear_checked`** (`types/index.ts`, `syncEngine.ts`)
- [x] **20. Remover senha do banco do `.env.local`** (`.env.local`)
