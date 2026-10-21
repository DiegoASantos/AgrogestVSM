import { SetMetadata } from "@nestjs/common";

export const ALLOW_TREASURER_KEY = "allowTreasurer";

/** Explicit access to a handler without changing permissions of existing roles. */
export const AllowTreasurer = () => SetMetadata(ALLOW_TREASURER_KEY, true);
