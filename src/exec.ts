import { Context } from './context';
import { Node } from './node';
import { MacroCode, RootCode } from './instructions';
import { Opcode } from './opcodes';
import { Variable } from './variable';

/**
 * Execute an instruction against the current context, capturing the output
 * and returning it. If privateContext is true variable resolution will be
 * blocked at the current stack frame.
 */
export const executeTemplate = (ctx: Context, inst: RootCode | MacroCode, node: Node, privateContext: boolean,
    argvar?: Variable) => {
  const buf = ctx.swapBuffer();
  ctx.pushNode(node);
  ctx.stopResolution(privateContext);

  // Arguments from the 'apply' formatter
  if (argvar) {
    ctx.setVar('@args', argvar);
  }

  switch (inst[0]) {
    case Opcode.ROOT:
      // Partials will be a full parsed template including a ROOT instruction.
      ctx.engine!.execute(inst as RootCode, ctx);
      break;

    case Opcode.MACRO:
      // Macros are named inline code blocks.
      ctx.engine!.executeBlock((inst as MacroCode)[2], ctx);
      break;
  }
  const text = ctx.render();

  ctx.pop();
  ctx.restoreBuffer(buf);
  return text;
};
