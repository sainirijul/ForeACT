export function FormulaBuilderHelp() {
  return (
    <section className="panel mini-panel">
      <p className="eyebrow">Custom method DSL</p>
      <h3>Formula builder vocabulary</h3>
      <p className="muted">Use a small safe expression language when selecting custom formulas.</p>
      <div className="formula-grid">
        <code>actual</code><span>Selected target series</span>
        <code>previous</code><span>Previous forecast-cycle series or baseline fallback</span>
        <code>current</code><span>Current forecast-cycle series or actual fallback</span>
        <code>baseline</code><span>Rolling baseline for the selected target</span>
        <code>growth_pct</code><span>Target month-over-month growth percentage</span>
        <code>driver_volatility</code><span>Mean instability of selected feature fields</span>
      </div>
    </section>
  );
}
