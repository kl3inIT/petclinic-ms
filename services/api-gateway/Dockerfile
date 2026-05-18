# syntax=docker/dockerfile:1.7-labs
# api-gateway — Spring Cloud Gateway 5.x (WebMVC) — single entry, JWT validate. Port 8180 / mgmt 9080.
# Standalone Dockerfile — không depend image base nào của project.
#
# Build từ project ROOT:
#   docker build -f services/api-gateway/Dockerfile -t petclinic-ms/api-gateway:25 .

# ============== STAGE 1: Builder ==============
FROM eclipse-temurin:25-jdk-noble AS builder
ENV GRADLE_USER_HOME=/cache/.gradle LANG=C.UTF-8 TZ=UTC
WORKDIR /build

# Gradle wrapper + version catalog
COPY gradlew gradlew.bat ./
COPY gradle/ gradle/

# Settings + convention plugins
COPY settings.gradle.kts ./
COPY build-logic/ build-logic/

# Module build files — copy TẤT CẢ vì settings.gradle.kts include() yêu cầu mọi
# module dir tồn tại (chỉ build.gradle.kts là đủ — không cần src). `--parents` (Dockerfile
# 1.7-labs) preserve cấu trúc thư mục khi glob copy.
COPY --parents shared/*/build.gradle.kts services/*/build.gradle.kts ./

RUN --mount=type=cache,id=gradle-cache,target=/cache/.gradle,sharing=locked     sed -i 's/\r$//' gradlew && chmod +x gradlew &&     ./gradlew :services:api-gateway:dependencies --no-daemon --console=plain

# Shared module src — chỉ deps mà api-gateway thực sự dùng
COPY shared/common-web/src shared/common-web/src
COPY shared/common-security/src shared/common-security/src
# Service src (đổi mỗi build code → chỉ layer này invalidate)
COPY services/api-gateway/src services/api-gateway/src

RUN --mount=type=cache,id=gradle-cache,target=/cache/.gradle,sharing=locked     ./gradlew :services:api-gateway:bootJar --no-daemon --console=plain -x test &&     cp services/api-gateway/build/libs/*.jar /app.jar

# Spring Boot layered JAR — 4 layer cho cache hit cao
RUN java -Djarmode=layertools -jar /app.jar extract --destination /extracted

# ============== STAGE 2: Runtime ==============
FROM eclipse-temurin:25-jre-alpine
LABEL org.opencontainers.image.title="petclinic-ms api-gateway"       org.opencontainers.image.source="https://github.com/kl3inIT/petclinic-ms"

RUN apk add --no-cache tini ca-certificates curl tzdata && rm -rf /var/cache/apk/* /tmp/*
RUN addgroup -g 1654 -S appgroup && adduser -u 1654 -S appuser -G appgroup

WORKDIR /app
COPY --from=builder --chown=1654:1654 /extracted/dependencies/ ./
COPY --from=builder --chown=1654:1654 /extracted/spring-boot-loader/ ./
COPY --from=builder --chown=1654:1654 /extracted/snapshot-dependencies/ ./
COPY --from=builder --chown=1654:1654 /extracted/application/ ./

USER 1654:1654
ENV TZ=Asia/Ho_Chi_Minh     JAVA_TOOL_OPTIONS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:InitialRAMPercentage=50.0 -XX:+UseG1GC -XX:MaxGCPauseMillis=100 -XX:+UseStringDeduplication -XX:+ExitOnOutOfMemoryError -Djava.awt.headless=true"

EXPOSE 8180 9080
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["java", "org.springframework.boot.loader.launch.JarLauncher"]
