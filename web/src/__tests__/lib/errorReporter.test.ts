import { buildErrorReport } from "@/lib/errorReporter";

function errorWithMessage(message: string): Error {
  const error = new Error("mensaje que se pierde en runtime");
  error.message = message;
  return error;
}

describe("buildErrorReport", () => {
  it("toma el tipo, el mensaje y el stack de un Error", () => {
    const error = new TypeError("no se puede leer 'value' de undefined");
    const report = buildErrorReport("web-browser", error, "/indicador/dollar_blue");

    expect(report.origin).toBe("web-browser");
    expect(report.kind).toBe("TypeError");
    expect(report.message).toBe("no se puede leer 'value' de undefined");
    expect(report.path).toBe("/indicador/dollar_blue");
    expect(report.stack).toContain("TypeError");
  });

  it("acepta que lo que se tiró no sea un Error", () => {
    expect(buildErrorReport("web-server", "algo se rompió").kind).toBe("UnknownError");
    expect(buildErrorReport("web-server", "algo se rompió").message).toBe("algo se rompió");
    expect(buildErrorReport("web-server", { raro: true }).message).toBe("error sin mensaje");
    expect(buildErrorReport("web-server", undefined).message).toBe("error sin mensaje");
  });

  it("nunca manda un mensaje vacío, porque el schema de la API lo rechaza", () => {
    expect(buildErrorReport("web-browser", errorWithMessage("")).message).toBe("error sin mensaje");
    expect(buildErrorReport("web-browser", errorWithMessage("   ")).message).toBe("error sin mensaje");
  });

  it("recorta los campos a los topes que acepta la API", () => {
    const error = new Error("m".repeat(5000));
    error.stack = "s".repeat(20000);
    const report = buildErrorReport("web-browser", error, `/${"p".repeat(500)}`);

    expect(report.message).toHaveLength(2000);
    expect(report.stack).toHaveLength(8000);
    expect(report.path).toHaveLength(300);
  });

  it("no inventa campos opcionales cuando no hay", () => {
    const report = buildErrorReport("web-server", "sin stack ni path");

    expect(report.stack).toBeUndefined();
    expect(report.path).toBeUndefined();
  });
});
