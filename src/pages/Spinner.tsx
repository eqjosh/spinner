import { useState, useEffect, useRef } from 'react';
import { useTeam } from '../context/TeamContext';
import { firestoreService } from '../services/firestore';
import type { TeamMember, SpinHistory } from '../types';

export default function Spinner() {
  const { selectedTeam } = useTeam();
  const [label, setLabel] = useState('');
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [allMembers, setAllMembers] = useState<TeamMember[]>([]); // All team members
  const [eligibleMemberIds, setEligibleMemberIds] = useState<Set<string>>(new Set()); // IDs of eligible members
  const [spaceAssignments, setSpaceAssignments] = useState<(TeamMember | null)[]>([]);
  const [winner, setWinner] = useState<TeamMember | null>(null);
  const [winnerLabel, setWinnerLabel] = useState<string>('');
  const spinTimeoutRef = useRef<number | null>(null);

  // Dynamic wheel configuration based on total team size (not just eligible)
  const TOTAL_SPACES = allMembers.length > 0 ? allMembers.length : 1;
  const DEGREES_PER_SPACE = 360 / TOTAL_SPACES;

  // Debug state
  const [debugInfo, setDebugInfo] = useState<{
    targetSpaceIndex: number;
    targetMemberName: string;
    finalRotation: number;
    landedSpaceIndex: number;
    landedMemberName: string;
    match: boolean;
    normalizedRotation?: number;
    spaceAssignments?: Array<{space: number; name: string}>;
    randomOffset?: number;
    targetAngle?: number;
    currentAngle?: number;
  } | null>(null);

  useEffect(() => {
    if (selectedTeam) {
      loadMembers();
    }

    // Cleanup timeout on unmount
    return () => {
      if (spinTimeoutRef.current) {
        clearTimeout(spinTimeoutRef.current);
      }
    };
  }, [selectedTeam]);

  const loadMembers = async () => {
    if (!selectedTeam) return;

    // Load ALL team members (both eligible and ineligible)
    const all = await firestoreService.getTeamMembers(selectedTeam.id);
    const activeMembers = all.filter(m => m.isActive);
    setAllMembers(activeMembers);

    // Load eligible members to track who can be selected
    const eligible = await firestoreService.getEligibleMembers(selectedTeam.id);
    const eligibleIds = new Set(eligible.map(m => m.id));
    setEligibleMemberIds(eligibleIds);

    // Assign ALL members to spaces (not just eligible)
    const assignments = assignMembersToSpaces(activeMembers);
    setSpaceAssignments(assignments);
  };

  // Assign members to their designated space numbers on the wheel
  const assignMembersToSpaces = (members: TeamMember[]): (TeamMember | null)[] => {
    if (members.length === 0) {
      return [];
    }

    const totalSpaces = members.length;
    const spaces: (TeamMember | null)[] = new Array(totalSpaces).fill(null);

    // Separate members into assigned and unassigned
    const assignedMembers: TeamMember[] = [];
    const unassignedMembers: TeamMember[] = [];

    members.forEach(member => {
      // Check if member has a valid space number for current team size
      if (member.spaceNumber !== undefined && member.spaceNumber >= 0 && member.spaceNumber < totalSpaces) {
        spaces[member.spaceNumber] = member;
        assignedMembers.push(member);
      } else {
        unassignedMembers.push(member);
      }
    });

    // Auto-assign unassigned members to empty spaces
    let nextEmptySpace = 0;
    for (const member of unassignedMembers) {
      while (nextEmptySpace < totalSpaces && spaces[nextEmptySpace] !== null) {
        nextEmptySpace++;
      }
      if (nextEmptySpace < totalSpaces) {
        spaces[nextEmptySpace] = member;
        nextEmptySpace++;
      }
    }

    return spaces;
  };

  const handleSpin = () => {
    if (spinning || eligibleMemberIds.size === 0) return;

    // Clear any existing timeout from previous spin
    if (spinTimeoutRef.current) {
      clearTimeout(spinTimeoutRef.current);
    }

    setWinner(null);
    setDebugInfo(null);
    setSpinning(true);

    // Select a random space from spaces that have ELIGIBLE members only
    const eligibleSpaces = spaceAssignments
      .map((member, index) => ({ member, index }))
      .filter(s => s.member !== null && eligibleMemberIds.has(s.member.id));

    const randomSpace = eligibleSpaces[Math.floor(Math.random() * eligibleSpaces.length)];
    const targetSpaceIndex = randomSpace.index;

    console.log('=== SPIN START ===');
    console.log('Target space index:', targetSpaceIndex);
    console.log('Target member:', randomSpace.member?.name);

    // Calculate rotation to land on target space
    // IMPORTANT: Space i has its CENTER at angle: i * DEGREES_PER_SPACE + (DEGREES_PER_SPACE/2) - 90
    //
    // The pointer is at -90 degrees (top of wheel)
    //
    // To put space i's center at the pointer, we need the wheel rotation R such that:
    // (space_center_angle) + R ≡ -90 (mod 360)
    // R ≡ -90 - (i * DEGREES_PER_SPACE + DEGREES_PER_SPACE/2 - 90)
    // R ≡ -i * DEGREES_PER_SPACE - DEGREES_PER_SPACE/2

    const extraSpins = 5 + Math.floor(Math.random() * 4); // 5, 6, 7, or 8 full rotations (must be integer!)

    // Add random offset to avoid stopping on division lines
    // Stay at least 3 degrees away from edges
    const maxOffset = (DEGREES_PER_SPACE / 2) - 3;
    const randomOffset = (Math.random() - 0.5) * 2 * maxOffset;

    // Calculate the normalized angle the wheel should be at for target space to align with pointer
    // Formula: -(DEGREES_PER_SPACE/2) - targetSpaceIndex * DEGREES_PER_SPACE
    let targetAngle = -(DEGREES_PER_SPACE / 2) - targetSpaceIndex * DEGREES_PER_SPACE + randomOffset;

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

    console.log('Random offset:', randomOffset);
    console.log('Current angle:', currentAngle);
    console.log('Target angle:', targetAngle);
    console.log('Rotation needed:', rotationNeeded);
    console.log('Final rotation:', finalRotation);

    setRotation(finalRotation);

    // Store intermediate values for debug
    const debugCalcValues = {
      randomOffset,
      targetAngle,
      currentAngle,
    };

    // Store timeout ID for cleanup
    spinTimeoutRef.current = setTimeout(async () => {
      setSpinning(false);
      spinTimeoutRef.current = null;

      // DETERMINISTIC: Calculate which space we actually landed on
      const landedSpaceIndex = getSpaceFromRotation(finalRotation);
      const actualWinner = spaceAssignments[landedSpaceIndex];

      const match = actualWinner?.id === randomSpace.member?.id;

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

      // Safety check: Ensure the landed member is eligible
      if (!eligibleMemberIds.has(actualWinner.id)) {
        console.error('ERROR: Landed on ineligible member!', actualWinner.name);
        console.error('This should not happen. Target was:', randomSpace.member?.name);
        alert(`Error: Wheel landed on ineligible member (${actualWinner.name}). This indicates a calculation error. Please try again.`);
        setSpinning(false);
        return;
      }

      setWinner(actualWinner);
      setWinnerLabel(label.trim()); // Save label for winner display

      // Set debug info
      const normalizedRot = ((finalRotation % 360) + 360) % 360;
      setDebugInfo({
        targetSpaceIndex,
        targetMemberName: randomSpace.member?.name || 'Unknown',
        finalRotation,
        landedSpaceIndex,
        landedMemberName: actualWinner.name,
        match,
        normalizedRotation: normalizedRot,
        spaceAssignments: spaceAssignments.map((m, i) => ({
          space: i,
          name: m?.name || 'Empty'
        })),
        randomOffset: debugCalcValues.randomOffset,
        targetAngle: debugCalcValues.targetAngle,
        currentAngle: debugCalcValues.currentAngle,
      });

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
        if (!selectedTeam) {
          throw new Error('No team selected');
        }
        await firestoreService.addHistoryEntry(selectedTeam.id, historyEntry as SpinHistory);
        console.log('✓ History entry saved successfully');

        // Immediately update eligibility to prevent re-selection on quick spins
        const eligible = await firestoreService.getEligibleMembers(selectedTeam.id);
        const eligibleIds = new Set(eligible.map(m => m.id));
        setEligibleMemberIds(eligibleIds);
      } catch (error: any) {
        console.error('✗ Failed to save history entry:', error);
        console.error('Error code:', error?.code);
        console.error('Error message:', error?.message);
        alert(`Failed to save spin to history: ${error?.message || 'Unknown error'}`);
      }

      // Clear label for next spin
      setLabel('');
    }, 5000);
  };

  // Deterministic function: given final rotation, which space (0-17) is under the pointer?
  const getSpaceFromRotation = (rotation: number): number => {
    // Normalize rotation to 0-360
    const normalizedRotation = ((rotation % 360) + 360) % 360;

    // Pointer is at top (-90 degrees in SVG)
    // Space i spans from (i*20 - 90) to ((i+1)*20 - 90) degrees
    // After rotating by R degrees, space i spans from (i*20 - 90 + R) to ((i+1)*20 - 90 + R)
    //
    // We need to find which space CONTAINS the pointer at -90 degrees:
    // i*20 - 90 + R <= -90 < (i+1)*20 - 90 + R
    // i*20 + R <= 0 < (i+1)*20 + R
    // i <= -R/20 < i+1
    //
    // Therefore: i = floor(-R/20) = -ceil(R/20)
    // In positive modulo: i = (18 - ceil(R/20)) % 18

    const spaceIndex = (TOTAL_SPACES - Math.ceil(normalizedRotation / DEGREES_PER_SPACE)) % TOTAL_SPACES;

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

  if (allMembers.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">No Team Members</h2>
        <p className="text-gray-600 mb-4">
          Add team members in the Team Admin page to get started.
        </p>
      </div>
    );
  }

  if (eligibleMemberIds.size === 0 && !winner) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">No Eligible Members</h2>
        <p className="text-gray-600 mb-4">
          All {allMembers.length} team members were selected in the last 30 days.
        </p>
        <p className="text-blue-600 font-medium">
          Check History to allow recent winners to be selected again.
        </p>
      </div>
    );
  }

  const photoSize = 50; // Photo size adjusts based on team size
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

                // Check if this member is eligible
                const isEligible = eligibleMemberIds.has(member.id);

                // Position photo at its assigned space number
                const angle = index * DEGREES_PER_SPACE + (DEGREES_PER_SPACE / 2); // Center of space
                const angleRad = ((angle - 90) * Math.PI) / 180; // -90 to start at top

                // Position at 50% of radius from center (moved inward to make room for numbers)
                const radius = 192 * 0.5;
                const x = 192 + radius * Math.cos(angleRad);
                const y = 192 + radius * Math.sin(angleRad);

                // Counter-rotate photo to maintain screen orientation
                // As wheel rotates, photo rotates opposite direction to stay screen-fixed
                // At rest, photo at space i is rotated i*20+10 degrees
                // This makes photo upright when that space reaches the top
                const photoRotation = angle - rotation;

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
                          transform: `rotate(${photoRotation}deg)`,
                          opacity: isEligible ? 1 : 0.3,
                          filter: isEligible ? 'none' : 'grayscale(100%)',
                        }}
                      />
                    ) : (
                      <div
                        className="rounded-full bg-white flex items-center justify-center border-4 border-white shadow-lg"
                        style={{
                          width: `${photoSize}px`,
                          height: `${photoSize}px`,
                          transform: `rotate(${photoRotation}deg)`,
                          opacity: isEligible ? 1 : 0.3,
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
              {allMembers.length} spaces • {eligibleMemberIds.size} eligible members
            </p>
          </div>

          {/* Debug Info - Hidden in production */}
          {/* {debugInfo && (
            <div className="mt-4 p-3 bg-gray-100 border border-gray-300 rounded-lg text-center">
              <p className="text-sm font-mono text-gray-700">{debugInfo}</p>
            </div>
          )} */}
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
                {winnerLabel && (
                  <div className="text-center mb-3">
                    <span className="px-4 py-2 bg-blue-600 text-white rounded-full text-lg font-semibold">
                      {winnerLabel}
                    </span>
                  </div>
                )}
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

              {/* Debug Info */}
              {debugInfo && (
                <div className={`p-4 border-2 rounded-lg ${debugInfo.match ? 'bg-blue-50 border-blue-500' : 'bg-red-50 border-red-500'}`}>
                  <h4 className="font-bold text-lg mb-2 text-gray-800">Debug Info:</h4>
                  <div className="space-y-1 text-sm font-mono">
                    <p><strong>Target Space #:</strong> {debugInfo.targetSpaceIndex}</p>
                    <p><strong>Target Name:</strong> {debugInfo.targetMemberName}</p>
                    <p className="border-t pt-1 mt-1"><strong>Landed Space #:</strong> {debugInfo.landedSpaceIndex}</p>
                    <p><strong>Landed Name:</strong> {debugInfo.landedMemberName}</p>
                    <p className="border-t pt-1 mt-1"><strong>Final Rotation:</strong> {debugInfo.finalRotation.toFixed(2)}°</p>
                    <p><strong>Normalized:</strong> {debugInfo.normalizedRotation?.toFixed(2)}°</p>
                    {debugInfo.randomOffset !== undefined && (
                      <>
                        <p className="border-t pt-1 mt-1"><strong>Random Offset:</strong> {debugInfo.randomOffset.toFixed(2)}°</p>
                        <p><strong>Target Angle:</strong> {debugInfo.targetAngle?.toFixed(2)}°</p>
                        <p><strong>Current Angle:</strong> {debugInfo.currentAngle?.toFixed(2)}°</p>
                      </>
                    )}
                    <p className="border-t pt-1 mt-1"><strong>Match:</strong> <span className={debugInfo.match ? 'text-green-600' : 'text-red-600 font-bold'}>{debugInfo.match ? '✓ YES' : '✗ NO - MISMATCH!'}</span></p>

                    {/* Space Assignments */}
                    {debugInfo.spaceAssignments && debugInfo.spaceAssignments.length > 0 && (
                      <details className="border-t pt-2 mt-2">
                        <summary className="cursor-pointer font-bold hover:text-blue-600">Space Assignments (click to expand)</summary>
                        <div className="mt-2 max-h-48 overflow-y-auto bg-white p-2 rounded border border-gray-300">
                          <div className="grid grid-cols-2 gap-1">
                            {debugInfo.spaceAssignments.map(sa => (
                              <div key={sa.space} className={`text-xs ${sa.space === debugInfo.landedSpaceIndex ? 'bg-yellow-100 font-bold' : ''}`}>
                                Space {sa.space}: {sa.name}
                              </div>
                            ))}
                          </div>
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
