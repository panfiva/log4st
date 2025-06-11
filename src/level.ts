import type { LevelName, ValidColors, LevelParam } from './types'
import type { LevelRegistry } from './levelRegistry'

export class Level<T extends LevelName = LevelName> {
  level: number
  levelName: T
  color: ValidColors
  parent: LevelRegistry<T>

  constructor(level: number, levelName: T, color: ValidColors, parent: LevelRegistry<T>) {
    this.level = level
    this.levelName = levelName
    this.color = color
    this.parent = parent
  }

  toString() {
    return this.levelName
  }

  isLessThanOrEqualTo(otherLevelParam: LevelParam<T>): boolean {
    const otherLevel = this.parent.getLevel(otherLevelParam)
    if (!otherLevel) throw Error('Other level not found')

    return this.level <= otherLevel.level
  }

  isGreaterThanOrEqualTo(otherLevelParam: LevelParam<T>) {
    const otherLevel = this.parent.getLevel(otherLevelParam)
    if (!otherLevel) throw Error('Other level not found')

    return this.level >= otherLevel.level
  }

  isEqualTo(otherLevelParam: LevelParam<T>) {
    const otherLevel = this.parent.getLevel(otherLevelParam)
    if (!otherLevel) throw Error('Other level not found')

    return this.level === otherLevel.level
  }
}
