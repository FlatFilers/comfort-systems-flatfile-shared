import { sendPrompt } from "../../utils/send.prompt";

/**
 * Generates code using a setup and a prompt.
 *
 * @param {string} setup - The setup for the code generation.
 * @param {string} prompt - The prompt for the code generation.
 *
 * @return {Promise<string|null>} - A promise that resolves to the generated code or null if no code is generated.
 */
export async function generateData(setup: string, prompt: string): Promise<any> {
  const response = await sendPrompt(setup, prompt);
  if (!response) {
    return null;
  }

  const block = response.content[0];
  if ("text" in block) {
    const generatedText = block.text;
    const codeStart = generatedText.indexOf("```json");
    if (codeStart !== -1) {
      const codeEnd = generatedText.indexOf("```", codeStart + 7);
      if (codeEnd !== -1) {
        return JSON.parse(generatedText.slice(codeStart + 7, codeEnd).trim());
      }
    }
    return null;
  }
}
