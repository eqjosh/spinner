import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { firestoreService } from '../services/firestore';
import type { Team } from '../types';

interface TeamContextType {
  teams: Team[];
  selectedTeam: Team | null;
  setSelectedTeam: (team: Team) => void;
  loadTeams: () => Promise<void>;
  loading: boolean;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export const useTeam = () => {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error('useTeam must be used within TeamProvider');
  }
  return context;
};

interface TeamProviderProps {
  children: ReactNode;
}

export const TeamProvider = ({ children }: TeamProviderProps) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeamState] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const loadedTeams = await firestoreService.getTeams();
      setTeams(loadedTeams);

      // If no team is selected, select the first one
      if (!selectedTeam && loadedTeams.length > 0) {
        const savedTeamId = localStorage.getItem('selectedTeamId');
        const teamToSelect = savedTeamId
          ? loadedTeams.find(t => t.id === savedTeamId) || loadedTeams[0]
          : loadedTeams[0];
        setSelectedTeamState(teamToSelect);
      }
    } catch (error) {
      console.error('Error loading teams:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  const setSelectedTeam = (team: Team) => {
    setSelectedTeamState(team);
    localStorage.setItem('selectedTeamId', team.id);
  };

  return (
    <TeamContext.Provider
      value={{
        teams,
        selectedTeam,
        setSelectedTeam,
        loadTeams,
        loading,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
};
