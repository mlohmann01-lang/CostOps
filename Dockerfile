FROM node:22-alpine AS builder
WORKDIR /app
COPY . .
RUN npm install -g pnpm@10 && pnpm install --frozen-lockfile && pnpm run typecheck:libs

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app /app
ENV NODE_ENV=production
EXPOSE 3000
CMD ["pnpm","--filter","@workspace/api-server","start"]
