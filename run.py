import sys
import os

# Auto-detect and switch to the project virtual environment
_venv_python = os.path.join(os.path.dirname(os.path.abspath(__file__)), "api", ".venv", "Scripts", "python.exe")
if os.path.exists(_venv_python) and os.path.abspath(sys.executable).lower() != os.path.abspath(_venv_python).lower():
    import subprocess
    sys.exit(subprocess.call([_venv_python, os.path.abspath(__file__)] + sys.argv[1:]))

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "api"))

if __name__ == '__main__':
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
