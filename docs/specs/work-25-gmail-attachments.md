# WORK-25 — Gmail anexos

## Metadados

- `spec_id`: WORK-25
- `titulo_tecnico`: Integração Gmail — Fase 7: download de anexos recebidos + upload no envio + preview inline
- `source_product_spec`: `docs/03-gmail-integration-plan.md`
- `source_product_spec_version`: 1
- `baseline_branch_or_commit`: `master` após merge da WORK-24
- `target_branch`: `work-25-gmail-attachments`
- `escopo_sistema`: financial (endpoints + upgrade do send) + financial-front (lista de anexos + preview + composer)
- `última_atualização`: 2026-08-08

## 1. Objective do documento

- **Download** de anexos de emails recebidos (stream autenticado)
- **Upload** de anexos no envio (composer com input file, multipart)
- **Preview inline** pra PDF (embed) e imagens (JPG/PNG)
- Limite de 25MB por email (limite oficial do Gmail)

## 2. System overview

- **Estado atual (pós WORK-24)**: sistema exibe body dos emails mas ignora anexos. Envio é só texto.
- **Estado alvo**:
  - Endpoint `GET /api/gmail/messages/{msgId}/attachments/{attachmentId}` stream do arquivo (Content-Disposition attachment, Content-Type original)
  - `POST /api/gmail/messages/send` upgrade pra aceitar multipart com múltiplos arquivos
  - UI mostra lista de anexos no viewer (nome + tamanho + ícone tipo)
  - Clicar em anexo baixa; se for PDF ou imagem, botão "Visualizar" abre preview inline
  - Composer ganha botão "Anexar" com input file múltiplo
- **Delta técnico**:
  - Endpoint download em `GmailAttachmentsController`
  - Upgrade do `GmailSendController` pra multipart
  - Upgrade do `MimeMessageBuilder` pra suportar multipart/mixed com anexos
  - Frontend: componente `AttachmentList.tsx`, upgrade do composer
- **Fora de escopo**: inline images no compose, drag&drop no composer (opcional), preview de docx/xlsx

## 3. Architecture design

- **Download**:
  - Frontend: `GET /api/gmail/messages/{msgId}/attachments/{attId}` com `responseType: 'blob'`
  - Cria object URL e força download via `<a>` (mesmo padrão do PJ)
- **Preview inline**:
  - Se `contentType == 'application/pdf'` → `<embed>` ou `<iframe src={objectUrl}>`
  - Se `image/*` → `<img src={objectUrl}>`
  - Modal fullscreen com o preview
- **Upload no envio**:
  - Composer usa `FormData` com `payload` (JSON com to/cc/etc.) + `files` (múltiplos)
  - Backend recebe multipart → passa files pro `MimeMessageBuilder` → monta MIME multipart/mixed
- **MIME multipart/mixed**:
  ```
  From/To/Subject/Date
  Content-Type: multipart/mixed; boundary="XYZ"

  --XYZ
  Content-Type: text/plain; charset=UTF-8

  {corpo}
  --XYZ
  Content-Type: application/pdf; name="doc.pdf"
  Content-Disposition: attachment; filename="doc.pdf"
  Content-Transfer-Encoding: base64

  {base64 do arquivo}
  --XYZ--
  ```
- **Limites**:
  - Frontend valida: soma total de anexos <= 25MB antes de enviar
  - Backend valida também (defense-in-depth)
  - `application.yml` `multipart.max-request-size`: aumentar pra 30MB (25MB + body + overhead)

## 4. Data design

- **Sem tabela nova**
- **Request DTO do send** (upgrade):
  - Passa a receber multipart:
    - `payload` (part JSON) = SendMessageRequest (mesmo da WORK-23)
    - `files` (multi-part) = arquivos

## 5. Interface design

- **APIs**:

  | Método | Path | Descrição |
  |---|---|---|
  | `GET` | `/api/gmail/messages/{msgId}/attachments/{attId}?filename=xxx` | Stream do arquivo. `filename` no query (retornado no header Content-Disposition) |
  | `POST` | `/api/gmail/messages/send` | Upgrade: agora consome `multipart/form-data` com `payload` (JSON) + `files` (multi) |

