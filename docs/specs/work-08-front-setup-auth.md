# Spec WORK-08 — Frontend: setup + autenticação + telas amigáveis 401

> Fase 8. Primeira fase do frontend.

---

## Metadados
- **spec_id:** `WORK-08`
- **titulo_tecnico:** Setup React+Vite+TS+Tailwind, LoginPage, ProtectedLayout, Sidebar consumindo `/api/menus`, route guards, interceptor Axios para 401, telas "Você precisa fazer login" e "Sua sessão expirou"
- **source_product_spec:** `PLAN-01`
- **baseline:** pós-WORK-03 (login back funcional). Pode iniciar em paralelo com WORK-04..07.
- **target_branch:** `feature/work-08-front-setup`
- **escopo_sistema:** `financial-front` (novo)
- **última_atualização:** 2026-05-31

---

## 1. Objective
Criar projeto front do zero, configurar stack, implementar fluxo de login E2E (front+back), layout autenticado com menu lateral carregado do back, route guards + interceptor para tratamento amigável de 401.

**Fora:** telas de CRUD (vêm na WORK-09), signup (vem na WORK-11), Docker (vem na WORK-10).

---

## 2. System overview
- **Atual:** `D:\workspace\financial-front` (junction) vazio.
- **Alvo:** SPA rodando em `localhost:5173` (Vite dev server), autentica contra `localhost:8080`.

---

## 3. Architecture
SPA React Router. Camadas: `pages/` (rotas), `components/` (reutilizáveis), `services/` (API), `hooks/` (lógica), `contexts/` (estado global), `types/` (TS).

---

## 4. Data design
Estado em React Context: `AuthContext` (token, user, login(), logout()).
Persistência: `localStorage` para token (`auth_token`) e user serializado.

---

## 5. Interface design
Consome: `POST /api/auth/login`, `GET /api/menus`. Header `Authorization: Bearer <token>` adicionado por interceptor Axios.

**Rotas do front:**
| Path | Acesso | Componente |
|---|---|---|
| `/login` | público | `LoginPage` |
| `/unauthorized` | público | `UnauthorizedPage` |
| `/session-expired` | público | `SessionExpiredPage` |
| `/` ou `/dashboard` (e tudo o mais) | protegido | dentro de `ProtectedLayout` |

---

## 6. Component design

**Setup:**
- `npm create vite@latest financial-front -- --template react-ts`
- Tailwind via `tailwindcss-cli` (npx tailwindcss init).
- React Router v6.
- Axios.
- Lucide React (ícones — usado pelos menus).

**Estrutura:**
```
src/
├── main.tsx
├── App.tsx                  ← Router setup
├── pages/
│   ├── LoginPage.tsx
│   ├── UnauthorizedPage.tsx
│   ├── SessionExpiredPage.tsx
│   └── DashboardPlaceholder.tsx
├── components/
│   ├── layout/
│   │   ├── ProtectedLayout.tsx
│   │   ├── Sidebar.tsx
│   │   └── Topbar.tsx
│   └── ui/
│       ├── Button.tsx
│       └── Input.tsx
├── contexts/
│   └── AuthContext.tsx
├── services/
│   ├── api.ts              ← axios instance + interceptors
│   ├── authService.ts      ← login, logout
│   └── menuService.ts      ← getMenus
├── guards/
│   └── RouteGuard.tsx      ← protege rotas
├── hooks/
│   └── useAuth.ts
└── types/
    ├── user.ts
    └── menu.ts
```

**`api.ts` (interceptor):**
```ts
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const code = error.response.data?.code;
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = code === 'TOKEN_EXPIRED' ? '/session-expired' : '/unauthorized';
    }
    return Promise.reject(error);
  }
);
```

**`RouteGuard.tsx`:**
```tsx
export function RouteGuard({ children }: { children: ReactNode }) {
  const token = localStorage.getItem('auth_token');
  if (!token) return <Navigate to="/unauthorized" replace />;
  return <>{children}</>;
}
```

---

## 7. UI

**LoginPage:** card centralizado, logo, inputs login+senha, botão "Entrar", link "Cadastre-se" (placeholder — vai redirecionar para `/signup` na WORK-11, por ora pode mostrar tooltip "em breve").

**UnauthorizedPage:** ícone amigável, título "Você precisa fazer login", botão "Ir para Login".

**SessionExpiredPage:** ícone amigável, título "Sua sessão expirou", subtítulo "Por segurança, sua sessão foi encerrada. Faça login novamente.", botão "Fazer Login".

**ProtectedLayout:** grid 2 colunas — `Sidebar` (largura 240px, fundo escuro) + área principal. `Topbar` opcional com avatar + nome + botão "Sair".

**Sidebar:** carrega `/api/menus`, renderiza recursivamente cada item como `<NavLink>` do React Router. Ícone do menu via Lucide (campo `icon` do back).

**Estilo:** Tailwind. Tema escuro. Tipografia padrão sistema.

---

## 8. Runtime/ops
- `.env.development`:
  ```env
  VITE_API_URL=http://localhost:8080
  ```
- `.env.production` (preenchido na WORK-10):
  ```env
  VITE_API_URL=/api
  ```
- Scripts npm: `dev`, `build`, `preview`.

---

## 9. Security
- Token em `localStorage` (decisão pragmática para MVP; cookies httpOnly seriam mais seguros mas exigem mais configuração). Documentar como risco aceito.
- Sem dados sensíveis em logs do console.
- HTTPS obrigatório em produção (config na WORK-10).

---

## 10. Requirement mapping
- **REQ-01** (Login) — front
- **REQ-09** (Layout menu lateral) ✅
- **REQ-10** (Menus consumidos do back) ✅ (parte front)
- **REQ-11** (Front React) ✅
- **D-12** (Proteção total) — implementação no front

---

## 11. Implementation plan input

| Sub-WORK | Objetivo |
|---|---|
| WORK-08.1 | Scaffold Vite + TS, configurar Tailwind |
| WORK-08.2 | Setup Axios + interceptors |
| WORK-08.3 | `AuthContext` + `useAuth` |
| WORK-08.4 | `LoginPage` + integração com `/api/auth/login` |
| WORK-08.5 | `RouteGuard` + `ProtectedLayout` + `Sidebar` |
| WORK-08.6 | Consumir `/api/menus` no Sidebar |
| WORK-08.7 | `UnauthorizedPage` + `SessionExpiredPage` |
| WORK-08.8 | Smoke test E2E (login, navegação, forçar URL, expirar token) |

---

## 12. Test plan
- **Unit:** N/A no MVP (sem Vitest configurado).
- **E2E manual:** scripts em §11.8.

---

## 13. Open items
- **O-24:** Adicionar `axios-retry` para retry automático em falhas de rede? Não nesta fase.
- **O-25:** Skeleton/placeholder enquanto carrega menus? Sim — mostrar 6 items placeholder com Tailwind animate-pulse.
- **O-26:** Internacionalização (i18n)? Não — projeto educacional em PT-BR.

---

## Critério de "pronto"
```
[ ] npm run dev sobe sem erros em localhost:5173
[ ] Acessar /dashboard sem token → /unauthorized (tela amigável)
[ ] Login com credenciais válidas → redireciona para /dashboard (placeholder)
[ ] Sidebar mostra os 6 menus carregados do back
[ ] Forçar token inválido no localStorage → próxima request → /session-expired
[ ] Botão "Sair" limpa token e redireciona para /login
[ ] Diego aprova explicitamente
```
