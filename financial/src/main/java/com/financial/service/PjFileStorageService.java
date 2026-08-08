package com.financial.service;

import com.financial.exception.InvalidFileException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.util.UUID;

@Service
public class PjFileStorageService {

    private static final long MAX_SIZE_BYTES = 5L * 1024 * 1024;

    private final S3Client s3Client;

    @Value("${minio.pj-bucket}")
    private String bucket;

    public PjFileStorageService(S3Client s3Client) {
        this.s3Client = s3Client;
    }

    public String upload(UUID userId, MultipartFile file) {
        validateFile(file);
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
            throw new RuntimeException("Falha ao fazer upload do arquivo", e);
        }

        return key;
    }

    public DownloadedFile download(String key) {
        ResponseInputStream<GetObjectResponse> stream = s3Client.getObject(
                GetObjectRequest.builder().bucket(bucket).key(key).build()
        );
        GetObjectResponse response = stream.response();
        return new DownloadedFile(stream, response.contentType(), response.contentLength());
    }

    public void delete(String key) {
        s3Client.deleteObject(
                DeleteObjectRequest.builder().bucket(bucket).key(key).build()
        );
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidFileException("Arquivo é obrigatório");
        }
        if (file.getSize() > MAX_SIZE_BYTES) {
            throw new InvalidFileException("Arquivo deve ter no máximo 5MB");
        }
        String contentType = file.getContentType();
        if (contentType == null
                || !(contentType.equals("application/pdf")
                    || contentType.equals("image/jpeg")
                    || contentType.equals("image/png"))) {
            throw new InvalidFileException("Somente PDF, JPG e PNG são aceitos");
        }
    }

    private String resolveExtension(String contentType) {
        return switch (contentType) {
            case "application/pdf" -> "pdf";
            case "image/jpeg" -> "jpg";
            case "image/png" -> "png";
            default -> throw new InvalidFileException("Tipo de arquivo não suportado");
        };
    }

    public record DownloadedFile(ResponseInputStream<GetObjectResponse> stream,
                                 String contentType,
                                 Long contentLength) {}
}
