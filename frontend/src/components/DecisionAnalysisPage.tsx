import type { AnalysisResponse, DecisionPolicy, ForeACTProjectSpec } from '../types/analysis';
import { DecisionCards } from './DecisionCards';
import { MatrixPlot } from './MatrixPlot';
import { SignalInsights } from './SignalInsights';
import { SummaryCards } from './SummaryCards';

export function DecisionAnalysisPage({ spec, analysis, onAnalyze }: { spec: ForeACTProjectSpec; analysis: AnalysisResponse | null; onAnalyze: () => void }) {
  const policy: DecisionPolicy = spec.decision_policy;
  if (!analysis) {
    return (
      <section className="page-grid">
        <article className="panel hero-panel full-span">
          <p className="eyebrow">Variance and volatility analysis</p>
          <h2>Compile first to generate decision cards</h2>
          <p>This page consumes the compiled SignalModel and DecisionPolicy. It remains empty until the model transformations produce variance and volatility signals.</p>
          <button onClick={onAnalyze}>Compile & analyze</button>
        </article>
      </section>
    );
  }
  return (
    <section className="page-grid">
      <article className="panel hero-panel full-span">
        <p className="eyebrow">Decision-facing forecast assurance</p>
        <h2>Variance, volatility, confidence, and actionability</h2>
        <p>This page is intentionally after the modeling pages. It visualizes only the signals produced from the explicit project specification and transformation chain.</p>
      </article>
      <div className="full-span"><SummaryCards analysis={analysis} /></div>
      <article className="panel full-span">
        <p className="eyebrow">Decision policy view</p>
        <h2>{policy.name}</h2>
        <div className="policy-grid compact">
          {policy.rules.map((rule) => <div className="policy-card" key={rule.id}><strong>{rule.id}</strong><span>{rule.when}</span><b>{rule.then}</b><p>{rule.rationale}</p></div>)}
        </div>
      </article>
      <div className="full-span"><MatrixPlot points={analysis.matrix_points} /></div>
      <div className="full-span"><DecisionCards cards={analysis.decision_cards} /></div>
      <div className="full-span"><SignalInsights results={analysis.target_results} /></div>
      <article className="panel full-span">
        <p className="eyebrow">Conformance and traceability</p>
        <div className="rule-grid">
          {analysis.conformance_results.map((rule) => <div className={`rule-card ${rule.status}`} key={rule.rule_id}><strong>{rule.rule_id}</strong><span>{rule.status}</span><p>{rule.message}</p></div>)}
        </div>
      </article>
    </section>
  );
}
