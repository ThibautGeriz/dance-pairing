import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateOpenRounds, generatePairs, generatePairsByLevel, generateRounds } from './pairing';
import type { Pair, Person, PersonId } from '../types';

const pid = (id: string) => id as PersonId;

const leader = (id: string, level = 'Newcomer'): Person => ({
  id: pid(id),
  name: `Leader ${id}`,
  roles: ['leader'],
  level,
});
const follower = (id: string, level = 'Newcomer'): Person => ({
  id: pid(id),
  name: `Follower ${id}`,
  roles: ['follower'],
  level,
});
const both = (id: string, level = 'Newcomer'): Person => ({
  id: pid(id),
  name: `Both ${id}`,
  roles: ['leader', 'follower'],
  level,
});

const hasSelfPair = (pairs: Pair[]) => pairs.some((p) => p.leader.id === p.follower.id);

describe('generatePairs', () => {
  it('returns empty when leaders is empty', () => {
    expect(generatePairs([], [follower('a')])).toEqual([]);
  });

  it('returns empty when followers is empty', () => {
    expect(generatePairs([leader('a')], [])).toEqual([]);
  });

  it('pairs equal counts', () => {
    const pairs = generatePairs([leader('a'), leader('b')], [follower('x'), follower('y')]);
    expect(pairs).toHaveLength(2);
  });

  it('handles more leaders than followers', () => {
    const pairs = generatePairs(
      [leader('a'), leader('b'), leader('c')],
      [follower('x'), follower('y')],
    );
    expect(pairs).toHaveLength(3);
  });

  it('handles more followers than leaders', () => {
    const pairs = generatePairs(
      [leader('a'), leader('b')],
      [follower('x'), follower('y'), follower('z')],
    );
    expect(pairs).toHaveLength(3);
  });

  it('every leader and follower appears at least once', () => {
    const leaders = [leader('a'), leader('b'), leader('c')];
    const followers = [follower('x'), follower('y')];
    const pairs = generatePairs(leaders, followers);
    const usedLeaderIds = new Set(pairs.map((p) => p.leader.id));
    const usedFollowerIds = new Set(pairs.map((p) => p.follower.id));
    leaders.forEach((l) => expect(usedLeaderIds.has(l.id)).toBe(true));
    followers.forEach((f) => expect(usedFollowerIds.has(f.id)).toBe(true));
  });
});

