import { useState } from 'react';
import { auth } from '../config/firebase';
import Spinner from './Spinner';
import History from './History';
import TeamAdmin from './TeamAdmin';

interface DashboardProps {
  onLogout: () => void;
}

type View = 'spinner' | 'history' | 'team';

export default function Dashboard({ onLogout }: DashboardProps) {
  const [activeView, setActiveView] = useState<View>('spinner');
  const user = auth.currentUser;

  const handleLogout = () => {
    onLogout();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
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
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeView === 'spinner' && <Spinner />}
        {activeView === 'history' && <History />}
        {activeView === 'team' && <TeamAdmin />}
      </main>
    </div>
  );
}
