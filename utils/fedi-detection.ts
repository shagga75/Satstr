import { useState, useEffect } from "react";

export function isFediEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes("fedi") || typeof (window as any).fedi !== "undefined";
}

export function hasWebLN(): boolean {
  if (typeof window === "undefined") return false;
  return typeof window.webln !== "undefined";
}

export function getWebLNProvider(): any | null {
  if (typeof window === "undefined") return null;
  return window.webln ?? null;
}

function isMobileWebViewInternal(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  return /wv|webview/.test(ua) || isFediEnvironment();
}

export function useFediContext(): {
  isInFedi: boolean;
  hasWebLN: boolean;
  isMobileWebView: boolean;
} {
  const [ctx, setCtx] = useState({
    isInFedi: false,
    hasWebLN: false,
    isMobileWebView: false,
  });

  useEffect(() => {
    setCtx({
      isInFedi: isFediEnvironment(),
      hasWebLN: hasWebLN(),
      isMobileWebView: isMobileWebViewInternal(),
    });
  }, []);

  return ctx;
}
