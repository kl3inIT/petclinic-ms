package com.mss301.petclinic.visits.client;

import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import com.mss301.petclinic.common.web.exception.ExternalServiceUnavailableException;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;

/**
 * Facade bao bọc cross-service HTTP calls + Resilience4j circuit breakers.
 *
 * <h4>Vì sao tách bean riêng?</h4>
 * Spring AOP intercept method qua proxy ĐƯỢC TẠO QUANH bean. Khi
 * {@code VisitServiceImpl.book()} gọi {@code this.fetchPet(...)} trong cùng class,
 * Java resolve method trực tiếp trên object — KHÔNG đi qua proxy → annotation
 * {@code @CircuitBreaker} không kick in (self-invocation trap).
 *
 * <p>Đặt CB methods trong bean tách riêng + inject vào caller → mỗi call đi qua proxy →
 * R4j aspect chặn được → fallback + state machine hoạt động đúng.
 *
 * <p>Tất cả fallback đều throw {@link ExternalServiceUnavailableException} → mapped HTTP 503
 * trong {@code common-web ExceptionTranslator}. {@code HttpClientErrorException.NotFound}
 * vẫn được bubble lên caller (ignore-exceptions trong config) để caller phân loại 404 vs 503.
 */
@Component
public class RemoteClientsFacade {

    private static final Logger log = LoggerFactory.getLogger(RemoteClientsFacade.class);

    private final CustomersClient customersClient;
    private final VetsClient vetsClient;
    private final UsersClient usersClient;
    private final ProductsClient productsClient;

    public RemoteClientsFacade(CustomersClient customersClient,
                               VetsClient vetsClient,
                               UsersClient usersClient,
                               ProductsClient productsClient) {
        this.customersClient = customersClient;
        this.vetsClient = vetsClient;
        this.usersClient = usersClient;
        this.productsClient = productsClient;
    }

    @CircuitBreaker(name = "customers-service", fallbackMethod = "fetchPetFallback")
    public PetSummary fetchPet(Long petId) {
        return customersClient.getPet(petId);
    }

    @CircuitBreaker(name = "customers-service", fallbackMethod = "fetchOwnerFallback")
    public OwnerSummary fetchOwner(Long ownerId) {
        return customersClient.getOwner(ownerId);
    }

    @CircuitBreaker(name = "vets-service", fallbackMethod = "fetchVetFallback")
    public VetSummary fetchVet(Long vetId) {
        return vetsClient.getVet(vetId);
    }

    @CircuitBreaker(name = "vets-service", fallbackMethod = "checkVetAvailabilityFallback")
    public VetAvailabilityResponse checkVetAvailability(Long vetId, String workday, String workHour) {
        return vetsClient.checkAvailability(vetId, workday, workHour);
    }

    @CircuitBreaker(name = "auth-service", fallbackMethod = "fetchUserFallback")
    public UserSummary fetchUser(UUID userId) {
        return usersClient.getUser(userId);
    }

    @CircuitBreaker(name = "products-service", fallbackMethod = "fetchProductFallback")
    public ProductSummary fetchProduct(Long productId) {
        return productsClient.getProduct(productId);
    }

    @CircuitBreaker(name = "products-service", fallbackMethod = "consumeProductFallback")
    public ProductSummary consumeProduct(Long productId, int quantity) {
        return productsClient.consume(productId, new ProductsClient.StockAdjust(quantity));
    }

    @SuppressWarnings("unused") // referenced by @CircuitBreaker fallbackMethod
    private PetSummary fetchPetFallback(Long petId, Throwable t) {
        log.warn("customers-service circuit OPEN/down (petId={}): {}", petId, t.toString());
        throw new ExternalServiceUnavailableException("customers-service", t);
    }

    @SuppressWarnings("unused")
    private OwnerSummary fetchOwnerFallback(Long ownerId, Throwable t) {
        log.warn("customers-service circuit OPEN/down (ownerId={}): {}", ownerId, t.toString());
        throw new ExternalServiceUnavailableException("customers-service", t);
    }

    @SuppressWarnings("unused")
    private VetSummary fetchVetFallback(Long vetId, Throwable t) {
        log.warn("vets-service circuit OPEN/down (vetId={}): {}", vetId, t.toString());
        throw new ExternalServiceUnavailableException("vets-service", t);
    }

    @SuppressWarnings("unused")
    private VetAvailabilityResponse checkVetAvailabilityFallback(Long vetId, String workday, String workHour,
                                                                 Throwable t) {
        log.warn("vets-service circuit OPEN/down (vetId={}, workday={}, workHour={}): {}",
                vetId, workday, workHour, t.toString());
        throw new ExternalServiceUnavailableException("vets-service", t);
    }

    @SuppressWarnings("unused")
    private UserSummary fetchUserFallback(UUID userId, Throwable t) {
        log.warn("auth-service circuit OPEN/down (userId={}): {}", userId, t.toString());
        throw new ExternalServiceUnavailableException("auth-service", t);
    }

    @SuppressWarnings("unused")
    private ProductSummary fetchProductFallback(Long productId, Throwable t) {
        log.warn("products-service circuit OPEN/down (productId={}): {}", productId, t.toString());
        throw new ExternalServiceUnavailableException("products-service", t);
    }

    @SuppressWarnings("unused")
    private ProductSummary consumeProductFallback(Long productId, int quantity, Throwable t) {
        log.warn("products-service circuit OPEN/down (consume productId={}, qty={}): {}",
                productId, quantity, t.toString());
        throw new ExternalServiceUnavailableException("products-service", t);
    }
}
