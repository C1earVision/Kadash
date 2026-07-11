# ---- Render Deployment Dockerfile for Frontend (Vite + React) ----

# Stage 1: Build
FROM node:20-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite reads VITE_* env vars at build time.
# Pass VITE_API_URL and VITE_AI_API_URL as build args so the
# built bundle knows where the backends live on Render.
ARG VITE_API_URL
ARG VITE_AI_API_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_AI_API_URL=$VITE_AI_API_URL

RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine

# Remove default nginx page
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
