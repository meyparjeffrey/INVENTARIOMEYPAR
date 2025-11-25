import log from "electron-log";

type LogLevel = "info" | "warn" | "error";

export const Logger = {
  info(message: string, meta?: unknown) {
    log.info(message, meta ?? "");
  },
  warn(message: string, meta?: unknown) {
    log.warn(message, meta ?? "");
  },
  error(message: string, meta?: unknown) {
    log.error(message, meta ?? "");
  }
} satisfies Record<LogLevel, (message: string, meta?: unknown) => void>;

