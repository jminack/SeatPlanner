import { useState, useCallback } from 'react';
import { useSeatingPlan } from './hooks/useSeatingPlan';
import { parseCSV } from './utils/csvParser';
import { loadCSVFromFile, loadPlanFromFile, savePlanToFile } from './utils/fileIO';
import { exportToPDF } from './utils/pdfExport';
import { Constraint, Student, RowPreference } from './types';
import './App.css';

function App() {
  const {
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
  } = useSeatingPlan();

  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [showPairModal, setShowPairModal] = useState(false);
  const [showRowModal, setShowRowModal] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [draggedStudent, setDraggedStudent] = useState<string | null>(null);

  const handleCSVImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const content = await loadCSVFromFile(file);
      const result = parseCSV(content);

      if (result.errors.length > 0) {
        setImportErrors(result.errors);
      } else {
        setImportErrors([]);
      }

      if (result.students.length > 0) {
        setStudents(result.students);
        // Use filename without extension as class name
        const className = file.name.replace(/\.[^/.]+$/, '');
        setClassName(className);
      }
    } catch (err) {
      setImportErrors([err instanceof Error ? err.message : 'Failed to import CSV']);
    }

    // Reset input
    e.target.value = '';
  }, [setStudents, setClassName]);

  const handleLoadPlan = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const plan = await loadPlanFromFile(file);
      loadPlan(plan);
      setImportErrors([]);
    } catch (err) {
      setImportErrors([err instanceof Error ? err.message : 'Failed to load plan']);
    }

    e.target.value = '';
  }, [loadPlan]);

  const handleSavePlan = useCallback(() => {
    savePlanToFile(state);
  }, [state]);

  const handleExportPDF = useCallback(async () => {
    await exportToPDF(state);
  }, [state]);

  const handleStudentClick = useCallback((studentId: string) => {
    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        // Clicking same student - show row preference modal
        setShowRowModal(true);
        return prev;
      } else if (prev.length === 1) {
        // Second selection - show pair constraint modal
        setShowPairModal(true);
        return [...prev, studentId];
      } else {
        // First selection
        return [studentId];
      }
    });
  }, []);

  const handleConstraintAction = useCallback((type: 'ban' | 'prefer' | 'clear') => {
    if (selectedStudents.length !== 2) return;

    if (type === 'clear') {
      removeConstraint([selectedStudents[0], selectedStudents[1]]);
    } else {
      const constraint: Constraint = {
        type,
        studentIds: [selectedStudents[0], selectedStudents[1]],
      };
      addConstraint(constraint);
    }

    setSelectedStudents([]);
    setShowPairModal(false);
  }, [selectedStudents, addConstraint, removeConstraint]);

  const handleRowPreferenceAction = useCallback((preference: RowPreference) => {
    if (selectedStudents.length !== 1) return;
    setRowPreference(selectedStudents[0], preference);
    setSelectedStudents([]);
    setShowRowModal(false);
  }, [selectedStudents, setRowPreference]);

  const getStudentRowPreference = useCallback((studentId: string): RowPreference => {
    const pref = state.rowPreferences?.find(p => p.studentId === studentId);
    return pref?.preference || 'none';
  }, [state.rowPreferences]);

  const handleDragStart = useCallback((studentId: string) => {
    setDraggedStudent(studentId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((row: number, col: number) => {
    if (draggedStudent) {
      moveStudent(draggedStudent, row, col);
      setDraggedStudent(null);
    }
  }, [draggedStudent, moveStudent]);

  const getStudentById = useCallback((id: string | null): Student | undefined => {
    if (!id) return undefined;
    return state.students.find(s => s.id === id);
  }, [state.students]);

  const getConstraintForPair = useCallback((id1: string, id2: string): Constraint | undefined => {
    return state.constraints.find(
      c => (c.studentIds[0] === id1 && c.studentIds[1] === id2) ||
           (c.studentIds[0] === id2 && c.studentIds[1] === id1)
    );
  }, [state.constraints]);

  const getExistingConstraint = useCallback((): Constraint | undefined => {
    if (selectedStudents.length !== 2) return undefined;
    return getConstraintForPair(selectedStudents[0], selectedStudents[1]);
  }, [selectedStudents, getConstraintForPair]);

  return (
    <div className="app">
      {/* Toolbar */}
      <header className="toolbar">
        <div className="toolbar-left">
          <h1>Seat Planner</h1>
          <input
            type="text"
            placeholder="Class Name"
            value={state.className}
            onChange={(e) => setClassName(e.target.value)}
            className="class-name-input"
          />
        </div>
        <div className="toolbar-center">
          <label className="gender-mode-label">
            Gender Preference:
            <select
              value={state.genderMode}
              onChange={(e) => setGenderMode(e.target.value as 'none' | 'same' | 'different')}
            >
              <option value="none">None</option>
              <option value="same">Same Gender</option>
              <option value="different">Different Gender</option>
            </select>
          </label>
        </div>
        <div className="toolbar-right">
          <label className="btn-primary file-btn">
            Import CSV
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVImport}
              hidden
            />
          </label>
          <label className="btn-secondary file-btn">
            Load Plan
            <input
              type="file"
              accept=".json"
              onChange={handleLoadPlan}
              hidden
            />
          </label>
          <button
            className="btn-secondary"
            onClick={handleSavePlan}
            disabled={state.students.length === 0}
          >
            Save Plan
          </button>
          <button
            className="btn-primary"
            onClick={handleExportPDF}
            disabled={state.students.length === 0}
          >
            Export PDF
          </button>
          <button
            className="btn-danger"
            onClick={clearAll}
            disabled={state.students.length === 0}
          >
            Clear
          </button>
        </div>
      </header>

      {/* Error display */}
      {importErrors.length > 0 && (
        <div className="error-banner">
          <strong>Import Errors:</strong>
          <ul>
            {importErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
          <button onClick={() => setImportErrors([])}>Dismiss</button>
        </div>
      )}

      {/* Main content */}
      <main className="main-content">
        {/* Left panel - Student list */}
        <aside className="student-panel">
          <h2>Students ({state.students.length})</h2>
          {state.students.length === 0 ? (
            <p className="empty-message">Import a CSV file to add students</p>
          ) : (
            <ul className="student-list">
              {[...state.students]
                .sort((a, b) => `${a.lastName}, ${a.firstName}`.localeCompare(`${b.lastName}, ${b.firstName}`))
                .map(student => {
                  const rowPref = getStudentRowPreference(student.id);
                  return (
                    <li
                      key={student.id}
                      className={`student-card ${selectedStudents.includes(student.id) ? 'selected' : ''}`}
                      onClick={() => handleStudentClick(student.id)}
                      draggable
                      onDragStart={() => handleDragStart(student.id)}
                    >
                      <span className="student-name">
                        {student.lastName ? `${student.lastName}, ${student.firstName}` : student.firstName}
                        {rowPref !== 'none' && (
                          <span className={`row-pref-badge ${rowPref}`}>
                            {rowPref === 'front' ? 'F' : 'B'}
                          </span>
                        )}
                      </span>
                      <span className={`student-gender gender-${student.gender}`}>
                        {student.gender}
                      </span>
                    </li>
                  );
                })}
            </ul>
          )}
        </aside>

        {/* Right panel - Classroom grid */}
        <section className="classroom-panel">
          <h2>Classroom</h2>
          {state.gridRows === 0 ? (
            <p className="empty-message">Import students to see the seating arrangement</p>
          ) : (
            <>
              <div className="classroom-front">FRONT</div>
              <div className="classroom-grid" id="classroom-grid">
                {Array.from({ length: state.gridRows }, (_, row) => (
                  <div key={row} className="grid-row">
                    {Array.from({ length: state.gridCols / 2 }, (_, pairIndex) => {
                      const col1 = pairIndex * 2;
                      const col2 = pairIndex * 2 + 1;
                      const student1 = getStudentById(state.grid[row]?.[col1]);
                      const student2 = getStudentById(state.grid[row]?.[col2]);
                      const constraint = student1 && student2
                        ? getConstraintForPair(student1.id, student2.id)
                        : undefined;

                      return (
                        <div
                          key={pairIndex}
                          className={`seat-pair ${constraint?.type === 'ban' ? 'banned' : ''} ${constraint?.type === 'prefer' ? 'preferred' : ''}`}
                        >
                          <div
                            className={`seat ${student1 ? '' : 'empty'} ${student1 && selectedStudents.includes(student1.id) ? 'selected' : ''}`}
                            onClick={() => student1 && handleStudentClick(student1.id)}
                            onDragOver={handleDragOver}
                            onDrop={() => handleDrop(row, col1)}
                            draggable={!!student1}
                            onDragStart={() => student1 && handleDragStart(student1.id)}
                          >
                            {student1 ? (
                              <>
                                <span className="seat-name">
                                  {student1.lastName ? `${student1.lastName}, ${student1.firstName.charAt(0)}.` : student1.firstName}
                                </span>
                                <span className={`seat-gender gender-${student1.gender}`}>
                                  {student1.gender}
                                </span>
                              </>
                            ) : (
                              <span className="seat-empty">Empty</span>
                            )}
                          </div>
                          <div
                            className={`seat ${student2 ? '' : 'empty'} ${student2 && selectedStudents.includes(student2.id) ? 'selected' : ''}`}
                            onClick={() => student2 && handleStudentClick(student2.id)}
                            onDragOver={handleDragOver}
                            onDrop={() => handleDrop(row, col2)}
                            draggable={!!student2}
                            onDragStart={() => student2 && handleDragStart(student2.id)}
                          >
                            {student2 ? (
                              <>
                                <span className="seat-name">
                                  {student2.lastName ? `${student2.lastName}, ${student2.firstName.charAt(0)}.` : student2.firstName}
                                </span>
                                <span className={`seat-gender gender-${student2.gender}`}>
                                  {student2.gender}
                                </span>
                              </>
                            ) : (
                              <span className="seat-empty">Empty</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </main>

      {/* Pair Action Modal */}
      {showPairModal && selectedStudents.length === 2 && (
        <div className="modal-overlay" onClick={() => { setShowPairModal(false); setSelectedStudents([]); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Set Pair Constraint</h3>
            <p>
              <strong>{getStudentById(selectedStudents[0])?.firstName}</strong>
              {' & '}
              <strong>{getStudentById(selectedStudents[1])?.firstName}</strong>
            </p>
            {getExistingConstraint() && (
              <p className="existing-constraint">
                Current: {getExistingConstraint()?.type === 'ban' ? 'Banned' : 'Preferred'}
              </p>
            )}
            <div className="modal-actions">
              <button className="btn-danger" onClick={() => handleConstraintAction('ban')}>
                Ban
              </button>
              <button className="btn-success" onClick={() => handleConstraintAction('prefer')}>
                Prefer
              </button>
              {getExistingConstraint() && (
                <button className="btn-secondary" onClick={() => handleConstraintAction('clear')}>
                  Clear
                </button>
              )}
              <button className="btn-secondary" onClick={() => { setShowPairModal(false); setSelectedStudents([]); }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Row Preference Modal */}
      {showRowModal && selectedStudents.length === 1 && (
        <div className="modal-overlay" onClick={() => { setShowRowModal(false); setSelectedStudents([]); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Row Preference</h3>
            <p>
              <strong>{getStudentById(selectedStudents[0])?.firstName} {getStudentById(selectedStudents[0])?.lastName}</strong>
            </p>
            {getStudentRowPreference(selectedStudents[0]) !== 'none' && (
              <p className="existing-constraint">
                Current: {getStudentRowPreference(selectedStudents[0]) === 'front' ? 'Front Row' : 'Back Row'}
              </p>
            )}
            <div className="modal-actions">
              <button className="btn-primary" onClick={() => handleRowPreferenceAction('front')}>
                Front Row
              </button>
              <button className="btn-primary" onClick={() => handleRowPreferenceAction('back')}>
                Back Row
              </button>
              {getStudentRowPreference(selectedStudents[0]) !== 'none' && (
                <button className="btn-secondary" onClick={() => handleRowPreferenceAction('none')}>
                  Clear
                </button>
              )}
              <button className="btn-secondary" onClick={() => { setShowRowModal(false); setSelectedStudents([]); }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      {state.students.length > 0 && (
        <footer className="instructions">
          <p>
            <strong>Tip:</strong> Click a student twice to set front/back row preference.
            Click two different students to set a pair constraint (ban/prefer).
            Drag students to manually place them.
          </p>
        </footer>
      )}
    </div>
  );
}

export default App;
