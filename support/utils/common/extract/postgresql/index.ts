import { PostgreSQL_DUMP } from "./helpers/postgresql.extract";
import { Extractor } from '@flatfile/util-extractor'


export const PostgreSQLExtractor = (
    fileExt: string,
    tableNameFilter?: string[]
) => {

    if (fileExt === '.sql') {
        return Extractor(fileExt, 'sql', async (buffer, options) => {
            return PostgreSQL_DUMP(buffer, tableNameFilter)
        })
    }

    throw new Error(
        `Please use .sql file type.`
    )
}