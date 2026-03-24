# Minimal Excel Templates

Generated files:

- `historical_fines_minimal.xlsx`
- `driver_hub_mapping_minimal.xlsx`
- `hub_salary_config_minimal.xlsx`

Recommended test configuration in `traffic_fine_deduction.py`:

```python
FINE_FILE_PATH = "sample_templates/historical_fines_minimal.xlsx"
HUB_SALARY_FILE_PATH = "sample_templates/hub_salary_config_minimal.xlsx"
DRIVER_HUB_MAPPING_FILE_PATH = "sample_templates/driver_hub_mapping_minimal.xlsx"
DEDUCTION_MONTH = "2026-03"
OUTPUT_FILE_PATH = f"traffic_fine_deduction_{DEDUCTION_MONTH.replace('-', '_')}.xlsx"
```

What the sample data covers:

- `D001` has historical unpaid fines plus one new fine.
- `D001` also has one source `hub` value intentionally set to `WRONG-HUB` to trigger a hub mismatch warning.
- `D002` has a simple new fine and a valid mapping/salary setup.

If you want a second template pack focused on error cases, we can add one with:

- duplicate `Invoice + Ticket No`
- missing driver-hub mapping
- invalid salary config
- invalid date / invalid amount rows
