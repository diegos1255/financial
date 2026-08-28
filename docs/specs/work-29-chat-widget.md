# WORK-29 — Chat widget frontend (bolinha bottom-right + drawer)

## Metadados

- `spec_id`: WORK-29
- `titulo_tecnico`: Chat RAG — Fase 4: widget de chat embutido no sistema (bolinha + drawer + input)
- `source_product_spec`: `docs/05-rag-plan.md`
- `source_product_spec_version`: 1
- `baseline_branch_or_commit`: `master` após WORK-28 na branch `rag-integration`
- `target_branch`: `rag-integration`
- `escopo_sistema`: financial-front (frontend React)
- `última_atualização`: 2026-08-23

## 1. Objective do documento

- Renderizar uma **bolinha fixa** no canto direito inferior de todas as páginas do sistema (só para usuário logado)
- Ao clicar na bolinha, abrir um **drawer** que sobe da direita com histórico da sessão + input + botão send
- Usar `POST /api/chat/query` (WORK-28) pra buscar respostas
- Mostrar `sources` como referências clicáveis (ex: "WORK-05 §Objetivo") — inicialmente só visual, sem link real; se der tempo, linkar pra spec no GitHub
- **Não cobre**: persistência de histórico entre sessões, streaming, feedback thumbs up/down, botão "limpar conversa"

## 2. System overview

- **Estado atual (pós WORK-28)**: backend do chat pronto e testado via cURL
- **Estado alvo**:
  - Widget global aparece em todas as rotas autenticadas
  - Diego clica bolinha → drawer abre → pergunta → resposta aparece no histórico
  - Histórico dura enquanto a aba estiver aberta (state em memória)
  - Sem persistência (F5 zera; ok pra MVP)
- **Delta técnico**:
  - Novo componente `ChatWidget` (root do widget: bolinha + drawer)
  - Novos componentes filhos: `ChatBubble`, `ChatDrawer`, `ChatMessage`
  - Novo serviço frontend: `chatService.ts` (métodos `getStatus`, `query`)
  - Renderizado no `App.tsx` (nível raiz, condicional a `user != null`)
  - Estado local (`useState`) para histórico + `open`/`close`/`loading`
- **Fora de escopo**: markdown rendering rico nas respostas (usar `<pre>` ou texto simples pra MVP), navegação por teclado com atalho, feedback UX
- **Restrições obrigatórias**:
  - Bolinha não pode cobrir botões críticos do sistema (verificar Dashboard, Email — sistema já usa alguns FABs?)
  - Drawer deve ser responsivo (em mobile ocupa a tela inteira)
  - Só aparece se `chat.status === enabled` (busca no mount do App)

## 3. Architecture design

- **Layout**:
  - Bolinha: `position: fixed; bottom: 20px; right: 20px; z-index: 40` (menos que modal, que é 50)
  - Cor accent do sistema (`bg-accent`), ícone `MessageCircle` do lucide
  - Drawer: `fixed inset-y-0 right-0 w-full max-w-md z-50` — full height, largura máxima 448px
  - Backdrop translúcido só em mobile (< md); em desktop o drawer flutua ao lado do conteúdo
- **Estados**:
  - Fechado: só a bolinha visível
  - Aberto: drawer expandido, bolinha continua visível (ou some — decisão UX; padrão Intercom é bolinha vira X pra fechar)
- **Histórico**:
  - `messages: Message[]` em useState
  - `Message = { id, role: 'user'|'assistant', content, sources?, error? }`
  - Renderização: mensagens do assistant à esquerda com bg cinza; do user à direita com bg accent
- **Fluxo de query**:
  ```
  1. User digita "como cadastro salário?" no input
  2. Enter (ou click Send) → dispatch
  3. Adiciona mensagem { role: user, content }
  4. Adiciona mensagem { role: assistant, content: '...', loading: true }
  5. chatService.query({ question })
  6. Recebe { answer, sources, tookMs }
  7. Atualiza a mensagem assistant loading com { content: answer, sources, loading: false }
  8. Em erro: mensagem { role: assistant, error: 'Falha ao consultar. Tente novamente.', loading: false }
  ```
