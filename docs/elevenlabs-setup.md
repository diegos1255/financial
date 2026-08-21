# Setup ElevenLabs (voz Jarvis nas notificações)

Este doc guia o setup **manual** no ElevenLabs pra ter voz realista nas notificações de novos emails do Gmail. Free tier: **10.000 caracteres/mês** — cada notificação usa ~50 chars, então cabe ~200 emails/mês sem pagar.

Ao final, tu vai ter 2 valores pra colocar no `.env`:
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_VOICE_ID`

Tempo estimado: **~10 minutos**.

---

## 1. Criar conta

1. Vai em https://elevenlabs.io/
2. **Sign Up** (Google login, GitHub ou email — qualquer um)
3. Confirma o email

---

## 2. Escolher a voz Jarvis-like

1. No painel, menu esquerdo → **Voices** (ou **Voice Library**)
2. Na busca, digita `British` ou `Jarvis` — várias vozes aparecem
3. Sugestões que soam bem Jarvis (todas em EN, mas o modelo `multilingual_v2` traduz o accent pra falar PT-BR):
   - **Adam** (padrão, masculina, calma)
   - **Antoni** (masculina, jovem)
   - **Arnold** (masculina, profunda — mais épico)
   - **Callum** (masculina, britânica, calma — **mais Jarvis clássico**)
   - **Charlie** (masculina, casual)
4. Clica em cada uma → botão de "play" pra ouvir samples
5. Escolhida a voz, clica no card dela → botão **"Add to My Voices"** (ou **"Use Voice"**)
6. Agora vai em **My Voices** (menu esquerdo) → tua voz aparece
7. Clica nela → tem um botão **"ID"** ou copia direto: o `voice_id` é um hash tipo `pNInz6obpgDQGcFmaJgB`

**Guarda o `voice_id`.**

---

## 3. Gerar API Key

1. Canto superior direito → clique no avatar → **Profile + API Key**
2. Aba **API Keys** → **Create API Key**
3. Nome: `financial-hub`
4. Permissões: deixa o default (leitura + `text_to_speech`)
5. **Create**
6. Copia a key (aparece **uma vez só**) — algo tipo `sk_...`

**Guarda a API key.**

---

## 4. Voice cloning (opcional, avançado)

Se quiseres a voz **exata do Paul Bettany** (Jarvis do MCU):
1. Consegue ~1min de áudio dele falando (YouTube com ferramentas de extração, filme, etc.)
2. Menu **Voice Library** → **Voice Cloning** → **Instant Voice Cloning**
3. Faz upload do sample, nome "Jarvis"
4. Aguarda ~30s → voice_id novo é gerado
5. Usa esse voice_id no lugar

**Aviso legal**: uso pessoal privado é OK; nunca redistribua/publique áudio dessa voz clonada.

---

## 5. Passar os valores pro sistema

Adiciona no `financial/.env` local:
```bash
ELEVENLABS_API_KEY=sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ELEVENLABS_VOICE_ID=pNInz6obpgDQGcFmaJgB
```

Depois:
```powershell
cd D:\workspace\financial
docker-compose up -d --build backend
```

---

## 6. Como o sistema decide qual voz usar

- **Se as 2 vars estão no `.env`**: usa ElevenLabs (voz Jarvis)
- **Se qualquer uma vazia**: cai automaticamente pro TTS do Windows (comportamento anterior)
- **Se ElevenLabs falhar em runtime** (rede, limite mensal estourou, etc.): cai pro Windows na hora, sem quebrar nada

---

## 7. Monitorar consumo

- Free tier: 10.000 chars/mês, reseta no dia da conta criada
- ElevenLabs dashboard mostra quanto tu usou este mês
- Se um mês estourar: ou paga $5 avulso, ou deixa cair pro Windows TTS até resetar

---

## Segurança

- **Nunca commite** `.env` no git (já está no `.gitignore`)
- **Nunca compartilhe** `ELEVENLABS_API_KEY` — quem tem ela pode consumir teu free tier
- Se vazar: no ElevenLabs, revoga a key antiga e cria uma nova
