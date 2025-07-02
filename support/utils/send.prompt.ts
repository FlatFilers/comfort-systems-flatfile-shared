import { Anthropic } from "@anthropic-ai/sdk";

/**
 * Sends a prompt to the Anthropic API to generate a response.
 *
 * @param {string} setup - The setup text.
 * @param {string} prompt - The prompt text.
 * @return A Promise that resolves with the generated response object, or null if an error occurred.
 */
export async function sendPrompt(
  setup: string,
  prompt: string
): Promise<Anthropic.Message | null> {
  const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

  try {
    return anthropic.messages.create({
      messages: [{ role: "user", content: setup + prompt }],
      model: "claude-3.7-sonnet-20250219",
      max_tokens: 4096,
    });
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}
