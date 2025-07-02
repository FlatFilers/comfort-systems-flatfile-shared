import { WorkbookCapture } from '@flatfile/util-extractor'



export async function PostgreSQL_DUMP(
    buffer: Buffer,
    tableNameFilter?: string[]
): Promise<WorkbookCapture> {
    try {
        const sqlContent = buffer.toString('utf-8')
        let workbook: WorkbookCapture = {}

        // Find all data blocks using regex - updated pattern
        const dataBlockRegex = /-- Data for Name: ([^;]+); Type: TABLE DATA;[\s\S]*?COPY ([\s\S]*?)\\\./g
        let match

        while ((match = dataBlockRegex.exec(sqlContent)) !== null) {
            const tableName = match[1].trim()

            //add wildcard filter * and compare on lower case
            if(tableNameFilter && tableNameFilter.length > 0){
                if(!tableNameFilter.some(filter => wildcardMatch(tableName, filter))) {
                    continue
                }
            }
            const copyBlock = match[2].trim()

            if (!copyBlock) continue

            // Split into lines and filter out empty ones
            const lines = copyBlock.split('\n').filter(line => line.trim())
            
            if (lines.length === 0) continue
            
            // First line contains the COPY statement with column names
            const copyMatch = lines[0].match(/([^\(]+)\((.*?)\)\s+FROM/i)
            if (!copyMatch) continue

            // Process headers and handle duplicates
            const headerCounts: { [key: string]: number } = {}
            const headers = copyMatch[2]
                .split(',')
                .map(header => {
                    const cleanHeader = header.trim().replace(/^["']|["']$/g, '')
                    const lowerHeader = cleanHeader.toLowerCase()
                    
                    headerCounts[lowerHeader] = (headerCounts[lowerHeader] || 0) + 1
                    
                    return headerCounts[lowerHeader] > 1 
                        ? `${cleanHeader}${headerCounts[lowerHeader]}`
                        : cleanHeader
                })

            // Process data lines (skip COPY statement)
            const dataLines = lines.slice(1)

            if(lines.length > 1) {
              // Initialize table in workbook
              workbook[tableName] = {
                headers,
                data: [],
                metadata: { rowHeaders: [] }
              }
            }
            
            dataLines.forEach(line => {
                const values = parseCopyLine(line)
                
                const record = headers.reduce((acc, header, index) => ({
                    ...acc,
                    [header]: { value: values[index] || '' }
                }), {})

                workbook[tableName].data.push(record)
            })
        }
        
        return workbook
    } catch (error) {
        console.error('An error occurred:', error)
        throw error
    }
}

function parseCopyLine(line: string): string[] {
    const values: string[] = []
    let currentValue = ''
    let insideQuotes = false
    let escapeNext = false
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i]
        
        if (escapeNext) {
            // Handle escaped characters
            switch (char) {
                case 'N': // \N represents NULL in COPY format
                    currentValue = ''
                    break
                case 'b': currentValue += '\b'; break
                case 'f': currentValue += '\f'; break
                case 'n': currentValue += '\n'; break
                case 'r': currentValue += '\r'; break
                case 't': currentValue += '\t'; break
                case 'v': currentValue += '\v'; break
                default: currentValue += char
            }
            escapeNext = false
            continue
        }

        if (char === '\\') {
            escapeNext = true
            continue
        }

        if (char === '"' && !escapeNext) {
            insideQuotes = !insideQuotes
            continue
        }

        if (char === '\t' && !insideQuotes) {
            values.push(currentValue)
            currentValue = ''
            continue
        }

        currentValue += char
    }

    // Push the last value
    if (currentValue || values.length > 0) {
        values.push(currentValue)
    }

    return values
}

function wildcardMatch(text: string, pattern: string): boolean {
    // Convert wildcard pattern to regex pattern
    // First escape any regex special chars except * and ?
    let regexPattern = pattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&');
    
    // Then replace wildcards with their regex equivalents
    regexPattern = regexPattern
        .replace(/\*/g, '.*')  // * matches any sequence of characters
        .replace(/\?/g, '.');  // ? matches a single character
    
    // Create regex with the pattern
    const regex = new RegExp(`^${regexPattern}$`, 'i'); // 'i' for case insensitive
    
    return regex.test(text);
}