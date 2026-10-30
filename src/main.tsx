import { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";
import "./telemetry.css";
import "./workspace.css";
import "./operations.css";

const DesignReview = lazy(() =>
  import("./DesignReview").then((module) => ({ default: module.DesignReview })),
);
createRoot(document.getElementById("root")!).render(
  new URLSearchParams(location.search).has("review") ? (
    <Suspense fallback={<p role="status">正在载入设计评审…</p>}>
      <DesignReview />
    </Suspense>
  ) : (
    <App />
  ),
);
