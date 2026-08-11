import { SetMetadata } from "@nestjs/common";

export const ALLOW_ANALYST_MUTATION_KEY = "allowAnalystMutation";

export const AllowAnalystMutation = () => SetMetadata(ALLOW_ANALYST_MUTATION_KEY, true);
