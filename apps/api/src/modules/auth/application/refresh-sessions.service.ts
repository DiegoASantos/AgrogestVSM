import { createHash } from "node:crypto";

import { Injectable, type OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, MoreThan, Repository } from "typeorm";

import { RefreshSessionEntity } from "../infrastructure/persistence/entities/refresh-session.entity";

@Injectable()
export class RefreshSessionsService implements OnModuleInit {
  constructor(
    @InjectRepository(RefreshSessionEntity)
    private readonly sessionsRepository: Repository<RefreshSessionEntity>
  ) {}

  async onModuleInit() {
    await this.sessionsRepository.query(`
      CREATE TABLE IF NOT EXISTS auth_refresh_sessions (
        id UUID PRIMARY KEY,
        user_public_id UUID NOT NULL,
        token_hash VARCHAR(64) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        revoked_at TIMESTAMPTZ NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await this.sessionsRepository.query(`
      CREATE INDEX IF NOT EXISTS idx_auth_refresh_sessions_user
      ON auth_refresh_sessions(user_public_id)
    `);
    await this.sessionsRepository.query(`
      CREATE INDEX IF NOT EXISTS idx_auth_refresh_sessions_expiry
      ON auth_refresh_sessions(expires_at)
    `);
  }

  async create(
    id: string,
    userPublicId: string,
    refreshToken: string,
    expiresAt: Date
  ) {
    await this.sessionsRepository.save(
      this.sessionsRepository.create({
        id,
        userPublicId,
        tokenHash: hashToken(refreshToken),
        expiresAt,
        revokedAt: null
      })
    );
  }

  async rotate(input: {
    id: string;
    userPublicId: string;
    currentRefreshToken: string;
    nextRefreshToken: string;
    nextExpiresAt: Date;
  }) {
    const result = await this.sessionsRepository.update(
      {
        id: input.id,
        userPublicId: input.userPublicId,
        tokenHash: hashToken(input.currentRefreshToken),
        revokedAt: IsNull(),
        expiresAt: MoreThan(new Date())
      },
      {
        tokenHash: hashToken(input.nextRefreshToken),
        expiresAt: input.nextExpiresAt,
        updatedAt: new Date()
      }
    );

    if (result.affected === 1) {
      return true;
    }

    // A stale token can indicate reuse after rotation. Revoke the session family.
    await this.revoke(input.id);
    return false;
  }

  async revoke(id: string) {
    await this.sessionsRepository.update(
      {
        id,
        revokedAt: IsNull()
      },
      {
        revokedAt: new Date(),
        updatedAt: new Date()
      }
    );
  }
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
