@echo off
start cmd /k "cd /d %~dp0 && python run.py"
start cmd /k "cd /d %~dp0platform && npm run dev"