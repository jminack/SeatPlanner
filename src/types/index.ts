export type Gender = 'M' | 'F' | 'O';

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  gender: Gender;
}

export type ConstraintType = 'ban' | 'prefer' | 'manual';

export interface Constraint {
  type: ConstraintType;
  studentIds: [string, string];
}

export type RowPreference = 'front' | 'back' | 'none';

export interface StudentRowPreference {
  studentId: string;
  preference: RowPreference;
}

export type GenderMode = 'none' | 'same' | 'different';

export interface SeatingPlan {
  className: string;
  students: Student[];
  constraints: Constraint[];
  rowPreferences: StudentRowPreference[];
  genderMode: GenderMode;
  grid: (string | null)[][]; // Student IDs or null for empty seats
  gridRows: number;
  gridCols: number; // Always even (pairs)
}

export interface ManualPlacement {
  studentId: string;
  row: number;
  col: number;
}

export type SeatingAction =
  | { type: 'SET_CLASS_NAME'; className: string }
  | { type: 'SET_STUDENTS'; students: Student[] }
  | { type: 'ADD_CONSTRAINT'; constraint: Constraint }
  | { type: 'REMOVE_CONSTRAINT'; studentIds: [string, string] }
  | { type: 'SET_ROW_PREFERENCE'; studentId: string; preference: RowPreference }
  | { type: 'SET_GENDER_MODE'; mode: GenderMode }
  | { type: 'SET_GRID'; grid: (string | null)[][] }
  | { type: 'SET_GRID_SIZE'; rows: number; cols: number }
  | { type: 'MOVE_STUDENT'; studentId: string; toRow: number; toCol: number }
  | { type: 'LOAD_PLAN'; plan: SeatingPlan }
  | { type: 'CLEAR_ALL' };
