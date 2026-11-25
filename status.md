# Status — Planos de Melhoria do PegaLá

---

## Ciclo 13 — Precisão de Busca, Departamento do Varejista, Ranking em Faixas & Aliases de Catálogo

> **Status**: Concluído (Migration Supabase + Adaptadores + Motor de Matching + 40 Aliases + Code Review + Validação completa)
> **Data de conclusão**: 2026-11-25

- [x] **C13-01. Coluna `retail_category` e limpeza de cache online antigo** (`supabase/migrations/20261125000004_retail_category_matching.sql`, `shared/priceTypes.ts`, `api/prices/quotes.ts`): adição da coluna opcional `retail_category` em `store_prices`, atualização da view `store_prices_public` (nova coluna ao final do `SELECT`) e da RPC `upsert_online_prices`, limpeza apenas de registros `source = 'online'` antigos (preservando preços da comunidade) e aumento dos limites de leitura de cache em `quotes.ts` (`1500`/`3000`).
- [x] **C13-02. Janela de 20 candidatos e extração de departamento nos adaptadores** (`api/prices/_adapters/vtexAdapter.ts`, `occAdapter.ts`, `magentoAdapter.ts`, `sfccAdapter.ts`, `types.ts`): ampliação de 8 para 20 resultados por consulta em uma única chamada por `(rede, termo)`, extração de `retailCategory` em VTEX (`categories[0]`), OCC (`product.category` / `parentCategory.displayName`), Tauste/Magento (`categories { name }` com proteção contra `null`) e Jaú Serve (`data-product-category`/`data-category`).
- [x] **C13-03. Compatibilidade de departamento, guardas expandidas e ranking em faixas** (`src/lib/priceEngine.ts`): `checkRetailCategoryCompatibility` com keywords no singular/plural bloqueando departamentos conflitantes (ex.: `/Mercearia/Salgadinhos/` para `hortifruti`), expansão de `CATEGORY_FORBIDDEN_TOKENS` (9 categorias) e `NEGATIVE_GUARD_RULES` (incluindo `cebola`, `alho`, `batata`, `tomate`, `feijao`, `milho` e `arroz`, com `unlessTermContains` para pedidos explícitos), ordenação em faixas (`isPreferred` → `categoryTier` → `packTier` → `titleTier` → `effectiveTotalCents`, sem penalizar pedidos pequenos `< 250g`) e até 8 alternativas na troca de produto.
- [x] **C13-04. Aliases de busca e matching para 40 itens do catálogo PT-BR** (`shared/searchTermAliases.ts`, `api/prices/quotes.ts`, `src/lib/priceEngine.ts`): tradução automática entre termos do catálogo e títulos reais do varejo (ex.: `arroz branco` → `arroz tipo 1`, `queijo mussarela` ↔ `muçarela`, `macarrao espaguete/penne/parafuso` ↔ `massa ...`, congelados sem sufixo `congelado(a)`, `pasta de dente` → `creme dental`, `desodorante aerosol` ↔ `aerossol`, `racao/sache/petisco cachorro` → `cães`), validado com **117 testes em 22 arquivos** (`tsc -b`, Vitest e ESLint sem erros).

---

## Ciclo 12 — Otimização Extrema de Performance, Backup Local & Qualidade de Vida

> **Status**: Concluído (4 rodadas de performance + Backup/UX + Code Reviews + Validação completa)
> **Data de conclusão**: 2026-11-25

