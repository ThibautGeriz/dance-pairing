import { ROLES } from '../types';
import { makeCanPair } from './forbidden';
import type { ForbiddenPair, Person, Role, RoleLevel, Roles } from '../types';

export function hasRole(person: Person, role: Role): boolean {
  return person.roles.some((r) => r.role === role);
}

export function canLead(person: Person): boolean {
  return hasRole(person, 'leader');
}

export function canFollow(person: Person): boolean {
  return hasRole(person, 'follower');
}

/**
 * The person's level when dancing `role`. Falls back to their other role's level, which only
 * happens when roles are ignored (Switch) and someone dances a role they don't have.
 */
export function levelOf(person: Person, role: Role): string {
  return (person.roles.find((r) => r.role === role) ?? person.roles[0]).level;
}

/** Keep one entry per role (first wins), leader first; null when empty. */
export function toRoles(entries: RoleLevel[]): Roles | null {
  const [first, second] = ROLES.flatMap((role) => entries.find((e) => e.role === role) ?? []);
  if (!first) return null;
  return second ? [first, second] : [first];
}

/** Change the level of one of the person's roles. */
export function withRoleLevel(roles: Roles, role: Role, level: string): Roles {
  return toRoles(roles.map((r) => (r.role === role ? { ...r, level } : r))) ?? roles;
}

/** True when at least one leader can be paired with a follower (not themselves, not forbidden). */
export function hasValidPair(
  leaders: Person[],
  followers: Person[],
  forbidden: ForbiddenPair[] = [],
): boolean {
  const canPair = makeCanPair(forbidden);
  return leaders.some((l) => followers.some((f) => canPair(l, f)));
}

/** Roles ignored: true when any two different people may be paired. */
export function hasValidOpenPair(people: Person[], forbidden: ForbiddenPair[] = []): boolean {
  const canPair = makeCanPair(forbidden);
  return people.some((a, i) => people.slice(i + 1).some((b) => canPair(a, b)));
}
