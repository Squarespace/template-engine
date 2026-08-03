import { CLDR } from '@phensley/cldr-core';

import { Assembler } from './assembler';
import { CompatLevel } from './compat/compat-level';
import { Patch } from './compat/patch';
import { Context, Partials } from './context';
import { Engine, EngineProps } from './engine';
import { TemplateError } from './errors';
import { Opcode } from './opcodes';
import { Parser } from './parser';
import { Code } from './instructions';
import { Formatters, Predicates } from './plugins';
import { Matcher, MatcherImpl } from './matcher';
import { ExprOptions } from './math';

const EMPTY_CODE: Code = [Opcode.ROOT, 1, [], Opcode.EOF];

/**
 * Max entries in the cross-context partial cache. Bounded to avoid unbounded
 * memory growth; when full the whole cache is cleared (simple policy).
 */
const MAX_PARTIAL_CACHE = 1024;

export interface CompilerProps extends EngineProps {}

export type InjectsMap = { [path: string]: any };

export interface ExecuteProps {
  code: string | Code;
  json?: any;
  partials?: Partials;
  injects?: InjectsMap;
  cldr?: CLDR;
  now?: number;
  enableExpr?: boolean;
  exprOpts?: ExprOptions;
  enableInclude?: boolean;
  maxPartialDepth?: number;

  /**
   * Compatibility level for this execution. Defaults to the released level
   * 0 surface.
   */
  compat?: CompatLevel;

  /**
   * Position on the compat ladder, applied on top of `compat`.
   */
  compatLevel?: number;

  /**
   * Force a patch's legacy behavior on, applied on top of `compat` and
   * `compatLevel`.
   */
  compatPatch?: Patch;
}

export interface ParseResult {
  code: Code;
  errors: TemplateError[];
}

export interface ExecuteResult {
  ctx: Context;
  errors: TemplateError[];
}

const DefaultExecuteProps = {
  code: EMPTY_CODE,
  json: {},
  partials: {},
  injects: {},
};

/**
 * High level interface for parsing and executing templates.
 */
export class Compiler {
  private engine: Engine;

  // Reuse single instance of Matcher across multiple parses, avoids
  // having to construct regexps on each parse.
  private matcher: Matcher;

  /**
   * Cross-context cache of compiled partials, keyed by raw source text.
   * Never the source of truth: a context still compiles on a miss and keeps
   * its own per-run map; this cache just skips a redundant recompile.
   *
   * Keyed by source alone, where Java keys by name plus source hash plus
   * compile flags. TS parses partials with no flags and the name never
   * reaches the parser, so the same source always yields the same tree under
   * any name.
   *
   * Shared instruction arrays are plain data. The only execution-time
   * mutation is the EVAL instruction's parsed-expression memo, which is
   * deterministic per source and re-parses when a context's expression
   * options differ.
   *
   * The key omits the compat level because on-the-fly partials always
   * compile at the default level. If that changes, the level must join the
   * key or a level mismatch will serve a stale compile.
   */
  private partialCache = new Map<string, ParseResult>();

  constructor(private props: CompilerProps = { formatters: Formatters, predicates: Predicates }) {
    this.engine = new Engine(props);
    this.matcher = new MatcherImpl('');
  }

  /**
   * Parse the template and return the instruction tree. The compat level
   * carries into the parse for the gated behaviors that are decided while
   * parsing; nothing reads it yet.
   */
  parse(source: string, compat?: CompatLevel): ParseResult {
    const level = compat || CompatLevel.defaultLevel();
    const { formatters, predicates } = this.props;
    const assembler = new Assembler();
    const parser = new Parser(source, assembler, this.matcher, formatters, predicates, level);
    parser.parse();
    return {
      code: assembler.code(),
      errors: assembler.errors,
    };
  }

  /**
   * Parse a raw partial on demand. Partials always compile at the default
   * level (see the cache key note), which keeps the shared cache level-free.
   * Reuses a previous compile of the same source: on a hit the cached tree
   * is returned as-is, and on a miss only error-free compiles are stored, so
   * a broken partial is re-parsed and its errors re-reported on every
   * execution.
   */
  private parsePartial(source: string): ParseResult {
    const cached = this.partialCache.get(source);
    if (cached !== undefined) {
      return cached;
    }
    const res = this.parse(source, CompatLevel.defaultLevel());
    if (res.errors.length === 0) {
      if (this.partialCache.size >= MAX_PARTIAL_CACHE) {
        this.partialCache.clear();
      }
      this.partialCache.set(source, res);
    }
    return res;
  }

  /**
   * Execute a template against the given node.
   */
  execute(props: ExecuteProps = DefaultExecuteProps): ExecuteResult {
    let code: string | Code = props.code;
    const {
      cldr,
      now,
      json,
      partials,
      injects,
      enableExpr,
      exprOpts,
      enableInclude,
      maxPartialDepth,
      compat,
      compatLevel,
      compatPatch
    } = props;
    let errors: TemplateError[] = [];

    // Effective level for this execution: the base level (or the default),
    // then any numeric position, then any forced legacy patches. A level
    // change never drops an override, so the order above is stable.
    let level = compat || CompatLevel.defaultLevel();
    if (compatLevel !== undefined) {
      level = level.withLevel(compatLevel);
    }
    if (compatPatch !== undefined) {
      level = level.withPatch(compatPatch);
    }

    if (typeof code === 'string') {
      ({ code, errors } = this.parse(code, level));
    }

    const ctx = new Context(json, {
      cldr,
      now,
      partials,
      injects,
      enableExpr,
      exprOpts,
      enableInclude,
      maxPartialDepth,
      compat: level
    });

    // On-the-fly partials always compile at the default level, matching Java
    // Compiler.compile(source, safe, preprocess); this keeps the partial
    // cache level-independent. parsePartial reuses a cross-context compile
    // of the same source when one exists.
    ctx.parsefunc = (raw: string) => this.parsePartial(raw);
    this.engine.execute(code, ctx);

    errors.splice(errors.length, 0, ...ctx.errors);

    return { ctx, errors };
  }
}
