export interface TeamMember {
  id: string;
  name: string;
  photo?: string; // Base64 encoded image or URL
  isActive: boolean;
}

export interface SpinHistory {
  id: string;
  memberId: string;
  memberName: string;
  date: string;
  label?: string;
  canBeSelectedAgain: boolean; // If true, overrides the 30-day rule
}

export interface AuthState {
  isAuthenticated: boolean;
  username?: string;
}