- **Auto-scroll**: `ChatDrawer` faz scroll to bottom quando `messages.length` muda
- **Fechamento**: ESC ou clicar backdrop (mobile) ou botão X no header do drawer
- **Trade-offs**:
  - Estado local em vez de Context/Redux → componente autônomo; sem necessidade de compartilhar histórico com outras partes do app
  - Sem persistência → simplicidade; F5 zera, aceitável na iteração inicial
  - Sources como texto sem link real → simplicidade; link pra GitHub vira nice-to-have depois

## 4. Data design

- Frontend only. Types:
  ```typescript
  type ChatStatus = { enabled: boolean };

  type ChunkSource = {
    sourcePath: string;
    section: string | null;
    score: number;
  };

  type ChatAnswer = {
    answer: string;
    sources: ChunkSource[];
    tookMs: number;
  };

  type ChatMessage = {
    id: string;                    // uuid gerado no client
    role: 'user' | 'assistant';
    content: string;
    sources?: ChunkSource[];
    loading?: boolean;
    error?: string;
  };
  ```

## 5. Interface design

- Consome apenas `GET /api/chat/status` e `POST /api/chat/query` (definidos na WORK-28)
- Frontend não expõe nova API

## 6. Component design

### `CMP-01` chatService (frontend)

- Path: `financial-front/src/services/chatService.ts`
- Métodos:
  ```typescript
  export const chatService = {
    async getStatus(): Promise<boolean> {
      try {
        const { data } = await api.get<ChatStatus>('/api/chat/status');
        return data.enabled;
      } catch { return false; }
    },
    async query(question: string): Promise<ChatAnswer> {
      const { data } = await api.post<ChatAnswer>('/api/chat/query', { question });
      return data;
    },
  };
  ```

### `CMP-02` ChatWidget

- Path: `financial-front/src/components/chat/ChatWidget.tsx`
- Estado local:
  - `enabled: boolean | null` (null = ainda não sabe)
  - `open: boolean`
  - `messages: ChatMessage[]`
  - `sending: boolean`
- Effects:
  - Ao mount: `chatService.getStatus()` → seta `enabled`
- Render:
  - Se `enabled == false` ou `null` → não renderiza nada
  - Se `enabled == true` → renderiza `ChatBubble` + (se `open`) `ChatDrawer`

### `CMP-03` ChatBubble

- Path: `financial-front/src/components/chat/ChatBubble.tsx`
- Props: `{ open: boolean, onClick: () => void }`
- Renderiza botão redondo `w-14 h-14 rounded-full bg-accent shadow-lg`
- Ícone: `MessageCircle` (fechado) ou `X` (aberto)
- Sem badge de notificação nesta versão

### `CMP-04` ChatDrawer

- Path: `financial-front/src/components/chat/ChatDrawer.tsx`
- Props: `{ messages, sending, onClose, onSend }`
- Layout: `fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl flex flex-col`
- Header: título "Assistente" + botão X
- Body: lista de `ChatMessage` (scroll auto)
- Empty state: "Pergunte sobre como usar o sistema"
- Footer: `<textarea>` + botão Send (Enter envia, Shift+Enter quebra linha)
- Escape → `onClose()`

### `CMP-05` ChatMessage

- Path: `financial-front/src/components/chat/ChatMessage.tsx`
- Props: `{ message: ChatMessage }`
- User: alinhado à direita, bg accent, texto branco
- Assistant: alinhado à esquerda, bg slate-100, texto slate-900
  - Se `loading` → mostra 3 dots animados
  - Se `error` → mostra em vermelho
  - Se `sources` → abaixo do texto, chip pequeno "WORK-XX §Section" (mostra até 3, se tiver mais → "+N mais")
- Sem markdown rendering — usa `<p>` com `whitespace-pre-wrap`

## 7. UI and interaction design

- **Telas**: todas as autenticadas (widget é global)
- **Componentes novos**: 4 (Widget, Bubble, Drawer, Message)
- **Estados visuais**:
  - **loading da resposta**: 3 dots pulsando no card do assistant
  - **erro**: card vermelho com "Falha ao consultar. Tente novamente." + botão Retentar (opcional MVP: só mostrar erro, retry manual = digitar de novo)
  - **empty**: drawer aberto sem mensagens mostra CTA "Pergunte sobre como usar o sistema. Ex: 'como cadastro salário?'"
- **Responsividade**:
  - Mobile (`< md`): drawer ocupa tela inteira; backdrop escuro; ESC fecha
  - Desktop: drawer flutua à direita, w-96, sem backdrop
