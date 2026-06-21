package com.financial.util;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

class PasswordHashGenerator {

    @Test
    @EnabledIfSystemProperty(named = "hash.password", matches = ".+")
    void generate() {
        String raw = System.getProperty("hash.password");
        String hash = new BCryptPasswordEncoder(10).encode(raw);
        System.out.println("BCRYPT_HASH_OUTPUT_START");
        System.out.println(hash);
        System.out.println("BCRYPT_HASH_OUTPUT_END");
    }
}
