import { useState } from 'react';
import type { Person } from '../types';
import styles from './PersonItem.module.css';

interface PersonItemProps {
  person: Person;
  levels: string[];
  onRemove: () => void;
  onRename: (name: string) => void;
  onLevelChange: (level: string) => void;
}

export default function PersonItem({
  person,
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

  const cycleLevel = () => {
    const currentIdx = levels.indexOf(person.level ?? '');
    const nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % levels.length;
    onLevelChange(levels[nextIdx] ?? person.level);
  };

  const displayLevel = person.level || levels[0] || '—';

  return (
    <li className={styles.personItem}>
      <span className={person.role === 'leader' ? styles.roleLeader : styles.roleFollower}>
        {person.role === 'leader' ? 'L' : 'F'}
      </span>

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
        title="Tap to change level"
        aria-label={`Level: ${displayLevel}`}
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
