# syntax=docker/dockerfile:1.7-labs
# discovery-server — Spring Cloud Netflix Eureka registry. Port 8761 / mgmt 9761.
# Standalone Dockerfile với jlink custom JRE (image ~280-350 MB vs 500 MB full JRE).
#
# Build từ project ROOT:
#   docker build -f services/discovery-server/Dockerfile -t petclinic-ms/discovery-server:25 .

# ============== STAGE 1: Builder — Gradle + jlink ==============
FROM eclipse-temurin:25-jdk-alpine AS builder

# binutils cần cho jlink --strip-debug
RUN apk add --no-cache binutils     && rm -rf /var/cache/apk/*

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

RUN --mount=type=cache,id=gradle-cache,target=/cache/.gradle,sharing=locked     sed -i 's/\r$//' gradlew && chmod +x gradlew &&     ./gradlew :services:discovery-server:dependencies --no-daemon --console=plain

# Shared src — chỉ deps discovery-server thực sự dùng
# Service src
COPY services/discovery-server/src services/discovery-server/src

RUN --mount=type=cache,id=gradle-cache,target=/cache/.gradle,sharing=locked     ./gradlew :services:discovery-server:bootJar --no-daemon --console=plain -x test &&     cp services/discovery-server/build/libs/*.jar /app.jar

WORKDIR /app

# jdeps phân tích module phụ thuộc trong fat JAR
RUN jdeps --ignore-missing-deps -q --recursive --multi-release 25         --print-module-deps --class-path 'BOOT-INF/lib/*' /app.jar > /deps.info

# jlink → custom JRE ~70 MB. Bổ sung modules jdeps không detect được do reflection:
#   java.management.rmi, jdk.management.agent → Actuator/JMX
#   jdk.naming.dns → Eureka DNS lookup
#   jdk.crypto.cryptoki → TLS
#   java.compiler, java.scripting → Spring AOT, JSP runtime
RUN jlink         --add-modules "$(cat /deps.info),java.instrument,java.sql,java.sql.rowset,java.management.rmi,java.rmi,jdk.management,jdk.management.agent,jdk.naming.dns,jdk.naming.rmi,jdk.crypto.ec,jdk.crypto.cryptoki,jdk.unsupported,jdk.zipfs,java.net.http,jdk.httpserver,jdk.net,jdk.attach,java.compiler,java.scripting,java.desktop,java.security.jgss,java.security.sasl,jdk.security.auth"         --compress zip-9         --no-header-files         --no-man-pages         --strip-debug         --output /jre-minimal

# Spring Boot layered JAR — 4 layer cho cache hit cao
RUN java -Djarmode=layertools -jar /app.jar extract --destination /extracted

# ============== STAGE 2: Runtime — alpine + custom JRE ==============
FROM alpine:3.21
LABEL org.opencontainers.image.title="petclinic-ms discovery-server"       org.opencontainers.image.source="https://github.com/kl3inIT/petclinic-ms"

RUN apk add --no-cache tini ca-certificates curl tzdata && rm -rf /var/cache/apk/* /tmp/*
RUN addgroup -g 1654 -S appgroup && adduser -u 1654 -S appuser -G appgroup

# Custom JRE từ builder (~70 MB thay vì 198 MB full Temurin JRE)
COPY --from=builder --chown=1654:1654 /jre-minimal /opt/java
ENV JAVA_HOME=/opt/java PATH="/opt/java/bin:${PATH}"

WORKDIR /app
COPY --from=builder --chown=1654:1654 /extracted/dependencies/ ./
COPY --from=builder --chown=1654:1654 /extracted/spring-boot-loader/ ./
COPY --from=builder --chown=1654:1654 /extracted/snapshot-dependencies/ ./
COPY --from=builder --chown=1654:1654 /extracted/application/ ./

USER 1654:1654
ENV TZ=Asia/Ho_Chi_Minh     JAVA_TOOL_OPTIONS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:InitialRAMPercentage=50.0 -XX:+UseG1GC -XX:MaxGCPauseMillis=100 -XX:+UseStringDeduplication -XX:+ExitOnOutOfMemoryError -Djava.awt.headless=true"

EXPOSE 8761 9761
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["java", "org.springframework.boot.loader.launch.JarLauncher"]
