import { Flatfile } from '@flatfile/api'
import { WorkbookCapture } from '@flatfile/util-extractor'
import * as sql from 'mssql'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'
import * as AdmZip from 'adm-zip'
import fetch from 'node-fetch'
import FormData from 'form-data'

const execAsync = promisify(exec)

export async function SQLExtract_DUMP(
    buffer: Buffer
  ): Promise<WorkbookCapture> {
    try {
        const sqlContent = buffer.toString('utf-8')
        let workbook: WorkbookCapture = {}

        // Split into statements by semicolon
        const statements = sqlContent.split(';').map(stmt => stmt.trim()).filter(Boolean)
        
        for (const statement of statements) {
            if (statement.toUpperCase().includes('CREATE TABLE')) {
                // Extract table name
                const tableNameMatch = statement.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`(\w+)`/i)
                if (!tableNameMatch) continue

                const tableName = tableNameMatch[1]

                // Extract column definitions
                const columnsMatch = statement.match(/\((.*)\)/s)
                if (!columnsMatch) continue

                // Split column definitions and clean them up
                const columns = columnsMatch[1].split(',')
                    .map(col => col.trim())
                    .filter(col => {
                        const lowerCol = col.toLowerCase();
                        return col && 
                               !lowerCol.includes('primary key') && 
                               !lowerCol.includes('foreign key') &&
                               !lowerCol.includes('key') &&
                               !lowerCol.includes('constraint');
                    });

                // Extract column names
                const headers = columns
                    .map(col => {
                        const match = col.match(/`(\w+)`/);
                        return match ? match[1] : null;
                    })
                    .filter(Boolean) as string[];

                // Initialize sheet for this table with headers
                workbook[tableName] = {
                    headers,
                    data: [],
                    metadata: { rowHeaders: [] }
                }
            } else if (statement.toUpperCase().includes('INSERT INTO')) {
                // Extract table name from INSERT statement
                const insertTableMatch = statement.match(/INSERT\s+INTO\s+`(\w+)`\s*(\([^)]+\))?\s*VALUES/i)
                if (!insertTableMatch) continue

                const tableName = insertTableMatch[1]
                if (!workbook[tableName]) continue

                // Get column order from INSERT statement if specified
                let columnOrder = workbook[tableName].headers
                if (insertTableMatch[2]) {
                    columnOrder = insertTableMatch[2]
                        .replace(/^\(|\)$/g, '')
                        .split(',')
                        .map(col => col.trim().replace(/^`|`$/g, ''))
                }

                // Extract values
                const valuesMatch = statement.match(/VALUES\s*(\(.*\))/s)
                if (!valuesMatch) continue

                // Split multiple value sets
                const valuesSets = valuesMatch[1].match(/\([^)]+\)/g) || []
                
                for (const valueSet of valuesSets) {
                    // Clean and split values
                    const values = valueSet
                        .replace(/^\(|\)$/g, '')  // Remove outer parentheses
                        .split(',')
                        .map(v => v.trim().replace(/^['`"]|['`"]$/g, ''))  // Clean quotes

                    // Create record using the column order from INSERT
                    const record = columnOrder.reduce((acc, colName, index) => ({
                        ...acc,
                        [colName]: { value: values[index] || '' }
                    }), {})

                    workbook[tableName].data.push(record)
                }
            }
        }

        return workbook
    } catch (error) {
        console.log('An error occurred:', error)
        throw error
    }
}

export async function SQLExtract_BAK(
    buffer: Buffer
): Promise<WorkbookCapture> {
    try {
        // Create form data directly from buffer
        const form = new FormData()
        form.append('files[]', buffer, {
            filename: 'database.bak',
            contentType: 'application/octet-stream'
        })

        // Call RebaseData API
        const response = await fetch(
            'https://www.rebasedata.com/api/v1/convert?outputFormat=csv&errorResponse=zip',
            {
                method: 'POST',
                body: form
            }
        )

        if (!response.ok) {
            throw new Error(`RebaseData API error: ${response.statusText}`)
        }

        // Get zip buffer directly from response
        const zipBuffer = await response.buffer()
        
        // Process zip buffer directly
        const zip = new AdmZip(zipBuffer)
        const zipEntries = zip.getEntries()

        // Initialize workbook
        let workbook: WorkbookCapture = {}

        // Process each CSV file in the zip
        for (const entry of zipEntries) {
            if (!entry.entryName.endsWith('.csv')) continue

            // Get table name from filename (remove .csv extension)
            const tableName = path.basename(entry.entryName, '.csv')

            // Read CSV content directly from zip entry
            const csvContent = entry.getData().toString('utf8')
            const lines = csvContent.split('\n').map(line => line.trim()).filter(Boolean)

            if (lines.length === 0) continue

            // First line contains headers
            const headers = lines[0].split(',').map(header => header.trim().replace(/^["']|["']$/g, ''))

            // Rest of the lines are data
            const data = lines.slice(1).map(line => {
                const values = line.split(',').map(val => val.trim().replace(/^["']|["']$/g, ''))
                return headers.reduce((acc, header, index) => ({
                    ...acc,
                    [header]: { value: values[index] || '' }
                }), {})
            })

            // Add to workbook
            workbook[tableName] = {
                headers,
                data,
                metadata: { rowHeaders: [] }
            }
        }

        return workbook
    } catch (error) {
        console.error('An error occurred:', error)
        throw error
    }
}