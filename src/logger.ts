import debugLib from 'debug'
const debug = debugLib('log4ts:logger')

import { LoggingEvent } from './loggingEvent'
import type { LevelParam, LevelName, LoggerArg, LoggerProps } from './types'
import type { Level } from './level'
import { LevelRegistry } from './levelRegistry'
import { getEventBus } from './eventBus'
import { defaultParseCallStack, ParseCallStackFunction } from './defaultParseCallStack'

/**
 * The top entry is the Error
 */
const baseCallStackSkip = 1
/**
 * The _log function is 3 levels deep, we need to skip those to make it to the callSite
 */
const defaultErrorCallStackSkip = 3

type LoggerFunction<D extends Array<LoggerArg>> = (...params: D) => void

type LoggerMethods<T extends LevelName, D extends Array<LoggerArg>> = Record<
  LoggerMethodName<T>,
  LoggerFunction<D>
>

type LoggerMethodName<T extends LevelName> = Lowercase<T>

export const createLogger = <
  TData extends Array<LoggerArg>,
  TLevelName extends LevelName,
  TName extends string,
>(
  param: LoggerProps<TLevelName, TName>
): Logger<TLevelName, TData, TName> => {
  const logger = new LoggerClass<TLevelName, TData, TName>(param) as Logger<
    TLevelName,
    TData,
    TName
  >

  for (const level of logger.levels.levelsArray) {
    const levelName: LoggerMethodName<TLevelName> = level.levelName.toLowerCase() as any

    const loggerRef = logger as LoggerMethods<TLevelName, TData>

    const fn: LoggerFunction<TData> = function (
      this: LoggerClass<TLevelName, TData, TName>,
      ...args: TData
    ) {
      this.log(level, ...args)
    }

    loggerRef[levelName] = fn.bind(logger)
  }

  return logger
}

export type Logger<
  TLevelName extends LevelName,
  TData extends Array<LoggerArg>,
  TName extends string,
> = LoggerClass<TLevelName, TData, TName> & LoggerMethods<TLevelName, TData>

/**
 * Logger to log messages.
 */
class LoggerClass<
  TLevelName extends LevelName,
  TData extends Array<LoggerArg>,
  TName extends string,
> {
  /** logger name */
  loggerName: TName

  /**
   * log levels defined in the logger;
   * includes all standard levels plus custom levels
   */
  levels: LevelRegistry<TLevelName>

  /** appenders attached */
  // private appenders: Appender<TLevelName>[] = []

  /** default log level for attached appenders */
  private _level: Level<TLevelName>

  /** indicates if callstack should be recorded  */
  useCallStack: boolean

  context: Record<string, any> = {}
  private callStackSkipIndex = 0

  private parseCallStack: ParseCallStackFunction = defaultParseCallStack

  constructor(param: LoggerProps<TLevelName, TName>) {
    this.context = {}

    this.loggerName = param.loggerName
    this.levels = param.levelRegistry
    this._level =
      (param.level && this.levels.getLevel(param.level)) ??
      this.levels.getLevel('INFO' as TLevelName)!
    this.useCallStack = param.useCallStack ?? false
  }

  get level(): Level<TLevelName> {
    const ret = this.levels.getLevel(this._level, this.levels.levelsDict['OFF' as TLevelName])
    return ret
  }

  set level(level) {
    const v = this.levels.getLevel(level)
    if (!v) console.warn(`level ${JSON.stringify(level)} is not configured`)
    this._level = v ?? this.level
  }

  /**
   * By default, logger will skip all stack lines between actual Error and logger function call
   * This value returns the number of additional lines to be skipped
   */
  get callStackLinesToSkip() {
    return this.callStackSkipIndex
  }

  /**
   * By default, logger will skip all stack lines between actual Error and logger function call
   * This setter updates the number of additional lines to be skipped
   */
  set callStackLinesToSkip(number: number) {
    if (number < 0) {
      throw new RangeError('Must be >= 0')
    }
    this.callStackSkipIndex = number
  }

  log(level: LevelParam<TLevelName>, ...args: TData) {
    const logLevel = this.levels.getLevel(level)

    if (!logLevel) {
      console.error('Cannot send event')
      return
    }

    if (this.isLevelEnabled(logLevel)) {
      this._log(logLevel, args)
    }
  }

  isLevelEnabled(otherLevel: LevelParam<TLevelName>) {
    const loggerEnabled = this.level.isLessThanOrEqualTo(otherLevel)

    if (!loggerEnabled) {
      return false
    }

    return true
  }

  private _log(level: LevelParam<TLevelName>, data: TData) {
    debug(`sending log data (${level}) to appenders`)
    const error = data.find((item) => item instanceof Error)
    let callStack
    if (this.useCallStack) {
      try {
        if (error) {
          callStack = this.parseCallStack(error, this.callStackSkipIndex + baseCallStackSkip)
        }
      } catch (_err) {
        // Ignore Error and use the original method of creating a new Error.
      }
      callStack =
        callStack ||
        this.parseCallStack(
          new Error(),
          this.callStackSkipIndex + defaultErrorCallStackSkip + baseCallStackSkip
        )
    }
    const loggingEvent = new LoggingEvent({
      loggerName: this.loggerName,
      level: level,
      data: data,
      context: this.context,
      location: callStack,
      error,
    })
    getEventBus().then((eventBus) => eventBus.send(loggingEvent))
  }

  addContext(key: string, value: any) {
    this.context[key] = value
  }

  removeContext(key: string) {
    delete this.context[key]
  }

  clearContext() {
    this.context = {}
  }

  setParseCallStackFunction(parseFunction?: ParseCallStackFunction) {
    if (!parseFunction) this.parseCallStack = defaultParseCallStack
    else this.parseCallStack = parseFunction
  }
}
