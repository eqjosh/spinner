import { useState, useEffect } from 'react';
import { firestoreService } from '../services/firestore';
import type { SpinHistory } from '../types';

export default function History() {
  const [history, setHistory] = useState<SpinHistory[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const data = await firestoreService.getHistory();
    setHistory(data);
  };

  const handleEditLabel = (entry: SpinHistory) => {
    setEditingId(entry.id);
    setEditLabel(entry.label || '');
  };

  const handleSaveLabel = async (id: string) => {
    await firestoreService.updateHistoryEntry(id, { label: editLabel || undefined });
    setEditingId(null);
    setEditLabel('');
    loadHistory();
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditLabel('');
  };

  const handleToggleEligibility = async (entry: SpinHistory) => {
    await firestoreService.updateHistoryEntry(entry.id, {
      canBeSelectedAgain: !entry.canBeSelectedAgain,
    });
    loadHistory();
  };

  const handleDeleteAllHistory = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete ALL spin history?\n\n' +
      'This will:\n' +
      '• Delete all history entries permanently\n' +
      '• Make all team members eligible again\n' +
      '• This action CANNOT be undone!\n\n' +
      'Click OK to confirm deletion.'
    );

    if (!confirmed) {
      return;
    }

    try {
      await firestoreService.deleteAllHistory();
      loadHistory();
      alert('All history has been deleted. All team members are now eligible to be selected.');
    } catch (error) {
      console.error('Error deleting history:', error);
      alert('Failed to delete history. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDaysSince = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (history.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">No History Yet</h2>
        <p className="text-gray-600">
          Spin the wheel to create your first history entry!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Spin History</h2>

      <div className="space-y-4">
        {history.map((entry) => {
          const daysSince = getDaysSince(entry.date);
          const isWithin30Days = daysSince < 30;

          return (
            <div
              key={entry.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                {/* Left side: Winner info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-gray-800">{entry.memberName}</h3>
                    {isWithin30Days && !entry.canBeSelectedAgain && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
                        Ineligible ({30 - daysSince} days left)
                      </span>
                    )}
                    {entry.canBeSelectedAgain && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                        Eligible Again
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mb-2">{formatDate(entry.date)}</p>

                  {/* Label */}
                  {editingId === entry.id ? (
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="text"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        className="flex-1 px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Add a label..."
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveLabel(entry.id)}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {entry.label ? (
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          {entry.label}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm italic">No label</span>
                      )}
                      <button
                        onClick={() => handleEditLabel(entry)}
                        className="text-blue-600 hover:text-blue-800 text-sm underline"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>

                {/* Right side: Actions */}
                <div className="ml-4">
                  {isWithin30Days && !entry.canBeSelectedAgain ? (
                    <button
                      onClick={() => handleToggleEligibility(entry)}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm whitespace-nowrap"
                    >
                      Allow Selection
                    </button>
                  ) : entry.canBeSelectedAgain ? (
                    <button
                      onClick={() => handleToggleEligibility(entry)}
                      className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm whitespace-nowrap"
                    >
                      Restore 30-day Rule
                    </button>
                  ) : (
                    <span className="text-sm text-gray-500">Eligible</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete All History Button */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <button
          onClick={handleDeleteAllHistory}
          className="w-full px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
        >
          Delete All History
        </button>
        <p className="text-sm text-gray-500 text-center mt-2">
          This will permanently delete all spin history and make everyone eligible again
        </p>
      </div>
    </div>
  );
}
