
import { FunctionParameter, FunctionParameterName } from './parserStructs';

/* Typing "holder" */
export interface TypingHolder<T extends Typing = Typing> {
  typing: T;
  explicit: boolean;
}

/* Typing utility methods */

// export const canCastTo = (from: Typing, to: Typing) => to.canCastFrom(from);
export function canCastTo(from: Typing, to: Typing) {
  if (from === to) return true;
  if (from instanceof TypingUnion) {
    return from.types.every(t => to.canCastFrom(t));
  } else if (from instanceof TypingIntersection) {
    return from.types.every(t => to.canCastFrom(t));
  }
  return to.canCastFrom(from);
}

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

/**
 * Collapses the array of Typings:
 * - TypingVararg at the end is kept
 * - TypingVararg in the middle is changed into its subtype
 * - TypingTuple at the end is "expanded"
 * - TypingTuple in the middle is changed into its first typing (or nil typing)
 * - Repeat this progress until the last element isn't a TypingTuple anymore
 * 
 * No elements in the resulting array are TypingTuple, and only the last element can be a TypingVararg
 */
export function collapseTuples(typings: Typing[]): Typing[] {
  let res = typings.slice(0, typings.length - 1);
  const last = typings[typings.length - 1];
  res = res.map(collapseTyping);
  if (!(last instanceof TypingTuple)) {
    res.push(collapseTyping(last));
    return res;
  }
  return collapseTuples([...res, ...last.tuple]);
}

/**
 * Collapses the Typing:
 * - TypingVararg is converted to its subtype
 * - TypingTuple is converted to its first type, or the nil typing for an empty tuple
 * - TypingAlias is converted to its first type
 * - TypingUnion/TypingIntersection is converted to the first type if it only consists of one
 * - Repeat this progress until it can't be converted further
 */
export function collapseTyping(typing: Typing): Typing {
  if (typing instanceof TypingTuple) {
    return collapseTyping(typing.tuple[0] || NIL);
  } else if (typing instanceof TypingVararg) {
    return collapseTyping(typing.subtype);
  } else if (typing instanceof TypingUnion || typing instanceof TypingIntersection) {
    return typing.types.length === 1 ? collapseTyping(typing.types[0]) : typing;
  }
  return typing;
}

/** Helper function (user-defined type guard) for .filter */
function isTyping(t: any): t is Typing {
  return t instanceof Typing;
}

/* Typing data structures */

export abstract class Typing {
  public abstract canCastFrom(typing: Typing): boolean;
  public abstract toString(indent?: number): string;
  public getField(index: Typing): Typing | null {
    return null;
  }
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
  public getField(index: Typing) {
    const first = this.tuple[0];
    return first ? first.getField(index) : null;
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
  public getField(index: Typing) {
    const fields = this.types.map(t => t.getField(index)).filter(isTyping);
    return fields.length ? new TypingUnion(fields) : null;
  }
}

export class TypingIntersection extends Typing {
  constructor(public types: Typing[] = []) {
    super();
  }
  public canCastFrom(typing: Typing): boolean {
    return this.types.every(canCastTo.bind(null, typing), typing);
  }
  public toString(): string {
    return this.types.join(' & ');
  }
  public getField(index: Typing) {
    const fields = this.types.map(t => t.getField(index)).filter(isTyping);
    return fields.length ? new TypingIntersection(fields) : null;
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
  public getField(index: Typing): Typing | null {
    index = collapseTyping(index);
    if (index instanceof TypingConstant && typeof index.value === 'string') {
      return this.fields[index.value];
    } else if (index instanceof TypingClass && index.name === 'string') {
      const fields = Object.values(this.fields);
      return fields.length ? new TypingUnion(fields) : null;
    } else if (index instanceof TypingUnion) {
      const fields = index.types.map(this.getField, this).filter(isTyping);
      return fields.length ? new TypingUnion(fields) : null;
    } else if (index instanceof TypingIntersection) {
      const fields = index.types.map(this.getField, this).filter(isTyping);
      return fields.length ? new TypingIntersection(fields) : null;
    }
    return null;
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
  constructor(public typingClass: TypingClass) {
    super(TypingClass.name);
    this.fields = typingClass.classFields;
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
    if (this.value === null) return 'nil';
    return typeof this.value === 'string' ? `'${this.value}'` : `${this.value}`;
  }
  // TODO: Add fields for string library (getField)
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
  public getField(index: Typing) {
    return this.typing.getField(index);
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
  public getField(index: Typing) {
    if (index instanceof TypingConstant && typeof index === 'number') {
      return this.subtype.getField(index);
    } else if (index instanceof TypingClass && index.name === 'number') {
      return this.subtype.getField(index);
    }
    return null;
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
  public getField(index: Typing) {
    if (index instanceof TypingConstant && typeof index === 'number') {
      return this.subtype.getField(index);
    } else if (index instanceof TypingClass && index.name === 'number') {
      return this.subtype.getField(index);
    }
    return null;
  }
}

export class TypingFunction extends Typing {
  public parameters: FunctionParameterName[] = [];
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
    if (!this.returnValues.canCastFrom(typing.returnValues)) return false;
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
