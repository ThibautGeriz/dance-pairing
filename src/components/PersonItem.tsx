import { useState } from 'react';
import { levelOf } from '../utils/roles';
import type { Person, Role } from '../types';
import styles from './PersonItem.module.css';

interface PersonItemProps {
  person: Person;
  /** The column this item is shown in; its level is the person's level in that role */
  role: Role;
  levels: string[];
  onRemove: () => void;
  onRename: (name: string) => void;
  onLevelChange: (level: string) => void;
}

export default function PersonItem({
  person,
  role,
  levels,
  onRemove,
  onRename,
  onLevelChange,
}: PersonItemProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(person.name);

  const commit = () => {
    const trimmed = editName.trim();
    if (trimmed) onRename(trimmed);
    setEditing(false);
  };

  const startEditing = () => {
    setEditName(person.name);
    setEditing(true);
  };

  const level = levelOf(person, role);

  const cycleLevel = () => {
    const currentIdx = levels.indexOf(level);
    const nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % levels.length;
    onLevelChange(levels[nextIdx] ?? level);
  };

  const displayLevel = level || levels[0] || '—';
  const roleName = role === 'leader' ? 'Leader' : 'Follower';

  return (
    <li className={styles.personItem}>
      {person.roles.map(({ role: r }) => (
        <span key={r} className={r === 'leader' ? styles.roleLeader : styles.roleFollower}>
          {r === 'leader' ? 'L' : 'F'}
        </span>
      ))}

      {editing ? (
        <input
          className={styles.personInput}
          value={editName}
          autoFocus
          onChange={(e) => setEditName(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') {
              setEditName(person.name);
              setEditing(false);
            }
          }}
        />
      ) : (
        <span className={styles.personName} onDoubleClick={startEditing}>
          {person.name}
        </span>
      )}

      <button className={styles.iconBtn} onClick={startEditing} aria-label="Rename person">
        <span className={styles.pencil}>✏</span>
      </button>

      <button
        className={styles.levelBtn}
        onClick={cycleLevel}
        title={`Tap to change ${roleName.toLowerCase()} level`}
        aria-label={`${roleName} level: ${displayLevel}`}
      >
        {displayLevel}
      </button>

      <button
        className={`${styles.iconBtn} ${styles.deleteBtn}`}
        onClick={onRemove}
        aria-label="Remove person"
      >
        ✕
      </button>
    </li>
  );
}
