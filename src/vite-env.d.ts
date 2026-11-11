/// <reference types="vite/client" />

declare module "*.glb?packed" {
  const asset: import("./model-transport").ModelTransport;
  export default asset;
}
