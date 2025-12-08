import { useState } from 'react';
import { useTeam } from '../context/TeamContext';
import { firestoreService } from '../services/firestore';
import type { Team } from '../types';

export default function TeamsManagement() {
  const { teams, loadTeams, setSelectedTeam } = useTeam();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '' });

  const handleAddClick = () => {
    setIsAdding(true);
    setFormData({ name: '' });
  };

  const handleEditClick = (team: Team) => {
    setEditingId(team.id);
    setFormData({ name: team.name });
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '' });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Please enter a team name');
      return;
    }

    if (isAdding) {
      const newTeam: Team = {
        id: Date.now().toString(),
        name: formData.name.trim(),
        createdAt: new Date().toISOString(),
      };
      await firestoreService.createTeam(newTeam);
      await loadTeams();
      setSelectedTeam(newTeam);
    } else if (editingId) {
      await firestoreService.updateTeam(editingId, {
        name: formData.name.trim(),
      });
      await loadTeams();
    }

    handleCancel();
  };

  const handleDelete = async (id: string, name: string) => {
    if (teams.length <= 1) {
      alert('You must have at least one team. Create a new team before deleting this one.');
      return;
    }

    if (confirm(`Are you sure you want to delete team "${name}"? This will delete all members and history for this team.`)) {
      await firestoreService.deleteTeam(id);
      await loadTeams();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Teams Management</h2>
        {!isAdding && !editingId && (
          <button
            onClick={handleAddClick}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            + Create Team
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {(isAdding || editingId) && (
        <div className="mb-6 p-6 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">
            {isAdding ? 'Create New Team' : 'Edit Team'}
          </h3>

          <div className="space-y-4">
            <div>
              <label htmlFor="team-name" className="block text-sm font-medium text-gray-700 mb-2">
                Team Name *
              </label>
              <input
                type="text"
                id="team-name"
                value={formData.name}
                onChange={(e) => setFormData({ name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter team name"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teams List */}
      {teams.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg">No teams yet. Create your first team!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => (
            <div
              key={team.id}
              className="border border-gray-200 bg-white rounded-lg p-4"
            >
              <div className="flex flex-col gap-3">
                <h3 className="text-lg font-semibold text-gray-800">
                  {team.name}
                </h3>
                <p className="text-sm text-gray-600">
                  Created: {new Date(team.createdAt).toLocaleDateString()}
                </p>

                <div className="flex flex-wrap gap-2 mt-2">
                  <button
                    onClick={() => handleEditClick(team)}
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(team.id, team.name)}
                    className="text-sm text-red-600 hover:text-red-800 underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
