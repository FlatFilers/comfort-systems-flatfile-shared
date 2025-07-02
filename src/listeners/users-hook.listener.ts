import { bulkRecordHook } from "@flatfile/plugin-record-hook";
import * as ssnValidator from "ssn-validator";

export const allDataHook = bulkRecordHook(
  "all-data",
  async (records, context) => {
    records.forEach((record) => {
      // TODO: Add reference table lookup from space to subsidiary
      // TODO: Add to downstream federated records
      const location: string = record.get("location") as string;
      if (!location || location.length === 0) {
        record.set("location", "WSME");
      }

      const ssn = record.get("employeeSsn") as string;
      if (ssn) {
        const normalizedSsn = ssn.replace(/\D/g, "");
        if (ssnValidator.isValid(normalizedSsn)) {
          record.set("employeeSsn", normalizedSsn);
        } else {
          record.addError("employeeSsn", "Invalid SSN");
        }
      }
    });
  }
);
