import { useState, useEffect } from 'react';
import { storageService } from '../services/storage';
import type { TeamMember } from '../types';

export default function TeamAdmin() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', photo: '' });

  useEffect(() => {
    loadTeam();
  }, []);

  const loadTeam = () => {
    const data = storageService.getTeam();
    setTeam(data);
  };

  const handleAddClick = () => {
    setIsAdding(true);
    setFormData({ name: '', photo: '' });
  };

  const handleEditClick = (member: TeamMember) => {
    setEditingId(member.id);
    setFormData({ name: member.name, photo: member.photo || '' });
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', photo: '' });
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      alert('Please enter a name');
      return;
    }

    if (isAdding) {
      const newMember: TeamMember = {
        id: Date.now().toString(),
        name: formData.name.trim(),
        photo: formData.photo || undefined,
        isActive: true,
      };
      storageService.addTeamMember(newMember);
    } else if (editingId) {
      storageService.updateTeamMember(editingId, {
        name: formData.name.trim(),
        photo: formData.photo || undefined,
      });
    }

    handleCancel();
    loadTeam();
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (limit to 1MB)
    if (file.size > 1024 * 1024) {
      alert('Photo size must be less than 1MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({ ...formData, photo: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleToggleActive = (id: string, currentStatus: boolean) => {
    storageService.updateTeamMember(id, { isActive: !currentStatus });
    loadTeam();
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      storageService.deleteTeamMember(id);
      loadTeam();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Team Admin</h2>
        {!isAdding && !editingId && (
          <button
            onClick={handleAddClick}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            + Add Member
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {(isAdding || editingId) && (
        <div className="mb-6 p-6 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">
            {isAdding ? 'Add New Member' : 'Edit Member'}
          </h3>

          <div className="space-y-4">
            {/* Name Input */}
            <div>
              <label htmlFor="member-name" className="block text-sm font-medium text-gray-700 mb-2">
                Name *
              </label>
              <input
                type="text"
                id="member-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter member name"
              />
            </div>

            {/* Photo Upload */}
            <div>
              <label htmlFor="member-photo" className="block text-sm font-medium text-gray-700 mb-2">
                Photo (Optional)
              </label>
              <input
                type="file"
                id="member-photo"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {formData.photo && (
                <div className="mt-2">
                  <img
                    src={formData.photo}
                    alt="Preview"
                    className="w-24 h-24 rounded-full object-cover border-2 border-gray-300"
                  />
                </div>
              )}
            </div>

            {/* Action Buttons */}
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

      {/* Team List */}
      {team.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg">No team members yet. Add your first member!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {team.map((member) => (
            <div
              key={member.id}
              className={`border rounded-lg p-4 ${
                member.isActive ? 'border-gray-200 bg-white' : 'border-gray-300 bg-gray-100'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Photo */}
                <div className="flex-shrink-0">
                  {member.photo ? (
                    <img
                      src={member.photo}
                      alt={member.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-gray-300"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold text-xl">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-800 truncate">
                    {member.name}
                  </h3>
                  <p className={`text-sm ${member.isActive ? 'text-green-600' : 'text-red-600'}`}>
                    {member.isActive ? 'Active' : 'Inactive'}
                  </p>

                  {/* Actions */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => handleEditClick(member)}
                      className="text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleActive(member.id, member.isActive)}
                      className={`text-sm underline ${
                        member.isActive
                          ? 'text-orange-600 hover:text-orange-800'
                          : 'text-green-600 hover:text-green-800'
                      }`}
                    >
                      {member.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDelete(member.id, member.name)}
                      className="text-sm text-red-600 hover:text-red-800 underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
