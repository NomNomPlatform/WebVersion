# ─── Stage 1: build ───────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# Cài dependencies (tận dụng cache)
COPY package.json package-lock.json ./
# --legacy-peer-deps: react-leaflet@4.x peer dep vẫn conflict nhẹ với một số
# package khác trong dự án, nhưng bản thân React 18 hoàn toàn tương thích.
# Lockfile đã được resolve đúng ở local; flag này chỉ tắt check peer nghiêm ngặt.
RUN npm ci --legacy-peer-deps

# Build production bundle -> /app/dist
COPY . .
# Build-time env (vd VITE_GOOGLE_CLIENT_ID cho đăng nhập Google ở FE).
ARG VITE_GOOGLE_CLIENT_ID=""
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
RUN npm run build

# ─── Stage 2: serve bằng nginx ────────────────────────────────
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"] 
