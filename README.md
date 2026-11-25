# PegaLá

Aplicativo **PWA (Progressive Web App) Offline-First** para lista ultra-rápida de mercado e farmácia, projetado para operação com uma mão em qualquer dispositivo (Android, iOS e Desktop).

## Recursos Principais

- **Modo Mão Única (`Thumb-Zone`)**: dock inferior fixo com abas de listas, catálogo rápido, pílulas de quantidade/unidade, colagem de 1 toque e captura por voz em PT-BR.
- **Ícones Vetoriais Minimalistas (100% SVG)**:
  - Mais de **370 itens** distribuídos em **16 corredores** de mercado e farmácia, cobertos por ícones vetoriais line-art duotone com paleta semântica por produto (zero emojis de sistema).
  - Itens personalizados fora do catálogo recebem monograma minimalista automático.
- **Catálogo Rápido com Toque Acumulativo**:
  - Carregado sob demanda (lazy chunk), com busca instantânea, abas por corredor e toques sucessivos (`1x`, `2x`, `3x`...) sem abrir o teclado principal.
  - Atalhos interativos diretamente no estado vazio da lista para abrir o catálogo, ditar por voz ou colar do WhatsApp.
- **Navegação Rápida & Organização por Corredores**:
  - Busca instantânea na lista ativa (a partir de 8 itens), pílulas de filtro por corredor e controle para recolher/expandir todos os corredores com estado persistido por lista.
  - Edição completa de itens em Bottom Sheet (nome, quantidade, unidade, corredor e exclusão acessível no mobile) + renomeação inline de listas no menu.
- **Digitação Inteligente, Voz & WhatsApp Paste**:
  - Digite ou dite `2 leite integral`, `1,5kg batata` ou `dipirona 500mg 2 cx` para separar quantidade, unidade e nome automaticamente (preservando expressões compostas como `água e sal` e `vitamina e`).
  - Cole uma lista inteira do WhatsApp (com múltiplas linhas e marcadores) com 1 toque.
- **Permanência & Seção "No carrinho / Já tenho"**:
  - Itens comprados permanecem salvos (exibindo quantidade para conferência) para reativação rápida em modo **Lista** ou **Grade compacta** (preferência persistida), com filtro instantâneo e botão **Recomeçar**.
  - Card celebratório de conclusão de compra com métricas e compartilhamento de resumo (Web Share / Clipboard).
  - Stepper inline de 44px com trava no mínimo da unidade (`1x`, `50g`, `0.5kg`) e exclusão por swipe com feedback háptico no limiar (mobile) ou botão de lixeira (desktop/sheet) com toast **Desfazer**.
