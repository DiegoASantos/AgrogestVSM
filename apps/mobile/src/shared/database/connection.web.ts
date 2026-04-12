type DatabaseRunResult = {
  changes: number;
  lastInsertRowId: number;
};

type WebDatabase = {
  execSync: (statement: string, ...params: unknown[]) => void;
  getAllSync: <T>(statement: string, ...params: unknown[]) => T[];
  getFirstSync: <T>(statement: string, ...params: unknown[]) => T | null;
  runSync: (statement: string, ...params: unknown[]) => DatabaseRunResult;
  withTransactionSync: (callback: () => void) => void;
};

const WEB_RESULT: DatabaseRunResult = {
  changes: 0,
  lastInsertRowId: 0
};

const webDatabase: WebDatabase = {
  execSync: () => {
    // Web preview runs without the native SQLite layer.
  },
  getAllSync: () => [],
  getFirstSync: () => null,
  runSync: () => WEB_RESULT,
  withTransactionSync: (callback) => {
    callback();
  }
};

export function getDatabase() {
  return webDatabase;
}

export function initDatabase() {
  return webDatabase;
}
