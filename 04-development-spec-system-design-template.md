# Development Spec Template
## Variant A: System Design Spec

Formato voltado para demandas em que uma única spec técnica precisa detalhar estrutura, dados, interfaces, componentes e operação.

Inspirado principalmente em:

- Atlassian `Software Design Document`
- Microsoft `Architecture Design Specification`

Use quando:

- a mudança tem impacto claro em arquitetura, contrato e componentes;
- você quer um documento único, denso e executável;
- a LLM precisa de contexto suficiente para gerar plano e patch sem depender de múltiplos documentos auxiliares.

## Metadados

- `spec_id`:
- `titulo_tecnico`:
- `source_product_spec`:
- `source_product_spec_version`:
- `baseline_branch_or_commit`:
- `target_branch`:
- `escopo_sistema`:
- `última_atualização`:

## 1. Objective do documento

- O que esta spec técnica precisa permitir que engenharia faça:
- O que esta spec não cobre:
- Artefatos complementares:
  diagramas, schema, contrato, Figma, dashboards, flag config.

## 2. System overview

- Estado atual resumido:
- Estado alvo resumido:
- Delta técnico:
- Escopo explícito:
- Fora de escopo:
- Restrições obrigatórias:

## 3. Architecture design

- Arquitetura atual relevante:
- Arquitetura alvo:
- Principais componentes e relações:
- Diagramas obrigatórios:
  contexto, fluxo, sequência, dados, se aplicável.
- Trade-offs assumidos:

## 4. Data design

- Entidades impactadas:
- Campos novos ou alterados:
- Regras de validação:
- Persistência:
- Cache:
- Compatibilidade retroativa:
- Migração de dados:
- Estratégia de leitura e escrita:

## 5. Interface design

- Interfaces internas:
- APIs externas:
- Eventos assíncronos:
- Formato dos payloads:
- Erros e códigos esperados:
- Autenticação ou autorização:
- Idempotência, retry, timeout e fallback:

## 6. Component design

Repita por componente principal.

### `CMP-XX` Nome curto

- Responsabilidade:
- Inputs:
- Outputs:
- Estado interno:
- Dependências:
- Regras principais:
- Algoritmos ou transformações:
- Casos de falha:
- Arquivos ou módulos previstos:

## 7. UI and interaction design

- Telas alteradas:
- Componentes novos:
- Componentes alterados:
- Estados visuais:
  loading, vazio, erro, sucesso, disabled.
- Navegação:
- Responsividade:
- Acessibilidade:
- Regras de conteúdo ou formatação:

## 8. Runtime and operations

- Configuração:
- Feature flags:
- Logs:
- Métricas:
- Alertas:
- Monitoramento pós-release:
- Rollout:
- Rollback:
- Recuperação ou contingência:

## 9. Security, privacy and compliance

- Dados sensíveis impactados:
- Regras de acesso:
- Controles obrigatórios:
- Implicações de privacidade:
- Requisitos regulatórios:

## 10. Requirement mapping

Repita para cada requisito da spec de produto.

### `REQ-XX` Nome curto

- `source_requirement`:
- Interpretação técnica:
- Touchpoints:
- Contratos impactados:
- Estados impactados:
- Critério de aceite técnico:
- Testes:
- Open questions:

## 11. Implementation plan input

Esta seção existe para facilitar geração de plano por LLM.

### `WORK-XX` Nome curto

- Objetivo:
- Pré-requisitos:
- Arquivos alvo:
- Mudanças esperadas:
- Dependências:
- Pode ser paralelo:
  `sim | não`
- Como validar:

## 12. Test plan

- Testes unitários:
- Testes de widget ou UI:
- Testes de integração:
- Testes de contrato:
- Testes manuais:
- Regressões obrigatórias:

## 13. Open items

- Bloqueios:
- Riscos:
- Decisões pendentes:
- Assunções temporárias:
