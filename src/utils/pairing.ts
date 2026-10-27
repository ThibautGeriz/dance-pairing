import { makeCanPair } from './forbidden';
import { levelOf } from './roles';
import type { CanPair } from './forbidden';
import type { ForbiddenPair, Person, PersonId, Pair, Role } from '../types';

/** Partners each person has already danced with */
type History = Map<PersonId, Set<PersonId>>;

function fisherYates<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function hasDanced(history: History, a: Person, b: Person): boolean {
  return history.get(a.id)?.has(b.id) ?? false;
}

function recordPair(history: History, a: Person, b: Person): void {
  if (!history.has(a.id)) history.set(a.id, new Set());
  history.get(a.id)!.add(b.id);
}

/**
 * Fix pairs that are not allowed (a dual-role dancer with themselves, or a forbidden pair).
 * Swap followers with another pair when both resulting pairs are allowed; drop it otherwise.
 */
function removeInvalidPairs(pairs: Pair[], canPair: CanPair): Pair[] {
  const result = [...pairs];
  for (let i = 0; i < result.length; i++) {
    const invalid = result[i];
    if (canPair(invalid.leader, invalid.follower)) continue;
    const j = result.findIndex(
      (p, k) =>
        k !== i && canPair(invalid.leader, p.follower) && canPair(p.leader, invalid.follower),
    );
    if (j === -1) continue;
    result[i] = { leader: invalid.leader, follower: result[j].follower };
    result[j] = { leader: result[j].leader, follower: invalid.follower };
  }
  return result.filter((p) => canPair(p.leader, p.follower));
}

/** Dancers who don't dance at all in this round, in the role they were offered. */
function countSittingOut(pairs: Pair[], leaders: Person[], followers: Person[]): number {
  const led = new Set(pairs.map((p) => p.leader.id));
  const followed = new Set(pairs.map((p) => p.follower.id));
  return (
    leaders.filter((l) => !led.has(l.id)).length +
    followers.filter((f) => !followed.has(f.id)).length
  );
}

function getLevelIdx(person: Person, role: Role, levels: string[]): number {
  const idx = levels.indexOf(levelOf(person, role));
  return idx === -1 ? levels.length : idx;
}

/**
 * Generate exactly n pairs from leaders and followers, cycling the shorter side.
 * Tries multiple shuffles to minimise history repeats.
 */
function generateNPairs(
  leaders: Person[],
  followers: Person[],
  n: number,
  history: History,
  canPair: CanPair,
): Pair[] {
  if (leaders.length === 0 || followers.length === 0 || n === 0) return [];
  let bestPairs: Pair[] = [];
  let bestScore = Infinity;

  for (let attempt = 0; attempt < 20; attempt++) {
    const sl = fisherYates(leaders);
    const sf = fisherYates(followers);
    const candidate: Pair[] = [];

    for (let i = 0; i < n; i++) {
      candidate.push({ leader: sl[i % sl.length], follower: sf[i % sf.length] });
    }

    const pairs = removeInvalidPairs(candidate, canPair);
    const repeats = pairs.filter(({ leader, follower }) =>
      hasDanced(history, leader, follower),
    ).length;
    // A dropped pair or a dancer sitting out is worse than any number of repeats
    const missed = n - pairs.length + countSittingOut(pairs, leaders, followers);
    const score = repeats + missed * (n + 1);

    if (score < bestScore) {
      bestScore = score;
      bestPairs = pairs;
      if (score === 0) break;
    }
  }

  return bestPairs;
}

/**
 * Randomly pair leaders and followers, trying to avoid repeats from history.
 * When one side has more dancers, the shorter side cycles.
 */
function generateRoundAvoidingRepeats(
  leaders: Person[],
  followers: Person[],
  history: History,
  canPair: CanPair,
): Pair[] {
  const n = Math.max(leaders.length, followers.length);
  return generateNPairs(leaders, followers, n, history, canPair);
}

function scoreLevelRound(pairs: Pair[], levels: string[], history: History): number {
  return pairs.reduce((total, { leader, follower }) => {
    const dist = Math.abs(
      getLevelIdx(leader, 'leader', levels) - getLevelIdx(follower, 'follower', levels),
    );
    const repeat = hasDanced(history, leader, follower) ? 100 : 0;
    return total + dist + repeat;
  }, 0);
}

function oneLevelRoundAttempt(
  leaders: Person[],
  followers: Person[],
  levels: string[],
  history: History,
  canPair: CanPair,
  startOffset: number,
): Pair[] {
  const n = Math.max(leaders.length, followers.length);

  // Shuffle within each level for randomness, then sort highest level first
  const leaderIdx = (p: Person) => getLevelIdx(p, 'leader', levels);
  const sl = fisherYates(leaders).sort((a, b) => leaderIdx(b) - leaderIdx(a));

  // Shuffle followers so tie-breaking is random
  const sf = fisherYates(followers);

  // Track how many times each follower has been picked this round
  const usage = new Map<PersonId, number>(sf.map((f) => [f.id, 0]));

  const pairs: Pair[] = [];

  for (let i = 0; i < n; i++) {
    const leader = sl[(i + startOffset) % sl.length];
    const leaderLevelIdx = leaderIdx(leader);
    const candidates = sf.filter((f) => canPair(leader, f));
    if (candidates.length === 0) continue;

    // Pick the best available follower:
    //   1. Least used this round (ensures everyone dances before anyone dances twice)
    //   2. Not already danced with this leader (history)
    //   3. Closest level
    const chosen = candidates.reduce((best, f) => {
      const bUsage = usage.get(best.id)!;
      const fUsage = usage.get(f.id)!;
      if (fUsage !== bUsage) return fUsage < bUsage ? f : best;

      const bNew = !hasDanced(history, leader, best);
      const fNew = !hasDanced(history, leader, f);
      if (fNew !== bNew) return fNew ? f : best;

      const bDist = Math.abs(getLevelIdx(best, 'follower', levels) - leaderLevelIdx);
      const fDist = Math.abs(getLevelIdx(f, 'follower', levels) - leaderLevelIdx);
      return fDist < bDist ? f : best;
    });

    pairs.push({ leader, follower: chosen });
    usage.set(chosen.id, usage.get(chosen.id)! + 1);
  }

  return pairs;
}