### Performance de Boot, Bundle & PWA (4 Rodadas)
- [x] **C12-01. Lazy-load do SDK Supabase (`~59 KB` gzip fora do boot)** (`src/lib/supabase.ts`, `src/hooks/useAuthSession.ts`, `src/db/syncEngine.ts`, `src/components/ShareModal.tsx`, `src/hooks/usePriceComparison.ts`, `src/App.tsx`): `getSupabaseClient()` com `import('@supabase/supabase-js')` dinâmico, carregamento imediato apenas quando há `?join=` / callback OAuth (`hasImmediateAuthOrJoinIntent`) e adiado pós-paint (`requestIdleCallback` / `setTimeout`) no uso normal.
- [x] **C12-02. Code-splitting de Ícones, Dicionário, Motor de Preços & Sync** (`src/components/ProductIconPack.tsx`, `src/components/ItemIcon.tsx`, `src/components/QuickAddBar.tsx`, `src/hooks/useActiveList.ts`, `src/hooks/usePinnedStore.ts`, `src/App.tsx`): extração de `itemIconMap.ts` + SVGs customizados para `ProductIconPack` (`12.92 KB` gzip async com fallback do corredor `CLS = 0`), desacoplamento de `dictionaryPtBr.ts` via `categories.ts` (pré-carregado ao focar no input), e lazy-load de `syncEngine`, `diagnostics`, `priceEngine`, `PinnedStoreBar`, `ShoppingCompleteCard` e `PwaUpdatePrompt` (`workbox-window`). Redução do **Initial JS total** de `227.92 KB` para **`143.64 KB` gzip (`-37.0%`)** e do `index.js` de `54.10 KB` para **`30.47 KB` gzip (`-43.7%`)**.
- [x] **C12-03. Boot sem waterfall, Fluidez 60fps & Batching IndexedDB** (`src/hooks/useActiveList.ts`, `src/components/ShoppingItemRow.tsx`, `src/components/CategoryGroup.tsx`, `src/components/CheckedSection.tsx`, `src/components/Header.tsx`, `src/components/ActiveListToolbar.tsx`, `src/db/localDb.ts`, `src/index.css`): hidratação imediata de `activeListId` via `getLastActiveListId()`, swipe horizontal 60fps via refs DOM diretas (zero re-renders por frame e proteção contra reset em re-renders externos), `memo(...)` + callbacks estáveis, `Intl.Collator('pt-BR')` reutilizado, `useDeferredValue` no autocomplete, `.cv-group`/`.cv-row` com `content-visibility: auto`, e `enqueueSyncBatch` + `bulkPut`/`bulkGet` eliminando N+1/`O(N²)` em operações em lote.
- [x] **C12-04. API de Preços, Stream NDJSON, Workbox & Cache HTTP** (`api/prices/quotes.ts`, `api/prices/nearby-stores.ts`, `src/hooks/usePriceComparison.ts`, `vite.config.ts`, `vercel.json`, `scripts/check-bundle-budget.mjs`): consultas de cache Supabase em paralelo (`Promise.all`), fila round-robin entre redes e flush não-bloqueante em `quotes.ts`; batching/throttle de 120ms no stream NDJSON do cliente; precache enxuto do PWA (`746.75 KiB`, excluindo chunks online pesados e PNGs 512px com `includeManifestIcons: false` + `runtimeCaching` `CacheFirst`); headers `Cache-Control: immutable` em `vercel.json`; e budget estrito (`entryJs: 34 KB`, `initialTotalJs: 152 KB`) com verificação anti-vazamento em `dist/index.html`.

### Qualidade de Vida & Dados Locais
- [x] **C12-05. Backup JSON Offline & Limpeza Seletiva** (`src/lib/localBackup.ts`, `src/components/DataBackupModal.tsx`, `src/db/localDb.ts`, `src/components/ListSwitcherMenu.tsx`, `src/components/Header.tsx`): modal lazy-loaded (`4.75 KB` gzip) com contadores do IndexedDB, exportação JSON versionada (com revogação segura de Blob URL para iOS), importação validada nos modos **Mesclar** ou **Substituir tudo** (preservando `preferredProduct` e limpando chaves órfãs do `localStorage`), e limpeza seletiva de cache de preços ou histórico de sugestões.
- [x] **C12-06. Limpar marcados com Desfazer, Duplicar Lista & Copiar por Corredores** (`src/components/CheckedSection.tsx`, `src/components/GlobalToastBar.tsx`, `src/lib/listTextExport.ts`, `src/components/ShareModal.tsx`, `src/components/ActiveListToolbar.tsx`, `src/lib/__tests__/localBackupAndExport.test.ts`): exclusão em lote de itens marcados com toast **Desfazer** (protegido contra duplicidade por `normalizedName`), clonagem de lista pronta para nova compra (`duplicateList`), formatação de pendentes por corredor para WhatsApp (`0.35 KB` gzip lazy) e **111 testes em 22 arquivos** passando.

---

## Ciclo 11 — Code Review & Design (UI/UX) Review Geral + Hardening + Refatoração

> **Status**: Concluído (Sprints 1–3, Migrations Supabase & Fixes de Produção concluídos)
> **Data de conclusão**: 2026-11-25

