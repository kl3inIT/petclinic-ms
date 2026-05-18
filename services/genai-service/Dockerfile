# syntax=docker/dockerfile:1.7-labs
# genai-service — Spring AI 2.0.0-M6 chatbot service. Port 8188 / mgmt 9188.
# Standalone Dockerfile với jlink custom JRE.
#
# Build từ project ROOT:
#   docker build -f services/genai-service/Dockerfile -t petclinic-ms/genai-service:25 .

# ============== STAGE 1: Builder — Gradle + jlink ==============
FROM eclipse-temurin:25-jdk-alpine AS builder

RUN apk add --no-cache binutils \
    && rm -rf /var/cache/apk/*

ENV GRADLE_USER_HOME=/cache/.gradle LANG=C.UTF-8 TZ=UTC
WORKDIR /build

COPY gradlew gradlew.bat ./
COPY gradle/ gradle/
COPY settings.gradle.kts ./
COPY build-logic/ build-logic/
COPY --parents shared/*/build.gradle.kts services/*/build.gradle.kts ./

RUN --mount=type=cache,id=gradle-cache,target=/cache/.gradle,sharing=locked \
    sed -i 's/\r$//' gradlew && chmod +x gradlew && \
    ./gradlew :services:genai-service:dependencies --no-daemon --console=plain

# Shared src — genai-service cần common-web, common-jpa, common-security
COPY shared/common-web/src shared/common-web/src
COPY shared/common-jpa/src shared/common-jpa/src
COPY shared/common-security/src shared/common-security/src
COPY services/genai-service/src services/genai-service/src

RUN --mount=type=cache,id=gradle-cache,target=/cache/.gradle,sharing=locked \
    ./gradlew :services:genai-service:bootJar --no-daemon --console=plain -x test && \
    cp services/genai-service/build/libs/*.jar /app.jar

WORKDIR /app

RUN jdeps --ignore-missing-deps -q --recursive --multi-release 25 \
        --print-module-deps --class-path 'BOOT-INF/lib/*' /app.jar > /deps.info

# jlink — bổ sung modules cho Spring Actuator + Eureka + JDBC + Liquibase + OkHttp (OpenAI SDK).
RUN jlink \
        --add-modules "$(cat /deps.info),java.management.rmi,java.rmi,jdk.management,jdk.management.agent,jdk.naming.dns,jdk.naming.rmi,jdk.crypto.ec,jdk.crypto.cryptoki,jdk.unsupported,jdk.zipfs,jdk.httpserver,jdk.attach,java.compiler,java.scripting,java.desktop,java.security.jgss,java.security.sasl,jdk.security.auth,java.sql,java.sql.rowset" \
        --compress zip-9 \
        --no-header-files \
        --no-man-pages \
        --strip-debug \
        --output /jre-minimal

RUN java -Djarmode=layertools -jar /app.jar extract --destination /extracted

# ============== STAGE 2: Runtime — alpine + custom JRE ==============
FROM alpine:3.21
LABEL org.opencontainers.image.title="petclinic-ms genai-service" \
      org.opencontainers.image.source="https://github.com/kl3inIT/petclinic-ms"

RUN apk add --no-cache tini ca-certificates curl tzdata && rm -rf /var/cache/apk/* /tmp/*
RUN addgroup -g 1654 -S appgroup && adduser -u 1654 -S appuser -G appgroup

COPY --from=builder --chown=1654:1654 /jre-minimal /opt/java
ENV JAVA_HOME=/opt/java PATH="/opt/java/bin:${PATH}"

WORKDIR /app
COPY --from=builder --chown=1654:1654 /extracted/dependencies/ ./
COPY --from=builder --chown=1654:1654 /extracted/spring-boot-loader/ ./
COPY --from=builder --chown=1654:1654 /extracted/snapshot-dependencies/ ./
COPY --from=builder --chown=1654:1654 /extracted/application/ ./

USER 1654:1654
ENV TZ=Asia/Ho_Chi_Minh \
    JAVA_TOOL_OPTIONS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:InitialRAMPercentage=50.0 -XX:+UseG1GC -XX:MaxGCPauseMillis=100 -XX:+UseStringDeduplication -XX:+ExitOnOutOfMemoryError -Djava.awt.headless=true"

EXPOSE 8188 9188
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["java", "org.springframework.boot.loader.launch.JarLauncher"]
