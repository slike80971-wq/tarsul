/**
 * Tarsul - تراسل | Authentication Store (Zustand)
 * Manages user session, token, and auth state.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
  role: string;
  department?: string | null;
  status: string;
  publicKey?: string | null;
  lastSeen?: Date | string | null;
  createdAt?: Date | string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginError: string | null;
  /** Tracks whether zustand persist has finished hydrating from localStorage */
  _hasHydrated: boolean;

  setUser: (user: User, token: string) => void;
  updateUser: (data: Partial<User>) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  setLoginError: (error: string | null) => void;
  setHasHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      loginError: null,
      _hasHydrated: false,

      setUser: (user, token) =>
        set({
          user,
          token,
          isAuthenticated: true,
          loginError: null,
          isLoading: false,
        }),

      updateUser: (data) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...data } : null,
        })),

      logout: () =>
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          loginError: null,
        }),

      setLoading: (loading) => set({ isLoading: loading }),
      setLoginError: (error) => set({ loginError: error, isLoading: false }),
      setHasHydrated: () => set({ _hasHydrated: true }),
    }),
    {
      name: 'tarsul-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated();
      },
    }
  )
);