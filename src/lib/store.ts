import { create } from 'zustand'
import type { Profile, FbAdAccount } from '@/types/database'

interface AppState {
  profile: Profile | null
  setProfile: (profile: Profile | null) => void

  selectedAccountId: string | null
  setSelectedAccountId: (id: string | null) => void

  accounts: FbAdAccount[]
  setAccounts: (accounts: FbAdAccount[]) => void

  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
}

export const useAppStore = create<AppState>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),

  selectedAccountId: null,
  setSelectedAccountId: (id) => set({ selectedAccountId: id }),

  accounts: [],
  setAccounts: (accounts) => set({ accounts }),

  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}))
