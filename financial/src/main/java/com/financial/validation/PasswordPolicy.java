package com.financial.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Constraint(validatedBy = PasswordPolicyValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface PasswordPolicy {
    String message() default "Senha deve ter no mínimo 10 caracteres com maiúscula, minúscula, número e caractere especial";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
