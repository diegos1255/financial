package com.financial.controller;

import com.financial.auth.CurrentUser;
import com.financial.dto.UserResponse;
import com.financial.exception.InvalidPhotoException;
import com.financial.model.User;
import com.financial.repository.UserRepository;
import com.financial.service.PhotoStorageService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final PhotoStorageService photoStorageService;

    public UserController(UserRepository userRepository, PhotoStorageService photoStorageService) {
        this.userRepository = userRepository;
        this.photoStorageService = photoStorageService;
    }

    @GetMapping("/me")
    public UserResponse me() {
        return userRepository.findById(CurrentUser.id())
                .map(UserResponse::from)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }

    @PatchMapping("/me/photo")
    public ResponseEntity<UserResponse> uploadPhoto(@RequestParam("file") MultipartFile file) {
        String contentType = file.getContentType();
        if (contentType == null || (!contentType.equals("image/jpeg") && !contentType.equals("image/png"))) {
            throw new InvalidPhotoException("Somente JPG e PNG são aceitos");
        }
        if (file.getSize() > 2L * 1024 * 1024) {
            throw new InvalidPhotoException("Foto deve ter no máximo 2MB");
        }

        UUID userId = CurrentUser.id();
        String url = photoStorageService.upload(userId, file);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        user.setPhotoUrl(url);
        userRepository.save(user);

        return ResponseEntity.ok(UserResponse.from(user));
    }
}
