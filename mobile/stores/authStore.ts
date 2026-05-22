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
  phone_verified: boolean;
  avatar_url: string | null;
  trial_ends_at: string | null;
  created_at: string;
  // Provider company verification
  company_pan: string | null;
  company_reg_no: string | null;
  gstin: string | null;
  total_vacancies: number | null;
  pan_verified: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hydrated: boolean;
  pendingRole: string;

  hydrate: () => Promise<void>;
  login: (email: string, password: string, expectedRole?: string) => Promise<void>;
  adminLogin: (email: string, password: string) => Promise<void>;
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

  login: async (email, password, expectedRole) => {
    set({ isLoading: true });
    try {
      await authService.login(email, password);
      const user = await authService.getMe();
      if (expectedRole && user.role !== 'admin' && user.role !== expectedRole) {
        await authService.logout();
        const err: any = new Error('role_mismatch');
        err.isRoleMismatch = true;
        err.actualRole = user.role;
        throw err;
      }
      set({ user, isAuthenticated: true });
    } finally {
      set({ isLoading: false });
    }
  },

  adminLogin: async (email, password) => {
    set({ isLoading: true });
    try {
      await authService.adminLogin(email, password);
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
