import { useState } from 'react';
import { isSamePair } from '../utils/forbidden';
import type { ForbiddenPair, Person, PersonId } from '../types';
import styles from './ForbiddenPairs.module.css';

interface ForbiddenPairsProps {
  people: Person[];
  forbiddenPairs: ForbiddenPair[];
  onAdd: (a: PersonId, b: PersonId) => void;
  onRemove: (a: PersonId, b: PersonId) => void;
}

export default function ForbiddenPairs({
  people,
  forbiddenPairs,
  onAdd,
  onRemove,
}: ForbiddenPairsProps) {
  const [firstId, setFirstId] = useState<PersonId | null>(null);
  const [secondId, setSecondId] = useState<PersonId | null>(null);

  const nameById = new Map(people.map((p) => [p.id, p.name]));
  // Resolve a <select> value back to a known person id instead of casting it
  const toPersonId = (value: string) => people.find((p) => p.id === value)?.id ?? null;

  // The pair to add, or null when the selection is incomplete or already forbidden
  const pending: ForbiddenPair | null =
    firstId && secondId && firstId !== secondId ? [firstId, secondId] : null;
  const canAdd = pending !== null && !forbiddenPairs.some((pair) => isSamePair(pair, ...pending));

  const handleAdd = () => {
    if (!pending || !canAdd) return;
    onAdd(...pending);
    setSecondId(null);
  };

  return (
    <section className={styles.section} aria-labelledby="forbidden-pairs-title">
      <h2 id="forbidden-pairs-title" className={styles.title}>
        Never pair together
      </h2>

      <div className={styles.addRow}>
        <select
          className={styles.select}
          value={firstId ?? ''}
          onChange={(e) => {
            const id = toPersonId(e.target.value);
            setFirstId(id);
            if (id === secondId) setSecondId(null);
          }}
          aria-label="Dancer"
        >
          <option value="">Dancer…</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <span className={styles.separator} aria-hidden="true">
          ✕
        </span>
        <select
          className={styles.select}
          value={secondId ?? ''}
          onChange={(e) => setSecondId(toPersonId(e.target.value))}
          aria-label="Never with"
        >
          <option value="">Never with…</option>
          {people
            .filter((p) => p.id !== firstId)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
        <button className={styles.addBtn} onClick={handleAdd} disabled={!canAdd}>
          Forbid
        </button>
      </div>

      {forbiddenPairs.length > 0 && (
        <ul className={styles.list}>
          {forbiddenPairs.map(([a, b]) => {
            const label = `${nameById.get(a)} and ${nameById.get(b)}`;
            return (
              <li key={`${a}|${b}`} className={styles.item}>
                <span className={styles.names}>
                  {nameById.get(a)} <span aria-hidden="true">✕</span>
                  <span className={styles.visuallyHidden}>never with</span> {nameById.get(b)}
                </span>
                <button
                  className={styles.removeBtn}
                  onClick={() => onRemove(a, b)}
                  aria-label={`Allow ${label} to dance together`}
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
