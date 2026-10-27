export type Role = 'leader' | 'follower';

export const ROLES: Role[] = ['leader', 'follower'];

/** One or two unique roles */
export type Roles = [Role] | [Role, Role];

export interface Person {
  id: string;
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
}

export interface Room {
  id: string;
  name: string;
  people: Person[];
  sessions: Session[];
}

export interface Settings {
  levels: string[];
}

export const DEFAULT_LEVELS = ['Newcomer', 'Novice', 'Intermediate', 'Advanced'];
