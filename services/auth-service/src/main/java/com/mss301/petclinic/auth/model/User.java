package com.mss301.petclinic.auth.model;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import com.mss301.petclinic.common.jpa.entity.AbstractAuditingEntity;

/**
 * User domain entity.
 *
 * <ul>
 *   <li>{@code id} = UUID — public-safe identifier (không expose internal Long id)</li>
 *   <li>{@code password} = BCrypt hash (12 rounds), KHÔNG plain</li>
 *   <li>{@code roles} = Set&lt;String&gt; persist CSV qua {@link StringSetConverter} — đơn giản hơn M-N table cho roles tĩnh</li>
 *   <li>{@code enabled} — disable user mà không xóa (audit trail)</li>
 * </ul>
 */
@Entity
@Table(name = "users")
public class User extends AbstractAuditingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid", updatable = false, nullable = false)
    private UUID id;

    @Column(nullable = false, unique = true, length = 100)
    private String username;

    @Column(nullable = false, length = 100)
    private String email;

    @Column(nullable = false, length = 100)
    private String password;            // BCrypt hash

    @Convert(converter = StringSetConverter.class)
    @Column(name = "roles_csv", nullable = false, length = 255)
    private Set<String> roles = new HashSet<>();

    @Column(nullable = false)
    private boolean enabled = true;

    /**
     * Phase K — link tới vet entity (vets-service). NULL = user thường.
     * Non-null → JWT có claim {@code vetId} → vets-service `/api/v1/vets/me/*` dùng claim này.
     * KHÔNG FK constraint (cross-schema) — integrity check ở app layer khi admin link.
     */
    @Column(name = "vet_id", nullable = true)
    private Long vetId;

    /**
     * Phase L — link tới customer (owner) entity (customers-service). NULL = user không phải owner
     * (vet/admin/staff). Non-null → JWT có claim {@code customerId} → visits-service /
     * customers-service dùng claim này để enforce per-instance authorization (USER chỉ book/xem
     * resource của mình).
     *
     * <p>Sync 2 chiều: mirror column {@code customers.owners.user_id}. Event-driven flow
     * (user.registered → owner.created → cập nhật cả 2 column). KHÔNG FK cross-schema.
     */
    @Column(name = "customer_id", nullable = true, unique = true)
    private Long customerId;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public Set<String> getRoles() { return roles; }
    public void setRoles(Set<String> roles) { this.roles = roles; }

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public Long getVetId() { return vetId; }
    public void setVetId(Long vetId) { this.vetId = vetId; }

    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }
}
