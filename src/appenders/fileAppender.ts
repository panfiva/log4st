import { Appender } from '../appenderClass'

import { RollingFileWriteStream } from '../rollingFileStream/RollingFileWriteStream'
import * as path from 'path'
import * as os from 'os'

import debugLib from 'debug'
const debug = debugLib('log4ts:file')

const eol = os.EOL

let mainSighupListenerStarted = false
const sighupListeners = new Set<FileAppender<any>>()

function mainSighupHandler() {
  sighupListeners.forEach((app) => {
    app.sighupHandler()
  })
}

export type FileAppenderConfig = {
  filename: string
  maxLogSize?: number
  backups?: number
  mode?: number
  encoding?: BufferEncoding
}

/** data accepted by appender */
type FileAppenderData = string

export class FileAppender<TNameA extends string> extends Appender<
  FileAppenderData,
  FileAppenderConfig,
  TNameA
> {
  config: Required<FileAppenderConfig>
  private writer: RollingFileWriteStream

  constructor(name: TNameA, config: FileAppenderConfig) {
    super(name)

    if (typeof config.filename !== 'string' || config.filename.length === 0) {
      throw new Error(`Invalid filename: ${config.filename}`)
    } else if (config.filename.endsWith(path.sep)) {
      throw new Error(`Filename is a directory: ${config.filename}`)
    }

    const filename =
      config.filename.indexOf(`~${path.sep}`) === 0
        ? config.filename.replace('~', os.homedir())
        : config.filename

    this.config = {
      backups: config.backups ?? 5,
      filename: path.normalize(filename),
      mode: config.mode || 0o600,
      maxLogSize: config.maxLogSize ?? 1 * 1024 * 1024,
      encoding: config.encoding ?? 'utf-8',
    }

    debug(`Creating file appender ${JSON.stringify(this.config)}`)

    this.writer = this.openStream()

    sighupListeners.add(this)
    if (!mainSighupListenerStarted) {
      process.on('SIGHUP', mainSighupHandler)
      mainSighupListenerStarted = true
    }
  }

  private openStream() {
    // const stream = new streams.RollingFileStream(filePath, fileSize, numFiles, opt)
    const stream = new RollingFileWriteStream(this.config.filename, {
      maxSize: this.config.maxLogSize,
      backups: this.config.backups,
      encoding: this.config.encoding,
      mode: this.config.mode,
    })

    stream.on('error', (err: Error) => {
      console.error(
        'log4js.fileAppender - Writing to file %s, error happened ',
        this.config.filename,
        err
      )
    })

    stream.on('drain', () => {
      // process.emit('log4js:pause', false)
      console.log('zzz-drain')
    })

    return stream
  }

  write = (data: FileAppenderData) => {
    if (!this.writer.writable) {
      return
    }
    // if (this.config.removeColor === true) {
    //
    //   const regex = /\x1b[[0-9;]*m/g
    //   loggingEvent.data = loggingEvent.data.map((d: any) => {
    //     if (typeof d === 'string') return d.replace(regex, '')
    //     return d
    //   })
    // }
    // if (!this.writer.write(this.layout(loggingEvent, this.config.timezoneOffset) + eol, 'utf8')) {
    //   process.emit('log4js:pause', true)
    // }

    this.writer.write(data + eol, 'utf8')
  }

  reopen() {
    this.writer.end(() => {
      this.writer = this.openStream()
    })
  }

  sighupHandler() {
    debug('SIGHUP handler called.')
    this.reopen()
  }

  shutdown = () => {
    sighupListeners.delete(this)
    if (sighupListeners.size === 0 && mainSighupListenerStarted) {
      process.removeListener('SIGHUP', mainSighupHandler)
      mainSighupListenerStarted = false
    }
    this.writer.end('', 'utf-8')
  }
}
