@echo off
cd /d "%~dp0"
if exist "..\backend\.venv\Scripts\python.exe" (
  "..\backend\.venv\Scripts\python.exe" scripts\run_stack.py
) else (
  echo Backend Python environment missing. Configure ..\backend with uv sync first.
)
pause
