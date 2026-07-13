# Case Study: AI Data-Center Load Forecast Assurance

## Scenario

A regional energy planner receives a new monthly forecast cycle for electricity demand. The current forecast shows a large increase in projected total load and peak load because one or more AI data centers may connect to the grid. However, the load increase is not automatically actionable because the forecast depends on uncertain assumptions: committed data-center capacity, connection probability, cooling efficiency, temperature, power price, renewable availability, and industrial growth.

## Practical question

The planner does not only need to know whether the forecast changed. The planner needs to know whether the change is stable enough to justify actions such as capacity procurement, connection planning, infrastructure review, or executive escalation.

## Demonstration workflow

1. Load the AI data-center case-study dataset.
2. Inspect the automatically discovered columns.
3. Refine the Semantic Field Model by annotating each column with role, unit, business name, semantic type, and direction.
4. Select variance and volatility methods from the Method Model.
5. Optionally define custom formulas through the small expression language.
6. Compile the model.
7. Inspect the generated graph and conformance rules.
8. Review the variance-volatility matrix and decision cards.
9. Trace each recommendation back to fields, methods, signals, and assumptions.

## Expected demonstration insight

When the forecast-cycle variance is large but volatility is also high, ForeACT recommends monitoring or requesting more evidence rather than immediate irreversible action. When forecast-cycle variance is large and volatility is low, ForeACT flags the target as a candidate for planning action or strategic review.
