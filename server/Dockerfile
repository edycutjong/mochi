# The server has to stay up for weeks, so the image is deliberately boring:
# one runtime, no build toolchain at run time, no native modules to rebuild.
# SQLite comes from Node itself (node:sqlite), which is why 22.5+ is required.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
COPY test ./test
COPY scripts ./scripts
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist

# The database is state, not image content. Mount a volume here and point
# MOCHI_DB_PATH at it, or every redeploy throws away the history.
VOLUME ["/data"]
ENV MOCHI_DB_PATH=/data/mochi.db
ENV MOCHI_HOST=0.0.0.0
ENV MOCHI_PORT=8080
EXPOSE 8080

HEALTHCHECK --interval=60s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.MOCHI_PORT||8080)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/src/index.js"]
