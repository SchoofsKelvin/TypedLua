
export interface Diagnostic {
  type: DiagnosticType;
  code: DiagnosticCode;
  message?: string;
  index: number;
}

export const enum DiagnosticType {
  Error = 'error',
  Warning = 'warning',
}

export const enum DiagnosticCode {
  ERROR_CANNOT_CAST = 'ERROR_CANNOT_CAST',
  ERROR_UNKNOWN_TYPE = 'ERROR_UNKNOWN_TYPE',
  WARNING_IMPLICIT_VARIABLE = 'WARNING_IMPLICIT_VARIABLE',
  WARNING_IMPLICIT_PARAMETER = 'WARNING_IMPLICIT_PARAMETER',
  WARNING_UNKNOWN_BINARY_OP = 'WARNING_UNKNOWN_BINARY_OP',
}
