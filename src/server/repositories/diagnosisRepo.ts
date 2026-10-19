import { SQLiteConnection } from '../db/connection.js';
import { FailureDiagnosis, ParsedDiagnosis } from '../types/domain.js';
import crypto from 'crypto';

export class DiagnosisRepository {
  constructor(private conn: SQLiteConnection) {}

  private validateJson(val: any): string {
    if (typeof val === 'string') {
      try {
        JSON.parse(val);
        return val;
      } catch (e) {
        return JSON.stringify([val]);
      }
    }
    return JSON.stringify(val);
  }

  async findByRunId(workflowRunId: string): Promise<ParsedDiagnosis | undefined> {
    const row = await this.conn.get<FailureDiagnosis>(
      'SELECT * FROM failure_diagnoses WHERE workflow_run_id = ?',
      [workflowRunId]
    );

    if (!row) return undefined;
    return this.parseRow(row);
  }

  async findById(id: string): Promise<ParsedDiagnosis | undefined> {
    const row = await this.conn.get<FailureDiagnosis>(
      'SELECT * FROM failure_diagnoses WHERE id = ?',
      [id]
    );

    if (!row) return undefined;
    return this.parseRow(row);
  }

  async listRecent(limit = 20): Promise<ParsedDiagnosis[]> {
    const rows = await this.conn.all<FailureDiagnosis>(
      'SELECT * FROM failure_diagnoses ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
    return rows.map((r) => this.parseRow(r));
  }

  async upsert(data: {
    workflow_run_id: string;
    failure_category: string;
    error_summary: string;
    sanitized_log_excerpt: string;
    evidence: string[];
    likely_causes: string[];
    recommended_actions: string[];
    proposed_fixes?: any;
    confidence: number;
    ai_assisted?: boolean;
  }): Promise<ParsedDiagnosis> {
    const evidenceJson = this.validateJson(data.evidence);
    const likelyCausesJson = this.validateJson(data.likely_causes);
    const recommendedActionsJson = this.validateJson(data.recommended_actions);
    const proposedFixesJson = data.proposed_fixes ? this.validateJson(data.proposed_fixes) : null;
    const aiAssisted = data.ai_assisted ? 1 : 0;
    const now = new Date().toISOString();

    const existing = await this.conn.get<{ id: string }>(
      'SELECT id FROM failure_diagnoses WHERE workflow_run_id = ?',
      [data.workflow_run_id]
    );

    if (existing) {
      await this.conn.run(
        `UPDATE failure_diagnoses
         SET failure_category = ?, error_summary = ?, sanitized_log_excerpt = ?,
             evidence_json = ?, likely_causes_json = ?, recommended_actions_json = ?,
             proposed_fixes_json = ?, confidence = ?, ai_assisted = ?
         WHERE id = ?`,
        [
          data.failure_category,
          data.error_summary,
          data.sanitized_log_excerpt,
          evidenceJson,
          likelyCausesJson,
          recommendedActionsJson,
          proposedFixesJson,
          data.confidence,
          aiAssisted,
          existing.id,
        ]
      );
      return (await this.findById(existing.id))!;
    } else {
      const id = 'diag_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
      await this.conn.run(
        `INSERT INTO failure_diagnoses (
          id, workflow_run_id, failure_category, error_summary, sanitized_log_excerpt,
          evidence_json, likely_causes_json, recommended_actions_json, proposed_fixes_json,
          confidence, ai_assisted, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.workflow_run_id,
          data.failure_category,
          data.error_summary,
          data.sanitized_log_excerpt,
          evidenceJson,
          likelyCausesJson,
          recommendedActionsJson,
          proposedFixesJson,
          data.confidence,
          aiAssisted,
          now,
        ]
      );
      return (await this.findById(id))!;
    }
  }

  private parseRow(row: FailureDiagnosis): ParsedDiagnosis {
    let evidence: string[] = [];
    let likelyCauses: string[] = [];
    let recommendedActions: string[] = [];
    let proposedFixes: any = undefined;

    try {
      evidence = JSON.parse(row.evidence_json);
    } catch {
      evidence = [row.evidence_json];
    }

    try {
      likelyCauses = JSON.parse(row.likely_causes_json);
    } catch {
      likelyCauses = [row.likely_causes_json];
    }

    try {
      recommendedActions = JSON.parse(row.recommended_actions_json);
    } catch {
      recommendedActions = [row.recommended_actions_json];
    }

    if (row.proposed_fixes_json) {
      try {
        proposedFixes = JSON.parse(row.proposed_fixes_json);
      } catch {
        proposedFixes = undefined;
      }
    }

    return {
      id: row.id,
      workflow_run_id: row.workflow_run_id,
      failure_category: row.failure_category,
      error_summary: row.error_summary,
      sanitized_log_excerpt: row.sanitized_log_excerpt,
      evidence,
      likely_causes: likelyCauses,
      recommended_actions: recommendedActions,
      proposed_fixes: proposedFixes,
      confidence: row.confidence,
      ai_assisted: row.ai_assisted === 1,
      created_at: row.created_at,
    };
  }
}