### Segurança, Banco de Dados & APIs Serverless
- [x] **C11-01. Hardening de Rate Limit e Permissões RPC** (`api/prices/_shared/security.ts`, `supabase/migrations/20261125000002_review_hardening.sql`, `supabase/migrations/20261125000003_grant_service_role_price_rpcs.sql`): `x-vercel-forwarded-for`/`x-real-ip` no hash de IP, política *fail-closed* em `checkRateLimit`, `pg_advisory_xact_lock` anti-TOCTOU, índices em `created_at`/`attempted_at` e `GRANT EXECUTE ... TO service_role` para `check_price_api_rate_limit` e `upsert_online_prices`.
- [x] **C11-02. Trigger de `lists` e Normalização de Outliers SQL** (`20261125000002_review_hardening.sql`): liberação de `ON DELETE SET NULL` em `trg_lists_guard_immutable`, bounds `lat`/`lng` em `stores`, proteção de `product_key` vazio em `upsert_online_prices` e conversão de unidades base (`kg`/`g`, `L`/`ml`) na detecção de outliers.
- [x] **C11-03. Correções em `/api/prices/*` e `/api/logs`** (`api/prices/nearby-stores.ts`, `api/prices/quotes.ts`, `api/logs.ts`, `api/prices/_adapters/*`, `shared/packParser.ts`): `geohash5` e metadados calculados por loja no Overpass, flush incremental + orçamento de tempo + tratamento de desconexão em `quotes.ts`, guarda de `Content-Length` e timestamp do servidor em `logs.ts`, suporte a multipacks (`6x350ml`) e fallback hash em `buildProductKey`.

### Confiabilidade de Hooks, Sync, PWA & Parser
- [x] **C11-04. Mediana regional na loja fixada e races assíncronas** (`src/hooks/usePinnedStore.ts`, `src/hooks/usePriceComparison.ts`, `src/lib/wakeLock.ts`, `src/lib/speechParser.ts`): `usePinnedStore` passa todas as `cache.stores` para calcular faltantes pela mediana regional; proteção contra abort/cache race em `usePriceComparison`; proteção contra vazamento de sentinela no `wakeLock` e toggle rápido no reconhecimento de voz.
- [x] **C11-05. Sync, IndexedDB, Workbox e Parser PT-BR** (`src/db/syncEngine.ts`, `src/db/localDb.ts`, `vite.config.ts`, `src/lib/itemParser.ts`, `src/lib/priceEngine.ts`, `src/lib/logger.ts`): flag `flushing` e ownership de `myChannel` em `syncEngine.ts`, limpeza de `priceComparisons` ao excluir/sair da lista, `recheckItems` para desfazer reinício, `navigateFallbackDenylist: [/^\/api\//]` no Workbox, suporte a `sachê`/`maço`/`comprimido`, prefix matching com `length >= 3` e sanitização de console no `logger.ts`.

### UI/UX Mobile, Acessibilidade (WCAG AA) & Refatoração Arquitetural
- [x] **C11-06. Correções P0/P1 de UX e Acessibilidade** (`QuickAddBar.tsx`, `GlobalToastBar.tsx`, `App.tsx`, `Header.tsx`, `ListSwitcherMenu.tsx`, `PinnedStoreBar.tsx`, `PriceComparisonSheet.tsx`, `ShareModal.tsx`, `CreateListModal.tsx`, `ShoppingItemRow.tsx`, `CategoryGroup.tsx`, `index.css`): `onClick` em vez de `onPointerDown` nas sugestões/pílulas, camada global de toasts `z-[60]` acima de modais, `z-index` do `Header`/`ListSwitcherMenu` acima da `PinnedStoreBar`, botão **"Desfazer"** no *"Recomeçar"*, `Escape` fechando docks antes do comparador, `touch-pan-y`, contraste WCAG AA em itens marcados, `prefers-reduced-motion` global e remoção de texto de infra em produção.
- [x] **C11-07. Modularização e Tree-Shaking** (`src/lib/formatters.ts`, `src/lib/categories.ts`, `src/lib/dictionaryPtBr.ts`, `src/hooks/useAuthSession.ts`, `src/components/ListSwitcherMenu.tsx`, `src/components/GlobalToastBar.tsx`, `src/components/price-comparison/SplitPurchaseTab.tsx`, `src/components/price-comparison/PriceComparisonDocks.tsx`): extração de formatadores, categorias, sessão auth, menu de listas, toast global e subcomponentes do comparador (com atalho de rota em 2 lojas).
- [x] **C11-08. Expansão da suíte de testes (105 testes em 21 arquivos)** (`usePinnedStore.test.ts`, `useAuthSession.test.ts`, `useModalAccessibility.test.tsx`, `QuickAddBar.test.tsx`, `packParserAndFormatters.test.ts`, `wakeLock.test.ts`).

---

## Ciclo 10 — Precisão do Comparador, Loja Fixada na Lista & "Leve-me lá"

> **Status**: Concluído (Hardening, Feature + Polimento Code/Design Review concluídos)
> **Data de conclusão**: 2026-11-24

