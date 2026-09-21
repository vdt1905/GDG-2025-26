# ShushrutAI API: Express + Firebase Admin + Cloudinary.
FROM node:22-alpine

ENV NODE_ENV=production \
    PORT=5000

WORKDIR /app

# Dependencies first, so code edits reuse the cached layer.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY . .

# Run as the image's built-in unprivileged user. serviceAccountKey.json is
# bind-mounted read-only by docker-compose, never baked into the image.
USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -qO- "http://127.0.0.1:${PORT}/" >/dev/null || exit 1

CMD ["node", "server.js"]
