import type { LevelName, LoggerArg } from './types'
import type { LoggingEvent } from './loggingEvent'

import { getEventBus } from './eventBus'

type WriteMethod<D> = (data: D) => Promise<void> | void

/**
 * class that writes logs to the destination repository
 */
export abstract class Appender<
  // data shape that appender accepts
  TFormattedData,
  // appender config parameters
  TConfigA extends Record<string, any>,
  TNameA extends string,
> {
  name: TNameA

  /** appender configurations */
  abstract config: TConfigA

  constructor(name: TNameA) {
    this.name = name
  }

  /** function executed on appender shutdown */
  shutdown: () => Promise<void> | void = () => {}

  attachToLogger = <
    TLoggerName extends string,
    TLevelName extends LevelName,
    TData extends Array<LoggerArg>,
  >(
    loggerName: TLoggerName,

    /**
     * controls what appenders will receive message sent by a logger
     *
     * this is different from Logger.level property that controls what messages are sent to appenders
     */
    levelName: TLevelName,

    /** callback function that transforms event payload to format accepted by appender  */
    transformer: (
      event: LoggingEvent<TLoggerName, TData>,
      appenderName: TNameA,
      appenderConfig: TConfigA
    ) => TFormattedData
  ): void => {
    const listener = function (
      this: Appender<TFormattedData, TConfigA, TNameA>,
      event: LoggingEvent<TLoggerName, TData>
    ) {
      const data = transformer(event, this.name, this.config)

      this.write(data)
    }.bind(this)

    getEventBus().then((eventBus) => {
      eventBus.addMessageListener({
        loggerName,
        levelName,
        listener,
      })
    })
  }

  /**
   * function that writes event data
   * At this point, data is transformed by the Transformer class
   */
  abstract write: WriteMethod<TFormattedData>
}
