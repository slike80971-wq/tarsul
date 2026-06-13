# ============================================================
# Tarsul Chat WebSocket Service | Dockerfile
# ============================================================
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install -g bun && bun install --frozen-lockfile

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 wsuser
USER wsuser
EXPOSE 3003
CMD ["node_modules/.bin/bun", "index.ts"]