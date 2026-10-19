import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';
import { sanitizeLog } from './sanitizer.js';
import { RuleDiagnosisResult } from './ruleDiagnostics.js';

// Zod validation schema for Gemini AI analysis
export const GeminiDiagnosisSchema = z.object({
  failure_category: z.string(),
  error_summary: z.string(),
  plain_explanation: z.string(),
  likely_causes: z.array(z.string()).min(1),
  recommended_actions: z.array(z.string()).min(1),
  proposed_fixes: z.array(
    z.object({
      file_path: z.string(),
      original_code: z.string(),
      suggested_code: z.string(),
      explanation: z.string(),
      verification_steps: z.array(z.string()),
    })
  ).optional().default([]),
  confidence: z.number().min(0).max(1),
});

export type GeminiDiagnosisOutput = z.infer<typeof GeminiDiagnosisSchema>;

export class GeminiDiagnosisService {
  private ai: GoogleGenAI | null = null;
  private isConfigured = false;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim().length > 0) {
      try {
        this.ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });
        this.isConfigured = true;
      } catch (e) {
        console.error('Failed to initialize GoogleGenAI client:', e);
        this.isConfigured = false;
      }
    }
  }

  public getStatus(): { isConfigured: boolean; model: string } {
    return {
      isConfigured: this.isConfigured,
      model: 'gemini-3.8-flash',
    };
  }

  public async analyzeFailure(
    rawLog: string,
    ruleResult: RuleDiagnosisResult,
    context?: { workflowName?: string; branch?: string; runtime?: string }
  ): Promise<{ diagnosis: GeminiDiagnosisOutput; aiAssisted: boolean; note?: string }> {
    // Sanitize logs before sending to AI
    const sanitizedLog = sanitizeLog(rawLog);
    const logExcerpt = sanitizedLog.length > 5000 ? sanitizedLog.slice(-5000) : sanitizedLog;

    if (!this.isConfigured || !this.ai) {
      // Graceful fallback to deterministic rule engine result
      return {
        diagnosis: {
          failure_category: ruleResult.failure_category,
          error_summary: ruleResult.error_summary,
          plain_explanation: `Deterministic diagnosis identified '${ruleResult.failure_category}'. ${ruleResult.likely_causes[0] || ''}`,
          likely_causes: ruleResult.likely_causes,
          recommended_actions: ruleResult.recommended_actions,
          proposed_fixes: ruleResult.proposed_fixes || [],
          confidence: ruleResult.confidence,
        },
        aiAssisted: false,
        note: 'Gemini API key is not configured or offline. Showing deterministic rule-based diagnosis.',
      };
    }

    try {
      const prompt = `You are DevFlow's Senior DevOps & SRE Engineer.
Analyze the following failed CI/CD workflow run and sanitized log excerpt.

Workflow Context:
- Workflow Name: ${context?.workflowName || 'CI Pipeline'}
- Target Branch: ${context?.branch || 'main'}
- Project Runtime: ${context?.runtime || 'Node.js'}

Deterministic Rule Diagnosis Preview:
- Category: ${ruleResult.failure_category}
- Initial Summary: ${ruleResult.error_summary}

Sanitized Log Excerpt:
\`\`\`
${logExcerpt}
\`\`\`

Return a structured JSON object strictly matching this schema:
- failure_category: string (e.g., missing_dependencies, failed_tests, typescript_error, build_failure, docker_build_failure, missing_env_vars, etc.)
- error_summary: brief technical description of the exact error
- plain_explanation: simple, accessible explanation of why the build failed in plain language
- likely_causes: array of plausible root causes
- recommended_actions: concrete step-by-step resolution actions
- proposed_fixes: array of file code modifications with file_path, original_code, suggested_code, explanation, verification_steps
- confidence: number between 0.1 and 0.99
`;

      const response = await this.ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              failure_category: { type: Type.STRING },
              error_summary: { type: Type.STRING },
              plain_explanation: { type: Type.STRING },
              likely_causes: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              recommended_actions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              proposed_fixes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    file_path: { type: Type.STRING },
                    original_code: { type: Type.STRING },
                    suggested_code: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                    verification_steps: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                  required: ['file_path', 'original_code', 'suggested_code', 'explanation', 'verification_steps'],
                },
              },
              confidence: { type: Type.NUMBER },
            },
            required: ['failure_category', 'error_summary', 'plain_explanation', 'likely_causes', 'recommended_actions', 'confidence'],
          },
        },
      });

      const responseText = response.text?.trim();
      if (!responseText) {
        throw new Error('Empty response from Gemini');
      }

      const parsedJson = JSON.parse(responseText);
      const validated = GeminiDiagnosisSchema.parse(parsedJson);

      return {
        diagnosis: validated,
        aiAssisted: true,
      };
    } catch (err: any) {
      console.warn('Gemini diagnosis fallback triggered due to error:', err?.message || err);
      // Graceful fallback to deterministic rule engine result
      return {
        diagnosis: {
          failure_category: ruleResult.failure_category,
          error_summary: ruleResult.error_summary,
          plain_explanation: `Deterministic diagnosis: ${ruleResult.likely_causes[0] || ruleResult.error_summary}`,
          likely_causes: ruleResult.likely_causes,
          recommended_actions: ruleResult.recommended_actions,
          proposed_fixes: ruleResult.proposed_fixes || [],
          confidence: ruleResult.confidence,
        },
        aiAssisted: false,
        note: `AI analysis unavailable (${err?.message || 'quota or network limit'}). Used deterministic diagnosis.`,
      };
    }
  }
}

export const geminiService = new GeminiDiagnosisService();
