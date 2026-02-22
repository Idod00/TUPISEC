import type { Finding } from "./types";

export interface ComparisonResult {
  newFindings: Finding[];
  resolvedFindings: Finding[];
  persistentFindings: Finding[];
}

function findingKey(f: Finding): string {
  return `${f.category}::${f.title}`;
}

export function compareScans(findingsA: Finding[], findingsB: Finding[]): ComparisonResult {
  const keysA = new Set(findingsA.map(findingKey));
  const keysB = new Set(findingsB.map(findingKey));
  const mapA = new Map(findingsA.map((f) => [findingKey(f), f]));
  const mapB = new Map(findingsB.map((f) => [findingKey(f), f]));

  const newFindings: Finding[] = [];
  const resolvedFindings: Finding[] = [];
  const persistentFindings: Finding[] = [];

  for (const [key, finding] of mapB) {
    if (!keysA.has(key)) {
      newFindings.push(finding);
    } else {
      persistentFindings.push(finding);
    }
  }

  for (const [key, finding] of mapA) {
    if (!keysB.has(key)) {
      resolvedFindings.push(finding);
    }
  }

  return { newFindings, resolvedFindings, persistentFindings };
}
