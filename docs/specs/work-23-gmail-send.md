# WORK-23 — Gmail enviar emails

## Metadados

- `spec_id`: WORK-23
- `titulo_tecnico`: Integração Gmail — Fase 5: envio de emails via composer
- `source_product_spec`: `docs/03-gmail-integration-plan.md`
- `source_product_spec_version`: 1
- `baseline_branch_or_commit`: `master` após merge da WORK-22
- `target_branch`: `work-23-gmail-send`
- `escopo_sistema`: financial (endpoint send) + financial-front (composer modal)
- `última_atualização`: 2026-08-08

## 1. Objective do documento

- Habilitar envio de emails pelo sistema com destinatário, CC, BCC, assunto e corpo (texto simples)
- **Não cobre**: editor rich (WYSIWYG), rascunhos (drafts), signature template, anexos (WORK-25), reply/reply-all (versão futura)

## 2. System overview

- **Estado atual**: user consome emails (lê, arquiva, gerencia labels), mas não envia
- **Estado alvo**:
  - Endpoint `POST /api/gmail/messages/send` que aceita `{ to, cc?, bcc?, subject, body }`, monta MIME + base64url, envia via Gmail API
  - Botão "Novo email" no header da inbox → abre modal composer
- **Delta técnico**:
  - Endpoint em `GmailSendController` (novo)
  - Service `GmailSendService`
  - Utility `MimeMessageBuilder` (monta o RFC 5322)
  - Frontend: `GmailComposerModal.tsx`
- **Fora de escopo**: HTML rich, anexos, drafts, reply threading (`In-Reply-To`/`References`), agendamento

## 3. Architecture design

- **Gmail API `messages.send`**:
  - Aceita body `{ raw: base64url(mime_message) }`
  - Retorna message `id` + `threadId` do email enviado
- **MIME multipart NÃO necessário** nesta fase (só texto simples). Formato:
  ```
  From: diego@gmail.com
  To: destinatario@x.com
  Cc: cc1@x.com, cc2@x.com
  Bcc: bcc@x.com
  Subject: =?UTF-8?B?<base64>?=       ← se tiver acento
  Content-Type: text/plain; charset=UTF-8
  Content-Transfer-Encoding: quoted-printable

  {corpo}
  ```
- **Encoding do subject**: usar Java `MimeUtility.encodeText` (jakarta.mail) ou implementar RFC 2047 quoted-printable
- **Validação de emails**: format check no frontend (regex simples) + backend (Bean Validation `@Email`)

## 4. Data design

- Sem tabela nova
- **Request DTO**:
  ```java
  record SendMessageRequest(
    @NotEmpty @Valid List<@Email String> to,
    @Valid List<@Email String> cc,       // pode ser null/vazio
    @Valid List<@Email String> bcc,      // idem
    @NotBlank @Size(max=200) String subject,
    @NotBlank @Size(max=100000) String body    // 100k chars = ~100KB de texto, suficiente
  ) {}
  ```
- **Response DTO**:
  ```java
  record SendMessageResponse(
    String messageId,
    String threadId
  ) {}
  ```

## 5. Interface design

- **API**:

  | Método | Path | Descrição |
  |---|---|---|
  | `POST` | `/api/gmail/messages/send` | envia email; retorna id do message + thread |

- **Errors**:
  - `INVALID_PAYLOAD` (400) — validação de campos
  - `GMAIL_SEND_FAILED` (502) — falha no Google
  - `GMAIL_REAUTH_REQUIRED` (401)

## 6. Component design

### `CMP-01` MimeMessageBuilder
- Path: `com.financial.gmail.util.MimeMessageBuilder`
- Método: `String buildRawMessage(String from, SendMessageRequest req)` → retorna base64url do MIME
- Handles:
  - Encoding do subject (RFC 2047 se tiver caractere non-ASCII)
  - Encoding do body (quoted-printable) se tiver non-ASCII
  - Múltiplos `To`/`Cc` separados por vírgula
  - `Bcc` **não** vai no header MIME (é revelado só no envelope SMTP; Gmail lida internamente)

### `CMP-02` GmailSendService
- Path: `com.financial.gmail.service.GmailSendService`
- Método: `SendMessageResponse send(SendMessageRequest req)`
- Fluxo:
  1. Pega email do user via `GmailCredentialRepository`
  2. `MimeMessageBuilder.buildRawMessage(from, req)`
  3. Chama Gmail API `users.messages.send` com `{raw}`
  4. Retorna response
- Invalida cache `gmail-unread-summary` (opcional; enviar não muda unread mas pode aparecer em "Sent")

### `CMP-03` GmailSendController
- Path: `com.financial.gmail.controller.GmailSendController`
- Endpoint `POST /api/gmail/messages/send`

