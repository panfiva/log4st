import { Appender, ShutdownCb } from '../appenderClass'

import debugLib from 'debug'
const debug = debugLib('log4ts:appender:example')

export type ExampleAppenderConfig = { example: string }

export class ExampleAppender<
  TFormattedData,
  TConfigA extends Record<string, any>,
  TNameA extends string,
> extends Appender<TFormattedData, TConfigA, TNameA> {
  config: TConfigA

  constructor(name: TNameA, config: TConfigA) {
    super(name)

    this.config = config

    debug(`Creating example appender ${JSON.stringify(this.config)}`)
  }

  write = (data: TFormattedData) => {
    console.log(data)
  }

  shutdown = (cb?: ShutdownCb) => {
    // shutdown function must always execute cb on exit
    if (cb) cb()
  }
}
