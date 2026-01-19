import { useReducer, useCallback } from 'react';
import { SeatingPlan, SeatingAction, Student, Constraint, GenderMode, RowPreference } from '../types';
import { generateSeating } from '../utils/seatingAlgorithm';

const initialState: SeatingPlan = {
  className: '',
  students: [],
  constraints: [],
  rowPreferences: [],
  genderMode: 'none',
  grid: [],
  gridRows: 0,
  gridCols: 0,
};

function calculateGridSize(studentCount: number): { rows: number; cols: number } {
  if (studentCount === 0) return { rows: 0, cols: 0 };

  // Aim for roughly square grid with even columns (for pairs)
  // Try to have 4-6 columns (2-3 pairs per row)
  const targetCols = Math.min(6, Math.max(4, Math.ceil(Math.sqrt(studentCount))));
  // Ensure even number for pairs
  const cols = targetCols % 2 === 0 ? targetCols : targetCols + 1;
  const rows = Math.ceil(studentCount / cols);

  return { rows, cols };
}

function seatingReducer(state: SeatingPlan, action: SeatingAction): SeatingPlan {
  switch (action.type) {
    case 'SET_CLASS_NAME':
      return { ...state, className: action.className };

    case 'SET_STUDENTS': {
      const { rows, cols } = calculateGridSize(action.students.length);
      const newState = {
        ...state,
        students: action.students,
        gridRows: rows,
        gridCols: cols,
        constraints: [], // Clear constraints when new students are loaded
        rowPreferences: [], // Clear row preferences when new students are loaded
      };
      // Generate initial seating
      const grid = generateSeating(newState);
      return { ...newState, grid };
    }

    case 'ADD_CONSTRAINT': {
      // Check if constraint already exists
      const exists = state.constraints.some(
        c =>
          (c.studentIds[0] === action.constraint.studentIds[0] &&
           c.studentIds[1] === action.constraint.studentIds[1]) ||
          (c.studentIds[0] === action.constraint.studentIds[1] &&
           c.studentIds[1] === action.constraint.studentIds[0])
      );
      if (exists) {
        // Replace existing constraint
        const newConstraints = state.constraints.filter(
          c => !(
            (c.studentIds[0] === action.constraint.studentIds[0] &&
             c.studentIds[1] === action.constraint.studentIds[1]) ||
            (c.studentIds[0] === action.constraint.studentIds[1] &&
             c.studentIds[1] === action.constraint.studentIds[0])
          )
        );
        const newState = { ...state, constraints: [...newConstraints, action.constraint] };
        const grid = generateSeating(newState);
        return { ...newState, grid };
      }
      const newState = { ...state, constraints: [...state.constraints, action.constraint] };
      const grid = generateSeating(newState);
      return { ...newState, grid };
    }

    case 'REMOVE_CONSTRAINT': {
      const newConstraints = state.constraints.filter(
        c => !(
          (c.studentIds[0] === action.studentIds[0] &&
           c.studentIds[1] === action.studentIds[1]) ||
          (c.studentIds[0] === action.studentIds[1] &&
           c.studentIds[1] === action.studentIds[0])
        )
      );
      const newState = { ...state, constraints: newConstraints };
      const grid = generateSeating(newState);
      return { ...newState, grid };
    }

    case 'SET_GENDER_MODE': {
      const newState = { ...state, genderMode: action.mode };
      const grid = generateSeating(newState);
      return { ...newState, grid };
    }

    case 'SET_ROW_PREFERENCE': {
      // Remove existing preference for this student
      const filteredPrefs = state.rowPreferences.filter(p => p.studentId !== action.studentId);
      // Add new preference if not 'none'
      const newPrefs = action.preference === 'none'
        ? filteredPrefs
        : [...filteredPrefs, { studentId: action.studentId, preference: action.preference }];
      const newState = { ...state, rowPreferences: newPrefs };
      const grid = generateSeating(newState);
      return { ...newState, grid };
    }

    case 'SET_GRID':
      return { ...state, grid: action.grid };

    case 'SET_GRID_SIZE': {
      const newState = { ...state, gridRows: action.rows, gridCols: action.cols };
      const grid = generateSeating(newState);
      return { ...newState, grid };
    }

    case 'MOVE_STUDENT': {
      // Find current position
      let fromRow = -1, fromCol = -1;
      for (let r = 0; r < state.grid.length; r++) {
        for (let c = 0; c < state.grid[r].length; c++) {
          if (state.grid[r][c] === action.studentId) {
            fromRow = r;
            fromCol = c;
            break;
          }
        }
        if (fromRow !== -1) break;
      }

      const newGrid = state.grid.map(row => [...row]);
      const targetStudent = newGrid[action.toRow]?.[action.toCol];

      // Swap students
      if (fromRow !== -1 && fromCol !== -1) {
        newGrid[fromRow][fromCol] = targetStudent;
      }
      newGrid[action.toRow][action.toCol] = action.studentId;

      // Add manual constraint to preserve this placement
      const manualConstraint: Constraint = {
        type: 'manual',
        studentIds: [action.studentId, action.studentId], // Self-reference for manual placement
      };

      return {
        ...state,
        grid: newGrid,
        constraints: [...state.constraints.filter(c =>
          !(c.type === 'manual' && c.studentIds[0] === action.studentId)
        ), manualConstraint]
      };
    }

    case 'LOAD_PLAN':
      return action.plan;

    case 'CLEAR_ALL':
      return initialState;

    default:
      return state;
  }
}

export function useSeatingPlan() {
  const [state, dispatch] = useReducer(seatingReducer, initialState);

  const setClassName = useCallback((className: string) => {
    dispatch({ type: 'SET_CLASS_NAME', className });
  }, []);

  const setStudents = useCallback((students: Student[]) => {
    dispatch({ type: 'SET_STUDENTS', students });
  }, []);

  const addConstraint = useCallback((constraint: Constraint) => {
    dispatch({ type: 'ADD_CONSTRAINT', constraint });
  }, []);

  const removeConstraint = useCallback((studentIds: [string, string]) => {
    dispatch({ type: 'REMOVE_CONSTRAINT', studentIds });
  }, []);

  const setGenderMode = useCallback((mode: GenderMode) => {
    dispatch({ type: 'SET_GENDER_MODE', mode });
  }, []);

  const setRowPreference = useCallback((studentId: string, preference: RowPreference) => {
    dispatch({ type: 'SET_ROW_PREFERENCE', studentId, preference });
  }, []);

  const moveStudent = useCallback((studentId: string, toRow: number, toCol: number) => {
    dispatch({ type: 'MOVE_STUDENT', studentId, toRow, toCol });
  }, []);

  const loadPlan = useCallback((plan: SeatingPlan) => {
    dispatch({ type: 'LOAD_PLAN', plan });
  }, []);

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
  }, []);

  return {
    state,
    setClassName,
    setStudents,
    addConstraint,
    removeConstraint,
    setGenderMode,
    setRowPreference,
    moveStudent,
    loadPlan,
    clearAll,
  };
}
