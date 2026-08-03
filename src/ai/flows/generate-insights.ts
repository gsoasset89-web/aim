
'use server';
/**
 * @fileOverview Generates analytical insights from inventory data.
 *
 * - generateInsights - A function that analyzes inventory items and produces insights.
 * - GenerateInsightsInput - The input type for the generateInsights function.
 * - GenerateInsightsOutput - The return type for the generateInsights function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateInsightsInputSchema = z.object({
  itemData: z.string().describe("A JSON string representing an array of summarized inventory items."),
  currentDate: z.string().describe("The current date in ISO format (YYYY-MM-DD) for calculating age of items."),
});

export type GenerateInsightsInput = z.infer<typeof GenerateInsightsInputSchema>;

const GenerateInsightsOutputSchema = z.object({
  summary: z.string().describe("A high-level overview of the inventory status in 2-3 sentences."),
  keyObservations: z.array(z.string()).describe("A list of 3-5 bullet points highlighting the most important trends, anomalies, or statistics."),
  warnings: z.array(z.string()).describe("A list of potential issues or risks that require attention, such as old stock, low inventory, or items in poor condition."),
  opportunities: z.array(z.string()).describe("A list of positive trends or potential areas for improvement, such as well-managed stock or recently acquired assets."),
});

export type GenerateInsightsOutput = z.infer<typeof GenerateInsightsOutputSchema>;

export async function generateInsights(input: GenerateInsightsInput): Promise<GenerateInsightsOutput> {
  return generateInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateInsightsPrompt',
  input: { schema: GenerateInsightsInputSchema },
  output: { schema: GenerateInsightsOutputSchema },
  prompt: `You are an expert inventory analyst for a government office. Your task is to analyze the provided list of summarized inventory items and generate a clear, concise report. The current date is {{currentDate}}.

Analyze the following inventory data which contains these fields for each item: type, status, responsibility_center, acquisition_date, acquisition_cost, current_condition, est_useful_life.
- Total number of items
- Breakdown by type (ICS vs. PAR) and status (active vs. inactive)
- Distribution of items across different responsibility centers.
- Age of items based on their acquisition date. Pay special attention to items older than 5 years.
- Cost of items.
- Condition of items.

Based on your analysis, provide the following:
1.  **Summary**: A brief, high-level overview of the entire inventory.
2.  **Key Observations**: Bullet points of the most interesting or significant findings (e.g., "The majority of assets are concentrated in the CEO office," "A significant portion of PAR items were acquired in the last year").
3.  **Warnings**: Identify critical issues that need attention. Focus on very old items (especially electronics over 5 years old), items in poor condition, or unusual concentrations of assets. Be specific. For example: "Warning: There are 5 laptops over 7 years old in the CMO office which may pose a security risk."
4.  **Opportunities**: Highlight positive aspects or suggest potential actions. For example: "Opportunity: The recent acquisition of new IT equipment for the Assessor's office should boost productivity," or "Consider redistributing the 20 unused office chairs from GSO."

Do not invent data. Base all your insights directly on the provided item list.

Item Data:
{{{itemData}}}
`,
});

const generateInsightsFlow = ai.defineFlow(
  {
    name: 'generateInsightsFlow',
    inputSchema: GenerateInsightsInputSchema,
    outputSchema: GenerateInsightsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
