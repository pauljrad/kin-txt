import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import App from "./App.tsx";
import "./index.css";

// iOS zooms the WKWebView in when a form field takes focus, and with no
// maximum-scale pinned there is nothing to bring it back out — the app is left
// stuck at the zoomed scale (hit when searching for KiNs). Pinning the scale
// stops the zoom happening at all. WKWebView honours user-scalable=no, unlike
// mobile Safari, so this only takes effect inside the native app; the web build
// keeps the original viewport untouched.
if (Capacitor.isNativePlatform()) {
  const viewport = document.querySelector('meta[name="viewport"]');
  viewport?.setAttribute(
    "content",
    "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover",
  );
}

createRoot(document.getElementById("root")!).render(<App />);
