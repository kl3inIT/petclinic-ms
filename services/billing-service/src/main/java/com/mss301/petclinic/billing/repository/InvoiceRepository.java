package com.mss301.petclinic.billing.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.mss301.petclinic.billing.model.Invoice;
import com.mss301.petclinic.billing.model.InvoiceStatus;

public interface InvoiceRepository
        extends JpaRepository<Invoice, Long>, JpaSpecificationExecutor<Invoice> {

    /**
     * Tab đang mở của một khách (tối đa 1 do partial unique index). Dùng cho
     * getOrCreateOpenInvoice — append charge vào tab thay vì tạo hoá đơn mới mỗi visit.
     */
    Optional<Invoice> findFirstByCustomerUserIdAndStatus(UUID customerUserId, InvoiceStatus status);
}
