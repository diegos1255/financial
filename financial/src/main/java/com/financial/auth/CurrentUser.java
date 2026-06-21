package com.financial.auth;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.UUID;

public final class CurrentUser {

    private CurrentUser() {}

    public static UUID id() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new IllegalStateException("No authenticated user in SecurityContext");
        }
        Object principal = auth.getPrincipal();
        if (principal instanceof AuthenticatedUser authUser) {
            return authUser.getId();
        }
        throw new IllegalStateException(
                "Principal is not AuthenticatedUser: " + principal.getClass().getName());
    }
}
