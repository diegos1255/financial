package com.financial.dto;

import com.financial.model.User;

import java.util.UUID;

public record UserResponse(
        UUID id,
        String name,
        String login,
        String photoUrl,
        Boolean active
) {
    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getName(),
                user.getLogin(),
                user.getPhotoUrl(),
                user.getActive()
        );
    }
}
