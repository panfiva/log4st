import { Level } from './level'
import type { LevelName, LevelParam, LevelConstructorProps } from './types'

export class LevelRegistry<T extends LevelName = LevelName> {
  levelsDict: Record<T, Level<T>> = {} as any // constructor will
  levelsArray: Array<Level<T>> = []

  constructor(
    /** additional levels to add; can also be used to override standard level configurations */
    props?: Partial<LevelConstructorProps<T>>
  ) {
    const standardLevels: LevelConstructorProps<LevelName> = {
      ALL: { value: Number.MIN_VALUE, color: 'grey' },
      TRACE: { value: 5000, color: 'blue' },
      DEBUG: { value: 10000, color: 'cyan' },
      INFO: { value: 20000, color: 'green' },
      WARN: { value: 30000, color: 'yellow' },
      ERROR: { value: 40000, color: 'red' },
      FATAL: { value: 50000, color: 'magenta' },
      MARK: { value: 9007199254740992, color: 'grey' },
      OFF: { value: Number.MAX_VALUE, color: 'grey' },
    }

    this.addLevels(standardLevels as LevelConstructorProps<T>)

    if (props) this.addLevels(props)
  }

  /**
   * converts given String or Level class instance or Level class props to corresponding Level class
   */
  getLevel(level: LevelParam<T>, defaultLevel: Level<T>): Level<T>
  getLevel(level: LevelParam<T>, defaultLevel?: undefined): Level<T> | undefined
  getLevel(level: LevelParam<T>, defaultLevel?: Level<T>): Level<T> | undefined {
    if (!level) {
      return defaultLevel
    }

    if (level instanceof Level) {
      return level as Level<T>
    }

    // a json-serialised level won't be an instance of Level
    if (level instanceof Object) {
      const levelName = level.levelName.toUpperCase() as T

      return this.levelsDict[levelName] ?? defaultLevel
    }

    return this.levelsDict[level] ?? defaultLevel
  }

  addLevels(levelsParam: Partial<LevelConstructorProps<T>>) {
    if (levelsParam) {
      const levelNames = Object.keys(levelsParam) as T[]

      levelNames.forEach((levelKey) => {
        const levelName = levelKey.toUpperCase() as T
        const levelConfig = levelsParam[levelKey]!

        const level = new Level<T>(levelConfig.value, levelName, levelConfig.color, this)

        this.levelsDict[levelName] = level
        const existingLevelIndex = this.levelsArray.findIndex((lvl) => lvl.levelName === levelName)

        if (existingLevelIndex > -1) {
          this.levelsArray[existingLevelIndex] = level
        } else {
          this.levelsArray.push(level)
        }
      })
      this.levelsArray.sort((a, b) => a.level - b.level)
    }
  }
}
