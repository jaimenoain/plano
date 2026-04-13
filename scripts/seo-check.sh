#!/usr/bin/env bash
# SEO smoke checks for public vs private routes (SSR HTML).
# Usage: BASE_URL=https://www.example.com ./scripts/seo-check.sh
# Optional overrides: SEO_TEST_BUILDING_ID, SEO_TEST_BUILDING_SLUG,
# SEO_TEST_ARCHITECT_ID, SEO_TEST_PROFILE_USERNAME

set -euo pipefail

UA="Googlebot/2.1"
BASE_RAW="${BASE_URL:-https://plano.app}"
BASE_TRIMMED="${BASE_RAW%/}"

BID="${SEO_TEST_BUILDING_ID:-18242}"
BSLUG="${SEO_TEST_BUILDING_SLUG:-lambeth-walk-methodist-church}"
AID="${SEO_TEST_ARCHITECT_ID:-36f42efb-39e1-47f4-8f4d-faec09abc154}"
PROFILE="${SEO_TEST_PROFILE_USERNAME:-davolon}"

fail() {
  echo "SEO check failed: $1" >&2
  echo "  URL: ${2:-}" >&2
  echo "  Expected: ${3:-}" >&2
  echo "  Actual: ${4:-}" >&2
  exit 1
}

if [[ -z "$BASE_TRIMMED" ]]; then
  echo "BASE_URL is empty. For CI, set the VERCEL_PREVIEW_URL secret." >&2
  exit 1
fi

# Resolve apex → www (or any single redirect) so status and HTML match the live host.
first_status=$(curl -s -o /dev/null -w "%{http_code}" --max-redirs 0 -A "$UA" "${BASE_TRIMMED}/" || echo "000")
if [[ "$first_status" == "301" || "$first_status" == "302" || "$first_status" == "307" || "$first_status" == "308" ]]; then
  loc=$(curl -sI --max-redirs 0 -A "$UA" "${BASE_TRIMMED}/" | tr -d '\r' | grep -i '^location:' | tail -1 | sed 's/^[Ll]ocation:[[:space:]]*//')
  if [[ -n "$loc" ]]; then
    if [[ "$loc" == http* ]]; then
      BASE_TRIMMED=$(node -p "new URL(process.argv[1]).origin" "$loc")
    else
      BASE_TRIMMED=$(node -p "new URL(process.argv[1], process.argv[2]).origin" "$loc" "${BASE_TRIMMED}/")
    fi
  fi
fi

BASE_URL="$BASE_TRIMMED"

assert_public() {
  local path="$1"
  local url="${BASE_URL}${path}"
  local code body
  code=$(curl -sL -o /dev/null -w "%{http_code}" -A "$UA" "$url")
  body=$(curl -sL -A "$UA" "$url")
  if [[ "$code" != "200" ]]; then
    fail "HTTP status not 200 for public page" "$url" "200" "$code"
  fi
  if ! echo "$body" | grep -q 'rel="canonical"'; then
    fail "missing <link rel=\"canonical\">" "$url" "canonical link in body" "(absent)"
  fi
  if ! echo "$body" | grep -qi 'name="description"'; then
    fail "missing <meta name=\"description\">" "$url" "description meta" "(absent)"
  fi
  if echo "$body" | grep -qiE '<meta[^>]*name=["'\'']robots["'\''][^>]*content=["'\''][^"'\'']*noindex'; then
    fail "public page must not emit noindex" "$url" "no noindex in robots meta" "(noindex found)"
  fi
}

assert_private_noindex() {
  local path="$1"
  local url="${BASE_URL}${path}"
  local code body
  code=$(curl -sL -o /dev/null -w "%{http_code}" -A "$UA" "$url")
  body=$(curl -sL -A "$UA" "$url")
  if [[ "$code" != "200" ]]; then
    fail "HTTP status not 200 for private page (SSR shell)" "$url" "200" "$code"
  fi
  if ! echo "$body" | grep -qiE '<meta[^>]*name=["'\'']robots["'\''][^>]*content=["'\''][^"'\'']*noindex'; then
    fail "missing noindex on private page" "$url" "robots noindex" "(absent)"
  fi
  if ! echo "$body" | grep -qiE '<meta[^>]*name=["'\'']robots["'\''][^>]*content=["'\''][^"'\'']*nofollow'; then
    fail "missing nofollow on private page" "$url" "robots nofollow" "(absent)"
  fi
}

assert_building_slugless_redirect() {
  local url="${BASE_URL}/building/${BID}"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-redirs 0 -A "$UA" "$url")
  if [[ "$code" != "301" ]]; then
    fail "slug-less building URL must return 301" "$url" "301" "$code"
  fi
}

echo "SEO smoke: BASE_URL=$BASE_URL"

assert_public "/"
assert_public "/connect"
assert_public "/building/${BID}/${BSLUG}"
assert_public "/architect/${AID}"
assert_public "/profile/${PROFILE}"
assert_public "/terms"

assert_private_noindex "/settings"
assert_private_noindex "/auth"
assert_private_noindex "/building/${BID}/edit"
assert_private_noindex "/admin"

assert_building_slugless_redirect

echo "SEO smoke: all checks passed."
