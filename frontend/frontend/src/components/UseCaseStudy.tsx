import { Building2, Gauge, ShieldCheck } from 'lucide-react';

export function UseCaseStudy() {
  return (
    <section className="panel usecase-panel">
      <div className="panel-header">
        <p className="eyebrow">Real demonstration case</p>
        <h2>AI data-center load forecast assurance</h2>
        <p className="muted">
          A utility planning team receives a new forecast cycle where projected AI data-center load increases sharply.
          The practical question is not only whether demand increased, but whether the change is stable enough to justify
          capacity, procurement, or executive planning action.
        </p>
      </div>
      <div className="usecase-grid">
        <div><Building2 size={20} /><b>Planning pressure</b><span>Committed MW and connection probability can change in discrete steps.</span></div>
        <div><Gauge size={20} /><b>Uncertainty source</b><span>Cooling, prices, renewable availability, and load timing drive volatility.</span></div>
        <div><ShieldCheck size={20} /><b>Assurance output</b><span>The tool traces each action recommendation back to fields, methods, signals, and rules.</span></div>
      </div>
    </section>
  );
}
