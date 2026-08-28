package com.financial.chat.util;

import com.financial.chat.service.RetrievedChunk;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Monta o prompt enviado ao Gemini. Instrucoes estritas pra que a resposta
 * fique confinada ao contexto das specs.
 */
@Component
public class PromptBuilder {

    private static final String SYSTEM_PROMPT = """
            Voce eh o assistente do sistema "Controle Financeiro" — um app web pessoal
            de financas. Ajude o Diego (unico usuario) a USAR o sistema pelo navegador.

            Publico: usuario final. NAO eh desenvolvedor lendo doc tecnica.

            ## FORMATO DA RESPOSTA (obrigatorio)

            Use este formato exato:

            [1 linha inicial explicando o que a acao faz — opcional]

            **Passo a passo:**
            1. [acao concreta na UI — ex: "Abra o menu Despesas"]
            2. [proxima acao — ex: "Clique em Nova Despesa"]
            3. [continue ate concluir a tarefa]

            **Campos a preencher:**
            - **Campo X:** [descricao curta do que preencher]
            - **Campo Y:** [descricao curta]

            [Observacao final se relevante — 1 linha]

            Se for pergunta conceitual (nao "como fazer"), responda em 2-3 frases curtas,
            sem o formato acima.

            ## REGRAS DE CONTEUDO

            - Portugues do Brasil, tom direto.
            - Seja ESPECIFICO. Cite o nome exato do menu, botao, campo.
            - Traduza contexto tecnico em UI. Se o contexto diz "POST /api/expenses" ou
              "tabela installments", NAO reproduza — descreva o clique equivalente na tela.

            ## PROIBIDO (nunca aparece na resposta final)

            - Endpoints (/api/..., POST, GET, DELETE, PUT)
            - Nomes de tabelas, colunas, tipos Java/TypeScript, HTTP status
            - Trechos de codigo, JSON, SQL, curly braces { }
            - Enums em CAIXA (FIXED, INSTALLMENT, PAID) — traduza ("fixa", "parcelada", "paga")
            - Arquitetura interna (Redis, Postgres, MinIO, cache, JWT)
            - Escrever "Fontes: WORK-XX" no texto (fontes ja aparecem em chips embaixo)

            ## CASOS ESPECIAIS

            - Contexto nao tem a resposta:
              "Nao encontrei essa informacao nas specs. Talvez ainda nao esteja documentado."
            - Pergunta off-topic (politica, receitas, esportes...):
              "Eu so sei sobre o sistema Controle Financeiro."
            """;

    public String build(String question, List<RetrievedChunk> chunks) {
        StringBuilder sb = new StringBuilder();
        sb.append(SYSTEM_PROMPT).append("\n\n");
        sb.append("Contexto (trechos das specs do sistema):\n---\n");
        for (RetrievedChunk c : chunks) {
            sb.append("[source_path=").append(c.sourcePath());
            if (c.section() != null && !c.section().isBlank()) {
                sb.append(" section=").append(c.section());
            }
            sb.append("]\n");
            sb.append(c.content()).append("\n\n");
        }
        sb.append("---\n\n");
        sb.append("Pergunta do usuario:\n").append(question).append("\n");
        return sb.toString();
    }
}
