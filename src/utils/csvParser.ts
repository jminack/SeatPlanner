import { Student, Gender } from '../types';

interface ParseResult {
  students: Student[];
  errors: string[];
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function parseGender(value: string): Gender | null {
  const normalized = value.trim().toUpperCase();
  if (normalized === 'M' || normalized === 'MALE') return 'M';
  if (normalized === 'F' || normalized === 'FEMALE') return 'F';
  if (normalized === 'O' || normalized === 'OTHER') return 'O';
  return null;
}

function parseName(value: string): { firstName: string; lastName: string } | null {
  const trimmed = value.trim();

  // Try "Last,First" format
  if (trimmed.includes(',')) {
    const parts = trimmed.split(',').map(p => p.trim());
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return { lastName: parts[0], firstName: parts[1] };
    }
  }

  // Try "First Last" format
  const spaceParts = trimmed.split(/\s+/);
  if (spaceParts.length >= 2) {
    return {
      firstName: spaceParts[0],
      lastName: spaceParts.slice(1).join(' ')
    };
  }

  // Single name - use as both
  if (trimmed.length > 0) {
    return { firstName: trimmed, lastName: '' };
  }

  return null;
}

export function parseCSV(content: string): ParseResult {
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  const students: Student[] = [];
  const errors: string[] = [];

  if (lines.length === 0) {
    errors.push('File is empty');
    return { students, errors };
  }

  // Check if first line is a header
  const firstLine = lines[0].toLowerCase();
  const hasHeader = firstLine.includes('name') || firstLine.includes('gender') || firstLine.includes('student');
  const startIndex = hasHeader ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Split by comma, handling quoted values
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        parts.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current.trim());

    if (parts.length < 2) {
      errors.push(`Line ${i + 1}: Expected at least 2 columns (name, gender), got ${parts.length}`);
      continue;
    }

    const nameResult = parseName(parts[0]);
    if (!nameResult) {
      errors.push(`Line ${i + 1}: Invalid name format "${parts[0]}"`);
      continue;
    }

    const gender = parseGender(parts[1]);
    if (!gender) {
      errors.push(`Line ${i + 1}: Invalid gender "${parts[1]}" (expected M/F/O)`);
      continue;
    }

    students.push({
      id: generateId(),
      firstName: nameResult.firstName,
      lastName: nameResult.lastName,
      gender,
    });
  }

  return { students, errors };
}
