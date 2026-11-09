package com.nomnom.payment.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Thrown when a refund is requested for a payment that is not in COMPLETED
 * status. Maps to HTTP 409 Conflict.
 */
@Getter
@ResponseStatus(HttpStatus.CONFLICT)
public class PaymentRefundException extends RuntimeException {

    public PaymentRefundException(String message) {
        super(message);
    }
}
