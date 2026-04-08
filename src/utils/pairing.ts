import type { Person, Pair } from '../types';

function fisherYates<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getLevelIdx(person: Person, levels: string[]): number {
  const idx = levels.indexOf(person.level);
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
  history: Map<string, Set<string>>,
): Pair[] {
  if (leaders.length === 0 || followers.length === 0 || n === 0) return [];
  let bestPairs: Pair[] = [];
  let bestRepeats = Infinity;

  for (let attempt = 0; attempt < 20; attempt++) {
    const sl = fisherYates(leaders);
    const sf = fisherYates(followers);
    const pairs: Pair[] = [];
    let repeats = 0;

    for (let i = 0; i < n; i++) {
      const leader = sl[i % sl.length];
      const follower = sf[i % sf.length];
      if (history.get(leader.id)?.has(follower.id)) repeats++;
      pairs.push({ leader, follower });
    }

    if (repeats < bestRepeats) {
      bestRepeats = repeats;
      bestPairs = pairs;
      if (repeats === 0) break;
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
  history: Map<string, Set<string>>,
): Pair[] {
  return generateNPairs(leaders, followers, Math.max(leaders.length, followers.length), history);
}

function scoreLevelRound(
  pairs: Pair[],
  levels: string[],
  history: Map<string, Set<string>>,
): number {
  return pairs.reduce((total, { leader, follower }) => {
    const dist = Math.abs(getLevelIdx(leader, levels) - getLevelIdx(follower, levels));
    const repeat = history.get(leader.id)?.has(follower.id) ? 100 : 0;
    return total + dist + repeat;
  }, 0);
}

function oneLevelRoundAttempt(
  leaders: Person[],
  followers: Person[],
  levels: string[],
  history: Map<string, Set<string>>,
  startOffset: number,
): Pair[] {
  const n = Math.max(leaders.length, followers.length);

  // Shuffle within each level for randomness, then sort highest level first
  const sl = fisherYates(leaders).sort((a, b) => getLevelIdx(b, levels) - getLevelIdx(a, levels));

  // Shuffle followers so tie-breaking is random
  const sf = fisherYates(followers);

  // Track how many times each follower has been picked this round
  const usage = new Map<string, number>(sf.map((f) => [f.id, 0]));

  const pairs: Pair[] = [];

  for (let i = 0; i < n; i++) {
    const leader = sl[(i + startOffset) % sl.length];
    const leaderHistory = history.get(leader.id) ?? new Set();
    const leaderLevelIdx = getLevelIdx(leader, levels);

    // Pick the best available follower:
    //   1. Least used this round (ensures everyone dances before anyone dances twice)
    //   2. Not already danced with this leader (history)
    //   3. Closest level
    const chosen = sf.reduce((best, f) => {
      const bUsage = usage.get(best.id)!;
      const fUsage = usage.get(f.id)!;
      if (fUsage !== bUsage) return fUsage < bUsage ? f : best;

      const bNew = !leaderHistory.has(best.id);
      const fNew = !leaderHistory.has(f.id);
      if (fNew !== bNew) return fNew ? f : best;

      const bDist = Math.abs(getLevelIdx(best, levels) - leaderLevelIdx);
      const fDist = Math.abs(getLevelIdx(f, levels) - leaderLevelIdx);
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
  history: Map<string, Set<string>>,
): Pair[] {
  if (leaders.length === 0 || followers.length === 0) return [];

  let bestPairs: Pair[] = [];
  let bestScore = Infinity;

  for (let attempt = 0; attempt < 20; attempt++) {
    // Vary which leader gets the extra dance across attempts
    const startOffset = attempt === 0 ? 0 : Math.floor(Math.random() * leaders.length);
    const pairs = oneLevelRoundAttempt(leaders, followers, levels, history, startOffset);
    const score = scoreLevelRound(pairs, levels, history);
    if (score < bestScore) {
      bestScore = score;
      bestPairs = pairs;
      if (score === 0) break;
    }
  }

  return bestPairs;
}

export function generatePairs(leaders: Person[], followers: Person[]): Pair[] {
  return generateRoundAvoidingRepeats(leaders, followers, new Map());
}

export function generatePairsByLevel(
  leaders: Person[],
  followers: Person[],
  levels: string[],
): Pair[] {
  return generateRoundByLevelAvoidingRepeats(leaders, followers, levels, new Map());
}

export function generateRounds(
  leaders: Person[],
  followers: Person[],
  iterations: number,
  pairByLevel: boolean,
  levels: string[],
): Pair[][] {
  const history = new Map<string, Set<string>>();
  const rounds: Pair[][] = [];

  for (let i = 0; i < iterations; i++) {
    const round = pairByLevel
      ? generateRoundByLevelAvoidingRepeats(leaders, followers, levels, history)
      : generateRoundAvoidingRepeats(leaders, followers, history);
    rounds.push(round);

    for (const pair of round) {
      if (!history.has(pair.leader.id)) history.set(pair.leader.id, new Set());
      history.get(pair.leader.id)!.add(pair.follower.id);
    }
  }

  return rounds;
}
