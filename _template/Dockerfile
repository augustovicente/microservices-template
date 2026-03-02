# -- Build stage -----------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /project

# Shared package
COPY packages/shared ./packages/shared
WORKDIR /project/packages/shared
RUN npm ci && npm run build

# Service
WORKDIR /project
COPY services/{{SERVICE_NAME}} ./services/{{SERVICE_NAME}}
WORKDIR /project/services/{{SERVICE_NAME}}
RUN npm ci && npm run build

# -- Production stage ------------------------------------------------------
FROM node:20-alpine

WORKDIR /project

COPY --from=builder /project/packages/shared ./packages/shared
COPY --from=builder /project/services/{{SERVICE_NAME}} ./services/{{SERVICE_NAME}}

WORKDIR /project/services/{{SERVICE_NAME}}

EXPOSE 3000
CMD ["node", "dist/index.js"]
