package com.nomnom.payment.repository;

import com.nomnom.payment.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    /**
     * Fetch the most recent payment record associated with the given order.
     *
     * @param orderId the UUID of the order
     * @return the most recent payment if one exists
     */
    Optional<Payment> findFirstByOrderIdOrderByCreatedAtDesc(UUID orderId);

    List<Payment> findByCreatedAtGreaterThanEqual(LocalDateTime start);
}
