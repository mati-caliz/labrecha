export type ErrorOrigin = "web-server" | "web-browser";

const KIND_MAX_LENGTH = 160;
const MESSAGE_MAX_LENGTH = 2000;
const STACK_MAX_LENGTH = 8000;
const PATH_MAX_LENGTH = 300;

const MAX_REPORTS_PER_SESSION = 5;
const UNKNOWN_KIND = "UnknownError";
const UNKNOWN_MESSAGE = "error sin mensaje";

export interface ErrorReport {
  origin: ErrorOrigin;
  kind: string;
  message: string;
  stack?: string;
  path?: string;
}

function cut(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) : text;
}

export function buildErrorReport(origin: ErrorOrigin, error: unknown, path?: string): ErrorReport {
  const isError = error instanceof Error;
  const kind = isError && error.name ? error.name : UNKNOWN_KIND;
  const rawMessage = isError ? error.message : typeof error === "string" ? error : "";
  const stack = isError && error.stack ? cut(error.stack, STACK_MAX_LENGTH) : undefined;
  return {
    origin,
    kind: cut(kind, KIND_MAX_LENGTH),
    message: cut(rawMessage.trim() || UNKNOWN_MESSAGE, MESSAGE_MAX_LENGTH),
    ...(stack === undefined ? {} : { stack }),
    ...(path === undefined ? {} : { path: cut(path, PATH_MAX_LENGTH) }),
  };
}

const alreadyReported = new Set<string>();

function shouldReport(report: ErrorReport): boolean {
  if (alreadyReported.size >= MAX_REPORTS_PER_SESSION) {
    return false;
  }
  const key = `${report.origin}|${report.kind}|${report.message}`;
  if (alreadyReported.has(key)) {
    return false;
  }
  alreadyReported.add(key);
  return true;
}

export async function reportError(origin: ErrorOrigin, error: unknown, path?: string): Promise<void> {
  const report = buildErrorReport(origin, error, path);
  if (!shouldReport(report)) {
    return;
  }
  try {
    const { errorsApi } = await import("@/lib/labrechaApi");
    await errorsApi.report(report);
  } catch {
    return;
  }
}