describe('generatePairsByLevel', () => {
  const levels = ['Newcomer', 'Intermediate', 'Advanced'];

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns empty when leaders is empty', () => {
    expect(generatePairsByLevel([], [follower('a')], levels)).toEqual([]);
  });

  it('returns empty when followers is empty', () => {
    expect(generatePairsByLevel([leader('a')], [], levels)).toEqual([]);
  });

  it('pairs dancers of the same level together', () => {
    const leaders = [leader('a', 'Newcomer'), leader('b', 'Advanced')];
    const followers = [follower('x', 'Newcomer'), follower('y', 'Advanced')];
    const pairs = generatePairsByLevel(leaders, followers, levels);

    expect(pairs).toHaveLength(2);
    const newcomerPair = pairs.find((p) => p.leader.id === 'a');
    expect(newcomerPair?.follower.id).toBe('x');
    const advancedPair = pairs.find((p) => p.leader.id === 'b');
    expect(advancedPair?.follower.id).toBe('y');
  });

  it('falls back to closest-level pairing when no exact match', () => {
    const leaders = [leader('a', 'Newcomer')];
    const followers = [follower('x', 'Advanced')];
    const pairs = generatePairsByLevel(leaders, followers, levels);

    expect(pairs).toHaveLength(1);
    expect(pairs[0].leader.id).toBe('a');
    expect(pairs[0].follower.id).toBe('x');
  });

  it('picks closest level when exact match unavailable', () => {
    // 1 leader (Intermediate), 2 followers (Newcomer, Advanced) — leader dances twice
    const leaders = [leader('a', 'Intermediate')];
    const followers = [follower('x', 'Newcomer'), follower('y', 'Advanced')];
    const pairs = generatePairsByLevel(leaders, followers, levels);
    expect(pairs).toHaveLength(2);
    expect(pairs.every((p) => p.leader.id === 'a')).toBe(true);
    const usedFollowerIds = new Set(pairs.map((p) => p.follower.id));
    expect(usedFollowerIds.has(pid('x'))).toBe(true);
    expect(usedFollowerIds.has(pid('y'))).toBe(true);
  });

  it('leaves extra dancers from uneven levels and pairs them', () => {
    const leaders = [leader('a', 'Newcomer'), leader('b', 'Newcomer')];
    const followers = [follower('x', 'Newcomer'), follower('y', 'Advanced')];
    const pairs = generatePairsByLevel(leaders, followers, levels);

    expect(pairs).toHaveLength(2);
    const allLeaderIds = new Set(pairs.map((p) => p.leader.id));
    const allFollowerIds = new Set(pairs.map((p) => p.follower.id));
    expect(allLeaderIds.has(pid('a')) || allLeaderIds.has(pid('b'))).toBe(true);
    expect(allFollowerIds.has(pid('x'))).toBe(true);
    expect(allFollowerIds.has(pid('y'))).toBe(true);
  });

  it('generates max pairs when followers outnumber leaders (all same level)', () => {
    const ls = ['a', 'b', 'c', 'd'].map((id) => leader(id, 'Newcomer'));
    const fs = ['v', 'w', 'x', 'y', 'z'].map((id) => follower(id, 'Newcomer'));
    const pairs = generatePairsByLevel(ls, fs, levels);

    expect(pairs).toHaveLength(5);
    const usedFollowerIds = new Set(pairs.map((p) => p.follower.id));
    fs.forEach((f) => expect(usedFollowerIds.has(f.id)).toBe(true));
  });

  it('handles a dancer whose level is not in the levels array', () => {
    // getLevelIdx returns levels.length as a sentinel for unknown levels
    const leaders = [leader('a', 'Unknown')];
    const followers = [follower('x', 'Newcomer')];
    const pairs = generatePairsByLevel(leaders, followers, levels);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].leader.id).toBe('a');
    expect(pairs[0].follower.id).toBe('x');
  });

  it('prefers the follower already in history as "best" when candidate f is in leader history', () => {
    // Mock shuffle so round 2 gets sf=[y, x], where x is in leader a's history.
    // In the reduce: best=y (new), f=x (old) → fNew=false, bNew=true → return best (y).
    // This exercises the `return best` branch on line 116.
    const mockRandom = vi
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0.9) // round 1: fisherYates(leaders=[a,b]) → no swap → [a,b]
      .mockReturnValueOnce(0.9) // round 1: fisherYates(followers=[x,y]) → no swap → [x,y]
      .mockReturnValueOnce(0.9) // round 2: fisherYates(leaders=[a,b]) → no swap → [a,b]
      .mockReturnValueOnce(0.1); // round 2: fisherYates(followers=[x,y]) → swap → [y,x]

    const rounds = generateRounds(
      [leader('a', 'Newcomer'), leader('b', 'Newcomer')],
      [follower('x', 'Newcomer'), follower('y', 'Newcomer')],
      2,
      true,
      ['Newcomer'],
    );

    expect(rounds).toHaveLength(2);
    // Round 2 should avoid repeats from round 1
    const round1Set = new Set(rounds[0].map((p) => `${p.leader.id}-${p.follower.id}`));
    const repeats = rounds[1].filter((p) => round1Set.has(`${p.leader.id}-${p.follower.id}`));
    expect(repeats).toHaveLength(0);
    expect(mockRandom).toHaveBeenCalled();
  });

  it('generates max pairs when leaders outnumber followers (all same level)', () => {
    const ls = ['a', 'b', 'c', 'd', 'e'].map((id) => leader(id, 'Newcomer'));
    const fs = ['x', 'y', 'z'].map((id) => follower(id, 'Newcomer'));
    const pairs = generatePairsByLevel(ls, fs, levels);

    expect(pairs).toHaveLength(5);
    const usedLeaderIds = new Set(pairs.map((p) => p.leader.id));
    ls.forEach((l) => expect(usedLeaderIds.has(l.id)).toBe(true));
  });
});

