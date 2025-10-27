import { useState, useEffect, useRef } from 'react';
import { firestoreService } from '../services/firestore';
import type { TeamMember, SpinHistory } from '../types';

export default function Spinner() {
  const [label, setLabel] = useState('');
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [allMembers, setAllMembers] = useState<TeamMember[]>([]);
  const [eligibleMembers, setEligibleMembers] = useState<TeamMember[]>([]);
  const [winner, setWinner] = useState<TeamMember | null>(null);
  const spinTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    loadMembers();

    // Cleanup timeout on unmount
    return () => {
      if (spinTimeoutRef.current) {
        clearTimeout(spinTimeoutRef.current);
      }
    };
  }, []);

  const loadMembers = async () => {
    const team = await firestoreService.getTeam();
    const activeMembers = team.filter(m => m.isActive);
    setAllMembers(activeMembers);

    const eligible = await firestoreService.getEligibleMembers();
    setEligibleMembers(eligible);
  };

  const handleSpin = () => {
    if (spinning || eligibleMembers.length === 0) return;

    // Clear any existing timeout from previous spin
    if (spinTimeoutRef.current) {
      clearTimeout(spinTimeoutRef.current);
    }

    setWinner(null);
    setSpinning(true);

    // Select random winner from eligible members
    const randomIndex = Math.floor(Math.random() * eligibleMembers.length);
    const selectedMember = eligibleMembers[randomIndex];

    // Find the index in allMembers array
    const wheelIndex = allMembers.findIndex(m => m.id === selectedMember.id);

    // Calculate precise rotation to align pointer with center of segment
    const degreesPerSegment = 360 / allMembers.length;
    const extraSpins = 5 + Math.random() * 3;

    // Add random offset to avoid stopping on division lines
    // Keep within central 60% of segment (avoid outer 20% on each side)
    const randomOffset = (Math.random() - 0.5) * degreesPerSegment * 0.4;

    // Calculate target angle for this segment
    // Segments start at -90 degrees (top). Segment i's center is at: -90 + i * degreesPerSegment + degreesPerSegment/2
    // Pointer is at -90 degrees. To align segment center with pointer:
    // We want: segmentCenter + rotation = -90
    // rotation = -90 - segmentCenter = -90 - (-90 + i * degreesPerSegment + degreesPerSegment/2)
    // rotation = -i * degreesPerSegment - degreesPerSegment/2
    let targetAngle = -wheelIndex * degreesPerSegment - (degreesPerSegment / 2) + randomOffset;

    // Normalize target angle to 0-360 range
    targetAngle = ((targetAngle % 360) + 360) % 360;

    // Calculate current wheel position (normalized to 0-360)
    const currentAngle = ((rotation % 360) + 360) % 360;

    // Calculate rotation needed from current position to target
    // Always go forward (clockwise) for full effect
    let rotationNeeded = targetAngle - currentAngle;
    if (rotationNeeded < 0) {
      rotationNeeded += 360;
    }

    // Final rotation: current + multiple spins + rotation to target
    const finalRotation = rotation + (360 * extraSpins) + rotationNeeded;

    setRotation(finalRotation);

    // Store timeout ID for cleanup
    spinTimeoutRef.current = setTimeout(async () => {
      setWinner(selectedMember);
      setSpinning(false);
      spinTimeoutRef.current = null;

      // Save to history
      const historyEntry: SpinHistory = {
        id: Date.now().toString(),
        memberId: selectedMember.id,
        memberName: selectedMember.name,
        date: new Date().toISOString(),
        label: label || undefined,
        canBeSelectedAgain: false,
      };

      try {
        await firestoreService.addHistoryEntry(historyEntry);
        console.log('History entry saved:', historyEntry);
      } catch (error) {
        console.error('Failed to save history entry:', error);
        alert('Failed to save spin to history. Please check the console.');
      }

      // Clear label for next spin
      setLabel('');

      // Reload members to update eligibility
      loadMembers();
    }, 5000);
  };

  const getPhotoSize = (memberCount: number) => {
    if (memberCount <= 3) return 100;
    if (memberCount <= 5) return 80;
    if (memberCount <= 8) return 60;
    return 50;
  };

  // Helper to create SVG path for pie slice
  const createSlicePath = (index: number, total: number) => {
    const angle = 360 / total;
    const startAngle = index * angle - 90; // Start at top
    const endAngle = startAngle + angle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = 192 + 192 * Math.cos(startRad);
    const y1 = 192 + 192 * Math.sin(startRad);
    const x2 = 192 + 192 * Math.cos(endRad);
    const y2 = 192 + 192 * Math.sin(endRad);

    const largeArc = angle > 180 ? 1 : 0;

    return `M 192 192 L ${x1} ${y1} A 192 192 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

  if (allMembers.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">No Team Members</h2>
        <p className="text-gray-600 mb-4">There are no active team members.</p>
        <p className="text-blue-600 font-medium">
          Go to Team Admin to add or activate team members.
        </p>
      </div>
    );
  }

  if (eligibleMembers.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">No Eligible Members</h2>
        <p className="text-gray-600 mb-4">
          All active members were selected in the last 30 days.
        </p>
        <p className="text-blue-600 font-medium">
          Check History to allow recent winners to be selected again.
        </p>
      </div>
    );
  }

  const photoSize = getPhotoSize(allMembers.length);
  const colors = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#ec4899', '#6366f1', '#f97316'];

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">Spin the Wheel</h2>

      {/* Responsive Layout: Desktop (side-by-side) vs Mobile (stacked) */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Column: Wheel + Spin Button - 50% width, centered content */}
        <div className="flex flex-col items-center justify-center w-full lg:w-1/2">
          {/* Wheel Container */}
          <div className="relative w-96 h-96 mb-6">
            {/* Pointer - elevated and with shadow */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-10" style={{ filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))' }}>
              <div className="w-0 h-0 border-l-[24px] border-l-transparent border-r-[24px] border-r-transparent border-t-[48px] border-t-red-600"></div>
            </div>

            {/* Wheel */}
            <div
              className="relative w-full h-full"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: spinning ? 'transform 5s cubic-bezier(0.33, 1, 0.68, 1)' : 'none',
              }}
            >
              <svg viewBox="0 0 384 384" className="w-full h-full rounded-full shadow-2xl">
                {/* Outer border circle */}
                <circle cx="192" cy="192" r="192" fill="none" stroke="#1f2937" strokeWidth="8" />

                {/* Segments */}
                {allMembers.map((member, index) => {
                  const isEligible = eligibleMembers.some(em => em.id === member.id);
                  const color = colors[index % colors.length];

                  return (
                    <g key={member.id}>
                      <path
                        d={createSlicePath(index, allMembers.length)}
                        fill={color}
                        opacity={isEligible ? 1 : 0.5}
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Photos overlaid on wheel */}
              {allMembers.map((member, index) => {
                const degreesPerSegment = 360 / allMembers.length;
                const angle = index * degreesPerSegment + (degreesPerSegment / 2); // Center of segment
                const angleRad = ((angle - 90) * Math.PI) / 180; // -90 to start at top

                // Position at 60% of radius from center
                const radius = 192 * 0.6;
                const x = 192 + radius * Math.cos(angleRad);
                const y = 192 + radius * Math.sin(angleRad);

                return (
                  <div
                    key={`photo-${member.id}`}
                    className="absolute"
                    style={{
                      left: `${x}px`,
                      top: `${y}px`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
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
                        <span
                          className="text-gray-700 font-bold"
                          style={{ fontSize: `${photoSize / 2}px` }}
                        >
                          {member.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Spin Button */}
          <button
            onClick={handleSpin}
            disabled={spinning}
            className="px-12 py-4 bg-blue-600 text-white text-2xl font-bold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-lg"
          >
            {spinning ? 'Spinning...' : 'SPIN!'}
          </button>

          {/* Info */}
          <div className="mt-4 text-center text-sm text-gray-600">
            <p>
              {allMembers.length} total • {eligibleMembers.length} eligible
            </p>
          </div>
        </div>

        {/* Right Column: Label + Winner - 50% width */}
        <div className="w-full lg:w-1/2 space-y-6">
          {/* Label Input */}
          <div>
            <label htmlFor="spin-label" className="block text-lg font-medium text-gray-700 mb-3">
              Spinning for (optional label)
            </label>
            <input
              type="text"
              id="spin-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              disabled={spinning}
              className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              placeholder="e.g., Sprint Demo, Code Review"
            />
          </div>

          {/* Winner Display */}
          {winner && !spinning && (
            <div className="p-6 bg-green-100 border-2 border-green-500 rounded-lg animate-pulse">
              <h3 className="text-2xl font-bold text-green-800 mb-3 text-center">Winner!</h3>
              <div className="flex items-center justify-center gap-4">
                {winner.photo ? (
                  <img
                    src={winner.photo}
                    alt={winner.name}
                    className="w-20 h-20 rounded-full object-cover border-4 border-green-600"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center border-4 border-green-600">
                    <span className="text-green-700 font-bold text-3xl">
                      {winner.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <p className="text-3xl font-bold text-green-900">{winner.name}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
