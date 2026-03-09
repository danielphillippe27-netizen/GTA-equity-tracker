#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

WORKSPACE_ID=""
REPORT_MONTH=""
NEW_DATA_DIR="/Volumes/Untitled 2/NEW DATA"
HPI_ARCHIVE_DIR="/Volumes/Untitled 2/TRREB HPI INDEX"
MARKET_WATCH_ARCHIVE_DIR="/Volumes/Untitled 2/TRREB MARKET WATCH"
HISTORIC_PDF="/Volumes/Untitled 2/TRREB HISTORIC/TRREB HISTORIC PDF.pdf"
SEND_REPORTS=0
REPLACE_EXISTING=0

usage() {
  cat <<'EOF'
Usage:
  scripts/refresh_trreb_month.sh \
    --workspace-id <uuid> \
    --report-month YYYY-MM \
    [--send-reports] \
    [--replace-existing] \
    [--new-data-dir <path>] \
    [--hpi-archive-dir <path>] \
    [--market-watch-archive-dir <path>] \
    [--historic-pdf <path>]

What it does:
  1) Finds HPI + Market Watch PDFs in NEW DATA.
  2) Copies them into the archive naming convention:
     - YYYY-MM TRREB HPI.pdf
     - YYYY-MM TRREB Market Watch.pdf
  3) Runs the TRREB importer with --apply.
  4) Runs monthly reports in dry-run mode.
  5) If --send-reports is set, sends monthly reports.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --workspace-id)
      WORKSPACE_ID="${2:-}"
      shift 2
      ;;
    --report-month)
      REPORT_MONTH="${2:-}"
      shift 2
      ;;
    --new-data-dir)
      NEW_DATA_DIR="${2:-}"
      shift 2
      ;;
    --hpi-archive-dir)
      HPI_ARCHIVE_DIR="${2:-}"
      shift 2
      ;;
    --market-watch-archive-dir)
      MARKET_WATCH_ARCHIVE_DIR="${2:-}"
      shift 2
      ;;
    --historic-pdf)
      HISTORIC_PDF="${2:-}"
      shift 2
      ;;
    --send-reports)
      SEND_REPORTS=1
      shift
      ;;
    --replace-existing)
      REPLACE_EXISTING=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "${WORKSPACE_ID}" ]]; then
  echo "Missing required flag: --workspace-id" >&2
  exit 1
fi

if [[ ! "${REPORT_MONTH}" =~ ^[0-9]{4}-[0-9]{2}$ ]]; then
  echo "Missing or invalid --report-month (expected YYYY-MM)." >&2
  exit 1
fi

find_hpi_source() {
  local file
  while IFS= read -r file; do
    local base
    base="$(basename "${file}")"
    local lower
    lower="$(printf '%s' "${base}" | tr '[:upper:]' '[:lower:]')"
    if [[ "${lower}" == *"hpi"* || "${lower}" == *"benchmark"* ]]; then
      printf '%s\n' "${file}"
      return 0
    fi
  done < <(find "${NEW_DATA_DIR}" -maxdepth 1 -type f -name '*.pdf' | sort)
  return 1
}

find_market_watch_source() {
  local file
  while IFS= read -r file; do
    local base
    base="$(basename "${file}")"
    local lower
    lower="$(printf '%s' "${base}" | tr '[:upper:]' '[:lower:]')"
    if [[ "${lower}" == *"market watch"* || "${lower}" == *"market_watch"* || "${lower}" =~ ^mw[0-9]{4}\.pdf$ ]]; then
      printf '%s\n' "${file}"
      return 0
    fi
  done < <(find "${NEW_DATA_DIR}" -maxdepth 1 -type f -name '*.pdf' | sort)
  return 1
}

HPI_SOURCE="$(find_hpi_source)" || {
  echo "Could not find an HPI PDF in ${NEW_DATA_DIR}" >&2
  exit 1
}

MARKET_WATCH_SOURCE="$(find_market_watch_source)" || {
  echo "Could not find a Market Watch PDF in ${NEW_DATA_DIR}" >&2
  exit 1
}

HPI_TARGET="${HPI_ARCHIVE_DIR}/${REPORT_MONTH} TRREB HPI.pdf"
MARKET_WATCH_TARGET="${MARKET_WATCH_ARCHIVE_DIR}/${REPORT_MONTH} TRREB Market Watch.pdf"

copy_file() {
  local source="$1"
  local target="$2"

  if [[ -e "${target}" && "${REPLACE_EXISTING}" -eq 0 ]]; then
    echo "Target already exists, keeping current file: ${target}"
    return 0
  fi

  if [[ "${REPLACE_EXISTING}" -eq 1 ]]; then
    cp -f "${source}" "${target}"
  else
    cp "${source}" "${target}"
  fi

  echo "Copied: ${source} -> ${target}"
}

copy_file "${HPI_SOURCE}" "${HPI_TARGET}"
copy_file "${MARKET_WATCH_SOURCE}" "${MARKET_WATCH_TARGET}"

cd "${REPO_ROOT}"

python3 "${REPO_ROOT}/scripts/import_trreb_market_data.py" \
  --workspace-id "${WORKSPACE_ID}" \
  --hpi-dir "${HPI_ARCHIVE_DIR}" \
  --market-watch-dir "${MARKET_WATCH_ARCHIVE_DIR}" \
  --historic-pdf "${HISTORIC_PDF}" \
  --taxonomy-json "${REPO_ROOT}/src/data/trreb-taxonomy.json" \
  --apply

echo "Running monthly reports dry-run..."
npx --yes tsx "${REPO_ROOT}/scripts/run-monthly-reports.ts" --dry-run

if [[ "${SEND_REPORTS}" -eq 1 ]]; then
  echo "Sending monthly reports..."
  npx --yes tsx "${REPO_ROOT}/scripts/run-monthly-reports.ts" --send
fi
