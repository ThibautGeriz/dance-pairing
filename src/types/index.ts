export type Role = 'leader' | 'follower';

export interface Person {
  id: string;
  name: string;
  role: Role;
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
