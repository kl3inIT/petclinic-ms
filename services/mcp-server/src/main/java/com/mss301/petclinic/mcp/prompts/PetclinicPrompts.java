package com.mss301.petclinic.mcp.prompts;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.mcp.annotation.McpArg;
import org.springframework.ai.mcp.annotation.McpPrompt;
import org.springframework.stereotype.Component;

/**
 * MCP Prompts — user-controlled templates cho AI interactions.
 *
 * <h4>Tại sao "user-controlled"?</h4>
 * Slide MSS301 #5: Prompts = "Pre-defined templates for AI interactions" (user picks).
 * User trong MCP client (Claude Desktop) pick prompt từ menu → client interpolate args
 * → send tới LLM. LLM KHÔNG tự gọi prompt; user phải chủ động trigger.
 *
 * <h4>So sánh 3 component categories</h4>
 * <table>
 *   <caption>MCP component decision matrix</caption>
 *   <tr><th>Component</th><th>Controlled by</th><th>Purpose</th></tr>
 *   <tr><td>Tool</td><td>Model</td><td>LLM tự quyết action (search, write, call API)</td></tr>
 *   <tr><td>Resource</td><td>Application</td><td>Inject context data (FAQ, catalog) vào session</td></tr>
 *   <tr><td>Prompt</td><td>User</td><td>Pre-baked template cho task hay làm (summary, contact)</td></tr>
 * </table>
 *
 * <h4>Return type</h4>
 * Method trả String — Spring AI wrap thành {@code GetPromptResult} với 1 message
 * (role=USER). Đối với multi-message prompts (system+user), return
 * {@code List<PromptMessage>} thẳng (chưa cần ở petclinic).
 */
@Component
public class PetclinicPrompts {

    private static final Logger log = LoggerFactory.getLogger(PetclinicPrompts.class);

    /**
     * Generate prompt template cho vet/staff viết visit summary gửi owner.
     *
     * <p>User flow: vet xong visit → Claude Desktop → chọn prompt "visit-summary" →
     * điền petName + diagnosis + treatment → LLM sinh email summary cho owner.
     */
    @McpPrompt(
            name = "visit-summary",
            title = "Visit Summary for Owner",
            description = "Generate a friendly, plain-language visit summary email for the pet "
                    + "owner. Translates clinical jargon to easy-to-read text + follow-up guidance.")
    public String visitSummary(
            @McpArg(name = "petName", description = "Name of the pet (vd: Mèo Mun, Lucky)", required = true)
                    String petName,
            @McpArg(name = "diagnosis", description = "Clinical diagnosis (vd: 'Otitis externa')",
                    required = true)
                    String diagnosis,
            @McpArg(name = "treatment", description = "Treatment given (vd: 'Ear cleaning + 7-day antibiotic')",
                    required = true)
                    String treatment,
            @McpArg(name = "followUpDays",
                    description = "Suggested follow-up window in days (vd: '7' for 1-week check)")
                    String followUpDays) {
        log.info("Prompt rendered: visit-summary (pet={}, diag={})", petName, diagnosis);
        String followUp = followUpDays == null || followUpDays.isBlank()
                ? "Lên lịch tái khám nếu triệu chứng tái phát."
                : "Hẹn tái khám sau " + followUpDays + " ngày để theo dõi.";
        return String.format(
                """
                Bạn là vet assistant viết tóm tắt buổi khám cho chủ pet bằng tiếng Việt. Dùng giọng \
                văn thân thiện, tránh thuật ngữ y khoa nặng. Cấu trúc:

                1. Lời chào ngắn, nhắc tên pet
                2. Tình trạng phát hiện (diễn giải '%s' dễ hiểu)
                3. Điều trị đã làm ('%s')
                4. Hướng dẫn chăm sóc tại nhà (3-5 bullet)
                5. Lời nhắn tái khám: %s
                6. Kết thúc với thông tin liên hệ phòng khám

                Pet: %s
                Diagnosis: %s
                Treatment: %s

                Sinh email hoàn chỉnh, format markdown.
                """,
                diagnosis, treatment, followUp, petName, diagnosis, treatment);
    }

    /**
     * Script template cho staff gọi điện owner về visit.
     */
    @McpPrompt(
            name = "owner-contact-script",
            title = "Owner Contact Script",
            description = "Generate a call script for staff to contact a pet owner about a visit. "
                    + "Adjusts tone based on the reason (reminder, follow-up, billing question).")
    public String ownerContactScript(
            @McpArg(name = "ownerName", description = "Owner's last name (vd: 'Nguyễn')", required = true)
                    String ownerName,
            @McpArg(name = "petName", description = "Pet's name", required = true) String petName,
            @McpArg(name = "reason",
                    description = "Reason for the call: 'reminder' | 'follow-up' | 'billing' | 'other'",
                    required = true)
                    String reason) {
        log.info("Prompt rendered: owner-contact-script (owner={}, reason={})", ownerName, reason);
        return String.format(
                """
                Bạn là staff phòng khám gọi điện cho chủ pet. Sinh script bằng tiếng Việt phù hợp \
                lý do '%s'. Yêu cầu:

                - Mở đầu lịch sự, identify yourself + clinic name
                - Xác nhận đúng người (anh/chị %s, chủ của %s đúng không ạ?)
                - Nội dung chính tuỳ reason:
                  * reminder: nhắc lịch hẹn sắp tới, hỏi confirm
                  * follow-up: hỏi tình trạng pet sau visit, có concern gì không
                  * billing: confirm thanh toán pending, không gấp gáp
                  * other: ngỏ lời, hỏi điều cần thông báo
                - Kết thúc lời cảm ơn + chúc tốt lành cho pet
                - Tone: thân thiện, professional, không sale-y

                Sinh script đầy đủ với 4-6 lines dialogue, indent rõ ràng.

                Owner: %s
                Pet: %s
                Reason: %s
                """,
                reason, ownerName, petName, ownerName, petName, reason);
    }
}
