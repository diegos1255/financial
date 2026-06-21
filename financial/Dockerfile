# ── Stage 1: build ───────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /build

# Instala a lib security no .m2 local
COPY security/ ./security/
RUN chmod +x security/mvnw \
 && cd security \
 && ./mvnw clean install -DskipTests -q

# Builda o app financial (security já está no .m2)
COPY financial/ ./financial/
RUN chmod +x financial/mvnw \
 && cd financial \
 && ./mvnw clean package -DskipTests -q

# ── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /build/financial/target/*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
