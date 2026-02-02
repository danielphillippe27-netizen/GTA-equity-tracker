// Source of Truth for TRREB District Mappings
// Maps Modern Area Names -> Historic District Codes (1996-2010)

export const DISTRICT_MAPPINGS: Record<string, string[]> = {
  // --- DURHAM REGION ---
  'Pickering': ['E13', 'E-13'],
  'Ajax': ['E14', 'E-14'],
  'Whitby': ['E15', 'E-15'],
  'Oshawa': ['E16', 'E-16'],
  'Clarington': ['E17', 'E-17'],
  'Bowmanville': ['E17', 'E-17'],
  'Scugog': ['E18', 'E-18'],
  'Uxbridge': ['E19', 'E-19'],
  'Brock': ['E20', 'E-20'], // Often combined with others in old reports

  // --- PEEL REGION ---
  'Brampton': ['W23', 'W24', 'W-23', 'W-24'], // Brampton is split
  'Caledon': ['W25', 'W-25'],
  'Mississauga': [
    'W12', 'W13', 'W14', 'W15', 'W16', 'W17', 'W18', 'W19', 'W20',
    'W-12', 'W-13', 'W-14', 'W-15', 'W-16', 'W-17', 'W-18', 'W-19', 'W-20'
  ],

  // --- HALTON REGION ---
  'Oakville': ['W06', 'W-06', 'W16'], // W06 is main Oakville, parts overlap
  'Burlington': ['W31', 'W-31'], 
  'Milton': ['W25', 'W-25'], // Sometimes grouped with Caledon in very old stats
  'Halton Hills': ['W26', 'W-26'], // Georgetown

  // --- YORK REGION ---
  'Richmond Hill': ['N03', 'N04', 'N05', 'N-03', 'N-04', 'N-05'],
  'Markham': ['N10', 'N11', 'N-10', 'N-11'], // Often N11
  'Vaughan': ['N06', 'N07', 'N08', 'N-06', 'N-07', 'N-08'], // Woodbridge/Maple
  'Aurora': ['N06'], // Often grouped
  'Newmarket': ['N07'],
  'King': ['N20'],
  'Whitchurch-Stouffville': ['N18'],
  'Georgina': ['N17'],

  // --- TORONTO (CENTRAL) ---
  'Toronto C01': ['C01', 'C-1'],
  'Toronto C02': ['C02', 'C-2'],
  'Toronto C03': ['C03', 'C-3'],
  'Toronto C04': ['C04', 'C-4'],
  'Toronto C06': ['C06', 'C-6'],
  'Toronto C07': ['C07', 'C-7'],
  'Toronto C08': ['C08', 'C-8'],
  'Toronto C09': ['C09', 'C-9'],
  'Toronto C10': ['C10', 'C-10'],
  'Toronto C11': ['C11', 'C-11'],
  'Toronto C12': ['C12', 'C-12'],
  'Toronto C13': ['C13', 'C-13'],
  'Toronto C14': ['C14', 'C-14'],
  'Toronto C15': ['C15', 'C-15'],

  // --- TORONTO (WEST) ---
  'Toronto W01': ['W01', 'W-1'],
  'Toronto W02': ['W02', 'W-2'],
  'Toronto W03': ['W03', 'W-3'],
  'Toronto W04': ['W04', 'W-4'],
  'Toronto W05': ['W05', 'W-5'],
  'Toronto W06': ['W06', 'W-6'],
  'Toronto W07': ['W07', 'W-7'],
  'Toronto W08': ['W08', 'W-8'],
  'Toronto W09': ['W09', 'W-9'],
  'Toronto W10': ['W10', 'W-10'],

  // --- TORONTO (EAST) ---
  'Toronto E01': ['E01', 'E-1'],
  'Toronto E02': ['E02', 'E-2'],
  'Toronto E03': ['E03', 'E-3'],
  'Toronto E04': ['E04', 'E-4'],
  'Toronto E05': ['E05', 'E-5'],
  'Toronto E06': ['E06', 'E-6'],
  'Toronto E07': ['E07', 'E-7'],
  'Toronto E08': ['E08', 'E-8'],
  'Toronto E09': ['E09', 'E-9'],
  'Toronto E10': ['E10', 'E-10'],
  'Toronto E11': ['E11', 'E-11']
};

/**
 * Returns a list of all possible database names for a given modern area name.
 * e.g. "Pickering" -> ["Pickering", "E13", "E-13"]
 */
export function getLookupKeys(modernName: string): string[] {
  const codes = DISTRICT_MAPPINGS[modernName] || [];
  return [modernName, ...codes];
}

/**
 * Normalizes a database area name back to its Modern Name.
 * e.g. "E-13" -> "Pickering"
 */
export function normalizeAreaName(dbName: string): string {
  // Reverse lookup
  for (const [modern, codes] of Object.entries(DISTRICT_MAPPINGS)) {
    if (dbName === modern || codes.includes(dbName)) {
      return modern;
    }
  }
  return dbName; // Fallback: return original if no map found
}
