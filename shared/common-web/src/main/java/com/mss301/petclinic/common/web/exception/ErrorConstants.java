package com.mss301.petclinic.common.web.exception;

import java.net.URI;

/**
 * RFC 9457 ProblemDetail `type` URIs. Client phân biệt loại lỗi bằng cách so sánh `type`,
 * không phải parse message string.
 */
public final class ErrorConstants {

    private static final String BASE = "https://petclinic-ms.mss301/problem/";

    public static final URI DEFAULT_TYPE          = URI.create(BASE + "problem-with-message");
    public static final URI ENTITY_NOT_FOUND_TYPE = URI.create(BASE + "entity-not-found");
    public static final URI INVALID_PAYLOAD_TYPE  = URI.create(BASE + "invalid-payload");
    public static final URI BAD_REQUEST_TYPE      = URI.create(BASE + "bad-request");
    public static final URI CONCURRENCY_TYPE      = URI.create(BASE + "concurrency-failure");
    public static final URI ACCESS_DENIED_TYPE    = URI.create(BASE + "access-denied");
    public static final URI SERVICE_UNAVAILABLE_TYPE = URI.create(BASE + "service-unavailable");

    private ErrorConstants() {}
}
