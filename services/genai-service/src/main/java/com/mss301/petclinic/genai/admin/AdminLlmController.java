package com.mss301.petclinic.genai.admin;

import com.mss301.petclinic.genai.admin.dto.LlmConfigResponse;
import com.mss301.petclinic.genai.admin.dto.SaveLlmConfigRequest;
import com.mss301.petclinic.genai.admin.dto.ValidateLlmConfigRequest;
import com.mss301.petclinic.genai.admin.dto.ValidateLlmConfigResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

/**
 * Admin LLM config endpoints (BYOK pattern). WebFlux stack — wrap blocking JPA/HTTP probe
 * trong {@code Mono.fromCallable(...).subscribeOn(Schedulers.boundedElastic())} để khỏi block event loop.
 */
@RestController
@RequestMapping("/api/v1/admin/llm")
@Tag(name = "Admin LLM", description = "BYOK — admin manages provider key/baseUrl/model")
public class AdminLlmController {

    private final LlmConfigService configService;

    public AdminLlmController(LlmConfigService configService) {
        this.configService = configService;
    }

    @GetMapping("/current")
    @Operation(summary = "Get current LLM config (apiKey masked)")
    public Mono<LlmConfigResponse> current() {
        return Mono.fromCallable(configService::getCurrentMasked)
                .subscribeOn(Schedulers.boundedElastic());
    }

    @PostMapping("/config")
    @Operation(summary = "Save LLM config + rebuild ChatClient immediately")
    public Mono<LlmConfigResponse> save(@Valid @RequestBody SaveLlmConfigRequest request,
                                         @AuthenticationPrincipal Jwt jwt) {
        return Mono.fromCallable(() -> configService.save(request, jwt.getSubject()))
                .subscribeOn(Schedulers.boundedElastic());
    }

    @PostMapping("/validate")
    @Operation(summary = "Ping LLM với config bất kỳ — KHÔNG save. Dùng trước khi POST /config.")
    public Mono<ValidateLlmConfigResponse> validate(@Valid @RequestBody ValidateLlmConfigRequest request) {
        return Mono.fromCallable(() -> configService.validate(request))
                .subscribeOn(Schedulers.boundedElastic());
    }

    @PostMapping("/test")
    @Operation(summary = "Test config ĐANG ACTIVE (DB hoặc env fallback). Cho nút \"Test\" trên UI.")
    public Mono<ValidateLlmConfigResponse> testCurrent() {
        return Mono.fromCallable(() -> {
                    LlmConfig active = configService.getCurrent();
                    return configService.validate(new ValidateLlmConfigRequest(
                            active.baseUrl(), active.apiKey(), active.chatModel()));
                })
                .subscribeOn(Schedulers.boundedElastic());
    }
}