- **Errors** download:
  - 404 se msgId/attId não pertence ao user
  - 400 se filename ausente ou inválido

- **Errors** send:
  - 400 se soma dos arquivos > 25MB
  - 400 se filename com path traversal (`../`, etc.)

## 6. Component design

### `CMP-01` GmailAttachmentsService
- Path: `com.financial.gmail.service.GmailAttachmentsService`
- Método: `AttachmentStream download(String messageId, String attachmentId)`
- Chama Gmail API `users.messages.attachments.get` → retorna `data` base64
- Retorna wrapper `AttachmentStream(InputStream, contentType, size)`

### `CMP-02` GmailAttachmentsController
- Endpoint stream (similar ao PJ download): escreve direto no `HttpServletResponse`
- `Content-Disposition: attachment; filename="..."`
- `Content-Type` original

### `CMP-03` MimeMessageBuilder (upgrade)
- Adiciona: `String buildMultipartMessage(String from, SendMessageRequest req, List<MultipartFile> files)`
- Usa `jakarta.mail` `MimeMultipart` com type `mixed`
- Cada anexo: `MimeBodyPart` com `setDataHandler(new DataHandler(new ByteArrayDataSource(bytes, contentType)))` + `setFileName`
- Retorna base64url do MIME

### `CMP-04` GmailSendService (upgrade)
- Aceita `List<MultipartFile>` opcional
- Se lista vazia/null → usa `buildRawMessage` (WORK-23)
- Se com files → `buildMultipartMessage`

### `CMP-05` GmailSendController (upgrade)
- Endpoint muda de `application/json` pra `multipart/form-data`
- `@RequestPart("payload") SendMessageRequest` + `@RequestPart(value = "files", required = false) List<MultipartFile>`

### `CMP-06` AttachmentList.tsx
- Path: `src/pages/gmail/components/AttachmentList.tsx`
- Renderiza lista de attachments do email
- Cada item: ícone (por tipo — PDF/imagem/doc), nome, tamanho formatado, botões [Visualizar] (se preview possível) [Baixar]

### `CMP-07` AttachmentPreviewModal.tsx
- Path: `src/pages/gmail/components/AttachmentPreviewModal.tsx`
- Modal fullscreen com `<embed>` (PDF) ou `<img>` (imagens)
- Botão baixar dentro do preview

### `CMP-08` GmailComposerModal (upgrade)
- Botão "Anexar arquivo" abre `<input type="file" multiple>`
- Lista dos arquivos escolhidos com botão X pra remover
- Validação: soma <= 25MB
- Ao enviar, monta `FormData` com `payload` (JSON blob) + `files`

### `CMP-09` gmailService (expandido)
- Método: `downloadAttachment(messageId, attachmentId, filename)`
- Update de `sendMessage` pra aceitar files

## 7. UI and interaction design

- **Lista de anexos** aparece no header do viewer ("📎 2 anexos") ou no rodapé de cada mensagem
- **Preview modal**: fullscreen, esc fecha
- **Composer** com "Anexar" no toolbar; anexos aparecem como chips embaixo do body

## 8. Runtime and operations

- **`application.yml`**:
  ```yaml
  spring:
    servlet:
      multipart:
        max-file-size: 25MB      # antes 5MB (pra PJ)
        max-request-size: 30MB   # antes 6MB
  ```
  Nota: essa mudança afeta TAMBÉM o upload do PJ. Precisa cuidar de não regredir (o backend do PJ tem sua própria validação de tamanho 5MB — mantém). Ou seja, o Spring aceita até 25MB, mas o PJ rejeita > 5MB no seu service. OK.
- **Dep**: `jakarta.mail` (já introduzido na WORK-23) — sem nova dep

## 9. Security, privacy and compliance

