# Double-Click Usage

## macOS

1. Put these files in the same folder:
   - `traffic_fine_deduction.py`
   - your 3 input Excel files
   - `run_traffic_fine_deduction.command`
2. Update the file paths in `traffic_fine_deduction.py`.
3. Double-click `run_traffic_fine_deduction.command`.

If macOS blocks the file the first time:

1. Right-click the `.command` file.
2. Click `Open`.
3. Click `Open` again in the warning dialog.

## Windows

1. Put these files in the same folder:
   - `traffic_fine_deduction.py`
   - your 3 input Excel files
   - `run_traffic_fine_deduction.bat`
2. Update the file paths in `traffic_fine_deduction.py`.
3. Double-click `run_traffic_fine_deduction.bat`.

## Requirements on both macOS and Windows

- Python 3 installed
- Required packages installed:

```bash
pip install pandas openpyxl
```

If `pip` does not work, use:

```bash
python -m pip install pandas openpyxl
```
