import { SeatingPlan } from '../types';

export function savePlanToFile(plan: SeatingPlan): void {
  const json = JSON.stringify(plan, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${plan.className || 'seating-plan'}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function loadPlanFromFile(file: File): Promise<SeatingPlan> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const plan = JSON.parse(content) as SeatingPlan;

        // Validate required fields
        if (!Array.isArray(plan.students)) {
          throw new Error('Invalid file: missing students array');
        }
        if (!Array.isArray(plan.constraints)) {
          throw new Error('Invalid file: missing constraints array');
        }
        if (!Array.isArray(plan.grid)) {
          throw new Error('Invalid file: missing grid array');
        }

        resolve(plan);
      } catch (err) {
        reject(new Error(`Failed to parse file: ${err instanceof Error ? err.message : 'Unknown error'}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}

export function loadCSVFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result as string;
      resolve(content);
    };

    reader.onerror = () => {
      reject(new Error('Failed to read CSV file'));
    };

    reader.readAsText(file);
  });
}
