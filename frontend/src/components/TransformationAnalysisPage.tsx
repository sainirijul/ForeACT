import type { AnalysisResponse, ForeACTProjectSpec, ProfileResponse } from '../types/analysis';
import { graphToFlow, MetamodelGraphView, modelInstanceToFlow } from './GraphViews';

export function TransformationAnalysisPage({ spec, profile, analysis, onAnalyze }: { spec: ForeACTProjectSpec; profile: ProfileResponse | null; analysis: AnalysisResponse | null; onAnalyze: () => void }) {
  const metamodelFlow = analysis ? graphToFlow(analysis.metamodel.graph) : { nodes: [], edges: [] };
  const instanceFlow = analysis ? modelInstanceToFlow(analysis) : { nodes: [], edges: [] };
  return (
    <section className="page-grid">
      <article className="panel hero-panel full-span">
        <p className="eyebrow">Model transformation analysis</p>
        <h2>Compile the DSL instance into an inspectable forecast assurance model</h2>
        <p>The transformation chain gives the paper a clear model-driven engineering contribution: field profiles become semantic models, scope bindings create aligned forecast models, declared methods generate signal models, and signals produce decision cards.</p>
        <div className="metric-row">
          <span><strong>{profile?.rows ?? 0}</strong><small>Dataset rows</small></span>
          <span><strong>{spec.field_model.fields.filter((f) => f.role === 'target').length}</strong><small>Targets</small></span>
          <span><strong>{spec.metamodel_extension.concepts.length}</strong><small>Extensions</small></span>
          <span><strong>{analysis?.transformations?.length ?? 0}</strong><small>Transformations</small></span>
        </div>
        <button onClick={onAnalyze}>Compile current project spec</button>
      </article>

      <article className="panel full-span">
        <p className="eyebrow">Transformation chain</p>
        <div className="transformation-grid">
          {(analysis?.transformations || [
            { id: 'T1', name: 'ProfileToSemanticFieldModel', input: 'DatasetVersion', output: 'SemanticFieldModel', purpose: 'Convert raw columns to typed semantic fields.', status: 'pending' },
            { id: 'T2', name: 'ScopeBindingAndVersionAlignment', input: 'SemanticFieldModel + AnalysisScope', output: 'AlignedForecastModel', purpose: 'Align forecast versions over the same horizon.', status: 'pending' },
            { id: 'T3', name: 'MethodModelToSignalModel', input: 'AlignedForecastModel + MethodModel', output: 'SignalModel', purpose: 'Apply declared variance and volatility methods.', status: 'pending' },
            { id: 'T4', name: 'SignalModelToDecisionCard', input: 'SignalModel + Policy', output: 'DecisionCardModel', purpose: 'Classify signals into decision recommendations.', status: 'pending' }
          ]).map((t) => <div className={`transformation-card ${t.status}`} key={t.id}><strong>{t.id}: {t.name}</strong><span>{t.input} → {t.output}</span><p>{t.purpose}</p><em>{t.status}</em></div>)}
        </div>
      </article>

      {analysis && <>
        <article className="panel full-span">
          <p className="eyebrow">Compiled metamodel view</p>
          <h2>Forecast assurance metamodel</h2>
          <MetamodelGraphView nodes={metamodelFlow.nodes} edges={metamodelFlow.edges} height={520} />
        </article>
        <article className="panel full-span">
          <p className="eyebrow">Model instance view</p>
          <h2>Compiled model instance generated from this use case</h2>
          <MetamodelGraphView nodes={instanceFlow.nodes} edges={instanceFlow.edges} height={560} />
        </article>
        <article className="panel full-span">
          <p className="eyebrow">AlignedForecastModel preview</p>
          <div className="mini-table wide">
            <table><thead><tr>{Object.keys(analysis.aligned_forecast_preview[0] || {}).map((k) => <th key={k}>{k}</th>)}</tr></thead><tbody>{analysis.aligned_forecast_preview.slice(0, 12).map((row, idx) => <tr key={idx}>{Object.values(row).map((v, i) => <td key={i}>{String(v ?? '')}</td>)}</tr>)}</tbody></table>
          </div>
        </article>
      </>}
    </section>
  );
}
