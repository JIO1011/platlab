# API de PlatLab (ADR 0033). Contexto: la raíz del repositorio.
FROM node:24-slim AS build
RUN corepack enable
WORKDIR /repo
COPY . .
# Solo lo que la API necesita: ella y los paquetes del monorepo de los que depende.
RUN pnpm install --frozen-lockfile --filter @platlab/server...
RUN pnpm --filter @platlab/server build

FROM node:24-slim
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000
WORKDIR /app
COPY --from=build /repo/apps/server/dist/api.mjs ./api.mjs
USER node
EXPOSE 3000
CMD ["node", "api.mjs"]
