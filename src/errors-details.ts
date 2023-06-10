export const EM = {
  2100: null,
  2101: null,

  2102: null,
  2103: 'No role permissions.',
  2104: 'Unauthorized status.',
  2105: 'Passwords do not match.',
  2106: null,
  2107: null,
  2108: null,

  2109: 'Not enough arguments provided.',
  2110: 'Bad setting at requiredLoginItems.',
  2111: null,
  2112: 'No role permissions.',
  2113: 'Unauthorized status.',
  2114: 'Passwords do not match.',
  2115: null,
  2116: null,

  2199: null,
} as const
type EM = typeof EM & { [key:number]: string | null }

// Regular expression for searching the target line
// new E\d+|pushReplyCode\(
