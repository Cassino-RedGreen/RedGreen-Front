# syntax=docker/dockerfile:1
FROM node:24.12.0-bookworm-slim@sha256:7326fb2dbdce998edd72140946851be64ef4a643e8715e138ca467e8e9d92c99 AS build
WORKDIR /app
ENV CI=true HUSKY=0
COPY package.json package-lock.json ./
# Existing React 19 / RTL 14 peer conflict: preserve the project's locked tree.
RUN npm ci --legacy-peer-deps --no-audit --no-fund
COPY index.html vite.config.ts tsconfig*.json postcss.config.js tailwind.config.js ./
COPY src ./src
COPY public ./public
ARG VITE_API_BASE_URL=/api
RUN test "$VITE_API_BASE_URL" = /api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

FROM nginx:1.28.0-alpine@sha256:30f1c0d78e0ad60901648be663a710bdadf19e4c10ac6782c235200619158284 AS production
COPY docker/nginx/nginx.conf /etc/nginx/nginx.conf
COPY docker/nginx/default.conf.template /opt/redgreen/default.conf.template
COPY --chmod=755 docker/nginx/start.sh /opt/redgreen/start.sh
COPY --from=build /app/dist /usr/share/nginx/html
ENV API_UPSTREAM=http://backend:3000
USER nginx
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
ENTRYPOINT ["/opt/redgreen/start.sh"]
