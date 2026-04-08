# Dance Pairing

A mobile-first Progressive Web App for managing dance class pairings across multiple rounds.

## Features

- **Rooms** — Create, rename, and delete rooms (e.g. a class or group)
- **People** — Add, rename, and remove people per room; assign each a role (`leader` / `follower`) and a skill level
- **Sessions** — Start a session from a room; deselect absent people, choose the number of rounds, and optionally enable level-based matching before generating pairs
- **Random pairing** — Leaders and followers are paired randomly across rounds; when numbers are uneven, the shorter side cycles so everyone dances
- **Level-based pairing** — Optionally pair dancers of similar skill levels, minimising level distance across all pairs in a round
- **History-aware** — The algorithm tracks pairings across all rounds in a session and avoids repeats wherever possible
- **Settings** — Customise the list of skill levels used across all rooms
- **Persistent** — All data is stored in `localStorage`; no backend required

## Tech Stack

- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) as the build tool
- [CSS Modules](https://github.com/css-modules/css-modules) for scoped styles
- Mobile-first responsive design

## Getting Started

```bash
npm install
npm run dev
```

Other useful scripts:

| Command | Description |
|---------|-------------|
| `npm test` | Run tests once |
| `npm run test:coverage` | Run tests with coverage report (fails below 95%) |
| `npm run typecheck` | TypeScript type-check without emitting |
| `npm run lint` | ESLint |
| `npm run format` | Auto-format with Prettier |

## Project Structure

```
src/
  pages/      # Route-level pages (Rooms, Room detail, Session, SessionView, Settings)
  states/     # Custom hooks for localStorage-backed state (useRooms, useSettings, useLocalStorage)
  types/      # Shared TypeScript types (Person, Room, Session, Pair, Settings)
  utils/      # Pairing algorithm (pairing.ts + pairing.test.ts)
```

## Pairing Algorithm

Given the list of present leaders and followers, for each round:

1. **Random mode**: shuffle both sides with Fisher-Yates; pair them index by index. If one side is longer, the shorter side cycles.
2. **Level mode**: sort leaders by level (highest first); for each leader, pick the follower who (in priority order): has danced the fewest times this round → has not danced with this leader before → is closest in level.
3. Both modes try up to 20 shuffle/rotation combinations and keep the attempt with the lowest score (level distance + 100 per repeated pair).
4. Across rounds, a history map records every leader–follower pairing so the next round can avoid repeats.

## Data Model

```ts
type Role = 'leader' | 'follower';

interface Person {
  id: string;
  name: string;
  role: Role;
  level: string;   // e.g. 'Newcomer', 'Intermediate'
}

interface Pair {
  leader: Person;
  follower: Person;
}

interface Session {
  id: string;
  createdAt: number;       // ms timestamp
  rounds: Pair[][];        // rounds[roundIndex][pairIndex]
  pairByLevel?: boolean;
}

interface Room {
  id: string;
  name: string;
  people: Person[];
  sessions: Session[];
}

interface Settings {
  levels: string[];        // ordered list of skill levels
}
```

Data is stored under two `localStorage` keys:
- `dance-pairing:rooms` — the full `Room[]` array
- `dance-pairing:settings` — the `Settings` object
