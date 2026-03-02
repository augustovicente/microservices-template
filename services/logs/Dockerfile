# -- Build stage -----------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /project

# Shared package
COPY packages/shared ./packages/shared
WORKDIR /project/packages/shared
RUN npm ci && npm run build

# Service
WORKDIR /project
COPY services/logs ./services/logs
WORKDIR /project/services/logs
RUN npm ci && npm run build

# -- Production stage ------------------------------------------------------
FROM node:20-alpine

WORKDIR /project

COPY --from=builder /project/packages/shared ./packages/shared
COPY --from=builder /project/services/logs ./services/logs

WORKDIR /project/services/logs

EXPOSE 3000
CMD ["node", "dist/index.js"]
