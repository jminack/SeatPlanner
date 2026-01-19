import { SeatingPlan, Student, Constraint, RowPreference } from '../types';

interface PlacementScore {
  studentId: string;
  row: number;
  col: number;
  score: number;
}

function getConstraint(
  constraints: Constraint[],
  studentId1: string,
  studentId2: string
): Constraint | undefined {
  return constraints.find(
    c =>
      (c.studentIds[0] === studentId1 && c.studentIds[1] === studentId2) ||
      (c.studentIds[0] === studentId2 && c.studentIds[1] === studentId1)
  );
}

function getRowPreference(plan: SeatingPlan, studentId: string): RowPreference {
  const pref = plan.rowPreferences?.find(p => p.studentId === studentId);
  return pref?.preference || 'none';
}

function areSameGender(students: Student[], id1: string, id2: string): boolean {
  const s1 = students.find(s => s.id === id1);
  const s2 = students.find(s => s.id === id2);
  return s1?.gender === s2?.gender;
}

function getPairNeighborCol(col: number): number {
  // Pairs are at (0,1), (2,3), (4,5), etc.
  return col % 2 === 0 ? col + 1 : col - 1;
}

function scoreRowPlacement(
  plan: SeatingPlan,
  studentId: string,
  row: number
): number {
  const preference = getRowPreference(plan, studentId);
  if (preference === 'none') return 0;

  const totalRows = plan.gridRows;
  if (totalRows <= 1) return 0;

  // Use gradual scoring: the closer to preferred position, the higher the score
  // Row 0 is front, row (totalRows-1) is back
  const maxScore = 50;

  if (preference === 'front') {
    // Score decreases as row number increases (further from front)
    // Row 0 gets maxScore, last row gets -maxScore
    return maxScore - (row / (totalRows - 1)) * (2 * maxScore);
  } else {
    // Score increases as row number increases (closer to back)
    // Last row gets maxScore, row 0 gets -maxScore
    return -maxScore + (row / (totalRows - 1)) * (2 * maxScore);
  }
}

function scorePairPlacement(
  plan: SeatingPlan,
  grid: (string | null)[][],
  studentId: string,
  row: number,
  col: number
): number {
  let score = 0;

  // Row preference scoring
  score += scoreRowPlacement(plan, studentId, row);

  const neighborCol = getPairNeighborCol(col);
  const neighborId = grid[row]?.[neighborCol];

  if (neighborId) {
    // Check constraints
    const constraint = getConstraint(plan.constraints, studentId, neighborId);
    if (constraint) {
      if (constraint.type === 'ban') {
        score -= 1000; // Heavy penalty for ban violation
      } else if (constraint.type === 'prefer') {
        score += 50; // Bonus for preference satisfaction
      }
    }

    // Gender mode
    const sameGender = areSameGender(plan.students, studentId, neighborId);
    if (plan.genderMode === 'same' && sameGender) {
      score += 10;
    } else if (plan.genderMode === 'same' && !sameGender) {
      score -= 10;
    } else if (plan.genderMode === 'different' && !sameGender) {
      score += 10;
    } else if (plan.genderMode === 'different' && sameGender) {
      score -= 10;
    }
  }

  return score;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function generateSeating(plan: SeatingPlan): (string | null)[][] {
  const { students, gridRows, gridCols, constraints } = plan;

  if (students.length === 0 || gridRows === 0 || gridCols === 0) {
    return [];
  }

  // Initialize empty grid
  const grid: (string | null)[][] = Array(gridRows)
    .fill(null)
    .map(() => Array(gridCols).fill(null));

  // Get manual placements first (they have highest priority)
  const manualPlacements = constraints.filter(c => c.type === 'manual');
  const manuallyPlacedIds = new Set(manualPlacements.map(c => c.studentIds[0]));

  // Shuffle remaining students for initial random placement
  const unplacedStudents = shuffleArray(
    students.filter(s => !manuallyPlacedIds.has(s.id))
  );

  // Get all empty positions
  const positions: { row: number; col: number }[] = [];
  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      positions.push({ row: r, col: c });
    }
  }

  // Place students randomly first
  let posIndex = 0;
  for (const student of unplacedStudents) {
    if (posIndex < positions.length) {
      const { row, col } = positions[posIndex];
      grid[row][col] = student.id;
      posIndex++;
    }
  }

  // Now optimize with local swaps
  let improved = true;
  let iterations = 0;
  const maxIterations = 100;

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    // Try swapping each pair of students
    outerLoop:
    for (let r1 = 0; r1 < gridRows; r1++) {
      for (let c1 = 0; c1 < gridCols; c1++) {
        const id1 = grid[r1][c1];
        if (!id1 || manuallyPlacedIds.has(id1)) continue;

        for (let r2 = r1; r2 < gridRows; r2++) {
          for (let c2 = r2 === r1 ? c1 + 1 : 0; c2 < gridCols; c2++) {
            const id2 = grid[r2][c2];
            if (!id2 || manuallyPlacedIds.has(id2)) continue;

            // Calculate current scores
            const currentScore1 = scorePairPlacement(plan, grid, id1, r1, c1);
            const currentScore2 = scorePairPlacement(plan, grid, id2, r2, c2);
            const currentTotal = currentScore1 + currentScore2;

            // Temporarily swap
            grid[r1][c1] = id2;
            grid[r2][c2] = id1;

            // Calculate new scores
            const newScore1 = scorePairPlacement(plan, grid, id2, r1, c1);
            const newScore2 = scorePairPlacement(plan, grid, id1, r2, c2);
            const newTotal = newScore1 + newScore2;

            if (newTotal > currentTotal) {
              // Keep the swap and restart iteration
              improved = true;
              break outerLoop;
            } else {
              // Revert the swap
              grid[r1][c1] = id1;
              grid[r2][c2] = id2;
            }
          }
        }
      }
    }
  }

  return grid;
}

export function getGridScore(plan: SeatingPlan): number {
  let totalScore = 0;
  const { grid, gridRows, gridCols } = plan;

  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      const studentId = grid[r]?.[c];
      if (studentId) {
        totalScore += scorePairPlacement(plan, grid, studentId, r, c);
      }
    }
  }

  return totalScore;
}
