import { useState, useEffect, useRef } from 'react';
import { firestoreService } from '../services/firestore';
import type { TeamMember, SpinHistory } from '../types';

// Fixed roulette wheel configuration
const TOTAL_SPACES = 18;
const DEGREES_PER_SPACE = 360 / TOTAL_SPACES; // 20 degrees per space

export default function Spinner() {
  const [label, setLabel] = useState('');
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [eligibleMembers, setEligibleMembers] = useState<TeamMember[]>([]);
  const [spaceAssignments, setSpaceAssignments] = useState<(TeamMember | null)[]>([]);
  const [winner, setWinner] = useState<TeamMember | null>(null);
  const [landedSpace, setLandedSpace] = useState<number | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
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
    const eligible = await firestoreService.getEligibleMembers();
    setEligibleMembers(eligible);

    // Assign members to the 18 fixed spaces
    const assignments = assignMembersToSpaces(eligible);
    setSpaceAssignments(assignments);
  };

  // Distribute eligible members across 18 fixed spaces
  const assignMembersToSpaces = (members: TeamMember[]): (TeamMember | null)[] => {
    const spaces: (TeamMember | null)[] = new Array(TOTAL_SPACES).fill(null);

    if (members.length === 0) {
      return spaces;
    }

    // Distribute members evenly across spaces
    // If fewer members than spaces, they'll repeat to fill the wheel
    // If more members than spaces, we'll cycle through them
    for (let i = 0; i < TOTAL_SPACES; i++) {
      spaces[i] = members[i % members.length];
    }

    return spaces;
  };

  const handleSpin = () => {
    if (spinning || eligibleMembers.length === 0) return;

    // Clear any existing timeout from previous spin
    if (spinTimeoutRef.current) {
      clearTimeout(spinTimeoutRef.current);
    }

    setWinner(null);
    setLandedSpace(null);
    setDebugInfo('');
    setSpinning(true);

    // Select a random space (0-17) from spaces that have eligible members
    const eligibleSpaces = spaceAssignments
      .map((member, index) => ({ member, index }))
      .filter(s => s.member !== null);

    const randomSpace = eligibleSpaces[Math.floor(Math.random() * eligibleSpaces.length)];
    const targetSpaceIndex = randomSpace.index;

    setDebugInfo(`Targeting Space #${targetSpaceIndex} (${randomSpace.member?.name})`);
    console.log('=== SPIN START ===');
    console.log('Target space index:', targetSpaceIndex);
    console.log('Target member:', randomSpace.member?.name);

    // Calculate rotation to land on target space
    // Pointer is at top (12 o'clock = -90 degrees in SVG = 270 degrees standard)
    // Spaces are numbered 0-17 clockwise starting from top
    // Space i's center is at: -90 + i * 20 + 10 = -80 + i * 20

    const extraSpins = 5 + Math.random() * 3; // 5-8 full rotations
    const randomOffset = (Math.random() - 0.5) * DEGREES_PER_SPACE * 0.6; // Stay within center 60% of space

    // Target angle for space center to align with pointer at -90 degrees
    // We want: spaceCenterAngle + rotation = -90
    // spaceCenterAngle = -90 + targetSpaceIndex * 20 + 10
    // rotation = -90 - spaceCenterAngle = -90 - (-90 + targetSpaceIndex * 20 + 10)
    // rotation = -targetSpaceIndex * 20 - 10
    let targetAngle = -targetSpaceIndex * DEGREES_PER_SPACE - (DEGREES_PER_SPACE / 2) + randomOffset;

    // Normalize to 0-360 range
    targetAngle = ((targetAngle % 360) + 360) % 360;

    // Calculate current wheel position
    const currentAngle = ((rotation % 360) + 360) % 360;

    // Calculate rotation needed (always go forward)
    let rotationNeeded = targetAngle - currentAngle;
    if (rotationNeeded < 0) {
      rotationNeeded += 360;
    }

    // Final rotation
    const finalRotation = rotation + (360 * extraSpins) + rotationNeeded;

    console.log('Current angle:', currentAngle);
    console.log('Target angle:', targetAngle);
    console.log('Rotation needed:', rotationNeeded);
    console.log('Final rotation:', finalRotation);

    setRotation(finalRotation);

    // Store timeout ID for cleanup
    spinTimeoutRef.current = setTimeout(async () => {
      setSpinning(false);
      spinTimeoutRef.current = null;

      // DETERMINISTIC: Calculate which space we actually landed on
      const landedSpaceIndex = getSpaceFromRotation(finalRotation);
      const actualWinner = spaceAssignments[landedSpaceIndex];

      const match = actualWinner?.id === randomSpace.member?.id;
      const debugText = `Landed on Space #${landedSpaceIndex} | Target was #${targetSpaceIndex} | ${match ? '✓ MATCH' : '✗ MISMATCH'}`;

      setLandedSpace(landedSpaceIndex);
      setDebugInfo(debugText);

      console.log('=== SPIN RESULT ===');
      console.log('Final rotation:', finalRotation);
      console.log('Normalized rotation:', ((finalRotation % 360) + 360) % 360);
      console.log('Landed on space index:', landedSpaceIndex);
      console.log('Actual winner:', actualWinner?.name);
      console.log('Expected winner:', randomSpace.member?.name);
      console.log('Match:', match ? '✓' : '✗');
      console.log('==================');

      if (!actualWinner) {
        console.error('ERROR: Landed on empty space!');
        alert('Error: Landed on empty space. Please try again.');
        setSpinning(false);
        return;
      }

      setWinner(actualWinner);

      // Save to history - build object without undefined fields
      const historyEntry: Partial<SpinHistory> = {
        id: Date.now().toString(),
        memberId: actualWinner.id,
        memberName: actualWinner.name,
        date: new Date().toISOString(),
        canBeSelectedAgain: false,
      };

      // Only add label if it has a value
      if (label && label.trim()) {
        historyEntry.label = label.trim();
      }

      try {
        await firestoreService.addHistoryEntry(historyEntry as SpinHistory);
        console.log('✓ History entry saved successfully');
      } catch (error: any) {
        console.error('✗ Failed to save history entry:', error);
        console.error('Error code:', error?.code);
        console.error('Error message:', error?.message);
        alert(`Failed to save spin to history: ${error?.message || 'Unknown error'}`);
      }

      // Clear label for next spin
      setLabel('');

      // NOTE: Do NOT reload members here! This would reassign everyone to different spaces
      // and cause the photos to shift. Space assignments must remain stable during the session.
      // The eligibility was already calculated when the page loaded.
      // User can refresh the page to get updated eligibility after 30 days pass.
    }, 5000);
  };

  // Deterministic function: given final rotation, which space (0-17) is under the pointer?
  const getSpaceFromRotation = (rotation: number): number => {
    // Normalize rotation to 0-360
    const normalizedRotation = ((rotation % 360) + 360) % 360;

    // Pointer is at top (-90 degrees in SVG)
    // After rotating by R degrees, space i is under pointer when:
    // (-90 + i * 20 + 10 + R) ≡ -90 (mod 360)
    // i * 20 + 10 + R ≡ 0 (mod 360)
    // i = floor((-R - 10) / 20) mod 18
    // Converting to positive: i = (18 - floor((R + 10) / 20)) % 18

    const adjustedRotation = normalizedRotation + DEGREES_PER_SPACE / 2;
    const spaceIndex = (TOTAL_SPACES - Math.floor(adjustedRotation / DEGREES_PER_SPACE)) % TOTAL_SPACES;

    return spaceIndex;
  };

  // Helper to create SVG path for pie slice (fixed 18 spaces)
  const createSlicePath = (index: number) => {
    const startAngle = index * DEGREES_PER_SPACE - 90; // Start at top
    const endAngle = startAngle + DEGREES_PER_SPACE;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = 192 + 192 * Math.cos(startRad);
    const y1 = 192 + 192 * Math.sin(startRad);
    const x2 = 192 + 192 * Math.cos(endRad);
    const y2 = 192 + 192 * Math.sin(endRad);

    const largeArc = DEGREES_PER_SPACE > 180 ? 1 : 0;

    return `M 192 192 L ${x1} ${y1} A 192 192 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

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

  const photoSize = 50; // Fixed size for 18 spaces
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

                {/* 18 Fixed Segments */}
                {Array.from({ length: TOTAL_SPACES }).map((_, index) => {
                  const color = colors[index % colors.length];

                  return (
                    <g key={`space-${index}`}>
                      <path
                        d={createSlicePath(index)}
                        fill={color}
                        opacity={1}
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Space numbers - outer ring */}
              {Array.from({ length: TOTAL_SPACES }).map((_, index) => {
                const angle = index * DEGREES_PER_SPACE + (DEGREES_PER_SPACE / 2);
                const angleRad = ((angle - 90) * Math.PI) / 180;

                // Position at 85% of radius (outer edge)
                const radius = 192 * 0.85;
                const x = 192 + radius * Math.cos(angleRad);
                const y = 192 + radius * Math.sin(angleRad);

                return (
                  <div
                    key={`space-num-${index}`}
                    className="absolute"
                    style={{
                      left: `${x}px`,
                      top: `${y}px`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <div className="w-8 h-8 rounded-full bg-white border-2 border-gray-800 flex items-center justify-center shadow-lg">
                      <span className="text-gray-900 font-bold text-sm">{index}</span>
                    </div>
                  </div>
                );
              })}

              {/* Photos overlaid on wheel - one per space */}
              {spaceAssignments.map((member, index) => {
                if (!member) return null;

                const angle = index * DEGREES_PER_SPACE + (DEGREES_PER_SPACE / 2); // Center of space
                const angleRad = ((angle - 90) * Math.PI) / 180; // -90 to start at top

                // Position at 50% of radius from center (moved inward to make room for numbers)
                const radius = 192 * 0.5;
                const x = 192 + radius * Math.cos(angleRad);
                const y = 192 + radius * Math.sin(angleRad);

                return (
                  <div
                    key={`space-photo-${index}-${member.id}`}
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
              18 spaces • {eligibleMembers.length} eligible members
            </p>
          </div>

          {/* Debug Info */}
          {debugInfo && (
            <div className="mt-4 p-3 bg-gray-100 border border-gray-300 rounded-lg text-center">
              <p className="text-sm font-mono text-gray-700">{debugInfo}</p>
            </div>
          )}
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
            <div className="space-y-4">
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
                {landedSpace !== null && (
                  <p className="text-center mt-3 text-lg text-green-700 font-semibold">
                    Landed on Space #{landedSpace}
                  </p>
                )}
              </div>

              {/* Debug visualization */}
              <div className="p-4 bg-blue-50 border border-blue-300 rounded-lg">
                <h4 className="font-bold text-blue-900 mb-2">Debug Info:</h4>
                <p className="text-sm text-blue-800 font-mono">{debugInfo}</p>
                <p className="text-xs text-blue-600 mt-2">
                  Look at the wheel: Does the arrow point to space #{landedSpace}?
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
