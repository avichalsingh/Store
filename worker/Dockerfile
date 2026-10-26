# Dedicated FFmpeg media worker for RHYTHM Phase 5A.
# Multi-stage: compile TypeScript, run production Node against dist/.
#
# Build context MUST be the repository root (Render: Dockerfile Path =
# worker/Dockerfile, Root Directory unset). Paths below are relative to repo root.
FROM node:20-bookworm-slim AS build

WORKDIR /app
COPY worker/package.json worker/package-lock.json ./
RUN npm ci
COPY worker/tsconfig.json ./
COPY worker/src ./src
# outDir is dist/ (worker/tsconfig.json); fail the build if tsc did not emit.
RUN npm run build \
  && test -f dist/index.js

FROM node:20-bookworm-slim AS runtime

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg fonts-dejavu-core \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY worker/package.json worker/package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist

ENV WORKER_WATERMARK_FONT=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
ENV PORT=8787
EXPOSE 8787

CMD ["node", "dist/index.js"]
