package com.financial.chat.util;

import java.util.Locale;

/**
 * Converte entre {@code float[]} (formato usado pela API do Gemini e pelo
 * codigo Java) e a serializacao textual do pgvector {@code "[0.1,0.2,...]"}
 * (formato armazenado no Postgres via @ColumnTransformer).
 */
public final class EmbeddingSerializer {

    private EmbeddingSerializer() {}

    public static String toPgvector(float[] embedding) {
        if (embedding == null) throw new IllegalArgumentException("embedding null");
        StringBuilder sb = new StringBuilder(embedding.length * 12);
        sb.append('[');
        for (int i = 0; i < embedding.length; i++) {
            if (i > 0) sb.append(',');
            // Locale.ROOT pra garantir ponto decimal (nao virgula)
            sb.append(String.format(Locale.ROOT, "%.6f", embedding[i]));
        }
        sb.append(']');
        return sb.toString();
    }

    public static float[] fromPgvector(String text) {
        if (text == null || text.isBlank()) throw new IllegalArgumentException("texto vazio");
        String trimmed = text.trim();
        if (trimmed.charAt(0) == '[') trimmed = trimmed.substring(1);
        if (trimmed.charAt(trimmed.length() - 1) == ']') trimmed = trimmed.substring(0, trimmed.length() - 1);
        String[] parts = trimmed.split(",");
        float[] out = new float[parts.length];
        for (int i = 0; i < parts.length; i++) {
            out[i] = Float.parseFloat(parts[i].trim());
        }
        return out;
    }
}
