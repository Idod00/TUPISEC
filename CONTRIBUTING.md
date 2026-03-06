# Contributing to TupiSec

Thanks for your interest in contributing! This guide will help you get started.

## Prerequisites

- Python 3.10+
- Node.js 18+
- Docker (optional, for containerized runs)

## Local Setup

```bash
# Clone the repo
git clone https://github.com/YOUR-USER/TUPISEC.git
cd TUPISEC

# Python scanner
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Dashboard (Next.js)
cd dashboard
npm install
npm run dev
```

## Running Tests

```bash
# Scanner tests
pytest tests/ -v

# Dashboard tests
cd dashboard
npm test
```

## Making Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes
4. Run the tests to make sure everything passes
5. Commit using [conventional commits](https://www.conventionalcommits.org/):
   - `feat:` new feature
   - `fix:` bug fix
   - `docs:` documentation changes
   - `test:` adding or updating tests
   - `refactor:` code changes that neither fix a bug nor add a feature
6. Push and open a Pull Request against `main`

## Adding a Scanner Module

Scanner modules live in `scanner.py` inside the `TupiSecScanner` class. Each module is a method that:

1. Logs what it's doing with `self.log()`
2. Performs analysis
3. Reports findings with `self.add_finding(severity, category, title, detail, recommendation)`

Severity levels: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `INFO`

## Code of Conduct

Be respectful and constructive. We follow the [Contributor Covenant](https://www.contributor-covenant.org/).
