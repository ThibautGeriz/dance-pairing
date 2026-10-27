import { toRoles } from './roles';
import type { Pair, Person, Role, RoleLevel, Room, Session } from '../types';

/**
 * Shapes written by older versions of the app:
 * - a single `role` field (before multi-role support)
 * - `roles: Role[]` with one person-wide `level` (before per-role levels)
 */
type StoredPerson = Omit<Person, 'roles'> & {
  roles?: (Role | RoleLevel)[];
  role?: Role;
  level?: string;
};

type StoredPair = { leader: StoredPerson; follower: StoredPerson };

type StoredSession = Omit<Session, 'rounds'> & { rounds: StoredPair[][] };

type StoredRoom = Omit<Room, 'people' | 'sessions' | 'forbiddenPairs'> & {
  people: StoredPerson[];
  sessions?: StoredSession[];
  forbiddenPairs?: Room['forbiddenPairs'];
};

export function normalizePerson(person: StoredPerson): Person {
  const { role, roles, level = '', ...rest } = person;
  const entries = (roles ?? (role ? [role] : [])).map((r) =>
    typeof r === 'string' ? { role: r, level } : r,
  );
  return { ...rest, roles: toRoles(entries) ?? [{ role: 'leader', level }] };
}

function normalizePair(pair: StoredPair): Pair {
  return { leader: normalizePerson(pair.leader), follower: normalizePerson(pair.follower) };
}

/** Fill in fields missing from rooms stored by older versions of the app. */
export function normalizeRooms(rooms: StoredRoom[]): Room[] {
  return rooms.map((r) => ({
    ...r,
    // Sessions keep a copy of each dancer, so migrate those too (used when reshuffling)
    sessions: (r.sessions ?? []).map((s) => ({
      ...s,
      rounds: s.rounds.map((round) => round.map(normalizePair)),
    })),
    people: r.people.map(normalizePerson),
    forbiddenPairs: r.forbiddenPairs ?? [],
  }));
}
