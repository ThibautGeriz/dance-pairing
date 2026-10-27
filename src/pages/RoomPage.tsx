import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useRooms } from '../states/useRooms';
import { useSettings } from '../states/useSettings';
import PersonItem from '../components/PersonItem';
import SessionCard from '../components/SessionCard';
import ForbiddenPairs from '../components/ForbiddenPairs';
import { canLead, canFollow, toRoles } from '../utils/roles';
import { ROLES } from '../types';
import type { Role } from '../types';
import styles from './RoomPage.module.css';

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const {
    getRoom,
    addPerson,
    removePerson,
    renamePerson,
    changePersonLevel,
    addForbiddenPair,
    removeForbiddenPair,
  } = useRooms();
  const { settings } = useSettings();

  const [newName, setNewName] = useState('');
  const [newRoles, setNewRoles] = useState<Role[]>(['leader']);
  const [newLevels, setNewLevels] = useState<Record<Role, string>>(() => ({
    leader: settings.levels[0] ?? '',
    follower: settings.levels[0] ?? '',
  }));
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

  const leaders = room.people.filter(canLead);
  const followers = room.people.filter(canFollow);
  const reversedSessions = [...room.sessions].reverse();
  const visibleSessions = reversedSessions.slice(0, visibleSessionCount);
  const hasMore = reversedSessions.length > visibleSessionCount;

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const roles = toRoles(newRoles.map((role) => ({ role, level: newLevels[role] })));
    if (!roles) return;
    addPerson(roomId, trimmed, roles);
    setNewName('');
  };

  // A person always keeps at least one role
  const toggleRole = (role: Role) => {
    setNewRoles((prev) => {
      if (!prev.includes(role)) return ROLES.filter((r) => r === role || prev.includes(r));
      return prev.length > 1 ? prev.filter((r) => r !== role) : prev;
    });
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
          <fieldset className={styles.roleToggles}>
            <legend className={styles.visuallyHidden}>Roles</legend>
            {ROLES.map((role) => {
              const checked = newRoles.includes(role);
              const roleName = role === 'leader' ? 'Leader' : 'Follower';
              return (
                <div key={role} className={styles.roleWithLevel}>
                  <label
                    className={`${styles.roleToggle} ${role === 'leader' ? styles.roleToggleLeader : styles.roleToggleFollower}`}
                  >
                    <input
                      type="checkbox"
                      className={styles.roleCheckbox}
                      checked={checked}
                      // The last selected role cannot be removed
                      disabled={checked && newRoles.length === 1}
                      onChange={() => toggleRole(role)}
                    />
                    {roleName}
                  </label>
                  {checked && (
                    <select
                      className={styles.select}
                      value={newLevels[role]}
                      onChange={(e) =>
                        setNewLevels((prev) => ({ ...prev, [role]: e.target.value }))
                      }
                      aria-label={`${roleName} level`}
                    >
                      {settings.levels.map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              );
            })}
          </fieldset>
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
                  role="leader"
                  onLevelChange={(level) => changePersonLevel(roomId, p.id, 'leader', level)}
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
                  role="follower"
                  onLevelChange={(level) => changePersonLevel(roomId, p.id, 'follower', level)}
                />
              ))}
            </ul>
            {followers.length === 0 && <p className={styles.emptyCol}>No followers yet</p>}
          </section>
        </div>

        {room.people.length >= 2 && (
          <ForbiddenPairs
            people={room.people}
            forbiddenPairs={room.forbiddenPairs}
            onAdd={(a, b) => addForbiddenPair(roomId, a, b)}
            onRemove={(a, b) => removeForbiddenPair(roomId, a, b)}
          />
        )}

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
