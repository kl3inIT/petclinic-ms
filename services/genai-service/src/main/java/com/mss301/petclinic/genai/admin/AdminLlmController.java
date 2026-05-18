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

/**
 * Admin LLM config endpoints (BYOK pattern). ROLE_ADMIN required — enforced trong
 * {@link com.mss301.petclinic.genai.config.GenaiSecurityConfig}.
 *
 * <ul>
 *   <li>{@code GET    /api/v1/admin/llm/current}  — config hiện tại (apiKey masked)</li>
 *   <li>{@code POST   /api/v1/admin/llm/config}   — save mới + rebuild ChatClient</li>
 *   <li>{@code POST   /api/v1/admin/llm/validate} — test config TÙY Ý (chưa save)</li>
 *   <li>{@code POST   /api/v1/admin/llm/test}     — test config ĐANG ACTIVE</li>
 * </ul>
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
    public LlmConfigResponse current() {
        return configService.getCurrentMasked();
    }

    @PostMapping("/config")
    @Operation(summary = "Save LLM config + rebuild ChatClient immediately")
    public LlmConfigResponse save(@Valid @RequestBody SaveLlmConfigRequest request,
                                   @AuthenticationPrincipal Jwt jwt) {
        return configService.save(request, jwt.getSubject());
    }

    @PostMapping("/validate")
    @Operation(summary = "Ping LLM với config bất kỳ — KHÔNG save. Dùng trước khi POST /config.")
    public ValidateLlmConfigResponse validate(@Valid @RequestBody ValidateLlmConfigRequest request) {
        return configService.validate(request);
    }

    @PostMapping("/test")
    @Operation(summary = "Test config ĐANG ACTIVE (DB hoặc env fallback). Cho nút \"Test\" trên UI.")
    public ValidateLlmConfigResponse testCurrent() {
        LlmConfig active = configService.getCurrent();
        return configService.validate(new ValidateLlmConfigRequest(
                active.baseUrl(), active.apiKey(), active.chatModel()));
    }
}
