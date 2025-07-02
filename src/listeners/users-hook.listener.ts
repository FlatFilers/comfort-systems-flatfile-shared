import { bulkRecordHook } from "@flatfile/plugin-record-hook";

export const usersHook = bulkRecordHook('users', async (records, context) => {
  records.forEach(record => {
    const name: string = record.get("name") as string;
    if (name.length > 0) {
      const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
      if (name !== capitalizedName) {
        record.set("name", capitalizedName);
      }
    }
  });
});