# Setup Google Cloud pra integração Gmail

Este documento guia o setup **manual** no Google Cloud Console necessário pra WORK-18 (Gmail OAuth). Precisa ser feito uma única vez pelo Diego (dono do projeto Google), antes de rodar o backend com a integração ativa.

Ao final, tu vai ter 4 valores pra colocar no `.env` local:
- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `GMAIL_REDIRECT_URI`
- `GMAIL_TOKEN_ENCRYPTION_KEY`

Tempo estimado: **~15 minutos**.

---

## 1. Criar projeto no Google Cloud Console

1. Abre https://console.cloud.google.com/
2. Clica no seletor de projeto (canto superior esquerdo) → **Novo projeto**
3. Nome sugerido: `financial-hub` (ou o nome que preferires)
4. Deixa "Organização" e "Local" em branco (default) se for conta pessoal
5. Clica **Criar**
6. Espera ~30 seg e seleciona o projeto criado no seletor

---

## 2. Habilitar Gmail API

1. No menu lateral (☰) → **APIs & Services** → **Library**
2. Busca `Gmail API`
3. Clica no resultado → botão **Enable**

Isso permite que teu projeto faça requests à Gmail API.

---

## 3. Configurar OAuth consent screen

1. Menu lateral → **APIs & Services** → **OAuth consent screen**
2. Escolhe **External** (mesmo pra uso pessoal — a menos que tenhas Google Workspace)
3. **Create**

### Aba OAuth consent screen
- **App name**: `Financial Hub` (ou como preferires)
- **User support email**: teu email
- **Developer contact information → email**: teu email
- Deixa o resto em branco
- **Save and Continue**

### Aba Scopes
- Clica **Add or Remove Scopes**
- Marca:
  - `https://www.googleapis.com/auth/gmail.modify`
  - `https://www.googleapis.com/auth/gmail.send`
  - `https://www.googleapis.com/auth/gmail.labels`
  - `openid`
  - `.../auth/userinfo.email`
- **Update** → **Save and Continue**

### Aba Test users
- Clica **Add users**
- Adiciona teu email pessoal (o que tu vai conectar no sistema)
- **Save and Continue**

### Aba Summary
- Confere tudo → **Back to Dashboard**

---

## 4. Criar credencial OAuth Client ID

1. Menu → **APIs & Services** → **Credentials**
2. **Create Credentials** → **OAuth client ID**
3. **Application type**: `Web application`
4. **Name**: `Financial Hub local` (ou como preferires)
5. **Authorized JavaScript origins**: (deixa em branco)
6. **Authorized redirect URIs**: clica **Add URI**:
   ```
   http://localhost/api/gmail/callback
   ```
   (⚠️ tem que ser **exatamente** essa URL — mesmo `http` e sem trailing slash)
7. **Create**

Vai aparecer um modal com **Your Client ID** e **Your Client Secret** — **copia os dois** e guarda em lugar seguro.

---

## 5. Gerar chave de criptografia dos tokens

O sistema criptografa o refresh token do Google antes de guardar no DB, usando AES-256-GCM. Precisa de uma chave de 32 bytes em base64.

**No terminal (Git Bash / WSL / Linux / macOS)**:
```bash
openssl rand -base64 32
```

Vai imprimir algo como:
```
K8sN2dP4XvB9mQ7yA1oL5hF3jR6tE0iU8pC4wG2vZ7Y=
```

**Guarda esse valor.**

---

## 6. Preencher `.env` local

No arquivo `financial/.env` do projeto, adiciona/preenche:

```bash
GMAIL_CLIENT_ID=<copiado do passo 4>
GMAIL_CLIENT_SECRET=<copiado do passo 4>
GMAIL_REDIRECT_URI=http://localhost/api/gmail/callback
GMAIL_TOKEN_ENCRYPTION_KEY=<gerado no passo 5>
```

Depois rebuild o backend:
```powershell
cd D:\workspace\financial
docker-compose up -d --build backend
```

---

## 7. Validar

1. Sobe o sistema, faz login normal
2. Vai em **Email** no menu lateral
3. Vê a tela "Conecte sua conta Gmail" → clica no botão
4. Vai redirecionar pro Google → escolhe teu email → aceita permissões
5. Volta pro sistema mostrando "Conectado como {teu-email}"

Se algo der errado, checa:
- Logs do backend (`docker logs financial-backend --tail 50`)
- URL de callback exata no Google Cloud
- 4 env vars preenchidas no `.env`

---

## Observação sobre o modo Test

Como configuramos como **External + Testing**, tem 2 limitações:

1. **Refresh token expira em 7 dias** — depois disso o sistema precisa que tu autorize de novo. Se quiseres não expirar, precisa submeter o app pra verificação da Google (formulário + revisão de semanas).
2. **Só users marcados como Test users** (no passo 3) conseguem autorizar.

Pro uso pessoal (só tu), OK. Se um dia precisar mais gente ou refresh token perpétuo, entramos com verificação.

---

## Segurança

- **Nunca commite** `.env` no git (já está no `.gitignore`)
- **Nunca compartilhe** `GMAIL_CLIENT_SECRET` ou `GMAIL_TOKEN_ENCRYPTION_KEY`
- Se um dia vazar, gera novos no Google Cloud Console (rotaciona) e uma nova chave de criptografia (nota: rotacionar a chave invalida os tokens criptografados no DB — vai precisar reconectar o Gmail)
