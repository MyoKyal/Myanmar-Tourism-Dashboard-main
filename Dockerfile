# Multi-stage build -- the final image ships only the standalone server output (see
# `output: 'standalone'` in next.config.ts) plus its traced dependencies, not the full
# node_modules tree used to build it. Matches the deployment architecture in the platform
# blueprint: one small application container behind Nginx, not a Kubernetes-scale setup this
# app's real traffic doesn't need.

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# --legacy-peer-deps: react-simple-maps@3 declares a React 16-18 peer range but this app runs
# React 19; the same flag used for every local `npm install` this project has needed.
RUN npm ci --legacy-peer-deps

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Runs as a non-root user -- the default `node` user baked into this base image, not a
# custom one, so there's nothing extra to maintain.
USER node

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
