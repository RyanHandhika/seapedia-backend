# ── Build stage ──
FROM node:22-slim AS builder

# Prisma & beberapa lib butuh openssl
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install semua dependency (termasuk devDependencies untuk build)
COPY package*.json ./
RUN npm ci

# Copy seluruh source
COPY . .

# Generate Prisma client (WAJIB sebelum tsc, karena hasilnya ikut di-compile)
RUN npx prisma generate

# Compile TypeScript → dist/
RUN npm run build

# ── Runtime stage ──
FROM node:22-slim AS runner

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production

# Hanya butuh dependency produksi di runtime
COPY package*.json ./
RUN npm ci --omit=dev

# Ambil hasil build dari stage builder
COPY --from=builder /app/dist ./dist
# Prisma schema & config (kalau dibutuhkan saat runtime)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# Koyeb akan set PORT lewat env; server Anda sudah baca process.env.PORT
EXPOSE 8000

CMD ["node", "dist/server.js"]
