FROM node:22-bookworm-slim AS build

WORKDIR /app

ENV CI=true \
    HUSKY=0

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY . .

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

FROM nginx:1.29-alpine

RUN rm -rf /usr/share/nginx/html/*

COPY docker/app/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
