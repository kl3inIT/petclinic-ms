# syntax=docker/dockerfile:1.7
#
# Spring service Dockerfile — TEMPLATE chung cho 6 service Spring trong monorepo:
#   config-server / discovery-server / api-gateway /
#   auth-service / customers-service / vets-service / visits-service / admin-server.
#
# Build mỗi service (BuildKit required — `DOCKER_BUILDKIT=1`):
#   docker build --build-arg SERVICE=visits-service -t petclinic-ms/visits:latest .
#
# Vì sao 1 file dùng cho 6 service?
#   Cùng JDK toolchain, cùng convention plugin (`petclinic.spring-boot-service`),
#   cùng layered JAR shape, cùng base + cùng JVM flags. Per-service khác biệt chỉ là
#   tên module + port (set ở runtime qua compose.yaml/k8s, không hard-code).
#
# Bộ nhớ runtime: do JVM tự respect cgroup limit (-XX:UseContainerSupport mặc định
# trên Java 25 + MaxRAMPercentage=75 cap heap). Service nhỏ chạy 256-384 MB OK.
#
# Healthcheck KHÔNG đặt trong Dockerfile — compose.yaml/k8s define per-service
# (mỗi service có management port riêng + path /actuator/health khác override-able).

# ============================================================================
# STAGE 1: Builder — Gradle build + jlink custom JRE
# ============================================================================
# Note: digest chưa pin — sau khi pull image lần đầu, pin sha256 cho reproducible build:
#   docker pull eclipse-temurin:25-jdk-noble
#   docker images --digests eclipse-temurin
#   → replace `:25-jdk-noble` bằng `:25-jdk-noble@sha256:<digest>`
FROM eclipse-temurin:25-jdk-noble AS builder

ARG SERVICE
# Fail-fast nếu quên --build-arg SERVICE=...
RUN test -n "$SERVICE" || (echo "ERROR: --build-arg SERVICE=<service-name> required" && exit 1)

ENV GRADLE_USER_HOME=/cache/.gradle \
    LANG=C.UTF-8 \
    TZ=UTC

# binutils cần cho jlink strip; xz cho compress zip-9.
RUN apt-get update && apt-get install -y --no-install-recommends \
        binutils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Layer A — gradle wrapper + version catalog. Đổi rất ít → cache lâu.
COPY gradlew gradlew.bat ./
COPY gradle/ gradle/

# Layer B — settings + version catalog + convention plugins.
# `build-logic/` PHẢI có trước `./gradlew dependencies` vì plugin
# `petclinic.spring-boot-service` định nghĩa ở đó.
COPY settings.gradle.kts ./
COPY build-logic/ build-logic/

# Layer C — module build files. Chỉ copy build.gradle.kts của shared + service
# để gradle resolve deps mà chưa cần source. Đổi deps → invalidate từ đây.
COPY shared/common-web/build.gradle.kts shared/common-web/
COPY shared/common-jpa/build.gradle.kts shared/common-jpa/
COPY shared/common-security/build.gradle.kts shared/common-security/
COPY shared/common-clients/build.gradle.kts shared/common-clients/
COPY shared/common-events/build.gradle.kts shared/common-events/
COPY services/${SERVICE}/build.gradle.kts services/${SERVICE}/

# Pre-fetch dependencies với BuildKit cache mount.
# `--no-daemon` vì 1 build/container. `--parallel` để build-logic + shared resolve song song.
RUN --mount=type=cache,id=gradle-cache-petclinic,target=/cache/.gradle,sharing=locked \
    chmod +x gradlew && \
    ./gradlew :services:${SERVICE}:dependencies --no-daemon --parallel --console=plain

# Layer D — source. Copy shared src + service src. Source đổi nhiều nhất → layer cuối.
COPY shared/common-web/src shared/common-web/src
COPY shared/common-jpa/src shared/common-jpa/src
COPY shared/common-security/src shared/common-security/src
COPY shared/common-clients/src shared/common-clients/src
COPY shared/common-events/src shared/common-events/src
COPY services/${SERVICE}/src services/${SERVICE}/src

