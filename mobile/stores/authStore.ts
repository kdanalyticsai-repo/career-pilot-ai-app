import { create } from 'zustand';
import { authService } from '@/services/auth';
import { storage } from '@/services/storage';

interface User {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: string;
  subscription: string;
  onboarded: boolean;
  avatar_url: string | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hydrated: boolean;
  pendingRole: string;

  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  googleLogin: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  setPendingRole: (role: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  hydrated: false,
  pendingRole: 'job_seeker',

  hydrate: async () => {
    const token = await storage.getAccessToken();
    if (!token) {
      set({ hydrated: true, isAuthenticated: false });
      return;
    }
    try {
      const user = await authService.getMe();
      set({ user, isAuthenticated: true, hydrated: true });
    } catch {
      await storage.clearTokens();
      set({ hydrated: true, isAuthenticated: false });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      await authService.login(email, password);
      const user = await authService.getMe();
      set({ user, isAuthenticated: true });
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (email, password, name) => {
    set({ isLoading: true });
    try {
      const { pendingRole } = useAuthStore.getState();
      await authService.register(email, password, name, pendingRole);
      const user = await authService.getMe();
      set({ user, isAuthenticated: true });
    } finally {
      set({ isLoading: false });
    }
  },

  googleLogin: async (idToken) => {
    set({ isLoading: true });
    try {
      await authService.googleLogin(idToken);
      const user = await authService.getMe();
      set({ user, isAuthenticated: true });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    await authService.logout();
    set({ user: null, isAuthenticated: false });
  },

  setUser: (user) => set({ user }),
  setPendingRole: (role) => set({ pendingRole: role }),
}));
