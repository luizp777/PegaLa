# Status — Plano de Melhorias (Code Review Geral)

> **Status geral**: Concluído (20/20 concluídos)
> **Data de conclusão**: 2026-11-24

---

## Alta Prioridade — Segurança no Supabase
- [x] **01. Fechar RLS de `list_members`** (`supabase/schema.sql`): substituído `list_members_self_manage` (`FOR ALL`) por políticas granulares (`list_members_select_self` e `list_members_delete_self`) e revogados `INSERT`/`UPDATE` diretos para `anon, authenticated`.
- [x] **02. Proteger `owner_id` e `share_code` em `lists`** (`supabase/schema.sql`): criada trigger `trg_lists_guard_immutable` (`BEFORE UPDATE`) bloqueando alteração de `owner_id` e restringindo alteração de `share_code` ao dono.
- [x] **03. Proteger código de convite contra força bruta** (`supabase/schema.sql`, `src/db/localDb.ts`): novos códigos ampliados para 8 caracteres (`PEGA-XXXXXXXX`) + tabela `public.join_attempts` com rate limit de 10 tentativas/minuto por usuário na RPC `join_list_by_share_code`.

## Média Prioridade — Sincronização e Dados
- [x] **04. Tratar colisão de `share_code` (`23505`)** (`src/db/syncEngine.ts`): helper `upsertListWithCodeRetry` regenera o `shareCode` automaticamente (até 3 tentativas) em caso de colisão `23505`.
- [x] **05. Deduplicar itens criados offline entre dispositivos** (`supabase/schema.sql`, `src/db/syncEngine.ts`): índice único `(list_id, normalized_name)` em `public.list_items`, `onConflict: 'list_id,normalized_name'` nos upserts e reconciliação de duplicatas em `pullListFromCloud`.
- [x] **06. Timestamp `updated_at` autoritativo no servidor** (`supabase/schema.sql`): triggers `trg_lists_server_updated_at` e `trg_list_items_server_updated_at` (`BEFORE INSERT OR UPDATE` definindo `updated_at = now()`).
- [x] **07. Propagar alterações e exclusões de `lists` em tempo real** (`supabase/schema.sql`, `src/db/syncEngine.ts`): `REPLICA IDENTITY FULL` em `public.lists` e assinatura `postgres_changes` para `UPDATE` (renomear/tipo) e `DELETE` (excluir).
- [x] **08. Diferenciar "Apagar para todos" (dono) vs. "Sair da lista" (convidado)** (`src/components/Header.tsx`, `src/db/localDb.ts`, `src/db/syncEngine.ts`, `src/App.tsx`): confirmação explícita `"Apagar p/ todos?"` para dono, `"Sair?"` + ação `leave_list` removendo vínculo em `list_members` para convidados.
- [x] **09. Evitar chamadas duplicadas de `syncListNow` no `ShareModal`** (`src/components/ShareModal.tsx`): efeito ajustado para depender de `[open, listId]`.

## Média Prioridade — Parser e Regras de Quantidade
- [x] **10. Evitar falsos positivos de quantidade em nomes/marcas** (`src/lib/itemParser.ts`): protegidos padrões como `"Fralda tamanho 3"`, `"Ômega 3"`, `"FPS 50"`, `"3 Corações"`, `"7 Belo"`, `"3M"`.
- [x] **11. Tratar quantidades inválidas (`0` ou negativas)** (`src/lib/itemParser.ts`): validação explícita em `parseSingleItem` com teste unitário para `"0 leite"`.
- [x] **12. Tornar simétrico o passo de gramas/ml no stepper** (`src/db/localDb.ts`): `getQuantityStep(unit, currentQty, direction)` agora percorre os mesmos degraus na subida e descida (`50 ↔ 100 ↔ 200 ↔ 300`).

## Baixa Prioridade — Qualidade, PWA e Infraestrutura
- [x] **13. Expandir suíte de testes** (`src/db/__tests__/localDb.test.ts`, `src/db/__tests__/syncEngine.test.ts`, `src/lib/__tests__/itemParser.test.ts`): adicionado `fake-indexeddb` cobrindo IndexedDB, fila coalescida, `23505`, `42501`, `isShared` e `leave_list`.
- [x] **14. Transporte remoto opcional no `tslog`** (`src/lib/logger.ts`): `tslog` v5 mantido com transporte opcional via `VITE_LOG_ENDPOINT` (`navigator.sendBeacon`) para eventos `warn`/`error`/`fatal` em produção.
- [x] **15. Gerar ícones PNG para PWA e iOS** (`public/icons/*.png`, `index.html`, `vite.config.ts`): gerados `icon-192.png`, `icon-512.png`, `maskable-icon-512.png` e `apple-touch-icon.png` (180×180).
- [x] **16. Adicionar cabeçalhos HTTP de segurança** (`vercel.json`): `CSP`, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` e `Permissions-Policy` (`microphone=(self)`).
- [x] **17. Auditar e corrigir vulnerabilidades de dependências** (`package.json`, `package-lock.json`): `vitest` atualizado para `^5.1.1` (0 vulnerabilidades críticas; `npm audit --omit=dev` = 0 vulnerabilidades em produção).
- [x] **18. Aumentar legibilidade dos badges `Privada` / `Compartilhada`** (`Header.tsx`, `QuickAddBar.tsx`, `ShareModal.tsx`): fonte elevada para `text-[11px]`.
- [x] **19. Remover código morto `clear_checked`** (`src/types/index.ts`, `src/db/syncEngine.ts`): ação obsoleta removida.
- [x] **20. Remover senha do banco do `.env.local`** (`.env.local`): `SUPABASE_DB_PASSWORD` removida do arquivo local.
