/**
 * Smart file naming utility for document uploads
 * Scrubs existing document number/version from filename and applies current values
 */

/**
 * Extracts the base filename without document number/version prefix
 * Handles various formats:
 * - FORM-00001vA_filename.pdf -> filename.pdf
 * - FORM-00001vA filename.pdf -> filename.pdf  
 * - PROC-00123v2_filename.pdf -> filename.pdf
 * - filename.pdf -> filename.pdf (no prefix to remove)
 */
export function scrubDocumentPrefix(filename: string): string {
  // Pattern matches: PREFIX-#####vX_ or PREFIX-#####vX (with space or underscore)
  // Examples: FORM-00001vA_, PROC-00123v2_, WI-00045vB 
  const prefixPattern = /^[A-Z]+-\d{5}v[A-Z0-9]+[_\s]/i
  
  if (prefixPattern.test(filename)) {
    // Remove the prefix part (everything up to and including the underscore/space)
    return filename.replace(prefixPattern, '')
  }
  
  return filename
}

/**
 * Generates a properly formatted filename with document number and version
 * @param documentNumber - e.g., "FORM-00001"
 * @param version - e.g., "vA" or "v1"
 * @param originalFilename - e.g., "User Survey.pdf" or "FORM-00001vA_User Survey.pdf"
 * @param autoRename - whether to apply smart renaming (scrub + reapply)
 * @returns formatted filename - e.g., "FORM-00001vA_User Survey.pdf"
 */
export function formatDocumentFilename(
  documentNumber: string,
  version: string,
  originalFilename: string,
  autoRename: boolean = true
): string {
  if (!autoRename) {
    // Auto-rename disabled - use original filename as-is
    return originalFilename
  }

  // Scrub any existing document prefix from the filename
  const cleanFilename = scrubDocumentPrefix(originalFilename)
  
  // Apply current document number and version
  return `${documentNumber}${version}_${cleanFilename}`
}

/**
 * Example usage:
 * 
 * // File uploaded to Draft FORM-00001vA
 * formatDocumentFilename('FORM-00001', 'vA', 'Survey.pdf', true)
 * // => 'FORM-00001vA_Survey.pdf'
 * 
 * // File already has old version prefix - scrub and update
 * formatDocumentFilename('FORM-00001', 'vB', 'FORM-00001vA_Survey.pdf', true)
 * // => 'FORM-00001vB_Survey.pdf'
 * 
 * // File has wrong document number - scrub and correct
 * formatDocumentFilename('FORM-00001', 'vA', 'PROC-00123v1_Survey.pdf', true)
 * // => 'FORM-00001vA_Survey.pdf'
 * 
 * // Auto-rename disabled - use original
 * formatDocumentFilename('FORM-00001', 'vA', 'MySurvey.pdf', false)
 * // => 'MySurvey.pdf'
 */