- **Acessibilidade**:
  - `aria-label="Abrir chat"` na bolinha
  - `role="dialog"` no drawer
  - Focus trap opcional (nice-to-have; ignora se complicar)
- **Regras de conteúdo**:
  - Placeholder do input: "Faça uma pergunta..."
  - Tamanho max do textarea: 500 chars (mesmo limit do backend)
  - Sem markdown — respostas simples

## 8. Runtime and operations

- Sem novas envs (CSP já libera `connect-src 'self'`)
- Widget montado no `App.tsx` dentro do provider de auth:
  ```tsx
  <AuthProvider>
    <Router>...</Router>
    {user && <ChatWidget />}
  </AuthProvider>
  ```

## 9. Security, privacy and compliance

- **Widget só aparece com user logado** (herda auth do App)
- **Sem armazenar histórico em localStorage** (evita PII em disco)
- **Endpoint de query já tem rate limit** no backend (WORK-28)

## 10. Requirement mapping

### `REQ-29-01` Bolinha aparece quando logado

- Aceite: logar → bolinha aparece bottom-right em todas as páginas
- Testes: manual

### `REQ-29-02` Bolinha não aparece quando desabilitado

- Aceite: remover `GEMINI_API_KEY`, restart, F5 → sem bolinha
- Testes: manual

### `REQ-29-03` Fluxo completo pergunta/resposta

- Aceite: abrir drawer → digitar "como cadastro salário?" → Enter → resposta aparece com sources
- Testes: manual

### `REQ-29-04` Loading state

- Aceite: enquanto backend processa, mostra 3 dots
- Testes: manual (verificar visualmente)

### `REQ-29-05` Erro tratado

- Aceite: derrubar backend, mandar pergunta → mensagem de erro vermelha, sem toast agressivo
- Testes: manual

## 11. Implementation plan input

### `WORK-29A` Service + tipos

- Arquivos:
  - `financial-front/src/services/chatService.ts`
  - `financial-front/src/types/chat.ts` (types acima)
- Validar: compilar; unit não obrigatório

### `WORK-29B` Componentes UI

- Arquivos:
  - `financial-front/src/components/chat/ChatWidget.tsx`
  - `financial-front/src/components/chat/ChatBubble.tsx`
  - `financial-front/src/components/chat/ChatDrawer.tsx`
  - `financial-front/src/components/chat/ChatMessage.tsx`
- Validar: mount visual, sem lógica ainda

### `WORK-29C` Integração no App

- Arquivo: `financial-front/src/App.tsx`
- Mudança: renderizar `<ChatWidget />` condicional a `user`
- Validar: logar → widget aparece

### `WORK-29D` Fluxo funcional

- Junta tudo: user digita → chatService.query → renderiza resposta
- Validar: caso feliz manual + erro simulado

## 12. Test plan

- **Unit**: nenhum obrigatório (UI simples; se der tempo, teste de `ChatMessage` com props diferentes)
- **Manual (Diego)**:
  - [ ] Login → bolinha aparece bottom-right
  - [ ] Click bolinha → drawer sobe
  - [ ] Empty state visível
  - [ ] Digitar pergunta + Enter → 3 dots aparecem → resposta chega
  - [ ] Sources aparecem embaixo da resposta
  - [ ] Fazer 2 perguntas consecutivas → histórico preserva
  - [ ] Fechar drawer com X, botão bolinha, ESC → todos funcionam
  - [ ] Refresh page → histórico zera (esperado)
  - [ ] Mobile (redimensionar janela) → drawer full-screen
  - [ ] Sem API key → nenhuma bolinha aparece
  - [ ] Regressão: navegação entre menus continua normal

## 13. Open items

- **Bloqueios**: WORK-28 fechada e endpoint validado via cURL
- **Riscos**:
  - Bolinha pode conflitar com FABs existentes (não vejo nenhum no sistema, mas conferir na hora)
  - Markdown na resposta pode ficar feio como plain text (aceitável no MVP; iterar depois)
- **Decisões**:
  - Sem persistência (histórico dura só a sessão)
  - Sem streaming
  - Sources como chip texto simples, sem link clicável real (adicionar depois se Diego pedir)
- **Assunções**:
  - Diego roda em desktop 90% do tempo; mobile é bonus
