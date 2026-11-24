# Status — Planos de Melhoria do PegaLá

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
