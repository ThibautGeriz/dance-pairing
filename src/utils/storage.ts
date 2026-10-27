import { toRoles } from './roles';
import type { Person, Role, Room } from '../types';

type StoredPerson = Omit<Person, 'roles'> & { roles?: Role[]; role?: Role };

type StoredRoom = Omit<Room, 'people' | 'sessions' | 'forbiddenPairs'> & {
  people: StoredPerson[];
  sessions?: Room['sessions'];
  forbiddenPairs?: Room['forbiddenPairs'];
};

/** Migrate people stored before multi-role support (single `role` field). */
export function normalizePerson(person: StoredPerson): Person {
  const { role, roles, ...rest } = person;
  return { ...rest, roles: toRoles(roles ?? (role ? [role] : [])) ?? ['leader'] };
}

/** Fill in fields missing from rooms stored by older versions of the app. */
export function normalizeRooms(rooms: StoredRoom[]): Room[] {
  return rooms.map((r) => ({
    ...r,
    sessions: r.sessions ?? [],
    people: r.people.map(normalizePerson),
    forbiddenPairs: r.forbiddenPairs ?? [],
  }));
}
