import { useState, useEffect } from 'react';
import { storageService } from '../services/storage';
import type { TeamMember, SpinHistory } from '../types';

export default function Spinner() {
  const [label, setLabel] = useState('');
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [eligibleMembers, setEligibleMembers] = useState<TeamMember[]>([]);
  const [winner, setWinner] = useState<TeamMember | null>(null);

  useEffect(() => {
    loadEligibleMembers();
  }, []);

  const loadEligibleMembers = () => {
    const members = storageService.getEligibleMembers();
    setEligibleMembers(members);
  };

  const handleSpin = () => {
    if (spinning || eligibleMembers.length === 0) return;

    // Reset winner
    setWinner(null);
    setSpinning(true);

    // Select random winner
    const randomIndex = Math.floor(Math.random() * eligibleMembers.length);
    const selectedMember = eligibleMembers[randomIndex];

    // Calculate rotation (multiple spins + final position)
    // Spin 5-7 times plus land on winner
    const extraSpins = 5 + Math.random() * 2;
    const degreesPerMember = 360 / eligibleMembers.length;
    const finalRotation = rotation + 360 * extraSpins + randomIndex * degreesPerMember;
    setRotation(finalRotation);

    // After animation, show winner
    setTimeout(() => {
      setWinner(selectedMember);
      setSpinning(false);

      // Save to history
      const historyEntry: SpinHistory = {
        id: Date.now().toString(),
        memberId: selectedMember.id,
        memberName: selectedMember.name,
        date: new Date().toISOString(),
        label: label || undefined,
        canBeSelectedAgain: false,
      };
      storageService.addHistoryEntry(historyEntry);

      // Refresh eligible members for next spin
      loadEligibleMembers();
    }, 5000); // 5 seconds for the spin animation
  };

  // Calculate photo size based on number of members
  const getPhotoSize = (memberCount: number) => {
    if (memberCount <= 3) return 100;
    if (memberCount <= 5) return 80;
    if (memberCount <= 8) return 60;
    return 50;
  };

  if (eligibleMembers.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">No Eligible Members</h2>
        <p className="text-gray-600 mb-4">
          There are no team members available to spin. This could be because:
        </p>
        <ul className="text-left max-w-md mx-auto space-y-2 text-gray-600 mb-6">
          <li>• No team members have been added yet</li>
          <li>• All team members are inactive</li>
          <li>• All active members were selected in the last 30 days</li>
        </ul>
        <p className="text-blue-600 font-medium">
          Go to Team Admin to add or activate team members, or check History to allow recent winners to be selected again.
        </p>
      </div>
    );
  }

  const photoSize = getPhotoSize(eligibleMembers.length);

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Spin the Wheel</h2>

      {/* Label Input */}
      <div className="mb-8 max-w-md mx-auto">
        <label htmlFor="spin-label" className="block text-sm font-medium text-gray-700 mb-2">
          Label (Optional)
        </label>
        <input
          type="text"
          id="spin-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          disabled={spinning}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          placeholder="e.g., Sprint Demo, Code Review"
        />
      </div>

      {/* Wheel Container */}
      <div className="relative w-96 h-96 mx-auto mb-8">
        {/* Pointer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
          <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[40px] border-t-red-600"></div>
        </div>

        {/* Wheel */}
        <div
          className="w-full h-full rounded-full border-8 border-gray-800 overflow-hidden relative shadow-2xl"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? 'transform 5s cubic-bezier(0.17, 0.67, 0.83, 0.67)' : 'none',
          }}
        >
          {eligibleMembers.map((member, index) => {
            const degreesPerSegment = 360 / eligibleMembers.length;
            const startAngle = index * degreesPerSegment;
            const colors = [
              'bg-red-500',
              'bg-blue-500',
              'bg-green-500',
              'bg-yellow-500',
              'bg-purple-500',
              'bg-pink-500',
              'bg-indigo-500',
              'bg-orange-500',
            ];
            const color = colors[index % colors.length];

            return (
              <div
                key={member.id}
                className={`absolute w-full h-full ${color} flex items-center justify-center`}
                style={{
                  clipPath: `polygon(50% 50%, ${50 + 50 * Math.cos((startAngle - 90) * Math.PI / 180)}% ${50 + 50 * Math.sin((startAngle - 90) * Math.PI / 180)}%, ${50 + 50 * Math.cos((startAngle + degreesPerSegment - 90) * Math.PI / 180)}% ${50 + 50 * Math.sin((startAngle + degreesPerSegment - 90) * Math.PI / 180)}%)`,
                  transform: `rotate(${startAngle}deg)`,
                  transformOrigin: 'center',
                }}
              >
                <div
                  className="absolute flex items-center justify-center"
                  style={{
                    transform: `rotate(${degreesPerSegment / 2}deg) translateY(-${photoSize / 2 + 40}px)`,
                    transformOrigin: 'center',
                  }}
                >
                  {/* Photo or Initial */}
                  {member.photo ? (
                    <img
                      src={member.photo}
                      alt={member.name}
                      className="rounded-full object-cover border-4 border-white shadow-lg"
                      style={{
                        width: `${photoSize}px`,
                        height: `${photoSize}px`,
                      }}
                    />
                  ) : (
                    <div
                      className="rounded-full bg-white flex items-center justify-center border-4 border-white shadow-lg"
                      style={{
                        width: `${photoSize}px`,
                        height: `${photoSize}px`,
                      }}
                    >
                      <span className="text-gray-700 font-bold" style={{ fontSize: `${photoSize / 2}px` }}>
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Spin Button */}
      <div className="text-center">
        <button
          onClick={handleSpin}
          disabled={spinning}
          className="px-8 py-4 bg-blue-600 text-white text-xl font-bold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-lg"
        >
          {spinning ? 'Spinning...' : 'SPIN!'}
        </button>
      </div>

      {/* Winner Display */}
      {winner && !spinning && (
        <div className="mt-8 p-6 bg-green-100 border-2 border-green-500 rounded-lg text-center animate-pulse">
          <h3 className="text-2xl font-bold text-green-800 mb-2">Winner!</h3>
          <div className="flex items-center justify-center gap-4">
            {winner.photo && (
              <img
                src={winner.photo}
                alt={winner.name}
                className="w-16 h-16 rounded-full object-cover"
              />
            )}
            <p className="text-3xl font-bold text-green-900">{winner.name}</p>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="mt-6 text-center text-sm text-gray-600">
        <p>{eligibleMembers.length} eligible member{eligibleMembers.length !== 1 ? 's' : ''} available</p>
      </div>
    </div>
  );
}
