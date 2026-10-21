import { ApiError } from "../../../shared/services/api/errors";
import { authService } from "../services/auth.service";
import type { AuthSession, LoginValues } from "../types/auth.types";

type SessionStorage = {
  read: () => string | null;
  write: (refreshToken: string) => void;
  clear: () => void;
};

/** Owns current credentials; React receives a stable snapshot until the user changes. */
export class WebSessionManager {
  private current: AuthSession | null = null;
  private published: AuthSession | null = null;
  private readonly authorizations = new Set<string>();
  private renewal: Promise<void> | null = null;
  private generation = 0;

  constructor(
    private readonly storage: SessionStorage,
    private readonly onChange: (session: AuthSession | null) => void,
    private readonly transport: Pick<typeof authService, "login" | "refresh" | "getCurrentUser"> = authService
  ) {}

  readonly logout = () => {
    this.generation += 1;
    this.renewal = null;
    this.current = null;
    this.published = null;
    this.authorizations.clear();
    this.storage.clear();
    this.onChange(null);
  };

  readonly login = async (values: LoginValues) => {
    const generation = ++this.generation;
    this.renewal = null;
    const next = await this.transport.login(values);
    this.assertCurrentGeneration(generation);
    this.storage.write(next.refreshToken);
    this.authorizations.clear();
    this.published = null;
    this.publish(next);
    return next;
  };

  readonly resolveAuthorization = (authorization: string) => {
    if (!this.current || !this.authorizations.has(authorization)) throw sessionChanged();
    return authorizationFor(this.current);
  };

  readonly recover = async (failedAuthorization: string, rejectedRetry = false) => {
    const currentAuthorization = this.resolveAuthorization(failedAuthorization);
    // A delayed 401 for an older token can use the token already renewed by another request.
    if (currentAuthorization !== failedAuthorization) return currentAuthorization;
    if (rejectedRetry) {
      this.logout();
      throw new ApiError("La sesión ya no es válida. Inicia sesión nuevamente.", 401);
    }
    await this.refreshUser();
    return this.resolveAuthorization(failedAuthorization);
  };

  readonly refreshUser = (): Promise<void> => {
    if (this.renewal) return this.renewal;
    const generation = this.generation;
    const renewal = this.renew(generation).finally(() => {
      if (this.renewal === renewal) this.renewal = null;
    });
    this.renewal = renewal;
    return renewal;
  };

  private async renew(generation: number) {
    try {
      const refreshToken = this.storage.read();
      if (!refreshToken) throw new ApiError("Inicia sesión para continuar.", 401);
      const refreshed = await this.transport.refresh(refreshToken);
      this.assertCurrentGeneration(generation);
      // Rotation has already consumed the previous token, even if /auth/me fails next.
      this.storage.write(refreshed.refreshToken);
      const user = await this.transport.getCurrentUser(refreshed.accessToken, refreshed.tokenType, false);
      this.assertCurrentGeneration(generation);
      this.publish({
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        tokenType: refreshed.tokenType,
        expiresIn: refreshed.expiresIn,
        user
      });
    } catch (error) {
      this.assertCurrentGeneration(generation);
      if (error instanceof ApiError && error.statusCode === 401) {
        this.logout();
        throw error;
      }
      throw new ApiError("No se pudo renovar la sesión temporalmente. Reintenta al recuperar la conexión.", 503);
    }
  }

  private publish(next: AuthSession) {
    this.current = next;
    this.authorizations.add(authorizationFor(next));
    if (!this.published || JSON.stringify(this.published.user) !== JSON.stringify(next.user)) {
      this.published = next;
      this.onChange(next);
    }
  }

  private assertCurrentGeneration(generation: number) {
    if (generation !== this.generation) throw sessionChanged();
  }
}

function authorizationFor(session: AuthSession) {
  return `${session.tokenType} ${session.accessToken}`;
}

function sessionChanged() {
  return new ApiError("La sesión cambió. Reintenta la operación desde la sesión actual.", 409);
}
