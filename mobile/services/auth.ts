import { api } from './api';
import { storage } from './storage';

interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

interface UserInfo {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: string;
  subscription: string;
  onboarded: boolean;
  avatar_url: string | null;
}

export const authService = {
  async register(email: string, password: string, name: string, role: string = 'job_seeker'): Promise<AuthTokens> {
    const { data } = await api.post<AuthTokens>('/auth/register', { email, password, name, role });
    await storage.setTokens(data.access_token, data.refresh_token);
    return data;
  },

  async login(email: string, password: string): Promise<AuthTokens> {
    const { data } = await api.post<AuthTokens>('/auth/login', { email, password });
    await storage.setTokens(data.access_token, data.refresh_token);
    return data;
  },

  async googleLogin(idToken: string): Promise<AuthTokens> {
    const { data } = await api.post<AuthTokens>('/auth/google', { id_token: idToken });
    await storage.setTokens(data.access_token, data.refresh_token);
    return data;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout').catch(() => {});
    await storage.clearTokens();
  },

  async getMe(): Promise<UserInfo> {
    const { data } = await api.get<UserInfo>('/users/me');
    return data;
  },
};
