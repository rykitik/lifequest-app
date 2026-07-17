#!/usr/bin/env bash
set -Eeuo pipefail

DEPLOY_BASE="${DEPLOY_BASE:-/var/www/lifequest}"
RELEASE_ID="${RELEASE_ID:?RELEASE_ID is required}"
ARCHIVE_PATH="${ARCHIVE_PATH:-/tmp/lifequest-release-${RELEASE_ID}.tar.gz}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"

RELEASES_DIR="${DEPLOY_BASE}/releases"
RELEASE_DIR="${RELEASES_DIR}/${RELEASE_ID}"
CURRENT_LINK="${DEPLOY_BASE}/current"
SUDO=()

cleanup_old_releases() {
  if ! [[ "${KEEP_RELEASES}" =~ ^[0-9]+$ ]] || (( KEEP_RELEASES <= 0 )); then
    echo "Warning: KEEP_RELEASES must be a positive integer; skipping release cleanup" >&2
    return 0
  fi

  local current_release
  current_release="$(readlink -f -- "${CURRENT_LINK}")" || return 1

  local release_list
  release_list="$(mktemp)" || return 1

  if ! find "${RELEASES_DIR}" -mindepth 1 -maxdepth 1 -type d -printf '%T@\t%p\0' | sort -z -nr > "${release_list}"; then
    rm -f -- "${release_list}"
    return 1
  fi

  local release_entries=()
  mapfile -d '' -t release_entries < "${release_list}" || {
    rm -f -- "${release_list}"
    return 1
  }
  rm -f -- "${release_list}" || return 1

  local kept=0
  local release_entry
  local release_path
  local release_realpath

  for release_entry in "${release_entries[@]}"; do
    release_path="${release_entry#*$'\t'}"

    if [[ "${release_path}" == "${release_entry}" || "${release_path}" != "${RELEASES_DIR}/"* ]]; then
      return 1
    fi

    release_realpath="$(readlink -f -- "${release_path}")" || return 1

    if [[ "${release_realpath}" == "${current_release}" ]]; then
      ((kept += 1))
      continue
    fi

    if (( kept < KEEP_RELEASES )); then
      ((kept += 1))
      continue
    fi

    rm -rf -- "${release_path}" || return 1
  done
}

if [[ "${EUID}" -ne 0 ]]; then
  SUDO=(sudo)
fi

if [[ ! -f "${ARCHIVE_PATH}" ]]; then
  echo "Archive not found: ${ARCHIVE_PATH}" >&2
  exit 1
fi

mkdir -p -- "${RELEASES_DIR}" "${DEPLOY_BASE}/shared"
rm -rf -- "${RELEASE_DIR}"
mkdir -p -- "${RELEASE_DIR}"

tar -xzf "${ARCHIVE_PATH}" -C "${RELEASE_DIR}"

if [[ ! -f "${RELEASE_DIR}/index.html" ]]; then
  echo "Release is missing index.html" >&2
  exit 1
fi

find "${RELEASE_DIR}" -type d -exec chmod 755 {} \;
find "${RELEASE_DIR}" -type f -exec chmod 644 {} \;
ln -sfn -- "${RELEASE_DIR}" "${CURRENT_LINK}"

"${SUDO[@]}" nginx -t
"${SUDO[@]}" systemctl reload nginx
rm -f -- "${ARCHIVE_PATH}"

if ! cleanup_old_releases; then
  echo "Warning: release cleanup failed; deploy completed" >&2
fi

echo "Release ${RELEASE_ID} deployed to ${CURRENT_LINK}"
