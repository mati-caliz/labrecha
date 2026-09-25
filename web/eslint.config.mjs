import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import { standardConfig } from "./eslint.standard.mjs";

export default defineConfig([
  ...standardConfig({
    tsconfigRootDir: import.meta.dirname,
    frameworks: nextVitals,
    allowDefaultProject: ["jest.config.js", "next.config.js", "postcss.config.js"],
  }),
]);
