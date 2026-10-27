import type { ForbiddenPair, Person, PersonId } from '../types';

export type CanPair = (a: Person, b: Person) => boolean;

function pairKey(a: PersonId, b: PersonId): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function isSamePair([a, b]: ForbiddenPair, x: PersonId, y: PersonId): boolean {
  return pairKey(a, b) === pairKey(x, y);
}

/** Nobody dances with themselves, nor with someone they are forbidden to dance with. */
export function makeCanPair(forbidden: ForbiddenPair[]): CanPair {
  const keys = new Set(forbidden.map(([a, b]) => pairKey(a, b)));
  return (a, b) => a.id !== b.id && !keys.has(pairKey(a.id, b.id));
}
