import { create } from 'zustand';
import { User, Chat } from './types';

interface AppState {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  selectedChatId: string | null;
  setSelectedChatId: (id: string | null) => void;
  encryptionKey: string;
  setEncryptionKey: (key: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  selectedChatId: null,
  setSelectedChatId: (id) => set({ selectedChatId: id }),
  encryptionKey: 'cipher-secret', // Default simple key, users can change it per chat in a real app
  setEncryptionKey: (key) => set({ encryptionKey: key }),
}));