# Build JAR. Skip test trong image build — CI/local chạy test riêng.
RUN --mount=type=cache,id=gradle-cache-petclinic,target=/cache/.gradle,sharing=locked \
    ./gradlew :services:${SERVICE}:bootJar --no-daemon --parallel --console=plain -x test && \
    mkdir -p /app && \
    cp services/${SERVICE}/build/libs/*.jar /app/app.jar

WORKDIR /app

# Phân tích module dep từ fat JAR. Quan trọng để jlink chỉ include những gì thật sự cần.
# `--ignore-missing-deps` vì Spring Boot reflection-load nhiều class compile-time không thấy.
RUN jdeps \
        --ignore-missing-deps \
        -q \
        --recursive \
        --multi-release 25 \
        --print-module-deps \
        --class-path 'BOOT-INF/lib/*' \
        app.jar > deps.info

# Custom JRE qua jlink. Image final ~60-80 MB thay vì 350 MB full JDK.
# Module list thêm: management/jmx/security/instrument cho Spring Boot Actuator + Resilience4j.
RUN jlink \
        --add-modules "$(cat deps.info),java.base,java.management,java.management.rmi,java.rmi,java.logging,java.naming,java.instrument,java.sql,java.xml,java.net.http,java.security.sasl,java.security.jgss,jdk.crypto.ec,jdk.crypto.cryptoki,jdk.unsupported,jdk.management,jdk.management.agent,jdk.naming.dns" \
        --compress zip-9 \
        --no-header-files \
        --no-man-pages \
        --strip-debug \
        --output /jre-minimal

# Spring Boot layered JAR — tách 4 layer cho Docker cache hit cao:
#   dependencies (đổi rất ít) → spring-boot-loader → snapshot-deps → application (đổi mỗi build).
RUN java -Djarmode=layertools -jar app.jar extract --destination /app/extracted

# ============================================================================
# STAGE 2: Runtime — Alpine + custom JRE + layered app
# ============================================================================
# Note: digest chưa pin — pin sau khi pull (xem ghi chú builder stage).
FROM alpine:3.21

ARG SERVICE
LABEL service="${SERVICE}"

# Runtime essentials only.
# ca-certificates: HTTPS gọi gateway/auth-service từ trong service.
# tini: PID 1 — signal handling + zombie reap khi spawn process (Resilience4j thread, …).
# curl: cho HEALTHCHECK (set ở compose).
# tzdata: log timezone Asia/Ho_Chi_Minh.
RUN apk add --no-cache \
        ca-certificates \
        tini \
        curl \
        tzdata \
    && rm -rf /var/cache/apk/* /tmp/*

# Non-root user (CIS Benchmark 4.1 — Spring Boot không cần root).
# Fixed uid/gid để k8s securityContext.runAsUser khớp.
RUN addgroup -g 1654 -S appgroup && \
    adduser -u 1654 -S appuser -G appgroup

# Custom JRE từ builder.
COPY --from=builder --chown=1654:1654 /jre-minimal /opt/java

WORKDIR /app

# Copy 4 Spring Boot layer theo thứ tự stable → volatile (Docker layer cache tối ưu).
COPY --from=builder --chown=1654:1654 /app/extracted/dependencies/ ./
COPY --from=builder --chown=1654:1654 /app/extracted/spring-boot-loader/ ./
COPY --from=builder --chown=1654:1654 /app/extracted/snapshot-dependencies/ ./
COPY --from=builder --chown=1654:1654 /app/extracted/application/ ./

USER 1654:1654

ENV JAVA_HOME=/opt/java \
    PATH="/opt/java/bin:${PATH}"

# JVM flags cho container Spring Boot service (Java 25 + virtual thread):
# - UseContainerSupport: respect cgroup mem/cpu (default Java 17+ nhưng explicit).
# - MaxRAMPercentage=75: heap tối đa 75% container mem. service 384MB → heap ~288MB.
# - InitialRAMPercentage=50: khởi đầu 50% — tránh GC sớm.
# - UseG1GC + MaxGCPauseMillis=100: pause ngắn, phù hợp request-response.
# - UseStringDeduplication: tiết kiệm RAM (Spring có nhiều String const).
# - ParallelRefProcEnabled: GC reference processing song song.
# - DisableExplicitGC: chặn System.gc() từ buggy library.
# - ExitOnOutOfMemoryError: fail-fast → k8s/compose restart container.
# - AlwaysActAsServerClassMachine: ép -server mode cho throughput.
ENV JAVA_TOOL_OPTIONS="-XX:+UseContainerSupport \
    -XX:MaxRAMPercentage=75.0 \
    -XX:InitialRAMPercentage=50.0 \
    -XX:+UseG1GC \
    -XX:MaxGCPauseMillis=100 \
    -XX:+UseStringDeduplication \
    -XX:+ParallelRefProcEnabled \
    -XX:+DisableExplicitGC \
    -XX:+ExitOnOutOfMemoryError \
    -XX:+AlwaysActAsServerClassMachine \
    -Djava.awt.headless=true"

# Service port — DOC ONLY (Docker không tự publish). Compose define port mapping.
# Đặt 8080 generic — service nội bộ tự bind theo application.yml.
EXPOSE 8080

# OCI labels — image registry + tooling đọc được metadata này.
LABEL org.opencontainers.image.title="petclinic-ms ${SERVICE}" \
      org.opencontainers.image.description="Spring Boot 4 microservice in MSS301 petclinic monorepo" \
      org.opencontainers.image.source="https://github.com/kl3inIT/petclinic-ms" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.base.name="docker.io/library/alpine:3.21"

# tini PID 1 — signal hierarchy + zombie reap.
ENTRYPOINT ["/sbin/tini", "--"]

# Spring Boot layered JAR launcher — KHÔNG `java -jar app.jar` vì layered extract
# tách rồi, không còn fat jar. JarLauncher đọc BOOT-INF/classpath.idx.
CMD ["java", "org.springframework.boot.loader.launch.JarLauncher"]