### Precisão, APIs & Banco de Dados
- [x] **C10-01. Filtros negativos por categoria e fronteira de palavra** (`src/lib/priceEngine.ts`, `src/lib/__tests__/priceEngine.test.ts`): bloqueio de derivados/industrializados em `hortifruti` (ex.: refresco/suco de laranja) e `acougue`, com matching por fronteira de palavra (`containsForbiddenTerm`) evitando falsos negativos em *"embalagem"* / *"embalada"*, além de estimativa conservadora para `un` vs `>= 500 g/ml`.
- [x] **C10-02. Cache de lojas, batching de RPCs e adaptadores** (`api/prices/nearby-stores.ts`, `api/prices/quotes.ts`, `api/prices/_adapters/sfccAdapter.ts`, `api/prices/_adapters/vtexAdapter.ts`, `src/hooks/usePriceComparison.ts`): descoberta mesmo com cache parcial (`< 3` lojas sem fetch nas últimas 24h), `upsert_online_prices` em lotes de até `80` linhas, expansão de `decodeHtmlEntities` no Jaú Serve, limite de `200` entradas no `regionCache` VTEX e limpeza de estado ao trocar de lista sem cache.
- [x] **C10-03. Anti-outlier por unidade/embalagem no Supabase** (`supabase/migrations/20261125000001_price_outlier_unit_fix.sql`): `report_community_price` normaliza a mediana por `price_cents / pack_quantity` e mesma `pack_unit`.
- [x] **C10-04. Ergonomia mobile, consistência e semântica ARIA** (`PriceComparisonSheet.tsx`, `ShareModal.tsx`, `ActiveListToolbar.tsx`): alvos de toque `>= 38px`, `role="tablist"`/`role="tab"`/`aria-expanded`, animação `animate-drawer-up` e `pb-safe` unificados, seletor de item em lojas vazias e botão `Comparar` inline com a busca.

### Estabelecimento Fixado na Lista & Navegação 1-Toque ("Leve-me lá")
- [x] **C10-05. Seleção persistida por lista e recálculo em tempo real** (`shared/priceTypes.ts`, `src/hooks/usePinnedStore.ts`): `PinnedStoreSelection` salvo por `listId` no `localStorage`, com recálculo reativo via Dexie (`useLiveQuery`) do total estimado e do subtotal *"No carrinho"*, limpeza ao excluir/sair da lista (`clearPinnedStoreStorage`) e atualização imediata ao salvar via `+ Preço` rápido.
- [x] **C10-06. Barra sticky `PinnedStoreBar` e link nativo "Leve-me lá"** (`src/components/PinnedStoreBar.tsx`, `src/lib/navigationLink.ts`, `src/components/Header.tsx`, `src/App.tsx`): barra sticky abaixo do cabeçalho (layout em 2 linhas no `< sm`, prefixo `~` para estimativa parcial, `dark:bg-emerald-950/90`), ancoragem dinâmica de toasts/`+ Preço` abaixo da barra, botão *"Escolher esta loja"* fechando o comparador e URIs nativas (`geo:` com escape de parênteses no Android, `maps://` no iOS, Google Maps no desktop).
- [x] **C10-07. Testes unitários e de componente** (`src/lib/__tests__/navigationLink.test.ts`, `src/components/__tests__/PriceComparisonSheet.test.tsx`).

---

## Ciclo 9 — Comparador de Preços em Mercados e Farmácias Próximos (Fase 0 + Fase 1 + Reviews)

> **Status**: Concluído (Fase 0, Fase 1, Code Review e Design Review concluídos)
> **Data de conclusão**: 2026-11-24

