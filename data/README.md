# ForeACT Demo Data

The active demo dataset is:

`data/use_cases/ai_datacenter_load_forecast.csv`

This file uses a **long forecast-cycle format**. Each `forecast_cycle` contains forecast values for the same future `forecast_period`s. This is required because ForeACT computes variance by aligning two forecast versions over the same target horizon.

Earlier scaffolds contained both `demo_energy_forecast.csv` and `demo_ai_datacenter_load_forecast.csv`. They were identical placeholders. This version removes that ambiguity and uses the AI data-center load forecasting use case as the canonical dataset.
