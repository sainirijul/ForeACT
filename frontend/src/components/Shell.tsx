import type { ReactNode } from 'react';
import { Database, FileJson, GitBranch, LineChart, Network, Settings2, TableProperties } from 'lucide-react';

export type PageId = 'semantic' | 'methodology' | 'metamodel' | 'transformations' | 'decisions' | 'spec';

const pages: { id: PageId; label: string; step: string; icon: typeof TableProperties; output: string }[] = [
  { id: 'semantic', label: 'Semantic Field Modeling', step: 'DSL Step 1', icon: TableProperties, output: 'FieldModel' },
  { id: 'methodology', label: 'Methodology Review', step: 'DSL Steps 2–3', icon: Settings2, output: 'MethodSet + Scope' },
  { id: 'metamodel', label: 'Metamodel Extension', step: 'DSL Step 4', icon: Network, output: 'Ecore + Extension' },
  { id: 'transformations', label: 'Model Rigor & Instance View', step: 'Compiled Model', icon: GitBranch, output: 'Assurance Instance' },
  { id: 'decisions', label: 'Variance & Volatility', step: 'Assurance', icon: LineChart, output: 'DecisionModel' },
  { id: 'spec', label: 'Project Spec File', step: 'Central JSON', icon: FileJson, output: '.foreact.json' }
];

export function AppShell({
  active,
  setActive,
  projectName,
  onSave,
  onAnalyze,
  loading,
  children
}: {
  active: PageId;
  setActive: (id: PageId) => void;
  projectName: string;
  centralFile?: string;
  onSave: () => void;
  onAnalyze: () => void;
  loading: boolean;
  children: ReactNode;
}) {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">FA</div>
          <div>
            <strong>ForeACT</strong>
            <span>Forecast Actionability Studio</span>
          </div>
        </div>
        {/* <div className="workspace-chip"><Database size={15} /> AI Data-Center Capacity Planning</div> */}
        <nav className="nav-stack">
          {pages.map((page) => {
            const Icon = page.icon;
            return (
              <button key={page.id} className={active === page.id ? 'nav-card active' : 'nav-card'} onClick={() => setActive(page.id)}>
                <Icon size={18} />
                <span>
                  <small>{page.step}</small>
                  <strong>{page.label}</strong>
                  <em>{page.output}</em>
                </span>
              </button>
            );
          })}
        </nav>
      </aside>
      <section className="content-area">
        <header className="topbar">
          <div>
            <p className="eyebrow">Model-driven forecast assurance project</p>
            <h1>{projectName}</h1>
          </div>
          <div className="topbar-actions">
            <button className="secondary" onClick={onSave} disabled={loading}>Save Project Spec</button>
            <button onClick={onAnalyze} disabled={loading}>Compile & Analyze</button>
          </div>
        </header>
        {children}
      </section>
    </main>
  );
}
