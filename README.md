# Log4ts TypeScript Project

This project is inspired by [log4js-node](https://log4js-node.github.io/log4js-node)

Key differences:

- Migrated from JavaScript to TypeScript
- Migrated functions and global variables to classes
- Do not use configuration to configure the project - instantiate class instances instead
- Allows multiple loggers in a project

## Sample App

In this example, `numberLogger` and `logger` share logWriter `testFileLogWriter`.
Loggers define different data types that log functions will accept.

To activate message listeners, we use `<LogWriter>.attachToLogger` function.

Process listeners (`process.on`) illustrate how to handle errors.

```ts
import debugLib from 'debug'
const debug = debugLib('log4ts:app')

import { getLevelRegistry, createLogger, FileLogWriter, shutdown, LevelName } from 'log4ts'

type LevelNames = LevelName | 'TEST'
type LoggerNames = 'NumberListLogger' | 'StringLogger'
type LogWriterNames = 'TestFileLogWriter'

// Logger will accept one or more number
type NumberListLoggerData = number[]

// Logger will only accept one or more string, number or Error objects
type LoggerData = (string | number | Error)[]

const levelRegistry = getLevelRegistry<LevelNames>()

levelRegistry.addLevels({
  INFO: { value: 20002, color: 'green' },
  TEST: { value: 20001, color: 'green' },
})

const testFileLogWriter = new FileLogWriter<LogWriterNames>('TestFileLogWriter', {
  filename: './logs/test.txt',
  backups: 3,
  maxLogSize: 1024, // size in bytes
  mode: 0o644,
})

// create link Logger (event generator) - LogWriter (event writer) - Level
testFileLogWriter.attachToLogger<LoggerNames, LevelNames, NumberListLoggerData>(
  'NumberListLogger',
  'DEBUG',
  (event, logWriterName, logWriterConfig) => {
    return (
      `${event.payload.level}: ${event.payload.loggerName}: ${logWriterName}:` +
      ` ${logWriterConfig.filename}: ${event.payload.data.join(', ')}`
    )
  }
)

// create link Logger (event generator) - LogWriter (event writer) - Level
testFileLogWriter.attachToLogger<LoggerNames, LevelNames, LoggerData>(
  'StringLogger',
  'DEBUG',
  (event, logWriterName, logWriterConfig) => {
    return (
      `${event.payload.level}: ${event.payload.loggerName}: ${logWriterName}: ` +
      `${logWriterConfig.filename}: ${event.payload.data.join(' - ')}`
    )
  }
)

const numberLogger = createLogger<NumberListLoggerData, LevelNames, LoggerNames>({
  loggerName: 'NumberListLogger',
  level: 'DEBUG',
})

const logger = createLogger<LoggerData, LevelNames, LoggerNames>({
  loggerName: 'StringLogger',
  level: 'DEBUG',
})

const handleExit = (reason: 'SIGINT' | 'SIGTERM' | 'uncaughtException' | 'unhandledRejection') => {
  if (['uncaughtException', 'unhandledRejection'].includes(reason)) {
    logger.fatal(`exit signal: ${reason}`)
  } else {
    logger.info(`exit signal: ${reason}`)
  }

  shutdown(() => {
    process.exit(1)
  })
}

process.on('unhandledRejection', (reason: Error) => {
  debug('process.on.unhandledRejection')
  try {
    logger.fatal('process.on.unhandledRejection', reason)
  } catch (err) {
    console.error(reason)
  }

  handleExit('unhandledRejection')
})

process.on('SIGINT', () => handleExit('SIGINT'))

process.on('SIGTERM', () => handleExit('SIGTERM'))

process.on('uncaughtException', (err: Error, _origin: any) => {
  debug('process.on.uncaughtException')

  try {
    logger.fatal('process.on.uncaughtException', err, _origin)
  } catch (e) {
    console.error(e)
  }

  handleExit('uncaughtException')
})

numberLogger.debug(1, 2, 3)
logger.test('sample string', 1, 2, 3)

// trigger SIGINT - demo purposes only to illustrate how process.on handler work
setTimeout(() => {
  process.kill(process.pid, 'SIGINT')
}, 2 * 1000)

// keep the process running - demo purposes keep process running for 30 seconds
setTimeout(() => {}, 30 * 1000)
```

## Sample LogWriter

```ts
import { LogWriter, ShutdownCb } from 'log4ts'

import debugLib from 'debug'
const debug = debugLib('log4ts:logWriter:example')

export type ExampleLogWriterConfig = { example: string }

export class ExampleLogWriter<
  TFormattedData,
  TConfigA extends Record<string, any>,
  TNameA extends string,
> extends LogWriter<TFormattedData, TConfigA, TNameA> {
  config: TConfigA

  constructor(name: TNameA, config: TConfigA) {
    super(name)

    this.config = config

    debug(`Creating example logWriter ${JSON.stringify(this.config)}`)
  }

  write = (data: TFormattedData) => {
    console.log(data)
  }

  shutdown = (cb?: ShutdownCb) => {
    // shutdown function must always execute cb on exit
    if (cb) cb()
  }
}
```

## Contributing

Contributions are welcome! Please feel free to submit a pull request
or open an issue for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.
