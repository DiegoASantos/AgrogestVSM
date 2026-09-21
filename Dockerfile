FROM node:20-bookworm-slim AS base

WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

COPY . .
RUN pnpm install --frozen-lockfile

FROM base AS api

RUN pnpm --filter @agrogest/api build

EXPOSE 3001
CMD ["pnpm", "--filter", "@agrogest/api", "start:prod"]

FROM base AS admin-web

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_ENVIRONMENT_LABEL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_ENVIRONMENT_LABEL=$NEXT_PUBLIC_ENVIRONMENT_LABEL

RUN pnpm --filter @agrogest/admin-web build

EXPOSE 3000
CMD ["pnpm", "--filter", "@agrogest/admin-web", "start"]
