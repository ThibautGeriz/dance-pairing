import { useParams, Link } from 'react-router-dom';
import { useRooms } from '../states/useRooms';
import { useSettings } from '../states/useSettings';
import { generateOpenRounds, generateRounds } from '../utils/pairing';
import { levelOf } from '../utils/roles';
import type { Person, PersonId } from '../types';
import styles from './SessionViewPage.module.css';

export default function SessionViewPage() {
  const { roomId, sessionId } = useParams<{ roomId: string; sessionId: string }>();
  const { getRoom, updateSessionRounds } = useRooms();
  const { settings } = useSettings();

  const room = roomId ? getRoom(roomId) : undefined;
  const session = room?.sessions.find((s) => s.id === sessionId);

  if (!room || !session) {
    return (
      <div className={styles.page}>
        <p className={styles.notFound}>Session not found.</p>
        <Link to={roomId ? `/rooms/${roomId}` : '/'} className={styles.backLink}>
          ← Back
        </Link>
      </div>
    );
  }

  // Derive participants from stored rounds (deduplicated by id)
  const leaderMap = new Map<PersonId, Person>();
  const followerMap = new Map<PersonId, Person>();
  for (const round of session.rounds) {
    for (const pair of round) {
      leaderMap.set(pair.leader.id, pair.leader);
      followerMap.set(pair.follower.id, pair.follower);
    }
  }
  const sessionLeaders = [...leaderMap.values()];
  const sessionFollowers = [...followerMap.values()];
  const iterations = session.rounds.length;
  const pairByLevel = session.pairByLevel ?? false;
  const ignoreRoles = session.ignoreRoles ?? false;

  const reshuffle = () => {
    const newRounds = ignoreRoles
      ? generateOpenRounds(
          [...new Map([...leaderMap, ...followerMap]).values()],
          iterations,
          pairByLevel,
          settings.levels,
          room.forbiddenPairs,
        )
      : generateRounds(
          sessionLeaders,
          sessionFollowers,
          iterations,
          pairByLevel,
          settings.levels,
          room.forbiddenPairs,
        );
    updateSessionRounds(roomId!, sessionId!, newRounds);
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to={`/rooms/${roomId}`} className={styles.backLink}>
          ← {room.name}
        </Link>
        <h1 className={styles.title}>Pairs</h1>
        <button className={styles.shuffleBtn} onClick={reshuffle}>
          Shuffle
        </button>
      </header>

      <main className={styles.main}>
        {session.rounds.map((round, ri) => {
          const leaderSeq = new Map<PersonId, number>();
          // Without roles a person may appear on either side, so count their dances together
          const followerSeq = ignoreRoles ? leaderSeq : new Map<PersonId, number>();
          const annotated = round.map((pair) => {
            const lo = (leaderSeq.get(pair.leader.id) ?? 0) + 1;
            leaderSeq.set(pair.leader.id, lo);
            const fo = (followerSeq.get(pair.follower.id) ?? 0) + 1;
            followerSeq.set(pair.follower.id, fo);
            return {
              pair,
              leaderOrdinal: lo,
              followerOrdinal: fo,
              leaderLevel: levelOf(pair.leader, 'leader'),
              followerLevel: levelOf(pair.follower, 'follower'),
            };
          });
          return (
            <div key={ri}>
              {session.rounds.length > 1 && <h2 className={styles.roundTitle}>Round {ri + 1}</h2>}
              <ul className={styles.pairsList}>
                {annotated.map(
                  ({ pair, leaderOrdinal, followerOrdinal, leaderLevel, followerLevel }, pi) => (
                    <li key={pi} className={styles.pairCard}>
                      <div className={styles.pairSide}>
                        <div className={styles.personInfo}>
                          <span className={ignoreRoles ? styles.neutralName : styles.leaderName}>
                            {pair.leader.name}
                          </span>
                          {leaderLevel && <span className={styles.pairLevel}>{leaderLevel}</span>}
                        </div>
                        {leaderOrdinal > 1 && (
                          <span className={styles.badge} title={`Dance #${leaderOrdinal}`}>
                            ×{leaderOrdinal}
                          </span>
                        )}
                      </div>
                      <span className={styles.divider}>↔</span>
                      <div className={`${styles.pairSide} ${styles.pairSideRight}`}>
                        {followerOrdinal > 1 && (
                          <span className={styles.badge} title={`Dance #${followerOrdinal}`}>
                            ×{followerOrdinal}
                          </span>
                        )}
                        <div className={`${styles.personInfo} ${styles.personInfoRight}`}>
                          {followerLevel && (
                            <span className={styles.pairLevel}>{followerLevel}</span>
                          )}
                          <span className={ignoreRoles ? styles.neutralName : styles.followerName}>
                            {pair.follower.name}
                          </span>
                        </div>
                      </div>
                    </li>
                  ),
                )}
              </ul>
            </div>
          );
        })}
      </main>
    </div>
  );
}
