package com.mss301.petclinic.genai.admin;

import org.springframework.data.jpa.repository.JpaRepository;

public interface LlmConfigRepository extends JpaRepository<LlmConfigEntity, Long> {
}
