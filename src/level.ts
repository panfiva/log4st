import type { LevelName, ValidColors, LevelParam } from './types'
import { getLevelRegistry } from './levelRegistry'

export class Level<TLevelName extends LevelName = LevelName> {
  level: number
  levelName: TLevelName
  color: ValidColors

  constructor(level: number, levelName: TLevelName, color: ValidColors) {
    this.level = level
    this.levelName = levelName
    this.color = color
  }

  toString() {
    return this.levelName
  }

  isLessThanOrEqualTo(otherLevelParam: LevelParam<TLevelName>): boolean {
    const levelRegistry = getLevelRegistry<TLevelName>()
    const otherLevel = levelRegistry.getLevel(otherLevelParam)
    if (!otherLevel) throw Error('Other level not found')

    return this.level <= otherLevel.level
  }

  isGreaterThanOrEqualTo(otherLevelParam: LevelParam<TLevelName>) {
    const levelRegistry = getLevelRegistry<TLevelName>()
    const otherLevel = levelRegistry.getLevel(otherLevelParam)
    if (!otherLevel) throw Error('Other level not found')

    return this.level >= otherLevel.level
  }

  isEqualTo(otherLevelParam: LevelParam<TLevelName>) {
    const levelRegistry = getLevelRegistry<TLevelName>()
    const otherLevel = levelRegistry.getLevel(otherLevelParam)
    if (!otherLevel) throw Error('Other level not found')

    return this.level === otherLevel.level
  }
}
