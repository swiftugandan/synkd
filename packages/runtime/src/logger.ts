export type LogLevel = "debug" | "info" | "warn" | "error";

export interface SynkdLogger {
  debug(msg: string, fields?: Record<string, unknown>): void;
  info(msg: string, fields?: Record<string, unknown>): void;
  warn(msg: string, fields?: Record<string, unknown>): void;
  error(msg: string, fields?: Record<string, unknown>): void;
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export function createLogger(options?: {
  service?: string;
  level?: LogLevel;
  json?: boolean;
}): SynkdLogger {
  const service = options?.service ?? "synkd";
  const min = LEVEL_ORDER[options?.level ?? "info"];
  const json =
    options?.json ??
    (process.env.SYNKD_LOG_JSON === "1" || process.env.SINKD_LOG_JSON === "1");

  const write = (level: LogLevel, msg: string, fields?: Record<string, unknown>) => {
    if (LEVEL_ORDER[level] < min) return;
    const entry = {
      ts: new Date().toISOString(),
      level,
      service,
      msg,
      ...fields,
    };
    const line = json ? JSON.stringify(entry) : formatLine(entry);
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  };

  return {
    debug: (msg, fields) => write("debug", msg, fields),
    info: (msg, fields) => write("info", msg, fields),
    warn: (msg, fields) => write("warn", msg, fields),
    error: (msg, fields) => write("error", msg, fields),
  };
}

function formatLine(entry: Record<string, unknown>): string {
  const { ts, level, service, msg, ...rest } = entry;
  const extras = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : "";
  return `${ts} ${level} ${service} ${msg}${extras}`;
}