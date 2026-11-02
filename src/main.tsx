import { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const Workspace = lazy(() =>
  import("./Workspace").then((module) => ({ default: module.Workspace })),
);
createRoot(document.getElementById("root")!).render(
  <Suspense fallback={<p role="status">正在载入三维工作区…</p>}>
    <Workspace />
  </Suspense>,
);