describe('generateRounds', () => {
  it('generates the correct number of rounds', () => {
    const rounds = generateRounds(
      [leader('a'), leader('b')],
      [follower('x'), follower('y')],
      3,
      false,
      [],
    );
    expect(rounds).toHaveLength(3);
  });

  it('avoids repeating pairs across rounds when possible', () => {
    const leaders = [leader('a'), leader('b')];
    const followers = [follower('x'), follower('y')];
    const rounds = generateRounds(leaders, followers, 2, false, []);

    const round1Pairings = new Set(rounds[0].map((p) => `${p.leader.id}-${p.follower.id}`));
    const round2Pairings = rounds[1].map((p) => `${p.leader.id}-${p.follower.id}`);
    const repeats = round2Pairings.filter((p) => round1Pairings.has(p)).length;
    expect(repeats).toBe(0);
  });

  it('generates correct number of pairs per round in pairByLevel mode', () => {
    const rounds = generateRounds([leader('a', 'Newcomer')], [follower('x', 'Newcomer')], 2, true, [
      'Newcomer',
    ]);
    expect(rounds).toHaveLength(2);
    expect(rounds[0]).toHaveLength(1);
    // Round 2 forces a repeat (only one possible pair), exercising the repeat penalty
    expect(rounds[1]).toHaveLength(1);
    expect(rounds[1][0].leader.id).toBe('a');
    expect(rounds[1][0].follower.id).toBe('x');
  });

  it('generates correct number of pairs per round with equal counts', () => {
    const rounds = generateRounds(
      [leader('a'), leader('b')],
      [follower('x'), follower('y')],
      2,
      false,
      [],
    );
    expect(rounds[0]).toHaveLength(2);
    expect(rounds[1]).toHaveLength(2);
  });
});

describe('dancers with both roles', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('never pairs a dancer with themselves in random mode', () => {
    const b = both('b');
    for (let i = 0; i < 50; i++) {
      const pairs = generatePairs([leader('a'), b], [b, follower('x')]);
      expect(pairs).toHaveLength(2);
      expect(hasSelfPair(pairs)).toBe(false);
    }
  });

  it('swaps followers to break a self-pair produced by the shuffle', () => {
    // Math.random ≈ 1 leaves both shuffles in input order: b-b and c-c, which must be swapped
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const b = both('b');
    const c = both('c');
    const pairs = generatePairs([b, c], [b, c]);
    expect(pairs).toHaveLength(2);
    expect(hasSelfPair(pairs)).toBe(false);
  });

  it('drops the self-pair when no swap can fix it', () => {
    const b = both('b');
    const pairs = generatePairs([leader('a'), b], [b]);
    expect(pairs).toEqual([{ leader: expect.objectContaining({ id: 'a' }), follower: b }]);
  });

  it('returns no pairs when the only dancer has both roles', () => {
    const b = both('b');
    expect(generatePairs([b], [b])).toEqual([]);
    expect(generatePairsByLevel([b], [b], ['Newcomer'])).toEqual([]);
  });

  it('never pairs a dancer with themselves in level mode', () => {
    const levels = ['Newcomer', 'Advanced'];
    const b = both('b', 'Advanced');
    for (let i = 0; i < 50; i++) {
      const pairs = generatePairsByLevel(
        [leader('a', 'Newcomer'), b],
        [b, follower('x', 'Advanced')],
        levels,
      );
      expect(pairs).toHaveLength(2);
      expect(hasSelfPair(pairs)).toBe(false);
    }
  });

  it('never pairs a dancer with themselves across rounds in either mode', () => {
    const b = both('b');
    const c = both('c');
    for (const pairByLevel of [false, true]) {
      const rounds = generateRounds([b, c, leader('a')], [b, c, follower('x')], 5, pairByLevel, [
        'Newcomer',
      ]);
      expect(rounds).toHaveLength(5);
      rounds.forEach((r) => {
        expect(r).toHaveLength(3);
        expect(hasSelfPair(r)).toBe(false);
      });
    }
  });
});

