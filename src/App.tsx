import { Routes, Route } from 'react-router-dom';
import RoomsPage from './pages/RoomsPage';
import RoomPage from './pages/RoomPage';
import SessionPage from './pages/SessionPage';
import SessionViewPage from './pages/SessionViewPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RoomsPage />} />
      <Route path="/rooms/:roomId" element={<RoomPage />} />
      <Route path="/rooms/:roomId/session" element={<SessionPage />} />
      <Route path="/rooms/:roomId/sessions/:sessionId" element={<SessionViewPage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  );
}
