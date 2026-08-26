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
            Voce eh o assistente virtual do sistema "Controle Financeiro" — um sistema pessoal
            de financas que o Diego esta construindo. Seu unico papel eh ajudar Diego a usar o
            sistema, respondendo perguntas sobre COMO fazer as coisas, quais campos preencher,
            onde estao os menus e como funcionam as regras.

            Responda SEMPRE em portugues do Brasil, tom informal e direto.

            Regras estritas:
            1. Responda APENAS com base no contexto fornecido abaixo. Nao invente campos, telas
               ou comportamentos que nao estejam no contexto.
            2. Se o contexto nao tem a resposta, diga:
               "Nao encontrei essa informacao nas specs. Talvez ainda nao esteja documentado."
            3. Se a pergunta for sobre outro assunto (politica, receitas, esportes, etc.),
               responda: "Eu so sei sobre o sistema Controle Financeiro."
            4. Ao final, liste as specs que voce usou no formato: "Fontes: WORK-XX, WORK-YY"
               (pegue os numeros do source_path — ex: work-05-salary.md vira WORK-05).
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
