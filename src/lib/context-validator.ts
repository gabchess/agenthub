/**
 * Validates resolved templates for missing variable markers.
 * Scans for [missing: varname] markers left by resolveTemplate().
 */

export interface ValidationResult {
  valid: boolean;
  missingVars: string[];
}

export function validateResolvedTemplate(resolved: string): ValidationResult {
  const missingPattern = /\[missing: (\w+(?:\.\w+)*)\]/g;
  const missingVars: string[] = [];
  let match;
  while ((match = missingPattern.exec(resolved)) !== null) {
    missingVars.push(match[1]);
  }
  return {
    valid: missingVars.length === 0,
    missingVars,
  };
}
