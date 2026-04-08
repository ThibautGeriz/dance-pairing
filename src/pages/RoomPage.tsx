import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useRooms } from '../states/useRooms';
import { useSettings } from '../states/useSettings';
import PersonItem from '../components/PersonItem';
import SessionCard from '../components/SessionCard';
import type { Role } from '../types';
import styles from './RoomPage.module.css';

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { getRoom, addPerson, removePerson, renamePerson, changePersonLevel } = useRooms();
  const { settings } = useSettings();

  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<Role>('leader');
  const [newLevel, setNewLevel] = useState(() => settings.levels[0] ?? '');
  const [visibleSessionCount, setVisibleSessionCount] = useState(3);

  if (!roomId) return null;
  const room = getRoom(roomId);

  if (!room) {
    return (
      <div className={styles.page}>
        <p className={styles.notFound}>Room not found.</p>
        <Link to="/" className={styles.back}>
          ← Back to rooms
        </Link>
      </div>
    );
  }

  const leaders = room.people.filter((p) => p.role === 'leader');
  const followers = room.people.filter((p) => p.role === 'follower');
  const reversedSessions = [...room.sessions].reverse();
  const visibleSessions = reversedSessions.slice(0, visibleSessionCount);
  const hasMore = reversedSessions.length > visibleSessionCount;

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    addPerson(roomId, trimmed, newRole, newLevel);
    setNewName('');
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/" className={styles.back}>
          ← Rooms
        </Link>
        <h1 className={styles.title}>{room.name}</h1>
        <button
          className={styles.sessionBtn}
          onClick={() => navigate(`/rooms/${roomId}/session`)}
          disabled={room.people.length === 0}
        >
          Start Session
        </button>
      </header>

      <main className={styles.main}>
        <div className={styles.addRow}>
          <input
            className={styles.input}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Person's name…"
            aria-label="Person's name"
          />
          <select
            className={styles.select}
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as Role)}
            aria-label="Role"
          >
            <option value="leader">Leader</option>
            <option value="follower">Follower</option>
          </select>
          <select
            className={styles.select}
            value={newLevel}
            onChange={(e) => setNewLevel(e.target.value)}
            aria-label="Level"
          >
            {settings.levels.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
          <button className={styles.addBtn} onClick={handleAdd}>
            Add
          </button>
        </div>

        <div className={styles.columns}>
          <section className={styles.column}>
            <h2 className={`${styles.columnTitle} ${styles.leaderTitle}`}>
              Leaders ({leaders.length})
            </h2>
            <ul className={styles.personList}>
              {leaders.map((p) => (
                <PersonItem
                  key={p.id}
                  person={p}
                  levels={settings.levels}
                  onRemove={() => removePerson(roomId, p.id)}
                  onRename={(name) => renamePerson(roomId, p.id, name)}
                  onLevelChange={(level) => changePersonLevel(roomId, p.id, level)}
                />
              ))}
            </ul>
            {leaders.length === 0 && <p className={styles.emptyCol}>No leaders yet</p>}
          </section>

          <section className={styles.column}>
            <h2 className={`${styles.columnTitle} ${styles.followerTitle}`}>
              Followers ({followers.length})
            </h2>
            <ul className={styles.personList}>
              {followers.map((p) => (
                <PersonItem
                  key={p.id}
                  person={p}
                  levels={settings.levels}
                  onRemove={() => removePerson(roomId, p.id)}
                  onRename={(name) => renamePerson(roomId, p.id, name)}
                  onLevelChange={(level) => changePersonLevel(roomId, p.id, level)}
                />
              ))}
            </ul>
            {followers.length === 0 && <p className={styles.emptyCol}>No followers yet</p>}
          </section>
        </div>

        {visibleSessions.length > 0 && (
          <section className={styles.sessionsSection}>
            <h2 className={styles.sessionsTitle}>Recent Sessions</h2>
            {visibleSessions.map((session) => (
              <SessionCard key={session.id} session={session} roomId={roomId} />
            ))}
            {hasMore && (
              <button
                className={styles.showMoreBtn}
                onClick={() => setVisibleSessionCount((n) => n + 3)}
              >
                Show more ({reversedSessions.length - visibleSessionCount} remaining)
              </button>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