### Fase 0 — Spike de Viabilidade dos Conectores
- [x] **C9-00. Validação técnica e de bloqueio anti-bot**: 10 redes aprovadas (Mambo, Oba Hortifruti, Swift, Sam's Club, Confiança, Tauste, Jaú Serve, Drogaria São Paulo, Drogarias Pacheco e Pague Menos); Carrefour descartado por Cloudflare `503`.

### Fase 1 — Infraestrutura, Motor de Cálculo, APIs & UX
- [x] **C9-01. Tipos compartilhados, parser único e IndexedDB v4** (`shared/priceTypes.ts`, `shared/packParser.ts`, `src/db/localDb.ts`, `vercel.json`, `.env.example`).
- [x] **C9-02. Migration Supabase, RLS, Views e RPCs seguras** (`supabase/migrations/20261125000000_price_comparison.sql`: `stores`, `store_prices`, `store_prices_public` com `security_invoker`, `report_community_price`, `upsert_online_prices`, `check_price_api_rate_limit`).
- [x] **C9-03. Motor de matching, normalização e ranking no cliente** (`src/lib/priceEngine.ts`, `src/lib/__tests__/priceEngine.test.ts`).
- [x] **C9-04. Endpoints Vercel (`/api/prices/nearby-stores`, `/api/prices/quotes`) e adaptadores plugáveis** (`api/prices/_shared/*`, `api/prices/_adapters/*`, `src/lib/__tests__/adaptersContract.test.ts`).
- [x] **C9-05. Hook, Bottom Sheet lazy-loaded e integração na lista** (`src/hooks/usePriceComparison.ts`, `src/components/PriceComparisonSheet.tsx`, `ActiveListToolbar.tsx`, `App.tsx`, `scripts/check-bundle-budget.mjs`).

### Code Review & Design Review (Hardening + UX Mobile/iOS)
- [x] **C9-06. Hardening de deploy, SQL, GraphQL e lógica de preços**: pasta `_adapters/` ignorada como rota pela Vercel, upsert online via RPC, query GraphQL parametrizada no Tauste, sanitização de filtros PostgREST, bounding box no cache de lojas, soma de pesos `0.5 + 0.5 >= 1.0`, embalagem unitária correta no `reportManualPrice` e persistência offline após contribuição.
- [x] **C9-07. Polimento de UX, acessibilidade WCAG AA e iOS PWA**: dock fixo para troca de marca/ajuste de preço, alvos de toque ≥ 32px, `safe-area-inset-bottom`, contraste AA, card `#1` unificado e recolhível, skeletons, estado vazio acionável, modo *"Estou comprando aqui"* com captura rápida `+ Preço` e feedback háptico.
- [x] **C9-08. Testes unitários, cobertura, bundle budget e E2E Playwright** (`priceEngine.test.ts`, `adaptersContract.test.ts`, `usePriceComparison.test.ts`, `PriceComparisonSheet.test.tsx`, `e2e/price-comparison.spec.ts`).

---

## Ciclo 8 — Qualidade, Engenharia e Infraestrutura (CI/CD, E2E, Cobertura, Observabilidade & Migrations)

> **Status**: Concluído (5 fases concluídas)
> **Data de conclusão**: 2026-11-24

### Fase 1 — Fundação, CI/CD Esqueleto, Hooks & Correção `?list=`
- [x] **C8-01. Padronização Node (`>= 22`) e hooks locais** (`.nvmrc`, `package.json`, `.husky/pre-commit`, `.husky/pre-push`, `.github/dependabot.yml`).
- [x] **C8-02. Correção dos atalhos PWA `?list=mercado|farmacia|geral`** (`src/hooks/useActiveList.ts`).

### Fase 2 — Cobertura & Expansão de Testes (Vitest)
- [x] **C8-03. Cobertura com `@vitest/coverage-v8` e ratchet de thresholds** (`vite.config.ts`, `package.json`).
- [x] **C8-04. Novas suítes para hooks e módulos críticos** (`useActiveList.test.ts`, `useTheme.test.ts`, `usePwaInstall.test.ts`, `wakeLock.test.ts`, `logger.test.ts`, expansão de `uiComponents.test.tsx`).

### Fase 3 — Observabilidade Privada (Compatível com CSP)
- [x] **C8-05. Buffer circular (50 eventos) e sanitizador único sem PII** (`src/lib/logger.ts`).
- [x] **C8-06. Core Web Vitals lazy e relatório "Copiar diagnóstico" no Header** (`src/lib/webVitals.ts`, `src/lib/diagnostics.ts`, `Header.tsx`, `App.tsx`, `main.tsx`).
- [x] **C8-07. Endpoint same-origin opcional `/api/logs` na Vercel** (`api/logs.ts`, `tsconfig.api.json`, `vercel.json`, `eslint.config.js`).

### Fase 4 — Testes E2E com Playwright
- [x] **C8-08. Configuração multi-dispositivo e suíte E2E** (`playwright.config.ts`, `e2e/core-shopping.spec.ts`, `e2e/mobile-a11y.spec.ts`, `e2e/offline-pwa.spec.ts`, `e2e/sync-mocked.spec.ts`).

### Fase 5 — Bundle Budget, Migrations Supabase & CI Completo
- [x] **C8-09. Budget de bundle gzip automatizado** (`scripts/check-bundle-budget.mjs`, `package.json`).
- [x] **C8-10. Migrations versionadas no padrão Supabase CLI** (`supabase/config.toml`, `supabase/migrations/20261124000000_baseline.sql`, remoção de `supabase/schema.sql`).
- [x] **C8-11. Pipeline em 2 estágios no GitHub Actions** (`.github/workflows/ci.yml`: `quality` + `e2e`).

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
