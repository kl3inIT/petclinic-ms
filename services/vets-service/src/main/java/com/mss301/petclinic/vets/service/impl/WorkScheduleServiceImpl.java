package com.mss301.petclinic.vets.service.impl;

import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mss301.petclinic.common.web.exception.BadRequestAlertException;
import com.mss301.petclinic.vets.dto.req.WorkScheduleRequest;
import com.mss301.petclinic.vets.dto.res.WorkScheduleSlotResponse;
import com.mss301.petclinic.vets.exception.VetNotFoundException;
import com.mss301.petclinic.vets.model.WorkHour;
import com.mss301.petclinic.vets.model.WorkScheduleSlot;
import com.mss301.petclinic.vets.model.WorkScheduleSlotId;
import com.mss301.petclinic.vets.model.Workday;
import com.mss301.petclinic.vets.repository.VetRepository;
import com.mss301.petclinic.vets.repository.WorkScheduleSlotRepository;
import com.mss301.petclinic.vets.service.WorkScheduleService;

@Service
@Transactional(readOnly = true)
public class WorkScheduleServiceImpl implements WorkScheduleService {

    private static final String ENTITY_NAME = "work-schedule";

    // Sort response theo (workday ordinal, workHour weight) để FE render lịch ổn định
    // KHÔNG phụ thuộc thứ tự DB trả về (Postgres không guarantee order without ORDER BY).
    private static final Comparator<WorkScheduleSlotResponse> SLOT_ORDER =
            Comparator.<WorkScheduleSlotResponse>comparingInt(s -> s.workday().ordinal())
                    .thenComparingInt(s -> s.workHour().weight());

    private final WorkScheduleSlotRepository scheduleRepository;
    private final VetRepository vetRepository;

    public WorkScheduleServiceImpl(WorkScheduleSlotRepository scheduleRepository, VetRepository vetRepository) {
        this.scheduleRepository = scheduleRepository;
        this.vetRepository = vetRepository;
    }

    @Override
    public List<WorkScheduleSlotResponse> findAllByVetId(Long vetId) {
        ensureVetExists(vetId);
        return scheduleRepository.findByIdVetId(vetId).stream()
                .map(WorkScheduleSlotResponse::from)
                .sorted(SLOT_ORDER)
                .toList();
    }

    @Override
    @Transactional
    public List<WorkScheduleSlotResponse> replaceAll(Long vetId, WorkScheduleRequest request) {
        ensureVetExists(vetId);
        // Validate dup TRƯỚC khi delete + insert. Nếu để Hibernate insert thì sẽ throw
        // ConstraintViolation (PK ghép) → 500 leak constraint name. Trả 400 sớm + cụ thể.
        Set<WorkScheduleSlotResponse> seen = new HashSet<>();
        for (WorkScheduleSlotResponse dto : request.slots()) {
            if (!seen.add(dto)) {
                throw new BadRequestAlertException(
                        "Duplicate slot in request: workday=" + dto.workday() + ", workHour=" + dto.workHour(),
                        ENTITY_NAME,
                        "slot-duplicate"
                );
            }
        }

        // REPLACE semantics: xoá hết cũ → thêm mới. Idempotent vì cùng input cho cùng output.
        // KHÔNG diff/merge — phức tạp thêm mà không có lợi ích (schedule là replace-by-design).
        scheduleRepository.deleteAllByVetId(vetId);
        // flush bắt buộc giữa delete và insert vì cùng tx — nếu không, Hibernate có thể
        // queue insert TRƯỚC delete khi flush cuối tx → ConstraintViolation PK trùng.
        scheduleRepository.flush();

        List<WorkScheduleSlot> entities = request.slots().stream()
                .map(dto -> new WorkScheduleSlot(vetId, dto.workday(), dto.workHour()))
                .toList();
        scheduleRepository.saveAll(entities);

        return request.slots().stream().sorted(SLOT_ORDER).toList();
    }

    @Override
    @Transactional
    public void clearAll(Long vetId) {
        ensureVetExists(vetId);
        scheduleRepository.deleteAllByVetId(vetId);
    }

    /**
     * Phase H — check vet có lịch trực tại (workday, workHour) hay không.
     * Composite PK = (vetId, workday, workHour) → existsById đủ nhanh (PK index lookup).
     */
    @Override
    public boolean isAvailable(Long vetId, Workday workday, WorkHour workHour) {
        ensureVetExists(vetId);
        return scheduleRepository.existsById(new WorkScheduleSlotId(vetId, workday, workHour));
    }

    private void ensureVetExists(Long vetId) {
        if (!vetRepository.existsById(vetId)) {
            throw new VetNotFoundException(vetId.toString());
        }
    }
}
