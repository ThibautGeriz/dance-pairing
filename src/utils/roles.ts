import { ROLES } from '../types';
import type { Person, Role, Roles, Room } from '../types';

export function canLead(person: Person): boolean {
  return person.roles.includes('leader');
}

export function canFollow(person: Person): boolean {
  return person.roles.includes('follower');
}

/** Deduplicate and order roles canonically (leader first); null when empty. */
export function toRoles(roles: Role[]): Roles | null {
  const [first, second] = ROLES.filter((r) => roles.includes(r));
  if (!first) return null;
  return second ? [first, second] : [first];
}

/** True when at least one leader can be paired with a follower other than themselves. */
export function hasValidPair(leaders: Person[], followers: Person[]): boolean {
  return leaders.some((l) => followers.some((f) => f.id !== l.id));
}

type StoredPerson = Omit<Person, 'roles'> & { roles?: Role[]; role?: Role };

/** Migrate people stored before multi-role support (single `role` field). */
export function normalizePerson(person: StoredPerson): Person {
  const { role, roles, ...rest } = person;
  return { ...rest, roles: toRoles(roles ?? (role ? [role] : [])) ?? ['leader'] };
}

export function normalizeRooms(rooms: Room[]): Room[] {
  return rooms.map((r) => ({ ...r, people: r.people.map(normalizePerson) }));
}