- **Filename sanitization**: rejeitar `../`, null bytes, control chars
- **Content-Type validation** no upload: sem whitelist (Gmail aceita qualquer) mas checar magic bytes seria overkill nesta fase. Confia no tipo declarado
- **Ownership**: só o user dono da conta Gmail baixa seus anexos (implícito via `GmailAuthService.getValidAccessToken`)

## 10. Requirement mapping

### `REQ-25-01` Download de anexo
- Aceite: emails com anexo mostram lista; clicar em baixar salva o arquivo original íntegro

### `REQ-25-02` Preview PDF
- Aceite: PDF com "Visualizar" abre embed inline

### `REQ-25-03` Preview imagem
- Aceite: JPG/PNG com "Visualizar" abre preview

### `REQ-25-04` Envio com anexo
- Aceite: enviar email com 1 PDF; destinatário recebe email + arquivo abre

### `REQ-25-05` Limite 25MB
- Aceite: tentar anexar 30MB → erro claro antes de enviar

### `REQ-25-06` Múltiplos anexos
- Aceite: enviar com 3 arquivos (soma < 25MB) → OK

## 11. Implementation plan input

### `WORK-25A` Backend
- Arquivos:
  - `com/financial/gmail/service/GmailAttachmentsService.java`
  - `com/financial/gmail/controller/GmailAttachmentsController.java`
  - `com/financial/gmail/util/MimeMessageBuilder.java` (upgrade multipart)
  - `com/financial/gmail/service/GmailSendService.java` (upgrade)
  - `com/financial/gmail/controller/GmailSendController.java` (multipart)
  - `application.yml` (multipart 25MB/30MB)
- Validar: `curl` download + envio com file

### `WORK-25B` Frontend
- Arquivos:
  - `src/pages/gmail/components/AttachmentList.tsx`
  - `src/pages/gmail/components/AttachmentPreviewModal.tsx`
  - Upgrade `GmailComposerModal.tsx`
  - `src/services/gmailService.ts` (download + send multipart)
- Validar: UX completo

## 12. Test plan

- **Manual (Diego)**:
  - [ ] Receber email com PDF, baixar, arquivo íntegro
  - [ ] Preview PDF inline funciona
  - [ ] Preview JPG inline funciona
  - [ ] Enviar email com 1 PDF anexo
  - [ ] Enviar com 3 anexos
  - [ ] Tentar anexar arquivo grande (30MB) → erro claro no front
  - [ ] Enviar com anexo + destinatário recebe o arquivo abrível
  - [ ] URL direta ao MinIO NÃO se aplica aqui (Gmail é o storage)

## 13. Open items

- **Riscos**:
  - Aumentar multipart do Spring pra 30MB afeta OUTROS endpoints (PJ, signup). Cada um valida seu próprio tamanho internamente, então na prática está OK, mas revisar
  - PDFs grandes podem estourar memory ao carregar como Blob no front. Alternativa: chunked download (complica); pra 25MB max, aceitável
- **Decisões**:
  - Backend faz download completo em memory antes de streamar? Sim, já que Gmail retorna base64 completo. Não é ideal pra memory mas simplifica. Se virar problema, mudar pra buffered
- **Assunções**:
  - Diego não precisa suportar arquivos > 25MB (limite do Gmail. Pra maiores, Gmail usa Google Drive links — fora de escopo)

---

## Fim da fase de specs

Este é o último documento das 8 fases planejadas para a integração Gmail. Ao final da WORK-25 o cliente Gmail estará **completo do ponto de vista da spec original**, com:

- OAuth, tokens seguros e refresh
- Inbox por categoria com leitura sanitizada
- Notificações em tempo real (badge + toast)
- Ações single e em lote
- Labels custom com CRUD e organização
- Envio de emails com validação
- Busca com operadores Gmail
- Anexos (download, preview, upload)

Roadmap além disso (não speccado nesta rodada):
- Editor rich text no composer
- Rascunhos (drafts)
- Reply/Reply-All com threading
- Snooze
- Filtros/regras automáticas
- Múltiplas contas Gmail
