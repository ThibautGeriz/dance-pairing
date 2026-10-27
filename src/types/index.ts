export type Role = 'leader' | 'follower';

export const ROLES: Role[] = ['leader', 'follower'];

/** One or two unique roles */
export type Roles = [Role] | [Role, Role];

declare const personIdBrand: unique symbol;

/** Branded so a plain string (room id, raw form value…) can't be used as a person id */
export type PersonId = string & { readonly [personIdBrand]: true };

export interface Person {
  id: PersonId;
  name: string;
  /** A person with both roles may lead or follow, but never dances with themselves */
  roles: Roles;
  level: string;
}

export interface Pair {
  leader: Person;
  follower: Person;
}

export interface Session {
  id: string;
  createdAt: number;
  rounds: Pair[][];
  pairByLevel?: boolean;
  /** Pairs were made regardless of roles; `leader`/`follower` are just the two sides */
  ignoreRoles?: boolean;
}

/** Ids of two people who must never be paired together (order does not matter) */
export type ForbiddenPair = [PersonId, PersonId];

export interface Room {
  id: string;
  name: string;
  people: Person[];
  sessions: Session[];
  forbiddenPairs: ForbiddenPair[];
}

export interface Settings {
  levels: string[];
}

export const DEFAULT_LEVELS = ['Newcomer', 'Novice', 'Intermediate', 'Advanced'];
