import { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { workspaceRoute } from "./workspace-route";
import "./styles.css";
import "./telemetry.css";
import "./workspace.css";
import "./operations.css";

const Workspace = lazy(() =>
  import("./Workspace").then((module) => ({ default: module.Workspace })),
);
const OriginalPrototype = lazy(() =>
  import("./App").then((module) => ({ default: module.App })),
);
const route = workspaceRoute(location.search);
createRoot(document.getElementById("root")!).render(
  <Suspense fallback={<p role="status">正在载入三维工作区…</p>}>
    {route === "prototype" ? (
      <OriginalPrototype />
    ) : (
      <Workspace reviewMode={route === "review"} />
    )}
  </Suspense>,
);
