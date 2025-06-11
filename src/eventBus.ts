import debugLib from 'debug'
const debug = debugLib('log4ts:clustering')

import { Worker, Cluster } from 'cluster'
import type { LoggingEvent } from './loggingEvent'
import type { LevelName } from './types'

let _cluster: Cluster | false | undefined = undefined
let _eventBus: EventBus | undefined = undefined

export type EventListenerConfig<TLoggerName extends string, TLevelName extends LevelName> = {
  loggerName: TLoggerName
  levelName: TLevelName
  listener: (event: LoggingEvent<any, any>) => void
}

let _promise: Promise<EventBus> | undefined

export async function getEventBus(): Promise<EventBus> {
  if (_promise) {
    return _promise
  }

  const fn = async (): Promise<EventBus> => {
    if (_eventBus) return _eventBus

    if (_cluster) {
      _eventBus = new EventBus()
      return _eventBus
    }

    // at this point, we know that cluster is not available (e.g. web environment)
    if (_cluster === false) {
      _eventBus = new EventBus()
      return _eventBus
    }

    try {
      _cluster = (await import('cluster')).default
    } catch (e) {
      _cluster = false
      debug('cluster module not present')
    }

    return new EventBus()
  }

  _promise = fn()

  return await _promise
}

class EventBus {
  private listeners: EventListenerConfig<any, any>[] = []

  cluster: Cluster | false

  /**  indicates if clustering is disabled or enabled */
  private disabled: boolean = false

  constructor() {
    // at this point, _cluster is populated with EventBus or false
    if (_cluster) {
      this.cluster = _cluster
      if (this.cluster) {
        this.cluster.off('message', this.receiver)
      }

      // if no cluster, do not configure listeners on cluster
      if (!this.cluster) {
        debug('Not listening for cluster messages, because clustering disabled.')
      } else if (this.cluster.isPrimary) {
        this.cluster.on('message', this.receiver)
      } else {
        debug('only primary cluster can subscribe to messages')
      }
    } else {
      this.disabled = true
      this.cluster = false
    }
  }

  /**
   * returns true if this process is primary:
   * - if `cluster` is used and `cluster` is primary; OR
   * - clustering is not used (`process` is used instead)
   */
  isMaster() {
    return (this.cluster && this.cluster.isPrimary) || !this.cluster
  }

  private sendToLlisteners = (logEvent: LoggingEvent<any, any>) => {
    const listeners = this.listeners.filter((v) => v.loggerName === logEvent.payload.loggerName)

    listeners.forEach((conf) => conf.listener(logEvent))
  }

  // will be used in multiprocess environment with workers
  private receiver = (worker: Worker, message: string) => {
    debug('cluster message received from worker ', worker, ': ', message)
    // if (worker.topic && worker.data) {
    //   message = worker
    //   worker = undefined
    // }
    // if (message && message.topic === 'log4ts:message') {
    //   const logEvent = LoggingEvent.deserialise(message.data)
    //   this.sendToLlisteners(logEvent)
    // }
  }

  public send(msg: LoggingEvent<any, any>) {
    if (this.isMaster()) {
      this.sendToLlisteners(msg)
    }
    // if workers are used in multiprocess environment
    else {
      // msg.payload.cluster = {
      //     workerId: cluster.worker.id,
      //     worker: process.pid,
      //   };
      process.send?.({ topic: 'log4ts:message', data: msg.serialise() })
    }
  }

  /** adds message listener */
  public addMessageListener(conf: EventListenerConfig<any, any>) {
    this.listeners.push(conf)
    return
  }
}
