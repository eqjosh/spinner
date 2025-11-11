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
import type { TeamMember, SpinHistory } from '../types';

// Get current user ID
const getUserId = (): string => {
  const user = auth.currentUser;
  if (!user) throw new Error('No authenticated user');
  return user.uid;
};

// Collection references
const getTeamCollection = () => {
  const userId = getUserId();
  return collection(db, 'users', userId, 'team');
};

const getHistoryCollection = () => {
  const userId = getUserId();
  return collection(db, 'users', userId, 'history');
};

export const firestoreService = {
  // Team methods
  async getTeam(): Promise<TeamMember[]> {
    try {
      const teamCol = getTeamCollection();
      // IMPORTANT: Order by name to ensure consistent ordering across queries
      // This prevents wheel segments from being misaligned with member indices
      const q = query(teamCol, orderBy('name'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as TeamMember));
    } catch (error) {
      console.error('Error getting team:', error);
      return [];
    }
  },

  async addTeamMember(member: TeamMember): Promise<void> {
    try {
      const teamCol = getTeamCollection();
      const memberRef = doc(teamCol, member.id);
      await setDoc(memberRef, member);
    } catch (error) {
      console.error('Error adding team member:', error);
      throw error;
    }
  },

  async updateTeamMember(id: string, updates: Partial<TeamMember>): Promise<void> {
    try {
      const teamCol = getTeamCollection();
      const memberRef = doc(teamCol, id);
      await updateDoc(memberRef, updates);
    } catch (error) {
      console.error('Error updating team member:', error);
      throw error;
    }
  },

  async deleteTeamMember(id: string): Promise<void> {
    try {
      const teamCol = getTeamCollection();
      const memberRef = doc(teamCol, id);
      await deleteDoc(memberRef);
    } catch (error) {
      console.error('Error deleting team member:', error);
      throw error;
    }
  },

  // History methods
  async getHistory(): Promise<SpinHistory[]> {
    try {
      const historyCol = getHistoryCollection();
      const q = query(historyCol, orderBy('date', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as SpinHistory));
    } catch (error) {
      console.error('Error getting history:', error);
      return [];
    }
  },

  async addHistoryEntry(entry: SpinHistory): Promise<void> {
    try {
      const historyCol = getHistoryCollection();
      const entryRef = doc(historyCol, entry.id);
      await setDoc(entryRef, entry);
    } catch (error) {
      console.error('Error adding history entry:', error);
      throw error;
    }
  },

  async updateHistoryEntry(id: string, updates: Partial<SpinHistory>): Promise<void> {
    try {
      const historyCol = getHistoryCollection();
      const entryRef = doc(historyCol, id);
      await updateDoc(entryRef, updates);
    } catch (error) {
      console.error('Error updating history entry:', error);
      throw error;
    }
  },

  async deleteAllHistory(): Promise<void> {
    try {
      const historyCol = getHistoryCollection();
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
  async getEligibleMembers(): Promise<TeamMember[]> {
    try {
      const team = await this.getTeam();
      const history = await this.getHistory();
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
