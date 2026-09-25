import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import { standardConfig } from "./eslint.standard.mjs";

export default defineConfig([
  ...standardConfig({
    tsconfigRootDir: import.meta.dirname,
    frameworks: nextVitals,
    allowDefaultProject: ["next.config.js", "postcss.config.js"],
  }),
  {
    // Único punto donde se asume la forma del JSON de la FastAPI propia en el SSR: sus tipos
    // espejan los schemas de api-py, así que la aserción queda aislada acá en vez de repartida.
    files: ["src/lib/assumeJsonShape.ts"],
    rules: {
      "@typescript-eslint/no-unsafe-type-assertion": "off",
      "@typescript-eslint/no-unnecessary-type-parameters": "off",
    },
  },
  {
    // Es el logger del repo: en desarrollo su salida es la consola.
    files: ["src/lib/logger.ts"],
    rules: { "no-console": "off" },
  },
]);
