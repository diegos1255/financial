# CLAUDE.md — Projeto `security` (lib JAR)

Biblioteca Maven com a camada de autenticação/autorização do sistema **financial**. Empacotada como JAR e importada via dependência local pelo `financial`. Para contexto geral, leia `D:\claude\financial\CLAUDE.md` primeiro.

## Identidade

- **Group:** `com.financial.security`
- **Artifact:** `security`
- **Version:** `0.0.1-SNAPSHOT`
- **Tipo:** Biblioteca JAR (sem `main` class, sem `spring-boot-maven-plugin`)
- **Pacote raiz:** `com.financial.security`

## Por que projeto separado

Diego escolheu manter `security` como projeto Maven próprio (não package dentro do `financial`) para exercitar modularização — mesma decisão de empresas que isolam camadas reutilizáveis. Custo: passo extra de `mvnw install` antes de buildar o `financial`. Benefício: a lib pode ser plugada em outros apps Spring Boot da mesma família no futuro.

## Stack

| Tecnologia | Versão | Para quê |
|---|---|---|
| Java | 21 LTS | runtime |
| Spring Boot | **4.0.6** (sem `.RELEASE`) | parent POM + autoconfig |
| Spring Security | starter `spring-boot-starter-security` | filters, encoders, SecurityFilterChain |
| Spring Web MVC | starter `spring-boot-starter-webmvc` | acesso a request/response (filters) |
| JJWT | 0.12.6 | geração e validação JWT (HS256) |
| Lombok | annotation processor | boilerplate |

## Build e publicação local

Esta lib **precisa estar instalada no `.m2` local** (`~/.m2/repository/com/financial/security/`) antes do `financial` compilar:

```powershell
cd D:\workspace\security
.\mvnw.cmd clean install -DskipTests       # publica no .m2
```

Validar que foi publicada:
```powershell
ls "$env:USERPROFILE\.m2\repository\com\financial\security\0.0.1-SNAPSHOT\"
# deve listar: security-0.0.1-SNAPSHOT.jar e .pom
```

## Estrutura de packages (planejada — definida no WORK-03)

```
com.financial.security
├── config/                        ← @Configuration: SecurityFilterChain, PasswordEncoder
├── filter/                        ← JwtAuthenticationFilter (OncePerRequestFilter)
├── jwt/                           ← JwtProvider (sign/parse), JwtProperties (@ConfigurationProperties)
├── service/                       ← interface UserDetailsService bem definida para o consumidor implementar
└── exception/                     ← JwtException customizada, handler base
```

## Princípios de design

- **Stateless.** Sem sessão, sem cache. Cada request valida o JWT do zero.
- **HS256** por simplicidade. Secret via `jwt.secret` (env var em prod).
- **Expiração** configurável via `jwt.expiration-hours` (default 8).
- **Não conhece o domínio.** A lib não importa nada do `financial`. Define a interface `UserDetailsService` que o `financial` implementa para resolver o usuário pelo login.
- **AutoConfiguration:** as classes `@Configuration` são importadas automaticamente pelo Spring Boot do consumidor via `spring.factories` ou `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` (definir no WORK-03).

## Estado atual

- Projeto gerado via Spring Initializr (Boot 4.0.6, Java 21, security/web/validation/lombok).
- Pom editado:
  - Removido `spring-boot-maven-plugin` (não vira app executável).
  - Adicionado JJWT 0.12.6 (api, impl runtime, jackson runtime).
  - Corrigido `4.0.6.RELEASE` → `4.0.6`.
- `SecurityApplication.java` **deletada** (lib não tem main).
- `target/security-0.0.1-SNAPSHOT.jar` gerado; instalado no `.m2`.
- **Nenhuma classe Java implementada ainda.** Tudo começa no WORK-03 do plano de desenvolvimento.

## O que NÃO fazer

- Não adicionar `spring-boot-maven-plugin` (vira app executável; isto é lib).
- Não criar `main()` aqui.
- Não importar nada do `financial` (acoplamento errado de direção).
- Não armazenar JWT secret no código — sempre via config externalizada.