/**
 * Pair leaders and followers by level proximity.
 * Tries multiple shuffle/rotation combinations and picks the one with
 * the lowest total level-distance score, avoiding history repeats.
 * When one side has more dancers the shorter side cycles naturally.
 */
function generateRoundByLevelAvoidingRepeats(
  leaders: Person[],
  followers: Person[],
  levels: string[],
  history: History,
  canPair: CanPair,
): Pair[] {
  if (leaders.length === 0 || followers.length === 0) return [];

  let bestPairs: Pair[] = [];
  let bestScore = Infinity;

  for (let attempt = 0; attempt < 20; attempt++) {
    // Vary which leader gets the extra dance across attempts
    const startOffset = attempt === 0 ? 0 : Math.floor(Math.random() * leaders.length);
    const pairs = oneLevelRoundAttempt(leaders, followers, levels, history, canPair, startOffset);
    // Forbidden pairs can make the greedy pick leave someone out; penalise that heavily
    const dropped = Math.max(leaders.length, followers.length) - pairs.length;
    const missed = dropped + countSittingOut(pairs, leaders, followers);
    const score = scoreLevelRound(pairs, levels, history) + missed * 1000;
    if (score < bestScore) {
      bestScore = score;
      bestPairs = pairs;
      if (score === 0) break;
    }
  }

  return bestPairs;
}

export function generatePairs(
  leaders: Person[],
  followers: Person[],
  forbidden: ForbiddenPair[] = [],
): Pair[] {
  return generateRoundAvoidingRepeats(leaders, followers, new Map(), makeCanPair(forbidden));
}

export function generatePairsByLevel(
  leaders: Person[],
  followers: Person[],
  levels: string[],
  forbidden: ForbiddenPair[] = [],
): Pair[] {
  return generateRoundByLevelAvoidingRepeats(
    leaders,
    followers,
    levels,
    new Map(),
    makeCanPair(forbidden),
  );
}

/** Build `iterations` rounds, sharing partner history so later rounds avoid repeats. */
function buildRounds(iterations: number, makeRound: (history: History) => Pair[]): Pair[][] {
  const history: History = new Map();
  const rounds: Pair[][] = [];

  for (let i = 0; i < iterations; i++) {
    const round = makeRound(history);
    rounds.push(round);

    // Record both directions so two dancers swapping sides still counts as a repeat
    for (const { leader, follower } of round) {
      recordPair(history, leader, follower);
      recordPair(history, follower, leader);
    }
  }

  return rounds;
}

function makeRoleRound(
  leaders: Person[],
  followers: Person[],
  pairByLevel: boolean,
  levels: string[],
  history: History,
  canPair: CanPair,
): Pair[] {
  return pairByLevel
    ? generateRoundByLevelAvoidingRepeats(leaders, followers, levels, history, canPair)
    : generateRoundAvoidingRepeats(leaders, followers, history, canPair);
}

/**
 * Roles ignored: anyone may dance with anyone (if allowed).
 * Split the pool into two random halves and pair them like leaders/followers; with an odd
 * count the smaller half cycles, so one person dances twice. Keep the best of several splits.
 */
function generateOpenRound(
  people: Person[],
  pairByLevel: boolean,
  levels: string[],
  history: History,
  canPair: CanPair,
): Pair[] {
  if (people.length < 2) return [];
  const half = Math.ceil(people.length / 2);

  let bestPairs: Pair[] = [];
  let bestScore = Infinity;

  for (let attempt = 0; attempt < 20; attempt++) {
    const shuffled = fisherYates(people);
    const a = shuffled.slice(0, half);
    const b = shuffled.slice(half);
    const pairs = makeRoleRound(a, b, pairByLevel, levels, history, canPair);
    const missed = half - pairs.length + countSittingOut(pairs, a, b);
    const levelScore = pairByLevel ? scoreLevelRound(pairs, levels, history) : 0;
    const repeats = pairs.filter((p) => hasDanced(history, p.leader, p.follower)).length;
    const score = missed * 1000 + repeats * 100 + levelScore;
    if (score < bestScore) {
      bestScore = score;
      bestPairs = pairs;
      if (score === 0) break;
    }
  }

  return bestPairs;
}

export function generateRounds(
  leaders: Person[],
  followers: Person[],
  iterations: number,
  pairByLevel: boolean,
  levels: string[],
  forbidden: ForbiddenPair[] = [],
): Pair[][] {
  const canPair = makeCanPair(forbidden);
  return buildRounds(iterations, (history) =>
    makeRoleRound(leaders, followers, pairByLevel, levels, history, canPair),
  );
}

/** Like `generateRounds`, but roles are ignored: anyone can be paired with anyone. */
export function generateOpenRounds(
  people: Person[],
  iterations: number,
  pairByLevel: boolean,
  levels: string[],
  forbidden: ForbiddenPair[] = [],
): Pair[][] {
  const canPair = makeCanPair(forbidden);
  return buildRounds(iterations, (history) =>
    generateOpenRound(people, pairByLevel, levels, history, canPair),
  );
}
