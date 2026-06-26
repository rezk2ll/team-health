# --- build stage: install all deps, build the adapter-node output ---
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
# --ignore-scripts: esbuild ships prebuilt binaries via optional deps (no build
# script needed) and skips the `prepare` hook before sources are copied.
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY . .
RUN pnpm build && pnpm prune --prod --ignore-scripts

# --- runtime stage: lean image with prod deps + build output + migrations ---
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/package.json ./package.json
EXPOSE 3000
# Apply DB migrations, then start the Node server.
CMD ["sh", "-c", "node scripts/migrate.js && node build"]
