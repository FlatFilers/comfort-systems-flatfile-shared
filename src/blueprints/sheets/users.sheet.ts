import { Flatfile } from "@flatfile/api";

export const usersSheet: Flatfile.SheetConfig = {
  name: "Users",
  slug: "users",
  fields: [
    {
      key: "name",
      type: "string",
      label: "Name",
    },
  ],
};