describe('forbidden pairs', () => {
  const pairKeys = (pairs: Pair[]) => pairs.map((p) => `${p.leader.id}-${p.follower.id}`).sort();

  it('never pairs forbidden dancers in random mode', () => {
    for (let i = 0; i < 50; i++) {
      const pairs = generatePairs(
        [leader('a'), leader('b')],
        [follower('x'), follower('y')],
        [[pid('a'), pid('x')]],
      );
      expect(pairKeys(pairs)).toEqual(['a-y', 'b-x']);
    }
  });

  it('ignores the order of the two dancers in a forbidden pair', () => {
    for (let i = 0; i < 20; i++) {
      const pairs = generatePairs(
        [leader('a'), leader('b')],
        [follower('x'), follower('y')],
        [[pid('x'), pid('a')]],
      );
      expect(pairKeys(pairs)).toEqual(['a-y', 'b-x']);
    }
  });

  it('never pairs forbidden dancers in level mode, even with matching levels', () => {
    const levels = ['Newcomer', 'Advanced'];
    for (let i = 0; i < 50; i++) {
      const pairs = generatePairsByLevel(
        [leader('a', 'Advanced'), leader('b', 'Newcomer')],
        [follower('x', 'Advanced'), follower('y', 'Newcomer')],
        levels,
        [[pid('a'), pid('x')]],
      );
      expect(pairKeys(pairs)).toEqual(['a-y', 'b-x']);
    }
  });

  it('returns no pairs when the only possible pair is forbidden', () => {
    const forbidden: [PersonId, PersonId][] = [[pid('a'), pid('x')]];
    expect(generatePairs([leader('a')], [follower('x')], forbidden)).toEqual([]);
    expect(generatePairsByLevel([leader('a')], [follower('x')], [], forbidden)).toEqual([]);
  });

  it('respects forbidden pairs in every round in both modes', () => {
    const leaders = [leader('a'), leader('b'), leader('c')];
    const followers = [follower('x'), follower('y'), follower('z')];
    const forbidden: [PersonId, PersonId][] = [
      [pid('a'), pid('x')],
      [pid('b'), pid('y')],
    ];
    for (const pairByLevel of [false, true]) {
      const rounds = generateRounds(leaders, followers, 5, pairByLevel, ['Newcomer'], forbidden);
      rounds.forEach((round) => {
        const keys = pairKeys(round);
        expect(keys).toHaveLength(3);
        expect(keys).not.toContain('a-x');
        expect(keys).not.toContain('b-y');
      });
    }
  });
});

describe('generateOpenRounds (roles ignored)', () => {
  const partners = (pairs: Pair[]) =>
    pairs.map((p) => [p.leader.id, p.follower.id].sort().join('-')).sort();

  it('returns empty rounds with fewer than two people', () => {
    expect(generateOpenRounds([], 1, false, [])).toEqual([[]]);
    expect(generateOpenRounds([leader('a')], 1, false, [])).toEqual([[]]);
  });

  it('pairs people regardless of their roles', () => {
    const [round] = generateOpenRounds([leader('a'), leader('b')], 1, false, []);
    expect(partners(round)).toEqual(['a-b']);
  });

  it('pairs everyone exactly once with an even count, never with themselves', () => {
    const people = [leader('a'), leader('b'), follower('x'), both('y')];
    for (let i = 0; i < 20; i++) {
      const [round] = generateOpenRounds(people, 1, false, []);
      expect(round).toHaveLength(2);
      expect(hasSelfPair(round)).toBe(false);
      const ids = round.flatMap((p) => [p.leader.id, p.follower.id]).sort();
      expect(ids).toEqual(['a', 'b', 'x', 'y']);
    }
  });

  it('makes one person dance twice with an odd count', () => {
    const people = [leader('a'), leader('b'), leader('c')];
    const [round] = generateOpenRounds(people, 1, false, []);
    expect(round).toHaveLength(2);
    expect(hasSelfPair(round)).toBe(false);
    const ids = new Set(round.flatMap((p) => [p.leader.id, p.follower.id]));
    expect(ids).toEqual(new Set(['a', 'b', 'c']));
  });

  it('never generates a forbidden pair', () => {
    const people = [leader('a'), leader('b'), leader('c'), leader('d')];
    const forbidden: [PersonId, PersonId][] = [
      [pid('a'), pid('b')],
      [pid('c'), pid('d')],
    ];
    for (let i = 0; i < 20; i++) {
      const [round] = generateOpenRounds(people, 1, false, [], forbidden);
      expect(round).toHaveLength(2);
      expect(partners(round)).not.toContain('a-b');
      expect(partners(round)).not.toContain('c-d');
    }
  });

  it('matches by level when requested', () => {
    const levels = ['Newcomer', 'Advanced'];
    const people = [
      leader('a', 'Advanced'),
      follower('b', 'Advanced'),
      leader('c', 'Newcomer'),
      follower('d', 'Newcomer'),
    ];
    for (let i = 0; i < 20; i++) {
      const [round] = generateOpenRounds(people, 1, true, levels);
      expect(partners(round)).toEqual(['a-b', 'c-d']);
    }
  });

  it('avoids repeating partners across rounds', () => {
    const people = [leader('a'), leader('b'), leader('c'), leader('d')];
    for (let i = 0; i < 20; i++) {
      const [first, second] = generateOpenRounds(people, 2, false, []);
      const seen = new Set(partners(first));
      expect(partners(second).filter((k) => seen.has(k))).toEqual([]);
    }
  });
});
