import { useState } from 'react';
import { auth } from '../config/firebase';
import { useTeam } from '../context/TeamContext';
import Spinner from './Spinner';
import History from './History';
import TeamAdmin from './TeamAdmin';
import TeamsManagement from './TeamsManagement';

interface DashboardProps {
  onLogout: () => void;
}

type View = 'spinner' | 'history' | 'team' | 'teams';

export default function Dashboard({ onLogout }: DashboardProps) {
  const [activeView, setActiveView] = useState<View>('spinner');
  const { teams, selectedTeam, setSelectedTeam, loading } = useTeam();
  const user = auth.currentUser;

  const handleLogout = () => {
    onLogout();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600 text-xl">Loading teams...</div>
      </div>
    );
  }

  // If no teams exist, show teams management
  if (teams.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white shadow-md">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">Team Spinner</h1>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">Welcome, {user?.email}</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-8">
          <TeamsManagement />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Team Spinner</h1>
          <div className="flex items-center gap-4">
            {/* Team Selector */}
            {selectedTeam && (
              <div className="flex items-center gap-2">
                <label htmlFor="team-select" className="text-sm text-gray-600">
                  Team:
                </label>
                <select
                  id="team-select"
                  value={selectedTeam.id}
                  onChange={(e) => {
                    const team = teams.find(t => t.id === e.target.value);
                    if (team) setSelectedTeam(team);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <span className="text-gray-600">Welcome, {user?.email}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveView('spinner')}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                activeView === 'spinner'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              Spinner
            </button>
            <button
              onClick={() => setActiveView('history')}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                activeView === 'history'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              History
            </button>
            <button
              onClick={() => setActiveView('team')}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                activeView === 'team'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              Team Admin
            </button>
            <button
              onClick={() => setActiveView('teams')}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                activeView === 'teams'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              Manage Teams
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeView === 'spinner' && selectedTeam && <Spinner />}
        {activeView === 'history' && selectedTeam && <History />}
        {activeView === 'team' && selectedTeam && <TeamAdmin />}
        {activeView === 'teams' && <TeamsManagement />}
      </main>
    </div>
  );
}
