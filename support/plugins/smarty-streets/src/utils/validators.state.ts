/**
* State abbreviations to full state name mapping for US addresses. 
* libaddress-validator does not support state abbreviations, so we need to map them.
*/
export const STATE_ABBREVIATIONS: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming"
};

/**
* Common state abbreviation typos and variations for correction
* Maps potentially mistaken state entries to their correct two-letter abbreviations
*/
export const STATE_TYPOS: Record<string, string> = {
  // Common 2-letter typos (duplicated for completeness)
  'AL': 'AL', 'AK': 'AK', 'AZ': 'AZ', 'AR': 'AR', 'CA': 'CA',
  'CO': 'CO', 'CT': 'CT', 'DE': 'DE', 'FL': 'FL', 'GA': 'GA',
  'HI': 'HI', 'ID': 'ID', 'IL': 'IL', 'IN': 'IN', 'IA': 'IA',
  'KS': 'KS', 'KY': 'KY', 'LA': 'LA', 'ME': 'ME', 'MD': 'MD',
  'MA': 'MA', 'MI': 'MI', 'MN': 'MN', 'MS': 'MS', 'MO': 'MO',
  'MT': 'MT', 'NE': 'NE', 'NV': 'NV', 'NH': 'NH', 'NJ': 'NJ',
  'NM': 'NM', 'NY': 'NY', 'NC': 'NC', 'ND': 'ND', 'OH': 'OH',
  'OK': 'OK', 'OR': 'OR', 'PA': 'PA', 'RI': 'RI', 'SC': 'SC',
  'SD': 'SD', 'TN': 'TN', 'TX': 'TX', 'UT': 'UT', 'VT': 'VT',
  'VA': 'VA', 'WA': 'WA', 'WV': 'WV', 'WI': 'WI', 'WY': 'WY',
  // Common typos and alternative formats (lowercase, with punctuation, etc)
  'al': 'AL', 'ak': 'AK', 'az': 'AZ', 'ar': 'AR', 'ca': 'CA',
  'n.y.': 'NY', 'n.y': 'NY', 'ny.': 'NY', 'n y': 'NY',
  'mass': 'MA', 'mass.': 'MA', 'va.': 'VA', 'penn': 'PA',
  'fla': 'FL', 'fla.': 'FL', 'fl.': 'FL', 'tex': 'TX',
  'tex.': 'TX', 'tx.': 'TX', 'cal': 'CA', 'cal.': 'CA',
  'calif': 'CA', 'calif.': 'CA', 'tenn': 'TN', 'tenn.': 'TN',
  // Additional common variations
  'ariz': 'AZ', 'conn': 'CT', 'ill': 'IL', 'ind': 'IN',
  'mich': 'MI', 'minn': 'MN', 'miss': 'MS', 'mont': 'MT',
  'nebr': 'NE', 'nev': 'NV', 'okla': 'OK', 'oreg': 'OR',
  'wis': 'WI', 'wyo': 'WY', 'wash': 'WA', 'wash.': 'WA',
  'dc': 'DC', 'd.c.': 'DC', 'district of columbia': 'DC',
  'n. carolina': 'NC', 's. carolina': 'SC', 'n. dakota': 'ND', 's. dakota': 'SD',
  'w. virginia': 'WV', 'n. hampshire': 'NH', 'n. jersey': 'NJ', 'n. mexico': 'NM'
};

/**
* Standardizes a state input string to a proper state name.
* 
* @param stateInput - The state input string to standardize.
* @returns An object containing the standardized state name, validity status, and optional error message.
*/
export function standardizeState(stateInput: string | undefined): { 
  standardizedName: string | undefined; 
  valid: boolean; 
  message?: string 
} {
  if (!stateInput) {
    return { standardizedName: undefined, valid: false, message: "State is required" };
  }
  
  let standardizedState = String(stateInput).trim();
  const upperState = standardizedState.toUpperCase();
  let stateFound = false;
  
  // First check: Is it a valid 2-letter abbreviation?
  if (standardizedState.length === 2 && STATE_ABBREVIATIONS[upperState]) {
    standardizedState = STATE_ABBREVIATIONS[upperState];
    stateFound = true;
  } 
  // Second check: Is it already a full state name that matches one in our list?
  else {
    // Try to match against full state names (case-insensitive)
    const possibleFullStateName = Object.values(STATE_ABBREVIATIONS).find(
      fullName => fullName.toLowerCase() === standardizedState.toLowerCase()
    );
    
    if (possibleFullStateName) {
      standardizedState = possibleFullStateName;
      stateFound = true;
    }
    // Third check: Check for common typos and alternate forms
    else {
      // Try to find a matching typo or alternate form, first checking the exact string
      // and then checking a standardized lowercase version
      const correctedAbbreviation = STATE_TYPOS[standardizedState] || 
      STATE_TYPOS[standardizedState.toLowerCase()];
      
      if (correctedAbbreviation && STATE_ABBREVIATIONS[correctedAbbreviation]) {
        standardizedState = STATE_ABBREVIATIONS[correctedAbbreviation];
        stateFound = true;
      }
      // Last attempt: Try removing spaces and punctuation for a fuzzy match
      else {
        const standardizedInput = standardizedState.toLowerCase().replace(/[.\s-]/g, '');
        
        // Check each state name and abbreviation for a match after standardization
        for (const [abbr, fullName] of Object.entries(STATE_ABBREVIATIONS)) {
          const standardizedFullName = fullName.toLowerCase().replace(/\s/g, '');
          if (standardizedFullName === standardizedInput || abbr.toLowerCase() === standardizedInput) {
            standardizedState = fullName;
            stateFound = true;
            break;
          }
        }
      }
    }
  }
  
  if (!stateFound) {
    // Provide a more helpful error message with suggestions
    const suggestions = Object.entries(STATE_ABBREVIATIONS)
    .filter(([abbr, name]) => {
      // Find plausible matches based on first letter or similar sounding states
      return abbr[0] === upperState[0] || 
      name.toLowerCase().startsWith(standardizedState.toLowerCase().substring(0, 2));
    })
    .map(([abbr, name]) => `${abbr} (${name})`)
    .slice(0, 3)
    .join(', ');
    
    return { 
      standardizedName: undefined, 
      valid: false, 
      message: `State '${stateInput}' is not a valid US state. ${suggestions ? `Did you mean: ${suggestions}?` : ''}`
    };
  }
  
  return {
    standardizedName: standardizedState,
    valid: true
  };
}