### `CMP-04` GmailComposerModal.tsx
- Path: `src/pages/gmail/components/GmailComposerModal.tsx`
- Campos:
  - **Para**: input com tags (email validos separados por Enter/vírgula)
  - **Cc** / **Bcc**: colapsáveis por default; toggle "Adicionar Cc/Bcc"
  - **Assunto**: input single-line
  - **Corpo**: textarea (min height ~200px, resizeable)
- Validação inline:
  - Pelo menos 1 destinatário em `To`
  - Email válido em cada tag
  - Assunto não vazio (aviso "Enviar sem assunto?" se vazio? Simplifica: bloqueia)
  - Corpo não vazio (mesmo)
- Botões: **Enviar** / **Cancelar** (com confirm se tem texto digitado — "Descartar rascunho?")

### `CMP-05` GmailInboxPage (modificação)
- Adiciona botão "Novo email" (ícone `Plus`) no header
- Estado: `composerOpen`

### `CMP-06` gmailService (expandido)
- Método: `sendMessage(request): Promise<SendMessageResponse>`

## 7. UI and interaction design

- **Modal composer** com tamanho `lg`
- **Tag input pra emails**: componente comum; ao digitar email + Enter, vira "chip". Delete no chip pra remover
- **Feedback**:
  - Sucesso → toast "Email enviado" + fechar modal
  - Erro → toast erro + manter modal aberto (não perde dados)
- **Discard confirm**: se digitou algo e clica Cancelar, modal "Descartar rascunho?"

## 8. Runtime and operations

- Sem novas envs
- Dep opcional backend: `jakarta.mail` (pra `MimeUtility`) — 1 jar pequeno
- Sem deps novas frontend

## 9. Security, privacy and compliance

- **From = email autorizado**: hardcoded do `GmailCredential.emailAddress` (não deixa spoofar)
- **Rate limit adicional**: opcional, mas cogitar Bucket4j específico pra envio (ex: 20/hora) — evita user abusar
- Backend valida emails no formato antes de mandar
- Não permitir enviar corpo com HTML nesta fase (força texto simples pra evitar surface de XSS reflexo)

## 10. Requirement mapping

### `REQ-23-01` Envio simples
- Aceite: preencher To + Subject + Body, enviar, email chega no destinatário
- Testes: manual

### `REQ-23-02` CC e BCC
- Aceite: enviar com CC e BCC, ambos recebem; BCC não aparece pra outros destinatários
- Testes: manual

### `REQ-23-03` Validação
- Aceite: sem `to` → 400; email malformado → 400
- Testes: unit + integração

### `REQ-23-04` Encoding UTF-8
- Aceite: enviar assunto e corpo com acentos e emojis → destinatário recebe corretamente
- Testes: manual

## 11. Implementation plan input

### `WORK-23A` Backend
- Arquivos:
  - `com/financial/gmail/util/MimeMessageBuilder.java`
  - `com/financial/gmail/service/GmailSendService.java`
  - `com/financial/gmail/controller/GmailSendController.java`
  - `com/financial/gmail/dto/send/SendMessageRequest.java`, `SendMessageResponse.java`
  - `pom.xml` (+ jakarta.mail se necessário)
- Validar: `curl` envia email teste

### `WORK-23B` Frontend
- Arquivos:
  - `src/pages/gmail/components/GmailComposerModal.tsx`
  - `src/pages/gmail/components/EmailTagsInput.tsx`
  - Modificação de `GmailInboxPage`
  - `src/services/gmailService.ts`
- Validar: enviar via UI

## 12. Test plan

- **Unit**: `MimeMessageBuilder` (com acentos, CC vazio, BCC vazio)
- **Manual (Diego)**:
  - [ ] Enviar email simples pra si mesmo, chega
  - [ ] Enviar com múltiplos destinatários
  - [ ] CC e BCC funcionam
  - [ ] Acento e emoji preservados
  - [ ] Fechar modal sem enviar → confirm
  - [ ] Erro forçado (destinatário inválido no lado do Google) → toast, modal permanece com dados

## 13. Open items

- **Riscos**:
  - Composer sem rich text vai frustrar em algum momento (formatação, hyperlinks). Aceitável nesta fase; iteração futura adiciona
  - Encoding de body com quoted-printable é chato de implementar manualmente; alternativa é passar tudo em base64 e setar `Content-Transfer-Encoding: base64` (menos bonito no MIME mas funciona)
- **Decisões**:
  - Backend usa `jakarta.mail` (com `Session` e `MimeMessage`) ou monta string manualmente? — Recomendo `jakarta.mail`, é padrão e já trata encoding
- **Assunções**: -
