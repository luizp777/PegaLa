# PegaLá 🛒💊

Aplicativo **PWA (Progressive Web App) Offline-First** para lista ultra-rápida de mercado e farmácia, feito para rodar em qualquer dispositivo (Android, iOS e Desktop).

## Recursos Principais

- **Modo Mão Única**: barra de adição fixa na parte inferior da tela (`Thumb-Zone`) com botões grandes.
- **Digitação Inteligente & WhatsApp Paste**:
  - Digite `2 leite integral`, `1,5kg batata` ou `dipirona 500mg 2 cx` para separar quantidade, unidade e nome automaticamente.
  - Cole uma lista inteira do WhatsApp (com múltiplas linhas e marcadores) para adicionar todos os itens de uma vez.
- **Agrupamento por Corredor + Aprendizado**: dicionário PT-BR embarcado com categorias de mercado e farmácia. Alterar a categoria de um item ensina o app para as próximas compras.
- **Offline-First + Tempo Real**: funciona 100% offline usando **IndexedDB (Dexie.js)** e sincroniza automaticamente via **Supabase Realtime** quando configurado.
- **Tela Acesa (Wake Lock)**: botão no topo para impedir o celular de apagar enquanto você faz compras.
- **Tema Claro / Escuro Automático**: alto contraste para ambientes claros e escuros.

## Rodando Localmente

```bash
npm install
npm run dev
```

Para rodar os testes do parser e dicionário:

```bash
npm test
```

## Ativando Sincronização em Tempo Real (Supabase + Vercel)

1. Crie um projeto gratuito no [Supabase](https://supabase.com).
2. No **SQL Editor** do Supabase, execute o script [`supabase/schema.sql`](./supabase/schema.sql).
3. (Opcional) Em **Authentication → Providers**, ative **Anonymous Sign-Ins** e/ou **Google** para login opcional.
4. Na **Vercel**, importe este repositório e adicione as variáveis de ambiente:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Faça o deploy! O `vercel.json` já está configurado para SPA + PWA.
