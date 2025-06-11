import { getLevelRegistry } from './level'
import { createLogger } from './logger'
import type { LevelName } from './types'
import { FileAppender } from './appenders/fileAppender'

type LevelNames = LevelName | 'TEST'
type LoggerNames = 'NumberListLogger' | 'StringLogger'
type AppenderNames = 'TestFileAppender'

// Logger will accept one or more number
type NumberListLoggerData = number[]

// Logger will only accept 1 string parameter
type StringLoggerData = [string]

const levelRegistry = getLevelRegistry<LevelNames>()

levelRegistry.addLevels({
  INFO: { value: 20002, color: 'green' },
  TEST: { value: 20001, color: 'green' },
})

const testFileAppender = new FileAppender<AppenderNames>('TestFileAppender', {
  filename: './logs/test.txt',
  backups: 3,
  maxLogSize: 1024, // size in bytes
  mode: 0o644,
})

testFileAppender.attachToLogger<LoggerNames, LevelNames, NumberListLoggerData>(
  'NumberListLogger',
  'DEBUG',
  (event, appenderName, appenderConfig) => {
    return `${event.payload.level}: ${event.payload.loggerName}: ${appenderName}: ${appenderConfig.filename}: ${event.payload.data.join(', ')}`
  }
)

testFileAppender.attachToLogger<LoggerNames, LevelNames, StringLoggerData>(
  'StringLogger',
  'DEBUG',
  (event, appenderName, appenderConfig) => {
    return `${event.payload.level}: ${event.payload.loggerName}: ${appenderName}: ${appenderConfig.filename}: ${event.payload.data[0]}`
  }
)

const numberLogger = createLogger<NumberListLoggerData, LevelNames, LoggerNames>({
  loggerName: 'NumberListLogger',
  level: 'DEBUG',
  // useCallStack: true,
})

const stringLogger = createLogger<StringLoggerData, LevelNames, LoggerNames>({
  loggerName: 'StringLogger',
  level: 'DEBUG',
  // useCallStack: true,
})

numberLogger.debug(1, 2, 3)
stringLogger.test('sample string')

setTimeout(() => {}, 3600 * 1000)
