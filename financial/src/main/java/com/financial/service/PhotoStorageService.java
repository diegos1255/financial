package com.financial.service;

import com.financial.exception.InvalidPhotoException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.util.UUID;

@Service
public class PhotoStorageService {

    private final S3Client s3Client;

    @Value("${minio.bucket}")
    private String bucket;

    @Value("${minio.public-url}")
    private String publicUrl;

    public PhotoStorageService(S3Client s3Client) {
        this.s3Client = s3Client;
    }

    public String upload(UUID userId, MultipartFile file) {
        String ext = resolveExtension(file.getContentType());
        String key = "users/" + userId + "/" + UUID.randomUUID() + "." + ext;

        try {
            s3Client.putObject(
                    PutObjectRequest.builder()
                            .bucket(bucket)
                            .key(key)
                            .contentType(file.getContentType())
                            .build(),
                    RequestBody.fromInputStream(file.getInputStream(), file.getSize())
            );
        } catch (IOException e) {
            throw new RuntimeException("Falha ao fazer upload da foto", e);
        }

        return publicUrl + "/" + bucket + "/" + key;
    }

    private String resolveExtension(String contentType) {
        if (contentType == null) throw new InvalidPhotoException("Tipo de arquivo não identificado");
        return switch (contentType) {
            case "image/jpeg" -> "jpg";
            case "image/png"  -> "png";
            default -> throw new InvalidPhotoException("Somente JPG e PNG são aceitos");
        };
    }
}
