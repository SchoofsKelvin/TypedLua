
export interface Diagnostic {
  type: DiagnosticType;
  code: DiagnosticCode;
  message?: string;
  index: number;
}

export const enum DiagnosticType {
  Error = 'error',
}

export const enum DiagnosticCode {
  ERROR_CANNOT_CAST = 'ERROR_CANNOT_CAST',
  ERROR_UNKNOWN_TYPE = 'ERROR_UNKNOWN_TYPE',
}
