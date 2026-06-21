package com.financial.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.regex.Pattern;

public class PasswordPolicyValidator implements ConstraintValidator<PasswordPolicy, String> {

    private static final Pattern HAS_UPPER   = Pattern.compile("[A-Z]");
    private static final Pattern HAS_LOWER   = Pattern.compile("[a-z]");
    private static final Pattern HAS_DIGIT   = Pattern.compile("\\d");
    private static final Pattern HAS_SPECIAL = Pattern.compile("[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>/?]");

    @Override
    public boolean isValid(String value, ConstraintValidatorContext ctx) {
        if (value == null) return false;
        return value.length() >= 10
                && HAS_UPPER.matcher(value).find()
                && HAS_LOWER.matcher(value).find()
                && HAS_DIGIT.matcher(value).find()
                && HAS_SPECIAL.matcher(value).find();
    }
}
