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

if [[ "${EUID}" -ne 0 ]]; then
  SUDO=(sudo)
fi

if [[ ! -f "${ARCHIVE_PATH}" ]]; then
  echo "Archive not found: ${ARCHIVE_PATH}" >&2
  exit 1
fi

mkdir -p "${RELEASES_DIR}" "${DEPLOY_BASE}/shared"
rm -rf "${RELEASE_DIR}"
mkdir -p "${RELEASE_DIR}"

tar -xzf "${ARCHIVE_PATH}" -C "${RELEASE_DIR}"

if [[ ! -f "${RELEASE_DIR}/index.html" ]]; then
  echo "Release is missing index.html" >&2
  exit 1
fi

find "${RELEASE_DIR}" -type d -exec chmod 755 {} \;
find "${RELEASE_DIR}" -type f -exec chmod 644 {} \;
ln -sfn "${RELEASE_DIR}" "${CURRENT_LINK}"

"${SUDO[@]}" nginx -t
"${SUDO[@]}" systemctl reload nginx
rm -f "${ARCHIVE_PATH}"

if [[ "${KEEP_RELEASES}" =~ ^[0-9]+$ ]] && (( KEEP_RELEASES > 0 )); then
  mapfile -t OLD_RELEASES < <(find "${RELEASES_DIR}" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -nr | awk "NR > ${KEEP_RELEASES} { print \$2 }")
  for OLD_RELEASE in "${OLD_RELEASES[@]}"; do
    rm -rf "${OLD_RELEASE}"
  done
fi

echo "Release ${RELEASE_ID} deployed to ${CURRENT_LINK}"
