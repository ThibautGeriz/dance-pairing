import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSettings } from '../states/useSettings';
import styles from './SettingsPage.module.css';

export default function SettingsPage() {
  const { settings, addLevel, deleteLevel, renameLevel, moveLevelUp, moveLevelDown } =
    useSettings();

  const [newLevel, setNewLevel] = useState('');
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleAdd = () => {
    const trimmed = newLevel.trim();
    if (!trimmed) return;
    addLevel(trimmed);
    setNewLevel('');
  };

  const startEdit = (i: number) => {
    setEditingIdx(i);
    setEditingName(settings.levels[i]);
  };

  const commitEdit = () => {
    if (editingIdx !== null && editingName.trim()) {
      renameLevel(editingIdx, editingName.trim());
    }
    setEditingIdx(null);
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/" className={styles.back}>
          ← Back
        </Link>
        <h1 className={styles.title}>Settings</h1>
      </header>

      <main className={styles.main}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Dance Levels</h2>
          <p className={styles.sectionDesc}>
            Assigned to each dancer. Tap a level badge to cycle, or enable "Match by level" in a
            session.
          </p>

          <ul className={styles.list}>
            {settings.levels.map((level, i) => (
              <li key={i} className={styles.item}>
                {editingIdx === i ? (
                  <input
                    className={styles.editInput}
                    value={editingName}
                    autoFocus
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitEdit();
                      if (e.key === 'Escape') setEditingIdx(null);
                    }}
                    aria-label="Level name"
                  />
                ) : (
                  <span className={styles.levelName}>{level}</span>
                )}

                <div className={styles.actions}>
                  <button
                    className={styles.iconBtn}
                    onClick={() => moveLevelUp(i)}
                    disabled={i === 0}
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                  <button
                    className={styles.iconBtn}
                    onClick={() => moveLevelDown(i)}
                    disabled={i === settings.levels.length - 1}
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                  <button
                    className={styles.iconBtn}
                    onClick={() => startEdit(i)}
                    aria-label="Rename level"
                  >
                    <span className={styles.pencil}>✏</span>
                  </button>
                  <button
                    className={`${styles.iconBtn} ${styles.deleteBtn}`}
                    onClick={() => deleteLevel(i)}
                    aria-label="Delete level"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className={styles.addRow}>
            <input
              className={styles.input}
              value={newLevel}
              onChange={(e) => setNewLevel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="New level…"
              aria-label="New level name"
            />
            <button className={styles.addBtn} onClick={handleAdd}>
              Add
            </button>
          </div>

          <button
            className={styles.resetBtn}
            onClick={() => {
              setEditingIdx(null);
              if (window.confirm('Reset levels to defaults?')) {
                window.location.reload();
              }
            }}
          >
            Reset to defaults
          </button>
        </section>
      </main>
    </div>
  );
}