- **Comparador de Preços (Mercado & Farmácia — Requer Supabase)**:
  - Descoberta de estabelecimentos próximos via **GPS** ou **CEP** (raio de `1`, `3`, `5` ou `10 km`) usando OpenStreetMap (Overpass/Nominatim) e ViaCEP.
  - Consulta híbrida com streaming progressivo (NDJSON): combina **preços online** de 10 redes brasileiras (Mambo, Oba Hortifruti, Swift, Sam's Club, Confiança, Tauste, Jaú Serve, Drogaria São Paulo, Drogarias Pacheco e Pague Menos) com **preços colaborativos** informados pela comunidade.
  - Normalização automática de embalagens (`g`/`kg`, `ml`/`L`), ranking por loja única, sugestão de divisão em 2 lojas (quando há economia relevante), troca de marca preferida, captura rápida `+ Preço` ao marcar itens no carrinho e cache offline no IndexedDB.
- **Offline-First + Sincronização em Tempo Real**:
  - Funciona 100% offline via **IndexedDB (Dexie.js)** com transações atômicas, fila de mutações coalescida em lotes e coordenação multi-aba via **Web Locks API** (inclusive na inicialização de listas padrão).
  - Sincroniza instantaneamente entre dispositivos via **Supabase Realtime** (PostgreSQL + RLS + `REPLICA IDENTITY FULL` + deduplicação por `normalized_name` + fallback automático de reconexão + gatilho manual no cabeçalho) e convite por link, código `PEGA-XXXXXX` ou QR Code.
- **Observabilidade & Segurança**:
  - Logger estruturado próprio (`src/lib/logger.ts`) segmentado por domínio (`App`, `Sync`, `Auth`, `DB`, `UI`), `AppErrorBoundary` raiz e captura global de erros.
  - Cabeçalhos de segurança HTTP e CSP estrita sem `'unsafe-inline'` em `script-src` (`vercel.json` + `public/theme-init.js`).
- **PWA, iOS & Acessibilidade (WCAG AA)**:
  - **Tela Acesa (Wake Lock)** com feedback de estado/erro para impedir o celular de apagar no mercado.
  - **Tema Claro / Escuro Automático** sem FOUC, com sincronização dinâmica de `<meta name="theme-color">` e suporte a `safe-area-inset-*` no iOS standalone.
  - Modais e Bottom Sheets com focus trap, scroll-lock, `Esc` para fechar, suporte a `prefers-reduced-motion`, contraste WCAG AA e inputs com `16px` anti-zoom no iOS.

## Stack Técnica

- **Frontend**: React 19 + TypeScript + Vite 6 + Tailwind CSS v4
- **PWA & Offline**: `vite-plugin-pwa` (Workbox) + Dexie.js (IndexedDB)
- **Backend (Opcional)**: Supabase (PostgreSQL, Realtime, RLS, Anonymous & Google Auth)
- **Qualidade & Documentação**: Vitest + Testing Library + `@vitest/coverage-v8`, Playwright E2E (Chromium Desktop/Mobile + WebKit iOS), ESLint 10 + `eslint-plugin-tsdoc` (`tsdoc/syntax: error`), Husky + lint-staged, GitHub Actions CI
- **Observabilidade Privada**: Buffer circular local com sanitização de PII, Core Web Vitals (`web-vitals` lazy), botão **Copiar diagnóstico** no menu e endpoint same-origin opcional `/api/logs` na Vercel
- **Deploy**: Vercel (`vercel.json` pronto para SPA + PWA + `/api/logs`)

## Rodando Localmente

```bash
npm install
npm run dev
```

### Validação (Lint + Typecheck + Testes/Cobertura + Bundle Budget + E2E)

```bash
npm run lint
npm run typecheck
npm run test:coverage
npm run build
npm run check:bundle
npm run test:e2e
```

## Ativando Sincronização em Tempo Real (Supabase + Vercel)

1. Crie um projeto gratuito no [Supabase](https://supabase.com).
2. Aplique as migrations versionadas de [`supabase/migrations/`](./supabase/migrations/) por um dos fluxos:
   - **Fluxo A (Supabase CLI)**: `npx supabase link` e `npx supabase db push`
   - **Fluxo B (SQL Editor)**: execute os arquivos de `supabase/migrations/` em ordem cronológica:
     1. [`20261124000000_baseline.sql`](./supabase/migrations/20261124000000_baseline.sql) — tabelas de listas (`lists`, `list_items`, `list_members`, `join_attempts`), constraints `CHECK`, **Realtime**, **RLS**, RPC `join_list_by_share_code` e `GRANT`s.
     2. [`20261125000000_price_comparison.sql`](./supabase/migrations/20261125000000_price_comparison.sql) — tabelas do comparador (`stores`, `store_prices`, `price_report_attempts`, `price_api_rate_limits`), view `store_prices_public` (`security_invoker`), RLS e RPCs (`report_community_price`, `upsert_online_prices`, `check_price_api_rate_limit`).
3. Em **Authentication → Sign In / Providers**, ative **Allow anonymous sign-ins** (obrigatório para sincronizar sem cadastro) e, opcionalmente, **Google OAuth**.
4. Copie a **Project URL** e a **Publishable / Anon Key** em **Project Settings → API** e configure:
   - **Localmente**: crie `.env.local` (ignorado pelo Git) baseado em [`.env.example`](./.env.example):
     ```env
     VITE_SUPABASE_URL=https://seu-projeto.supabase.co
     VITE_SUPABASE_ANON_KEY=sua-chave-publica
     ```
   - **Na Vercel**: adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` em **Settings → Environment Variables**. Para habilitar o **Comparador de Preços**, adicione também as variáveis **server-only** (sem prefixo `VITE_`): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PRICE_ADAPTERS_ENABLED=all`, `OSM_CONTACT_EMAIL` e `PRICE_RATE_LIMIT_SALT`, e faça o **Redeploy**. (Opcional: defina `VITE_LOG_ENDPOINT=/api/logs` para enviar erros sanitizados à Vercel Function same-origin.)

Sem essas variáveis, o PegaLá opera automaticamente em modo **100% local (Offline-First)** (com o comparador de preços oculto).

## Histórico de Evolução

O detalhamento dos ciclos concluídos (Ciclos 1 a 9 — Segurança, Design Review, Code Review, Performance/Escala, Acessibilidade, Estabilidade, Engenharia/Infraestrutura e Comparador de Preços) está documentado em [`status.md`](./status.md).
