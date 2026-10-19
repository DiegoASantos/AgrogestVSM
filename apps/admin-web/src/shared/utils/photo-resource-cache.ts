export type GalleryPhoto = { id: string; createdAt: string };

/** Session-scoped blob URLs. The caller supplies the existing authenticated reader. */
export function createPhotoResourceCache(load: (photo: GalleryPhoto) => Promise<string>) {
  const entries = new Map<string, Promise<string>>();
  const urls = new Set<string>();
  const queue: Array<{ run: () => void; cancel: () => void }> = [];
  let active = 0;
  let disposed = false;
  const cancelled = () => new Error("La galería se cerró.");

  function drain() {
    while (!disposed && active < 3 && queue.length) queue.shift()!.run();
  }

  return {
    get(photo: GalleryPhoto): Promise<string> {
      if (disposed) return Promise.reject(cancelled());
      const existing = entries.get(photo.id);
      if (existing) return existing;
      const pending = new Promise<string>((resolve, reject) => {
        queue.push({
          cancel: () => reject(cancelled()),
          run() {
            active += 1;
            void Promise.resolve()
              .then(() => load(photo))
              .then((url) => {
                if (disposed) {
                  URL.revokeObjectURL(url);
                  reject(cancelled());
                  return;
                }
                urls.add(url);
                resolve(url);
              })
              .catch((error: unknown) => {
                entries.delete(photo.id);
                reject(error);
              })
              .finally(() => {
                active -= 1;
                drain();
              });
          }
        });
      });
      entries.set(photo.id, pending);
      drain();
      return pending;
    },
    invalidate(photo: GalleryPhoto) {
      const pending = entries.get(photo.id);
      entries.delete(photo.id);
      if (pending)
        void pending.then(
          (url) => {
            if (urls.delete(url)) URL.revokeObjectURL(url);
          },
          () => undefined
        );
    },
    dispose() {
      disposed = true;
      queue.splice(0).forEach((job) => job.cancel());
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
      entries.clear();
    }
  };
}
