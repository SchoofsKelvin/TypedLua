
/* Typing "holder" */
export interface TypingHolder {
  typing: Typing;
  explicit: boolean;
}

/* Typing data structures */
export abstract class Typing {
  public abstract canCastFrom(typing: Typing): boolean;
  public abstract toString(indent?: number): string;
}

const canCastTo = (from: Typing, to: Typing) => to.canCastFrom(from);

export class TypingUnion extends Typing {
  constructor(public types: Typing[] = []) {
    super();
  }
  public canCastFrom(typing: Typing): boolean {
    return this.types.some(canCastTo.bind(typing), typing);
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
  public fields: { [key: string]: Typing} = {};
  constructor(public name: string) {
    super();
  }
  public canCastFrom(typing: Typing): boolean {
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
  public classFields: { [key: string]: Typing} = {};
  constructor(public name: string) {
    super(name);
  }
}

export class TypingClassObject extends TypingInterface {
  constructor(typingClass: TypingClass) {
    super(TypingClass.name);
  }
}

export class TypingConstant {
  constructor(public value: any) {
    // super(typeof value);
  }
  public canCastFrom(typing: Typing): boolean {
    return typing === this;
  }
  public toString(): string {
    return `${this.value}`;
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

/* Typing constants */

export const STRING = new TypingClass('string');
export const NUMBER = new TypingClass('number');
export const BOOLEAN = new TypingClass('boolean');

export const NIL = new TypingConstant(null);
export const TRUE = new TypingConstant(true);
export const FALSE = new TypingConstant(false);
