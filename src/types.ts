import type { Level } from './level'

/** Standard level name */
export type LevelName =
  | 'TRACE'
  | 'DEBUG'
  | 'INFO'
  | 'WARN'
  | 'ERROR'
  | 'FATAL'
  | 'ALL'
  | 'MARK'
  | 'OFF'
  | CustomLevel

export type ValidColors =
  | 'white'
  | 'grey'
  | 'black'
  | 'blue'
  | 'cyan'
  | 'green'
  | 'magenta'
  | 'red'
  | 'yellow'

/** this type is a string type; NonNullable<unknown> is added so that autocomplete works for LevelName items */
type CustomLevel = string & NonNullable<unknown>

export type LevelParam<T extends LevelName = LevelName> =
  | T
  | Level<T>
  | { level: number; levelName: T; color: ValidColors }

/**
 * level configurations passed to `Logger` and `LevelRegistry` class constructor
 *
 * Do not use for passing level information between different functions and methods; use `LevelParam` instead
 */
export type LevelConstructorProps<T extends LevelName = LevelName> = Record<
  T,
  { value: number; color: ValidColors }
>

// Logger-related types
export type LoggerPrimitiveTypes = string | number | boolean | undefined | bigint | null

export type LoggerArg =
  | string
  | number
  | boolean
  | undefined
  | bigint
  | null
  | Record<string, any>
  | Array<any>
  | Error

// CallStack type
export type CallStack = {
  callStack?: string
  callerName?: string
  className?: string
  columnNumber?: number
  fileName?: string
  functionAlias?: string
  functionName?: string
  lineNumber?: number
}

export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>

export type TransformerFn<
  T extends LevelName = LevelName,
  // Logger data shape
  D extends Array<LoggerArg> = Array<LoggerArg>,
  // appender configs
  CA extends Record<string, any> = Record<string, any>,
  // Data accepted by appender
  DA = any,
  // Context
  CO extends Record<string, any> = Record<string, any>,
> = (
  data: D,
  options: {
    appenderConfig: CA
    context: CO
    loggerName: string
    level: Level<T>
  }
) => DA

export type LoggerProps<TLevelName extends LevelName, TName extends string> = {
  /** logger name */
  loggerName: TName

  /**
   * controls what messages will be sent to appenders using message severity
   *
   * Once requests are sent, they are received by appenders using Appender - Logger - Level mapping (see Appender.attachToLogger function)
   */
  level: LevelParam<TLevelName>

  /** indicates if callstack should be recorded  */
  useCallStack?: boolean
}
