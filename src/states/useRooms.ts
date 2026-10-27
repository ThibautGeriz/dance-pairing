import { useLocalStorage } from './useLocalStorage';
import { isSamePair } from '../utils/forbidden';
import { toRoles } from '../utils/roles';
import { normalizeRooms } from '../utils/storage';
import type { Room, Person, PersonId, Roles, Session, Pair } from '../types';

const STORAGE_KEY = 'dance-pairing:rooms';

function generateId(): string {
  return crypto.randomUUID();
}

function generatePersonId(): PersonId {
  return crypto.randomUUID() as PersonId;
}

export function useRooms() {
  const [storedRooms, setStoredRooms] = useLocalStorage<Room[]>(STORAGE_KEY, []);
  const rooms = normalizeRooms(storedRooms);
  const setRooms = (update: (prev: Room[]) => Room[]) =>
    setStoredRooms((prev) => update(normalizeRooms(prev)));

  const addRoom = (name: string) => {
    const newRoom: Room = {
      id: generateId(),
      name: name.trim(),
      people: [],
      sessions: [],
      forbiddenPairs: [],
    };
    setRooms((prev) => [...prev, newRoom]);
  };

  const deleteRoom = (roomId: string) => {
    setRooms((prev) => prev.filter((r) => r.id !== roomId));
  };

  const renameRoom = (roomId: string, name: string) => {
    setRooms((prev) => prev.map((r) => (r.id === roomId ? { ...r, name: name.trim() } : r)));
  };

  const addPerson = (roomId: string, name: string, roles: Roles, level: string) => {
    const person: Person = {
      id: generatePersonId(),
      name: name.trim(),
      roles: toRoles(roles) ?? roles,
      level,
    };
    setRooms((prev) =>
      prev.map((r) => (r.id === roomId ? { ...r, people: [...r.people, person] } : r)),
    );
  };

  const removePerson = (roomId: string, personId: PersonId) => {
    setRooms((prev) =>
      prev.map((r) =>
        r.id === roomId
          ? {
              ...r,
              people: r.people.filter((p) => p.id !== personId),
              forbiddenPairs: r.forbiddenPairs.filter((pair) => !pair.includes(personId)),
            }
          : r,
      ),
    );
  };

  const renamePerson = (roomId: string, personId: PersonId, name: string) => {
    setRooms((prev) =>
      prev.map((r) =>
        r.id === roomId
          ? {
              ...r,
              people: r.people.map((p) => (p.id === personId ? { ...p, name: name.trim() } : p)),
            }
          : r,
      ),
    );
  };

  const changePersonLevel = (roomId: string, personId: PersonId, level: string) => {
    setRooms((prev) =>
      prev.map((r) =>
        r.id === roomId
          ? { ...r, people: r.people.map((p) => (p.id === personId ? { ...p, level } : p)) }
          : r,
      ),
    );
  };

  const addForbiddenPair = (roomId: string, a: PersonId, b: PersonId) => {
    if (a === b) return;
    setRooms((prev) =>
      prev.map((r) =>
        r.id === roomId && !r.forbiddenPairs.some((pair) => isSamePair(pair, a, b))
          ? { ...r, forbiddenPairs: [...r.forbiddenPairs, [a, b]] }
          : r,
      ),
    );
  };

  const removeForbiddenPair = (roomId: string, a: PersonId, b: PersonId) => {
    setRooms((prev) =>
      prev.map((r) =>
        r.id === roomId
          ? { ...r, forbiddenPairs: r.forbiddenPairs.filter((pair) => !isSamePair(pair, a, b)) }
          : r,
      ),
    );
  };

  const addSession = (roomId: string, rounds: Pair[][], pairByLevel: boolean): string => {
    const id = generateId();
    const session: Session = { id, createdAt: Date.now(), rounds, pairByLevel };
    setRooms((prev) =>
      prev.map((r) => (r.id === roomId ? { ...r, sessions: [...r.sessions, session] } : r)),
    );
    return id;
  };

  const updateSessionRounds = (roomId: string, sessionId: string, rounds: Pair[][]): void => {
    setRooms((prev) =>
      prev.map((r) =>
        r.id === roomId
          ? {
              ...r,
              sessions: r.sessions.map((s) => (s.id === sessionId ? { ...s, rounds } : s)),
            }
          : r,
      ),
    );
  };

  const getRoom = (roomId: string): Room | undefined => {
    return rooms.find((r) => r.id === roomId);
  };

  return {
    rooms,
    addRoom,
    deleteRoom,
    renameRoom,
    addPerson,
    removePerson,
    renamePerson,
    changePersonLevel,
    addForbiddenPair,
    removeForbiddenPair,
    addSession,
    updateSessionRounds,
    getRoom,
  };
}
