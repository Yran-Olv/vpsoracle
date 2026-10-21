import { db } from '../database';

export interface OracleRuleChange {
  id: number;
  ruleKey: string;
  ruleLabel: string;
  oldValue: string;
  newValue: string;
  sourceUrl: string;
  impactLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  impactDescription: string;
  detectedAt: string;
  isAlerted: boolean;
}

export class OracleChangeService {
  static getChanges(): OracleRuleChange[] {
    const rows = db.prepare('SELECT * FROM oracle_rule_changes ORDER BY detected_at DESC').all() as any[];
    return rows.map(r => ({
      id: r.id,
      ruleKey: r.rule_key,
      ruleLabel: r.rule_label,
      oldValue: r.old_value,
      newValue: r.new_value,
      sourceUrl: r.source_url,
      impactLevel: r.impact_level,
      impactDescription: r.impact_description,
      detectedAt: r.detected_at,
      isAlerted: Boolean(r.is_alerted)
    }));
  }

  static recordChange(
    ruleKey: string,
    ruleLabel: string,
    oldValue: string,
    newValue: string,
    sourceUrl: string,
    impactLevel: 'Low' | 'Medium' | 'High' | 'Critical',
    impactDescription: string
  ): void {
    const stmt = db.prepare(`
      INSERT INTO oracle_rule_changes (
        rule_key, rule_label, old_value, new_value, source_url, impact_level, impact_description, detected_at, is_alerted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 1)
    `);

    stmt.run(ruleKey, ruleLabel, oldValue, newValue, sourceUrl, impactLevel, impactDescription);

    // Also insert into alert history
    db.prepare(`
      INSERT INTO alerts_history (alert_key, severity, title, message, triggered_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      `oracle_rule_change_${ruleKey}`,
      impactLevel === 'High' || impactLevel === 'Critical' ? 'critical' : 'warning',
      `🚨 ALTERAÇÃO DETECTADA: Regras Oracle Free Tier (${ruleLabel})`,
      `Valor anterior: ${oldValue} → Novo valor: ${newValue}. Impacto: ${impactDescription}. Verifique sua instância.`
    );
  }
}
