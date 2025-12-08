import {
  collection,
  doc,
  setDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import type { Team, TeamMember, SpinHistory } from '../types';

// Get current user ID
const getUserId = (): string => {
  const user = auth.currentUser;
  if (!user) throw new Error('No authenticated user');
  return user.uid;
};

// Collection references
const getTeamsCollection = () => {
  const userId = getUserId();
  return collection(db, 'users', userId, 'teams');
};

const getTeamMembersCollection = (teamId: string) => {
  const userId = getUserId();
  return collection(db, 'users', userId, 'teams', teamId, 'members');
};

const getHistoryCollection = (teamId: string) => {
  const userId = getUserId();
  return collection(db, 'users', userId, 'teams', teamId, 'history');
};

export const firestoreService = {
  // Team management methods
  async getTeams(): Promise<Team[]> {
    try {
      const teamsCol = getTeamsCollection();
      const q = query(teamsCol, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Team));
    } catch (error) {
      console.error('Error getting teams:', error);
      return [];
    }
  },

  async createTeam(team: Team): Promise<void> {
    try {
      const teamsCol = getTeamsCollection();
      const teamRef = doc(teamsCol, team.id);
      await setDoc(teamRef, team);
    } catch (error) {
      console.error('Error creating team:', error);
      throw error;
    }
  },

  async updateTeam(id: string, updates: Partial<Team>): Promise<void> {
    try {
      const teamsCol = getTeamsCollection();
      const teamRef = doc(teamsCol, id);
      await updateDoc(teamRef, updates);
    } catch (error) {
      console.error('Error updating team:', error);
      throw error;
    }
  },

  async deleteTeam(id: string): Promise<void> {
    try {
      const teamsCol = getTeamsCollection();
      const teamRef = doc(teamsCol, id);
      await deleteDoc(teamRef);
    } catch (error) {
      console.error('Error deleting team:', error);
      throw error;
    }
  },

  // Team member methods (now scoped to a specific team)
  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    try {
      const membersCol = getTeamMembersCollection(teamId);
      // IMPORTANT: Order by name to ensure consistent ordering across queries
      // This prevents wheel segments from being misaligned with member indices
      const q = query(membersCol, orderBy('name'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as TeamMember));
    } catch (error) {
      console.error('Error getting team members:', error);
      return [];
    }
  },

  async addTeamMember(teamId: string, member: TeamMember): Promise<void> {
    try {
      const membersCol = getTeamMembersCollection(teamId);
      const memberRef = doc(membersCol, member.id);
      await setDoc(memberRef, member);
    } catch (error) {
      console.error('Error adding team member:', error);
      throw error;
    }
  },

  async updateTeamMember(teamId: string, id: string, updates: Partial<TeamMember>): Promise<void> {
    try {
      const membersCol = getTeamMembersCollection(teamId);
      const memberRef = doc(membersCol, id);
      await updateDoc(memberRef, updates);
    } catch (error) {
      console.error('Error updating team member:', error);
      throw error;
    }
  },

  async deleteTeamMember(teamId: string, id: string): Promise<void> {
    try {
      const membersCol = getTeamMembersCollection(teamId);
      const memberRef = doc(membersCol, id);
      await deleteDoc(memberRef);
    } catch (error) {
      console.error('Error deleting team member:', error);
      throw error;
    }
  },

  // History methods (now scoped to a specific team)
  async getHistory(teamId: string): Promise<SpinHistory[]> {
    try {
      const historyCol = getHistoryCollection(teamId);
      const q = query(historyCol, orderBy('date', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as SpinHistory));
    } catch (error) {
      console.error('Error getting history:', error);
      return [];
    }
  },

  async addHistoryEntry(teamId: string, entry: SpinHistory): Promise<void> {
    try {
      const historyCol = getHistoryCollection(teamId);
      const entryRef = doc(historyCol, entry.id);
      await setDoc(entryRef, entry);
    } catch (error) {
      console.error('Error adding history entry:', error);
      throw error;
    }
  },

  async updateHistoryEntry(teamId: string, id: string, updates: Partial<SpinHistory>): Promise<void> {
    try {
      const historyCol = getHistoryCollection(teamId);
      const entryRef = doc(historyCol, id);
      await updateDoc(entryRef, updates);
    } catch (error) {
      console.error('Error updating history entry:', error);
      throw error;
    }
  },

  async deleteAllHistory(teamId: string): Promise<void> {
    try {
      const historyCol = getHistoryCollection(teamId);
      const snapshot = await getDocs(historyCol);

      // Delete all history entries
      const deletePromises = snapshot.docs.map(docSnapshot =>
        deleteDoc(doc(historyCol, docSnapshot.id))
      );

      await Promise.all(deletePromises);
      console.log(`Deleted ${snapshot.docs.length} history entries`);
    } catch (error) {
      console.error('Error deleting all history:', error);
      throw error;
    }
  },

  // Utility methods
  async getEligibleMembers(teamId: string): Promise<TeamMember[]> {
    try {
      const team = await this.getTeamMembers(teamId);
      const history = await this.getHistory(teamId);
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
    } catch (error) {
      console.error('Error getting eligible members:', error);
      return [];
    }
  },
};
