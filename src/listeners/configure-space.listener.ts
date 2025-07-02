import { companyWorkbook } from "../blueprints/workbooks/company.workbook";
import { configureSpace } from "@flatfile/plugin-space-configure";

export const spaceConfig = configureSpace({
  workbooks: [ companyWorkbook ],
    space: {
      metadata: {
        theme: {
          root: {
            primaryColor: "#1E88E5",      // Bright blue matching CSUSA website
            dangerColor: "#E53E3E",       // Red for danger states
            warningColor: "#F6AD55",      // Orange for warnings
            borderColor: "#E2E8F0",       // Light border color
            fontFamily: "Inter, -apple-system, sans-serif"
          },
          sidebar: {
            logo: 'https://comfortsystemsusa.com/wp-content/uploads/logo_white.svg',
            backgroundColor: "#1A365D",     // Dark navy blue matching CSUSA website
            textColor: "#FFFFFF",           // White text for contrast
            titleColor: "#1E88E5",          // Bright blue for titles
            focusBgColor: "#2D3748",        // Slightly lighter navy for focus
            focusTextColor: "#FFFFFF"       // White text on focus
          },
          table: {
            column: {
              header: {
                backgroundColor: "#2D3748",  // Dark gray-blue matching website aesthetic
                color: "#FFFFFF"             // White text for contrast
              }
            },
            indexColumn: {
              backgroundColor: "#F7FAFC",    // Very light blue-gray
              color: "#1A365D",              // Dark navy text
              selected: {
                backgroundColor: "#1E88E5"   // Bright blue for selection
              }
            },
            inputs: {
              checkbox: {
                color: "#1E88E5",            // Bright blue matching primary
                borderColor: "#CBD5E0"       // Light gray-blue borders
              }
            },
            footer: {
              backgroundColor: "#2D3748",    // Matching header background
              textColor: "#FFFFFF"           // White text
            }
          }
        }
      }
    }
}); 