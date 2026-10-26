import { createContext, useContext } from 'react'
import type { LoginResponse, Session } from '../lib/types'

export interface AuthState {
  session: Session | null; restoring: boolean; error: Error | null
  authenticate: (response: LoginResponse) => void; logout: () => void; restore: () => void
}
export const AuthContext = createContext<AuthState | null>(null)
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('AuthProvider requerido')
  return context
}
