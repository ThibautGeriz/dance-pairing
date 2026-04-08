import { useLocalStorage } from './useLocalStorage';
import { DEFAULT_LEVELS } from '../types';
import type { Settings } from '../types';

export function useSettings() {
  const [settings, setSettings] = useLocalStorage<Settings>('dance-pairing:settings', {
    levels: DEFAULT_LEVELS,
  });

  const addLevel = (name: string) => {
    setSettings((prev) => ({ ...prev, levels: [...prev.levels, name.trim()] }));
  };

  const deleteLevel = (index: number) => {
    setSettings((prev) => ({
      ...prev,
      levels: prev.levels.filter((_, i) => i !== index),
    }));
  };

  const renameLevel = (index: number, name: string) => {
    setSettings((prev) => ({
      ...prev,
      levels: prev.levels.map((l, i) => (i === index ? name.trim() : l)),
    }));
  };

  const moveLevelUp = (index: number) => {
    if (index === 0) return;
    setSettings((prev) => {
      const levels = [...prev.levels];
      [levels[index - 1], levels[index]] = [levels[index], levels[index - 1]];
      return { ...prev, levels };
    });
  };

  const moveLevelDown = (index: number) => {
    setSettings((prev) => {
      if (index >= prev.levels.length - 1) return prev;
      const levels = [...prev.levels];
      [levels[index], levels[index + 1]] = [levels[index + 1], levels[index]];
      return { ...prev, levels };
    });
  };

  return { settings, addLevel, deleteLevel, renameLevel, moveLevelUp, moveLevelDown };
}
