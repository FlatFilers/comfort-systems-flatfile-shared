import { TabularExtract } from "./helpers/tabular.extract";
import { Extractor } from '@flatfile/util-extractor'

export enum NativeFileTypes {
    CSV = 'csv',
    TSV = 'tsv',
    PSV = 'psv',
}

export const TabularExtractor = (
    fileExt: string
) => {

    if (Object.values(NativeFileTypes).includes(fileExt as NativeFileTypes)) {
        throw new Error(
        `${fileExt} is a native file type and not supported by the ocr extractor.`
        )
    }

    return Extractor(fileExt, 'tabular', TabularExtract)
}