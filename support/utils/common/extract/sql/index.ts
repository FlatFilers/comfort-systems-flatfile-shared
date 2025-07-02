import { SQLExtract_BAK, SQLExtract_DUMP } from "./helpers/sql.extract";
import { Extractor } from '@flatfile/util-extractor'


export const SQLExtractor = (
    fileExt: string
) => {

    if (fileExt === '.bak') {
        return Extractor(fileExt, 'bak', SQLExtract_BAK)
    }

    if (fileExt === '.sql') {
        return Extractor(fileExt, 'sql', SQLExtract_DUMP)
    }

    throw new Error(
        `Please use .bak or .sql file type.`
    )
}