package com.mss301.petclinic.common.jpa.enums;

/**
 * Marker cho enum có stable string ID dùng cho persistence + i18n.
 *
 * <h4>Stability invariant</h4>
 * {@code id()} là contract với DB và FE. Khi rename {@link Enum#name()} (vd: refactor),
 * <b>override {@code id()}</b> để giữ giá trị cũ — DB rows hiện có không phải migrate.
 *
 * <pre>{@code
 * enum OnboardingStep implements IdentifiedEnum {
 *     MAIL_LINKED("GMAIL_CONNECTED"),   // name() đổi, id() giữ
 *     PROFILE_DONE("PROFILE_DONE");
 *
 *     private final String id;
 *     OnboardingStep(String id) { this.id = id; }
 *     public String id() { return id; }
 * }
 * }</pre>
 *
 * <h4>Default convention</h4>
 * Nếu KHÔNG cần stable ID khác {@code name()}, cứ trả về {@code name()} trực tiếp:
 *
 * <pre>{@code
 * public String id() { return name(); }
 * }</pre>
 */
public interface IdentifiedEnum {

    /**
     * Stable string ID. Lưu DB + key i18n. KHÔNG được phụ thuộc tên Java constant.
     */
    String id();

    /**
     * Default i18n bundle key: {@code <EnumClassSimpleName>.<id>}.
     *
     * <p>Bug đã fix: dùng {@code getDeclaringClass()} thay {@code getClass()} vì enum constant
     * có method body sẽ là anonymous subclass — {@code getClass().getSimpleName()} trả về chuỗi rỗng.
     */
    default String labelKey() {
        String simpleName = (this instanceof Enum<?> e)
                ? e.getDeclaringClass().getSimpleName()
                : getClass().getSimpleName();
        return simpleName + "." + id();
    }
}
