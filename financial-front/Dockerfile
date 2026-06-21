# ── Stage 1: build ───────────────────────────────────────────────────────────
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# VITE_API_URL vazio → Axios usa URL relativa → Nginx faz proxy
RUN VITE_API_URL= npm run build

# ── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
