#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
python3 -m venv var/mornye/.venv
var/mornye/.venv/bin/python -m pip install -r requirements-mornye.txt
