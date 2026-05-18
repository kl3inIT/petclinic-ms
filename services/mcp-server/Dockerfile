# syntax=docker/dockerfile:1.7-labs
# mcp-server — Spring AI 2.0.0-M6 MCP server (STREAMABLE HTTP transport). Port 8187 / mgmt 9187.
# Standalone Dockerfile với jlink custom JRE (~280-350 MB).
#
# Build từ project ROOT:
#   docker build -f services/mcp-server/Dockerfile -t petclinic-ms/mcp-server:25 .

# ============== STAGE 1: Builder — Gradle + jlink ==============
FROM eclipse-temurin:25-jdk-alpine AS builder

# binutils cần cho jlink --strip-debug
RUN apk add --no-cache binutils \
    && rm -rf /var/cache/apk/*

ENV GRADLE_USER_HOME=/cache/.gradle LANG=C.UTF-8 TZ=UTC
WORKDIR /build

# Gradle wrapper + version catalog
COPY gradlew gradlew.bat ./
COPY gradle/ gradle/

# Settings + convention plugins
COPY settings.gradle.kts ./
COPY build-logic/ build-logic/

# Module build files — copy TẤT CẢ để settings.gradle.kts resolve được mọi include()
COPY --parents shared/*/build.gradle.kts services/*/build.gradle.kts ./

RUN --mount=type=cache,id=gradle-cache,target=/cache/.gradle,sharing=locked \
    sed -i 's/\r$//' gradlew && chmod +x gradlew && \
    ./gradlew :services:mcp-server:dependencies --no-daemon --console=plain

# Shared src — mcp-server cần common-clients (RestClient + JwtForward) + common-web (ProblemDetail)
COPY shared/common-clients/src shared/common-clients/src
COPY shared/common-web/src shared/common-web/src
# Service src
COPY services/mcp-server/src services/mcp-server/src

RUN --mount=type=cache,id=gradle-cache,target=/cache/.gradle,sharing=locked \
    ./gradlew :services:mcp-server:bootJar --no-daemon --console=plain -x test && \
    cp services/mcp-server/build/libs/*.jar /app.jar

WORKDIR /app

# jdeps phân tích module phụ thuộc trong fat JAR
RUN jdeps --ignore-missing-deps -q --recursive --multi-release 25 \
        --print-module-deps --class-path 'BOOT-INF/lib/*' /app.jar > /deps.info

# jlink → custom JRE ~70 MB. Bổ sung modules jdeps không detect được do reflection
RUN jlink \
        --add-modules "java.base,java.compiler,java.datatransfer,java.desktop,java.instrument,java.logging,java.management,java.management.rmi,java.naming,java.net.http,java.prefs,java.rmi,java.scripting,java.security.jgss,java.security.sasl,java.smartcardio,java.sql,java.sql.rowset,java.transaction.xa,java.xml,java.xml.crypto,jdk.accessibility,jdk.attach,jdk.charsets,jdk.compiler,jdk.crypto.cryptoki,jdk.crypto.ec,jdk.dynalink,jdk.httpserver,jdk.jartool,jdk.jcmd,jdk.jdi,jdk.jdwp.agent,jdk.jfr,jdk.jlink,jdk.jsobject,jdk.localedata,jdk.management,jdk.management.agent,jdk.management.jfr,jdk.naming.dns,jdk.naming.rmi,jdk.net,jdk.nio.mapmode,jdk.random,jdk.sctp,jdk.security.auth,jdk.security.jgss,jdk.unsupported,jdk.xml.dom,jdk.zipfs" \
        --compress zip-9 \
        --no-header-files \
        --no-man-pages \
        --strip-debug \
        --output /jre-minimal

# Spring Boot layered JAR — 4 layer cho cache hit cao
RUN java -Djarmode=layertools -jar /app.jar extract --destination /extracted

# ============== STAGE 2: Runtime — alpine + custom JRE ==============
FROM alpine:3.21
LABEL org.opencontainers.image.title="petclinic-ms mcp-server" \
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

EXPOSE 8187 9187
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["java", "org.springframework.boot.loader.launch.JarLauncher"]
