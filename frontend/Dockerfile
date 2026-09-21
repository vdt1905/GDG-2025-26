# ShushrutAI frontend: Vite build, served as static files by nginx.

# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite inlines VITE_* at BUILD time, so the API URLs are fixed per image.
# They default to the compose ports on the host: the browser calls these
# directly, so they must be reachable from the user's machine, not from inside
# the Docker network. Values set here override .env / .env.production.
# The Firebase web config still comes from frontend/.env (it is public anyway:
# it ships inside the JS bundle).
ARG VITE_BACKEND_URL=http://localhost:5000/api
ARG VITE_PYTHON_URL=http://localhost:8000
ENV VITE_BACKEND_URL=${VITE_BACKEND_URL} \
    VITE_PYTHON_URL=${VITE_PYTHON_URL}

RUN npm run build

# ---- serve ----
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
