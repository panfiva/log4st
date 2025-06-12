import type { LevelName, LoggerArg, CustomLevel } from './types'
import type { LoggingEvent } from './loggingEvent'

import { getEventBus } from './eventBus'

type WriteMethod<D> = (data: D) => Promise<void> | void

export type ShutdownCb = ((e?: Error) => void) | ((e?: Error) => Promise<void>)

/**
 * class that writes logs to the destination repository
 */
export abstract class LogWriter<
  // data shape that logWriter accepts
  TFormattedData,
  // logWriter config parameters
  TConfigA extends Record<string, any>,
  TNameA extends string,
> {
  name: TNameA

  /** logWriter configurations */
  abstract config: TConfigA

  constructor(name: TNameA) {
    this.name = name
  }

  /** function executed on logWriter shutdown */
  shutdown: (cb?: ShutdownCb) => Promise<void> | void = (cb) => {
    if (cb) cb()
  }

  attachToLogger = <
    TLoggerName extends string,
    TLevelName extends LevelName | CustomLevel,
    TData extends Array<LoggerArg>,
  >(
    loggerName: TLoggerName,

    /**
     * controls what low writers will receive message sent by a logger
     *
     * this is different from Logger.level property that controls what messages are sent to log writers
     */
    levelName: TLevelName,

    /** callback function that transforms event payload to format accepted by logWriter  */
    transformer: (
      event: LoggingEvent<TLevelName, TData>,
      logWriterName: TNameA,
      logWriterConfig: TConfigA
    ) => TFormattedData
  ): void => {
    const listener = function (
      this: LogWriter<TFormattedData, TConfigA, TNameA>,
      event: LoggingEvent<TLevelName, TData>
    ) {
      const data = transformer(event, this.name, this.config)
      this.write(data)
    }.bind(this)

    getEventBus().then((eventBus) => {
      eventBus.addMessageListener({
        loggerName,
        levelName,
        listener,
        logWriter: this,
      })
    })
  }

  /**
   * function that writes event data
   * At this point, data is transformed by the Transformer class
   */
  abstract write: WriteMethod<TFormattedData>
}
