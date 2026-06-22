FROM node:24-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG DATABASE_URL
RUN npx prisma generate
RUN npm run build

FROM node:24-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/use-postgres.js ./use-postgres.js
COPY --from=builder /app/use-sqlite.js ./use-sqlite.js

EXPOSE 3001
ENV PORT=3001
CMD ["node", "dist/src/main"]
