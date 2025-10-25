import type { TeamMember, SpinHistory, AuthState } from '../types';

const KEYS = {
  AUTH: 'spinner_auth',
  TEAM: 'spinner_team',
  HISTORY: 'spinner_history',
};

export const storageService = {
  // Auth methods
  getAuth(): AuthState {
    const data = localStorage.getItem(KEYS.AUTH);
    return data ? JSON.parse(data) : { isAuthenticated: false };
  },

  setAuth(auth: AuthState): void {
    localStorage.setItem(KEYS.AUTH, JSON.stringify(auth));
  },

  clearAuth(): void {
    localStorage.removeItem(KEYS.AUTH);
  },

  // Team methods
  getTeam(): TeamMember[] {
    const data = localStorage.getItem(KEYS.TEAM);
    return data ? JSON.parse(data) : [];
  },

  setTeam(team: TeamMember[]): void {
    localStorage.setItem(KEYS.TEAM, JSON.stringify(team));
  },

  addTeamMember(member: TeamMember): void {
    const team = this.getTeam();
    team.push(member);
    this.setTeam(team);
  },

  updateTeamMember(id: string, updates: Partial<TeamMember>): void {
    const team = this.getTeam();
    const index = team.findIndex(m => m.id === id);
    if (index !== -1) {
      team[index] = { ...team[index], ...updates };
      this.setTeam(team);
    }
  },

  deleteTeamMember(id: string): void {
    const team = this.getTeam();
    this.setTeam(team.filter(m => m.id !== id));
  },

  // History methods
  getHistory(): SpinHistory[] {
    const data = localStorage.getItem(KEYS.HISTORY);
    return data ? JSON.parse(data) : [];
  },

  setHistory(history: SpinHistory[]): void {
    localStorage.setItem(KEYS.HISTORY, JSON.stringify(history));
  },

  addHistoryEntry(entry: SpinHistory): void {
    const history = this.getHistory();
    history.unshift(entry); // Add to beginning
    this.setHistory(history);
  },

  updateHistoryEntry(id: string, updates: Partial<SpinHistory>): void {
    const history = this.getHistory();
    const index = history.findIndex(h => h.id === id);
    if (index !== -1) {
      history[index] = { ...history[index], ...updates };
      this.setHistory(history);
    }
  },

  // Utility methods
  getEligibleMembers(): TeamMember[] {
    const team = this.getTeam();
    const history = this.getHistory();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get member IDs that were selected in the last 30 days and can't be selected again
    const recentlySelectedIds = new Set(
      history
        .filter(h => {
          const spinDate = new Date(h.date);
          return spinDate > thirtyDaysAgo && !h.canBeSelectedAgain;
        })
        .map(h => h.memberId)
    );

    // Return active members who haven't been selected recently
    return team.filter(m => m.isActive && !recentlySelectedIds.has(m.id));
  },
};
