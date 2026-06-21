package com.financial.auth;

import com.financial.model.User;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;
import java.util.UUID;

public final class AuthenticatedUser implements UserDetails {

    private final UUID id;
    private final String login;
    private final String password;
    private final boolean active;

    public AuthenticatedUser(UUID id, String login, String password, boolean active) {
        this.id = id;
        this.login = login;
        this.password = password;
        this.active = active;
    }

    public static AuthenticatedUser from(User user) {
        return new AuthenticatedUser(
                user.getId(),
                user.getLogin(),
                user.getPassword(),
                Boolean.TRUE.equals(user.getActive())
        );
    }

    public UUID getId() {
        return id;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return Collections.emptyList();
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return login;
    }

    @Override
    public boolean isEnabled() {
        return active;
    }
}
