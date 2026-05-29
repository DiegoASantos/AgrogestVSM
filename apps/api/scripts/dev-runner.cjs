const fs = require("node:fs");
const path = require("node:path");
const process = require("node:process");
const readline = require("node:readline");
const { spawn } = require("node:child_process");

const projectDir = path.resolve(__dirname, "..");
const distEntry = path.join(projectDir, "dist", "main.js");
const tscCliPath = require.resolve("typescript/bin/tsc", {
  paths: [projectDir]
});

let compilerProcess = null;
let serverProcess = null;
let restarting = false;
let restartQueued = false;
let shuttingDown = false;
let initialWatchCycleCompleted = false;

function log(message) {
  console.log(`[api:dev] ${message}`);
}

function startServer() {
  if (!fs.existsSync(distEntry)) {
    log(`Cannot start server because ${distEntry} does not exist yet.`);
    return;
  }

  const child = spawn(process.execPath, [distEntry], {
    cwd: projectDir,
    env: process.env,
    stdio: "inherit"
  });

  serverProcess = child;

  child.once("exit", (code, signal) => {
    if (serverProcess === child) {
      serverProcess = null;
    }

    if (shuttingDown || restarting) {
      return;
    }

    const reason = signal ? `signal ${signal}` : `code ${code ?? 0}`;
    log(`Server process exited with ${reason}.`);
  });
}

function stopServer() {
  if (!serverProcess) {
    return Promise.resolve();
  }

  const child = serverProcess;

  return new Promise((resolve) => {
    let finished = false;

    const complete = () => {
      if (finished) {
        return;
      }

      finished = true;

      if (serverProcess === child) {
        serverProcess = null;
      }

      resolve();
    };

    child.once("exit", complete);

    try {
      child.kill("SIGTERM");
    } catch {
      complete();
      return;
    }

    const killTimer = setTimeout(() => {
      if (finished) {
        return;
      }

      log("Forcing server shutdown after timeout.");

      try {
        child.kill("SIGKILL");
      } catch {
        complete();
      }
    }, 5000);

    if (typeof killTimer.unref === "function") {
      killTimer.unref();
    }
  });
}

async function restartServer(reason) {
  if (shuttingDown) {
    return;
  }

  if (restarting) {
    restartQueued = true;
    return;
  }

  restarting = true;
  log(`Restarting server because ${reason}.`);

  await stopServer();

  if (!shuttingDown) {
    startServer();
  }

  restarting = false;

  if (restartQueued) {
    restartQueued = false;
    await restartServer("another build finished while restarting");
  }
}

function handleCompilerLine(line) {
  const match = line.match(/Found (\d+) errors?\. Watching for file changes\./);

  if (!match) {
    return;
  }

  const errorCount = Number(match[1]);

  if (!initialWatchCycleCompleted) {
    initialWatchCycleCompleted = true;

    if (errorCount === 0) {
      log("TypeScript watch is ready.");
    } else {
      log(`TypeScript watch started with ${errorCount} build error(s).`);
    }

    return;
  }

  if (errorCount > 0) {
    log(`Build has ${errorCount} error(s); keeping the current server instance.`);
    return;
  }

  void restartServer("the TypeScript build completed");
}

function pipeCompilerStream(stream) {
  const reader = readline.createInterface({ input: stream });

  reader.on("line", (line) => {
    console.log(line);
    handleCompilerLine(line);
  });
}

function startCompiler() {
  const child = spawn(
    process.execPath,
    [
      tscCliPath,
      "-w",
      "-p",
      "tsconfig.build.json",
      "--pretty",
      "false",
      "--preserveWatchOutput"
    ],
    {
      cwd: projectDir,
      env: process.env,
      stdio: ["inherit", "pipe", "pipe"]
    }
  );

  compilerProcess = child;
  pipeCompilerStream(child.stdout);
  pipeCompilerStream(child.stderr);

  child.once("exit", (code, signal) => {
    if (shuttingDown) {
      return;
    }

    const reason = signal ? `signal ${signal}` : `code ${code ?? 0}`;
    log(`TypeScript watcher exited unexpectedly with ${reason}.`);
    void shutdown(code ?? 1);
  });
}

async function shutdown(exitCode) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  log("Shutting down development runner.");

  if (compilerProcess) {
    try {
      compilerProcess.kill("SIGTERM");
    } catch {}
  }

  await stopServer();
  process.exit(exitCode);
}

process.on("SIGINT", () => {
  void shutdown(0);
});

process.on("SIGTERM", () => {
  void shutdown(0);
});

log("Starting development runner.");
startServer();
startCompiler();
