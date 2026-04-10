declare module "livekit-client" {
  export type StructuredLogger = {
    methodFactory: (
      methodName: string,
      level: number,
      loggerName: string,
    ) => (message: UntypedJson, context?: UntypedJson) => void;
    setLevel(level: number | string): void;
    getLevel(): number;
  };

  export enum LoggerNames {
    Engine = "engine",
  }

  export function getLogger(name: LoggerNames | string): StructuredLogger;
}
