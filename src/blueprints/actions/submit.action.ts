import api, { Flatfile } from "@flatfile/api";

export const submitBlueprint: Flatfile.Action = {
  operation: "submit",
  mode: Flatfile.ActionMode.Foreground,
  label: "Submit",
  description: "Submits the workbook to Webhook.site"
}

