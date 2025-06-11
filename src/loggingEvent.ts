import flatted from 'flatted'
import type { LevelParam, LevelName, CallStack, LoggerArg } from './types'
import { getLevelRegistry } from './levelRegistry'
import type { Level } from 'level'

import { pick, omitBy } from 'lodash'

const deserialise = {
  '__LOG4JS_undefined__': undefined,
  '__LOG4JS_NaN__': Number('abc'),
  '__LOG4JS_Infinity__': 1 / 0,
  '__LOG4JS_-Infinity__': -1 / 0,
}

type TdeMap = typeof deserialise

class SerDe {
  deMap: TdeMap = deserialise
  serMap: Map<any, any>

  constructor() {
    this.deMap = deserialise
    this.serMap = new Map<any, any>()
    Object.keys(this.deMap).forEach((key) => {
      const value = this.deMap[key as keyof TdeMap]
      this.serMap.set(value, key)
    })
  }

  canSerialise(key: any) {
    if (typeof key === 'string') return false
    try {
      return this.serMap.has(key)
    } catch (e) {
      return false
    }
  }

  serialise(key: any) {
    if (this.canSerialise(key)) return this.serMap.get(key)
    return key
  }

  canDeserialise(key: any) {
    return key in this.deMap
  }

  deserialise(key: any) {
    if (this.canDeserialise(key)) return this.deMap[key as keyof TdeMap]
    return key
  }
}
const serde = new SerDe()

type LoggingEventProps<T extends LevelName, TData extends Array<LoggerArg>> = {
  loggerName: string
  level: LevelParam<T>
  /** objects to log */
  data: TData
  error?: Error
  context?: Record<string, any>
  /** node process pid (`process.pid`) */
  pid: number
  location?: CallStack
  cluster?: {
    /** cluster.worker.id */
    workerId: number
    /** process.pid */
    worker: number
  }
}

export class LoggingEvent<TLevelName extends LevelName, TData extends Array<LoggerArg>> {
  payload: Omit<LoggingEventProps<TLevelName, TData>, 'level'> & {
    startTime: Date
    level: Level<TLevelName>
  } = {} as any

  constructor(param: Omit<LoggingEventProps<TLevelName, TData>, 'pid'>) {
    const { loggerName, level, data, context, location, error, cluster } = param

    let locationVal: CallStack | undefined = undefined

    if (location !== undefined) {
      if (!location || typeof location !== 'object' || Array.isArray(location))
        throw new TypeError('Invalid location type passed to LoggingEvent constructor')

      const keys = LoggingEvent.getLocationKeys()
      locationVal = omitBy(pick(location, keys), (v) => v === undefined)
    }

    const levelRegistry = getLevelRegistry<TLevelName>()

    // level should always be here if we use types properly
    const levelInstance = levelRegistry.getLevel(level)!

    this.payload = {
      startTime: new Date(),
      loggerName: loggerName,
      data: data,
      level: levelInstance,
      context: { ...context },
      pid: process.pid,
      /**
       * error object that is used to extract stack trace
       */
      error: error,
      location: locationVal,
    }
  }

  private static getLocationKeys() {
    const locationKeys: Array<keyof CallStack> = [
      'callStack',
      'callerName',
      'className',
      'columnNumber',
      'fileName',
      'functionAlias',
      'functionName',
      'lineNumber',
    ]
    return locationKeys
  }

  serialise() {
    return flatted.stringify(this, (_key, value) => {
      // JSON.stringify(new Error('test')) returns {}, which is not really useful for us.
      // The following allows us to serialize errors (semi) correctly.

      const v =
        value instanceof Error
          ? Object.assign({ message: value.message, stack: value.stack }, value)
          : value

      // JSON.stringify({a: Number('abc'), b: 1/0, c: -1/0}) returns {a: null, b: null, c: null}.
      // The following allows us to serialize to NaN, Infinity and -Infinity correctly.
      // JSON.stringify([undefined]) returns [null].
      // The following allows us to serialize to undefined correctly.
      return serde.serialise(v)
    })
  }

  static deserialise(serialised: any) {
    let event: LoggingEvent<any, any>
    try {
      const rehydratedEvent = flatted.parse(serialised, (key, value) => {
        if (value && value.message && value.stack) {
          const fakeError = new Error(value)
          Object.keys(value).forEach((k) => {
            fakeError[k as keyof Error] = value[k]
          })
          return serde.deserialise(value)
        }
        return serde.deserialise(value)
      })
      LoggingEvent.getLocationKeys().forEach((key) => {
        if (typeof rehydratedEvent[key] !== 'undefined') {
          if (!rehydratedEvent.location) rehydratedEvent.location = {}
          rehydratedEvent.location[key] = rehydratedEvent[key]
        }
      })

      event = new LoggingEvent({
        loggerName: rehydratedEvent.loggerName,
        // level: this.levels.getLevel(rehydratedEvent.level.levelStr, levels.getLevel('WARN')!),
        level: rehydratedEvent.level.levelStr,
        data: rehydratedEvent.data,
        context: rehydratedEvent.context,
        location: rehydratedEvent.location,
        error: rehydratedEvent.error,
      })

      event.payload.startTime = new Date(rehydratedEvent.startTime)
      event.payload.pid = rehydratedEvent.pid
      if (rehydratedEvent.cluster) {
        event.payload.cluster = rehydratedEvent.cluster
      }
    } catch (e) {
      event = new LoggingEvent({
        loggerName: 'log4ts',
        level: 'ERROR',
        data: ['Unable to parse log:', serialised, 'because: ', e],
      })
    }

    return event
  }
}
