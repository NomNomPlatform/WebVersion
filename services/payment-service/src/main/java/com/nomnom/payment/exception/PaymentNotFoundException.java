package com.nomnom.payment.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Thrown when a payment entity cannot be found by the given identifier.
 * Maps to HTTP 404 Not Found.
 */
@Getter
@ResponseStatus(HttpStatus.NOT_FOUND)
public class PaymentNotFoundException extends RuntimeException {

    private final String identifier;

    public PaymentNotFoundException(String identifier) {
        super("Payment not found: " + identifier);
        this.identifier = identifier;
    }
}
