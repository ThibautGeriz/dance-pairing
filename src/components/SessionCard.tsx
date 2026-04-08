import { Link } from 'react-router-dom';
import type { Session } from '../types';
import styles from './SessionCard.module.css';

interface SessionCardProps {
  session: Session;
  roomId: string;
}

export default function SessionCard({ session, roomId }: SessionCardProps) {
  const date = new Date(session.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const pairCount = session.rounds[0]?.length ?? 0;

  return (
    <Link to={`/rooms/${roomId}/sessions/${session.id}`} className={styles.sessionCard}>
      <span className={styles.sessionDate}>{date}</span>
      <span className={styles.sessionMeta}>
        {session.rounds.length} round{session.rounds.length !== 1 ? 's' : ''}
        {' · '}
        {pairCount} pair{pairCount !== 1 ? 's' : ''}
      </span>
      <span className={styles.sessionChevron}>›</span>
    </Link>
  );
}
