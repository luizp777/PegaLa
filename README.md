# PegaLá

Aplicativo **PWA (Progressive Web App) Offline-First** para lista ultra-rápida de mercado e farmácia, projetado para operação com uma mão em qualquer dispositivo (Android, iOS e Desktop).

## Recursos Principais

- **Modo Mão Única (`Thumb-Zone`)**: dock inferior fixo com abas de listas, catálogo rápido, pílulas de quantidade/unidade, colagem de 1 toque e captura por voz em PT-BR.
- **Ícones Vetoriais Minimalistas (100% SVG)**:
  - **377 itens** distribuídos em **16 corredores** de mercado e farmácia, todos cobertos por ícones vetoriais duotone com paleta semântica por produto (zero emojis de sistema).
  - Itens personalizados fora do catálogo recebem monograma minimalista automático.
- **Catálogo Rápido com Toque Acumulativo**:
  - Busca instantânea em 370+ itens de mercado e farmácia, abas por corredor e toques sucessivos (`1x`, `2x`, `3x`...) sem abrir o teclado principal.
  - Atalhos interativos diretamente no estado vazio da lista para abrir o catálogo ou iniciar a captura por voz.
- **Digitação Inteligente, Voz & WhatsApp Paste**:
  - Digite ou dite `2 leite integral`, `1,5kg batata` ou `dipirona 500mg 2 cx` para separar quantidade, unidade e nome automaticamente.
  - Cole uma lista inteira do WhatsApp (com múltiplas linhas e marcadores) com 1 toque.
- **Permanência & Seção "No carrinho / Já tenho"**:
  - Itens comprados permanecem salvos para reativação rápida (modo Lista ou Grade compacta, com filtro instantâneo e botão **Recomeçar**).
  - Stepper inline de 44px com trava no mínimo da unidade (`1x`, `50g`, `0.5kg`) e exclusão por swipe (mobile) ou hover (desktop) com toast **Desfazer**.
- **Offline-First + Sincronização em Tempo Real**:
  - Funciona 100% offline via **IndexedDB (Dexie.js)** com fila de mutações coalescida.
  - Sincroniza instantaneamente entre dispositivos via **Supabase Realtime** (PostgreSQL + RLS + `REPLICA IDENTITY FULL` + fallback automático de reconexão) e convite por link, código `PEGA-XXXXXX` ou QR Code.
- **Observabilidade & Tratamento de Exceções**:
  - Logs estruturados via **`tslog` v5** segmentados por domínio (`App`, `Sync`, `Auth`, `DB`, `UI`), `AppErrorBoundary` raiz e captura global de `window.error` / `unhandledrejection`.
- **Qualidade de Vida**:
  - **Tela Acesa (Wake Lock)** para impedir o celular de apagar no mercado.
  - **Tema Claro / Escuro Automático** com alto contraste e acessibilidade de teclado (`Esc`, `role="dialog"`).

## Stack Técnica

- **Frontend**: React 19 + TypeScript + Vite 6 + Tailwind CSS v4
- **PWA & Offline**: `vite-plugin-pwa` (Workbox) + Dexie.js (IndexedDB)
- **Backend (Opcional)**: Supabase (PostgreSQL, Realtime, RLS, Anonymous & Google Auth)
- **Logs & Qualidade**: `tslog` v5, Vitest, ESLint 10 + `eslint-plugin-tsdoc` (`tsdoc/syntax: error`)
- **Deploy**: Vercel (`vercel.json` pronto para SPA + PWA)

## Rodando Localmente

```bash
npm install
npm run dev
```

### Validação (Lint + Testes + Build)

```bash
npm run lint
npm test
npm run build
```

## Ativando Sincronização em Tempo Real (Supabase + Vercel)

1. Crie um projeto gratuito no [Supabase](https://supabase.com).
2. No **SQL Editor** do Supabase, execute o script [`supabase/schema.sql`](./supabase/schema.sql) — ele cria as tabelas (`lists`, `list_items`, `list_members`), ativa o **Realtime** com `REPLICA IDENTITY FULL`, aplica políticas **RLS**, cria a RPC `join_list_by_share_code` e concede os `GRANT`s para `anon` e `authenticated`.
3. Em **Authentication → Sign In / Providers**, ative **Allow anonymous sign-ins** (obrigatório para sincronizar sem cadastro) e, opcionalmente, **Google OAuth**.
4. Copie a **Project URL** e a **Publishable / Anon Key** em **Project Settings → API** e configure:
   - **Localmente**: crie `.env.local` (ignorado pelo Git) baseado em [`.env.example`](./.env.example):
     ```env
     VITE_SUPABASE_URL=https://seu-projeto.supabase.co
     VITE_SUPABASE_ANON_KEY=sua-chave-publica
     ```
   - **Na Vercel**: adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` em **Settings → Environment Variables** e faça o **Redeploy**.

Sem essas variáveis, o PegaLá opera automaticamente em modo **100% local (Offline-First)**.
