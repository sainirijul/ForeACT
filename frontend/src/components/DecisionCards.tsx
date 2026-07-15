import type { DecisionCard } from '../types/analysis';

export function DecisionCards({ cards }: { cards: DecisionCard[] }) {
  return (
    <section className="grid two">
      {cards.map((card) => (
        <article className="panel decision-card" key={card.target}>
          <p className="eyebrow">Decision card</p>
          <h3>{card.headline}</h3>
          <p style={{ background: '#fffbcc', padding: '0.6rem', borderRadius: '8px', color: '#182230' }}><strong>Recommendation:</strong> {card.rationale}</p>
          <div className="trace-box">
            {Object.entries(card.trace).map(([key, value]) => (
              <div key={key}>
                <span>{key.replace(/_/g, ' ')}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}
