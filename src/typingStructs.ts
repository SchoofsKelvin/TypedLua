
import { FunctionParameter } from './parserStructs';

/* Typing "holder" */
export interface TypingHolder<T extends Typing = Typing> {
  typing: T;
  explicit: boolean;
}

/* Typing utility methods */

export const canCastTo = (from: Typing, to: Typing) => to.canCastFrom(from);

export function canCastTuple(from: Typing[], to: Typing[], toVararg?: TypingVararg | null): boolean {
  from = from.slice(0);
  to = to.slice(0);
  while (from.length || to.length) {
    const t = to.shift();
    const f = from.shift();
    if (!t && !toVararg) return true;
    if (t && f) {
      if (!t.canCastFrom(f)) return false;
    } else if (f && toVararg) {
      if (!toVararg.subtype.canCastFrom(f)) return false;
    } else {
      return false;
    }
  }
  return true;
}

export function unionFromTuples(tuples: Typing[][]): TypingUnion[] {
  const tuple = tuples[0] || [];
  const res: Typing[][] = [];
  tuples.forEach(tup => tup.forEach((t, i) => (res[i] || (res[i] = [])).push(t)));
  return res.map(t => new TypingUnion(t));
}

/* Typing data structures */

export abstract class Typing {
  public abstract canCastFrom(typing: Typing): boolean;
  public abstract toString(indent?: number): string;
}

export class TypingTuple extends Typing {
  constructor(public tuple: Typing[] = []) {
    super();
  }
  public canCastFrom(typing: Typing): boolean {
    if (typing instanceof TypingTuple) {
      return canCastTuple(typing.tuple, this.tuple);
    }
    const first = this.tuple[0];
    if (!first) return true;
    return first.canCastFrom(typing);
  }
  public toString(): string {
    return `(${this.tuple.join(', ')})`;
  }
}

export class TypingUnion extends Typing {
  constructor(public types: Typing[] = []) {
    super();
  }
  public canCastFrom(typing: Typing): boolean {
    return this.types.some(canCastTo.bind(null, typing), typing);
  }
  public toString(): string {
    return this.types.join(' | ');
  }
}

export class TypingIntersection extends Typing {
  constructor(public types: Typing[] = []) {
    super();
  }
  public canCastFrom(typing: Typing): boolean {
    return this.types.every(canCastTo.bind(typing), typing);
  }
  public toString(): string {
    return this.types.join(' & ');
  }
}

export class TypingInterface extends Typing {
  public fields: { [key: string]: Typing } = {};
  constructor(public name: string) {
    super();
  }
  public canCastFrom(typing: Typing): boolean {
    if (typing === ANY) return true;
    if (typing instanceof TypingInterface) {
      return Object.keys(this.fields).every((key) => {
        const field = typing.fields[key] || NIL;
        return this.fields[key].canCastFrom(field);
      });
    }
    return false;
  }
  public toString(indent = 0): string {
    const res = ['{'];
    Object.keys(this.fields).forEach((key) => {
      res.push('\n\t'.repeat(indent), this.fields[key].toString(indent + 1), ';');
    });
    res.push('}');
    return res.join('');
  }
}

export class TypingClass extends TypingInterface {
  public classFields: { [key: string]: Typing } = {};
  constructor(public name: string) {
    super(name);
  }
  public canCastFrom(typing: Typing): boolean {
    if (typing === ANY) return true;
    return typing instanceof TypingClass && typing.name === this.name;
  }
  public toString(): string {
    return this.name;
  }
}

export class TypingClassObject extends TypingInterface {
  constructor(typingClass: TypingClass) {
    super(TypingClass.name);
  }
}

export class TypingConstant extends Typing {
  constructor(public value: any) {
    super();
  }
  public canCastFrom(typing: Typing): boolean {
    if (typing === ANY) return true;
    return typing instanceof TypingConstant && typing.value === this.value;
  }
  public toString(): string {
    return typeof this.value === 'string' ? `'${this.value}'` : `${this.value}`;
  }
}

export class TypingAlias extends Typing {
  constructor(public name: string, public typing: Typing) {
    super();
  }
  public canCastFrom(typing: Typing): boolean {
    return this.typing.canCastFrom(typing);
  }
  public toString(): string {
    return this.name;
  }
}

export class TypingArray extends Typing {
  constructor(public readonly subtype: Typing) {
    super();
  }
  public canCastFrom(typing: Typing): boolean {
    if (typing === ANY) return true;
    return typing instanceof TypingArray && this.subtype.canCastFrom(typing.subtype);
  }
  public toString(): string {
    return `${this.subtype}[]`;
  }
}

export class TypingVararg extends Typing {
  constructor(public readonly subtype: Typing) {
    super();
  }
  public canCastFrom(typing: Typing): boolean {
    if (typing instanceof TypingVararg) {
      return this.subtype.canCastFrom(typing.subtype);
    }
    return this.subtype.canCastFrom(typing);
  }
  public toString(): string {
    return `${this.subtype}...`;
  }
}

export class TypingFunction extends Typing {
  public parameters: FunctionParameter[] = [];
  public vararg?: TypingVararg;
  public returnValues: TypingTuple = new TypingTuple();
  constructor(public name?: string) {
    super();
  }
  public canCastFrom(typing: Typing): boolean {
    if (typing === ANY) return true;
    if (!(typing instanceof TypingFunction)) return false;
    const argF = typing.parameters.map(p => p.typing!.typing);
    const argT = this.parameters.map(p => p.typing!.typing);
    if (!canCastTuple(argF, argT, this.vararg)) return false;
    if (!typing.returnValues.canCastFrom(this.returnValues)) return false;
    return true;
  }
  public toString(): string {
    const params = this.parameters.map(({ name, typing }, index) =>
      `${name || `arg${index}`}: ${typing ? typing.typing : 'any'}`,
    );
    if (this.vararg) params.push(`...: ${this.vararg.subtype}[]`);
    return `${this.name || ''}(${params.join(', ')}) => ${this.returnValues}`;
  }
}

/* Typing constants */

export const ANY = new (class TypingAny extends Typing {
  public canCastFrom(): boolean { return true; }
  public toString(): string { return 'any'; }
})();

export const STRING = new TypingClass('string');
export const NUMBER = new TypingClass('number');
export const BOOLEAN = new TypingClass('boolean');

export const NIL = new TypingConstant(null);
export const TRUE = new TypingConstant(true);
export const FALSE = new TypingConstant(false);
