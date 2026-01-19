import jsPDF from 'jspdf';
import { SeatingPlan, Student } from '../types';

function getStudentById(students: Student[], id: string | null): Student | undefined {
  if (!id) return undefined;
  return students.find(s => s.id === id);
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export async function exportToPDF(plan: SeatingPlan): Promise<void> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(plan.className || 'Seating Plan', margin, margin + 5);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${formatDate()}`, margin, margin + 12);

  // Grid section
  const gridStartY = margin + 20;
  const gridWidth = pageWidth * 0.6 - margin * 2;
  const gridHeight = pageHeight - gridStartY - margin - 30;

  const cellWidth = Math.min(30, gridWidth / plan.gridCols);
  const cellHeight = Math.min(20, gridHeight / plan.gridRows);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Classroom Layout', margin, gridStartY);
  doc.text('FRONT', margin + (plan.gridCols * cellWidth) / 2 - 10, gridStartY + 5);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  // Draw grid
  for (let row = 0; row < plan.gridRows; row++) {
    for (let col = 0; col < plan.gridCols; col++) {
      const x = margin + col * cellWidth;
      const y = gridStartY + 10 + row * cellHeight;

      // Draw cell border
      doc.setDrawColor(200);
      doc.rect(x, y, cellWidth, cellHeight);

      // Highlight pairs
      if (col % 2 === 0) {
        doc.setFillColor(245, 247, 250);
        doc.rect(x, y, cellWidth * 2, cellHeight, 'F');
        doc.rect(x, y, cellWidth, cellHeight);
        doc.rect(x + cellWidth, y, cellWidth, cellHeight);
      }

      // Student name
      const studentId = plan.grid[row]?.[col];
      const student = getStudentById(plan.students, studentId);
      if (student) {
        const displayName = student.lastName
          ? `${student.lastName}, ${student.firstName.charAt(0)}.`
          : student.firstName;
        doc.text(displayName, x + 2, y + cellHeight / 2 + 2, { maxWidth: cellWidth - 4 });
      }
    }
  }

  // Student list section (right side)
  const listStartX = pageWidth * 0.6;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Student List', listStartX, gridStartY);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  const sortedStudents = [...plan.students].sort((a, b) =>
    `${a.lastName}, ${a.firstName}`.localeCompare(`${b.lastName}, ${b.firstName}`)
  );

  let listY = gridStartY + 8;
  const lineHeight = 5;
  const maxStudentsPerColumn = Math.floor((pageHeight - listY - margin) / lineHeight);

  sortedStudents.forEach((student, index) => {
    const col = Math.floor(index / maxStudentsPerColumn);
    const row = index % maxStudentsPerColumn;
    const x = listStartX + col * 45;
    const y = listY + row * lineHeight;

    if (x < pageWidth - margin) {
      const name = student.lastName
        ? `${student.lastName}, ${student.firstName}`
        : student.firstName;
      doc.text(`${index + 1}. ${name} (${student.gender})`, x, y);
    }
  });

  // Constraints section
  const constraintsY = pageHeight - margin - 20;
  const bans = plan.constraints.filter(c => c.type === 'ban');
  const prefers = plan.constraints.filter(c => c.type === 'prefer');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Constraints:', margin, constraintsY);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  let constraintText = '';
  if (plan.genderMode !== 'none') {
    constraintText += `Gender mode: ${plan.genderMode === 'same' ? 'Same gender pairs' : 'Different gender pairs'}. `;
  }
  if (bans.length > 0) {
    constraintText += `Bans: ${bans.length}. `;
  }
  if (prefers.length > 0) {
    constraintText += `Preferences: ${prefers.length}. `;
  }
  if (!constraintText) {
    constraintText = 'None';
  }

  doc.text(constraintText, margin, constraintsY + 5);

  // Save
  doc.save(`${plan.className || 'seating-plan'}.pdf`);
}
