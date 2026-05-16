package com.mss301.petclinic.common.web.exception;

/**
 * Base cho mọi "X not found" của các service. Service tạo subclass:
 * <pre>
 * public class OwnerNotFoundException extends ResourceNotFoundException {
 *     public OwnerNotFoundException(String id) {
 *         super("Owner", id);
 *     }
 * }
 * </pre>
 * ExceptionTranslator ở shared module sẽ tự catch base class → handle mọi subclass.
 */
public abstract class ResourceNotFoundException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    private final String entityName;
    private final String resourceId;

    protected ResourceNotFoundException(String entityName, String resourceId) {
        super(entityName + " not found with id: " + resourceId);
        this.entityName = entityName;
        this.resourceId = resourceId;
    }

    public String getEntityName() { return entityName; }
    public String getResourceId() { return resourceId; }
}
