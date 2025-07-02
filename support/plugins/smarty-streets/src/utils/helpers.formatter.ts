import type { SmartyHttpResponseItem, SmartyResponseComponents } from "../types/smarty";
import type { SmartyStreetsOptions } from "../types/config";

/**
* Formats the secondary address line from SmartyStreets response components.
* @param components - SmartyStreets response components.
* @returns The formatted secondary line or undefined if no secondary components.
*/
export function formatSecondary(components: SmartyResponseComponents): string | undefined {
  if (!components) return undefined;
  
  // The SmartyStreets API uses secondary_number and secondary_designator 
  // in the components object
  const { secondary_number, secondary_designator } = components;
  
  if (!secondary_number) return undefined;
  
  return secondary_designator 
  ? `${secondary_designator} ${secondary_number}` 
  : secondary_number;
}

/**
* Gets formatted address components from SmartyStreets API response.
* @param smartyItem - SmartyStreets API response item.
* @param options - SmartyStreets options.
* @returns Address components for field matching.
*/
export function getFormattedAddressComponents(
  smartyItem: SmartyHttpResponseItem,
  options?: SmartyStreetsOptions,
): Record<string, string | undefined> {
  const components = smartyItem.components;
  const metadata = smartyItem.metadata;
  
  // Construct primary street EXCLUSIVELY from components initially
  const primaryStreetParts = [
    components?.primary_number,
    components?.street_predirection,
    components?.street_name,
    components?.street_suffix,
    components?.street_postdirection
  ];
  let primary_street = primaryStreetParts.filter(Boolean).join(" ") || undefined; 

  // Fallback: If component-based street is empty or potentially incomplete,
  // and delivery_line_1 exists, prefer delivery_line_1.
  // This handles cases where SmartyStreets returns a valid address line
  // but minimal component breakdown.
  const streetSeemsIncomplete = !primary_street || 
                               (!components?.primary_number && !components?.street_name); 

  if (streetSeemsIncomplete && smartyItem.delivery_line_1) {
      const temp_secondary = components ? formatSecondary(components) : undefined;
      if (temp_secondary && smartyItem.delivery_line_1.endsWith(temp_secondary)) {
          let potentialPrimary = smartyItem.delivery_line_1.substring(0, smartyItem.delivery_line_1.length - temp_secondary.length).trim();
          if (potentialPrimary.endsWith(',')) {
              potentialPrimary = potentialPrimary.slice(0, -1).trim();
          }
          if (potentialPrimary) {
              primary_street = potentialPrimary;
          } else {
              primary_street = smartyItem.delivery_line_1;
          }
      } else {
          primary_street = smartyItem.delivery_line_1;
      }
  }
  
  const street_secondary = components ? formatSecondary(components) : undefined;
  
  let reconstructedLine1 = primary_street || '';
  
  // Avoid duplicating secondary info in reconstructedLine1 if primary_street came from delivery_line_1
  // and already contained it
  if (!(streetSeemsIncomplete && smartyItem.delivery_line_1 && smartyItem.delivery_line_1.includes(street_secondary || '')) && street_secondary) {
     reconstructedLine1 += (reconstructedLine1 ? ', ' : '') + street_secondary;
  }

  let full: string | undefined = undefined;
  if (reconstructedLine1 || smartyItem.last_line) {
    const fullParts = [reconstructedLine1, smartyItem.last_line].filter(Boolean);
    full = fullParts.join(', ');
  }
  
  let formattedZip = components?.zipcode;
  if (options?.includeZipPlus4 && components?.zipcode && components?.plus4_code) {
    formattedZip = `${components.zipcode}-${components.plus4_code}`;
  }
  
  let rdi: string | undefined = undefined;
  if (options?.includeRDI && metadata?.rdi) {
    rdi = metadata.rdi;
  }
  
  return {
    primary_street, 
    street_secondary,
    city: components?.city_name,
    state: components?.state_abbreviation,
    zip: formattedZip,
    zip4: components?.plus4_code,
    full, 
    rdi,
  };
}