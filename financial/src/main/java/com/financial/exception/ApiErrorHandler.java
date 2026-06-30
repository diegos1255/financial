package com.financial.exception;

import com.financial.dto.ApiError;
import com.financial.exception.DuplicateSalaryException;
import com.financial.exception.ExpenseCancellationException;
import com.financial.exception.InstallmentAlreadyProcessedException;
import com.financial.exception.InstallmentNotPaidException;
import com.financial.exception.InvalidExpenseTypeException;
import com.financial.exception.InvalidPaymentDateException;
import com.financial.exception.InvalidPhotoException;
import com.financial.exception.LoginAlreadyExistsException;
import com.financial.exception.ResourceConflictException;
import com.financial.exception.ResourceNotFoundException;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.List;

@RestControllerAdvice
public class ApiErrorHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiErrorHandler.class);

    @ExceptionHandler({BadCredentialsException.class, UsernameNotFoundException.class})
    public ResponseEntity<ApiError> handleBadCredentials(RuntimeException e) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiError.of(401, "BAD_CREDENTIALS", "Login ou senha inválidos"));
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiError> handleNotFound(ResourceNotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiError.of(404, "NOT_FOUND", e.getMessage()));
    }

    @ExceptionHandler(ResourceConflictException.class)
    public ResponseEntity<ApiError> handleConflict(ResourceConflictException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiError.of(409, "CONFLICT", e.getMessage()));
    }

    @ExceptionHandler(DuplicateSalaryException.class)
    public ResponseEntity<ApiError> handleDuplicateSalary(DuplicateSalaryException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiError.of(409, "DUPLICATE_SALARY", e.getMessage()));
    }

    @ExceptionHandler(InvalidExpenseTypeException.class)
    public ResponseEntity<ApiError> handleInvalidExpenseType(InvalidExpenseTypeException e) {
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(ApiError.of(422, "INVALID_EXPENSE_TYPE", e.getMessage()));
    }

    @ExceptionHandler(ExpenseCancellationException.class)
    public ResponseEntity<ApiError> handleExpenseCancellation(ExpenseCancellationException e) {
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(ApiError.of(422, "EXPENSE_CANCELLATION", e.getMessage()));
    }

    @ExceptionHandler(InstallmentAlreadyProcessedException.class)
    public ResponseEntity<ApiError> handleInstallmentAlreadyProcessed(InstallmentAlreadyProcessedException e) {
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(ApiError.of(422, "INSTALLMENT_ALREADY_PROCESSED", e.getMessage()));
    }

    @ExceptionHandler(InstallmentNotPaidException.class)
    public ResponseEntity<ApiError> handleInstallmentNotPaid(InstallmentNotPaidException e) {
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(ApiError.of(422, "INSTALLMENT_NOT_PAID", e.getMessage()));
    }

    @ExceptionHandler(InvalidPaymentDateException.class)
    public ResponseEntity<ApiError> handleInvalidPaymentDate(InvalidPaymentDateException e) {
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(ApiError.of(422, "INVALID_PAYMENT_DATE", e.getMessage()));
    }

    @ExceptionHandler(LoginAlreadyExistsException.class)
    public ResponseEntity<ApiError> handleLoginAlreadyExists(LoginAlreadyExistsException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiError.of(409, "LOGIN_ALREADY_EXISTS", e.getMessage()));
    }

    @ExceptionHandler(InvalidPhotoException.class)
    public ResponseEntity<ApiError> handleInvalidPhoto(InvalidPhotoException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiError.of(400, "INVALID_PHOTO", e.getMessage()));
    }

    @ExceptionHandler(RefreshTokenInvalidException.class)
    public ResponseEntity<ApiError> handleRefreshTokenInvalid(RefreshTokenInvalidException e) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiError.of(401, "TOKEN_EXPIRED", e.getMessage()));
    }

    @ExceptionHandler(DisabledException.class)
    public ResponseEntity<ApiError> handleDisabled(DisabledException e) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiError.of(401, "USER_INACTIVE", "Usuário inativo"));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException e) {
        List<ApiError.FieldError> fields = e.getBindingResult().getFieldErrors().stream()
                .map(f -> new ApiError.FieldError(f.getField(), f.getDefaultMessage()))
                .toList();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiError.withFields(400, "INVALID_PAYLOAD", "Payload inválido", fields));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiError> handleConstraintViolation(ConstraintViolationException e) {
        List<ApiError.FieldError> fields = e.getConstraintViolations().stream()
                .map(v -> {
                    String path = v.getPropertyPath().toString();
                    int dot = path.lastIndexOf('.');
                    String field = dot >= 0 ? path.substring(dot + 1) : path;
                    return new ApiError.FieldError(field, v.getMessage());
                })
                .toList();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiError.withFields(400, "INVALID_PAYLOAD", "Payload inválido", fields));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleGeneric(Exception e) {
        log.error("Unhandled exception", e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiError.of(500, "INTERNAL_ERROR", "Erro interno"));
    }
}
