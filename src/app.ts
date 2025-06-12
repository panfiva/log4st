// process.env.DEBUG = 'log4ts:logger,log4ts:clustering, log4ts:app'

import debugLib from 'debug'
const debug = debugLib('log4ts:app')

import { getLevelRegistry, createLogger, FileAppender, shutdown } from './'
import type { LevelName } from './types'

type LevelNames = LevelName | 'TEST'
type LoggerNames = 'NumberListLogger' | 'StringLogger'
type AppenderNames = 'TestFileAppender'

// Logger will accept one or more number
type NumberListLoggerData = number[]

// Logger will only accept one or more string, number or Error objects
type LoggerData = (string | number | Error)[]

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

// create link Logger (event generator) - Appender (event writer) - Level
testFileAppender.attachToLogger<LoggerNames, LevelNames, NumberListLoggerData>(
  'NumberListLogger',
  'DEBUG',
  (event, appenderName, appenderConfig) => {
    return `${event.payload.level}: ${event.payload.loggerName}: ${appenderName}: ${appenderConfig.filename}: ${event.payload.data.join(', ')}`
  }
)

// create link Logger (event generator) - Appender (event writer) - Level
testFileAppender.attachToLogger<LoggerNames, LevelNames, LoggerData>(
  'StringLogger',
  'DEBUG',
  (event, appenderName, appenderConfig) => {
    return `${event.payload.level}: ${event.payload.loggerName}: ${appenderName}: ${appenderConfig.filename}: ${event.payload.data.join(' - ')}`
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

// trigger SIGINT
setTimeout(() => {
  process.kill(process.pid, 'SIGINT')
}, 2 * 1000)

// keep the process running
setTimeout(() => {}, 30 * 1000)
