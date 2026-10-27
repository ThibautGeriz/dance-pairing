import { ROLES } from '../types';
import { makeCanPair } from './forbidden';
import type { ForbiddenPair, Person, Role, Roles } from '../types';

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

/** True when at least one leader can be paired with a follower (not themselves, not forbidden). */
export function hasValidPair(
  leaders: Person[],
  followers: Person[],
  forbidden: ForbiddenPair[] = [],
): boolean {
  const canPair = makeCanPair(forbidden);
  return leaders.some((l) => followers.some((f) => canPair(l, f)));
}
