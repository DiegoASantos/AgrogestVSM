/// <reference types="node" />

import { runInNewContext } from "node:vm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildPageRenderScript,
  REPORT_MEASUREMENT_SCRIPT
} from "./html-report-image-capturer";

vi.mock("react-native", () => ({
  PixelRatio: { get: () => 3 },
  Platform: { OS: "ios" },
  StyleSheet: { create: (styles: unknown) => styles, absoluteFillObject: {} },
  ActivityIndicator: "ActivityIndicator",
  Modal: "Modal",
  View: "View"
}));
vi.mock("react-native-view-shot", () => ({
  captureRef: vi.fn(),
  releaseCapture: vi.fn()
}));
vi.mock("react-native-webview", () => ({ WebView: "WebView" }));
vi.mock("../components/app-text", () => ({ AppText: "AppText" }));
vi.mock("../components/app-button", () => ({ AppButton: "AppButton" }));

function createBrowser(options: { hasContent?: boolean; imagePending?: boolean } = {}) {
  const messages: unknown[] = [];
  const frames: Array<() => void> = [];
  const events = new Map<string, () => void>();
  const imageEvents = new Map<string, () => void>();
  const textNode = { nodeValue: "Receta sintetica" };
  const body = {
    scrollHeight: 2140,
    offsetHeight: 2140,
    style: {} as Record<string, string>,
    querySelectorAll: () => []
  };
  const root = {
    scrollHeight: 2140,
    offsetHeight: 1080,
    style: {} as Record<string, string>
  };
  const document = {
    body,
    documentElement: root,
    readyState: "complete",
    fonts: { ready: Promise.resolve() },
    images: options.imagePending
      ? [
          {
            complete: false,
            addEventListener: (name: string, callback: () => void) =>
              imageEvents.set(name, callback)
          }
        ]
      : [],
    createTreeWalker: () => {
      let visited = false;
      return {
        nextNode: () => {
          if (visited || options.hasContent === false) return null;
          visited = true;
          return textNode;
        }
      };
    },
    createRange: () => ({
      selectNodeContents: () => undefined,
      getClientRects: () => [{ top: 12, bottom: 32, width: 200, height: 20 }]
    })
  };
  const browser = {
    document,
    NodeFilter: { SHOW_TEXT: 4 },
    setTimeout,
    clearTimeout,
    requestAnimationFrame: (callback: () => void) => frames.push(callback),
    ReactNativeWebView: {
      postMessage: (message: string) => messages.push(JSON.parse(message))
    },
    addEventListener: (name: string, callback: () => void) => events.set(name, callback)
  };

  return {
    body,
    root,
    document,
    frames,
    messages,
    events,
    imageEvents,
    execute: (script: string) => runInNewContext(script, { ...browser, window: browser })
  };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("report rendering bridge", () => {
  it("reports height even when the covered WebView never receives animation frames", async () => {
    const browser = createBrowser();
    browser.execute(REPORT_MEASUREMENT_SCRIPT);

    await vi.advanceTimersByTimeAsync(250);

    expect(browser.messages).toEqual([{ type: "agrogest-report-size", height: 2140 }]);
    expect(browser.frames).toHaveLength(1);
  });

  it("does not post twice when delayed frames arrive after the fallback", async () => {
    const browser = createBrowser();
    browser.execute(REPORT_MEASUREMENT_SCRIPT);
    await vi.advanceTimersByTimeAsync(250);

    browser.frames.shift()?.();
    browser.frames.shift()?.();

    expect(browser.messages).toHaveLength(1);
  });

  it("uses normal paint frames before the fallback when available", async () => {
    const browser = createBrowser();
    browser.execute(REPORT_MEASUREMENT_SCRIPT);
    await vi.advanceTimersByTimeAsync(0);
    browser.frames.shift()?.();
    browser.frames.shift()?.();

    expect(browser.messages).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(250);
    expect(browser.messages).toHaveLength(1);
  });

  it("waits for image assets before measuring", async () => {
    const browser = createBrowser({ imagePending: true });
    browser.execute(REPORT_MEASUREMENT_SCRIPT);
    await vi.advanceTimersByTimeAsync(1000);
    expect(browser.messages).toEqual([]);

    browser.imageEvents.get("load")?.();
    await vi.advanceTimersByTimeAsync(250);
    expect(browser.messages).toHaveLength(1);
  });

  it("prepares the correct page without waiting indefinitely for WebKit frames", async () => {
    const browser = createBrowser();
    browser.execute(
      buildPageRenderScript({
        height: 1060,
        offsetY: 1080,
        renderId: 2,
        index: 1,
        total: 2
      })
    );

    await vi.advanceTimersByTimeAsync(250);

    expect(browser.root.style).toMatchObject({ height: "1060px", overflow: "hidden" });
    expect(browser.body.style).toMatchObject({ top: "-1080px", position: "relative" });
    expect(browser.messages).toEqual([
      {
        type: "agrogest-report-page-ready",
        renderId: 2,
        hasContent: true
      }
    ]);
  });

  it("still marks blank pages as empty", async () => {
    const browser = createBrowser({ hasContent: false });
    browser.execute(
      buildPageRenderScript({
        height: 100,
        offsetY: 2140,
        renderId: 3,
        index: 2,
        total: 3
      })
    );

    await vi.advanceTimersByTimeAsync(250);

    expect(browser.messages).toEqual([
      {
        type: "agrogest-report-page-ready",
        renderId: 3,
        hasContent: false
      }
    ]);
  });

  it("waits for document load before preparing a page", async () => {
    const browser = createBrowser();
    browser.document.readyState = "loading";
    browser.execute(
      buildPageRenderScript({ height: 1080, offsetY: 0, renderId: 1, index: 0, total: 1 })
    );
    await vi.advanceTimersByTimeAsync(1000);
    expect(browser.messages).toEqual([]);

    browser.events.get("load")?.();
    await vi.advanceTimersByTimeAsync(250);
    expect(browser.messages).toHaveLength(1);
  });
});
