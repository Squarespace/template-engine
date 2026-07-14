import { Patch } from './patch';

/**
 * The compatibility level for one compile. Level 0 keeps every legacy
 * behavior active, the released surface. At level N every patch with a
 * threshold at or below N is fixed, and the highest level is the fully fixed
 * compiler.
 *
 * Per-site overrides force a legacy behavior on regardless of level, for the
 * rare site a plain level cannot express.
 */
export class CompatLevel {
  private readonly _level: number;
  private readonly _overrides: Set<Patch>;

  /**
   * The fully fixed compiler. Every fix applies and no legacy behavior is
   * active.
   */
  static fixed(): CompatLevel {
    return new CompatLevel(Patch.maxThreshold(), new Set());
  }

  /**
   * The default level. Every legacy behavior is active, which preserves the
   * released behavior for sites that have not migrated.
   */
  static defaultLevel(): CompatLevel {
    return new CompatLevel(0, new Set());
  }

  /**
   * A specific position on the ladder.
   */
  static at(level: number): CompatLevel {
    if (level < 0) {
      throw new Error(`compat level must be >= 0, got ${level}`);
    }
    return new CompatLevel(level, new Set());
  }

  private constructor(level: number, overrides: Set<Patch>) {
    this._level = level;
    this._overrides = overrides;
  }

  /**
   * True when the legacy behavior for the patch is active at this level,
   * either because the level sits below the patch threshold or because an
   * override forces it on.
   */
  enabled(patch: Patch): boolean {
    return this._overrides.has(patch) || this._level < patch.threshold;
  }

  /**
   * The level value. 0 keeps every legacy behavior active.
   */
  level(): number {
    return this._level;
  }

  /**
   * The patches whose legacy behavior is forced on regardless of level.
   */
  overrides(): Set<Patch> {
    return new Set(this._overrides);
  }

  /**
   * A copy with the patch's legacy behavior forced on.
   */
  withPatch(patch: Patch): CompatLevel {
    const copy = new Set(this._overrides);
    copy.add(patch);
    return new CompatLevel(this._level, copy);
  }

  /**
   * A copy at a different ladder position. The override set carries over, so
   * a level change never drops a per-site override.
   */
  withLevel(level: number): CompatLevel {
    if (level < 0) {
      throw new Error(`compat level must be >= 0, got ${level}`);
    }
    return new CompatLevel(level, this._overrides);
  }

  /**
   * True when the other level has the same position and the same override
   * set.
   */
  equals(other: CompatLevel): boolean {
    if (this === other) {
      return true;
    }
    if (this._level !== other._level || this._overrides.size !== other._overrides.size) {
      return false;
    }
    let equal = true;
    this._overrides.forEach(patch => {
      if (!other._overrides.has(patch)) {
        equal = false;
      }
    });
    return equal;
  }

  /**
   * Debug rendering of the level and its overrides.
   */
  toString(): string {
    const names = Array.from(this._overrides)
      .map(p => p.name)
      .join(',');
    return `CompatLevel(level=${this._level}, overrides=[${names}])`;
  }
}
