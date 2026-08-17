let mutationTail: Promise<void> = Promise.resolve();

export async function runWithSyncMutationLock<T>(work: () => Promise<T>): Promise<T> {
  const previous = mutationTail;
  let release: () => void = () => {};

  mutationTail = new Promise<void>((resolve) => {
    release = resolve;
  });

  await previous;

  try {
    return await work();
  } finally {
    release();
  }
}
