package com.mss301.petclinic.visits.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.mss301.petclinic.visits.model.Prescription;

public interface PrescriptionRepository extends JpaRepository<Prescription, Long> {

    /** Đơn MỚI NHẤT của visit (visit có thể có nhiều đơn). Dùng cho GET + tải PDF. */
    Optional<Prescription> findFirstByVisitIdOrderByIssuedAtDescIdDesc(Long visitId);

    /** Tất cả đơn của visit, mới nhất trước. */
    List<Prescription> findByVisitIdOrderByIssuedAtDescIdDesc(Long visitId);
}
