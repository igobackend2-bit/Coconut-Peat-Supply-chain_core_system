#!/usr/bin/env bash
# Fails if a tracked file looks like it contains a credential. Run locally, from
# .githooks/pre-commit, and in CI.
#   scripts/check-secrets.sh            scan every git-tracked file
#   scripts/check-secrets.sh <dir>      scan a directory tree (used to test the scanner)
set -u

# Files that legitimately hold fake or placeholder values.
EXCLUDE='(^|/)(node_modules|\.git|\.kilo|dist|docs|coverage)/|package-lock\.json$|go\.sum$|\.example$|\.sample$|apps/api/test/|\.spec\.tsx?$|scripts/check-secrets\.sh$'

if [ $# -ge 1 ]; then
  files=$(cd "$1" && find . -type f -not -path './.git/*' | sed 's|^\./||')
  root="$1"
else
  files=$(git ls-files)
  root="."
fi
files=$(printf '%s\n' "$files" | grep -Ev "$EXCLUDE" || true)

# name|extended regex. A value starting with $ or { is a variable reference, not a literal.
PATTERNS=(
  'private key block|-----BEGIN [A-Z ]*PRIVATE KEY-----'
  'AWS access key|(AKIA|ASIA)[0-9A-Z]{16}'
  'GitHub token|gh[pousr]_[A-Za-z0-9]{36,}'
  'hex private key literal|["'"'"']0x[0-9a-fA-F]{64}["'"'"']|HexToECDSA\(["'"'"'][0-9a-fA-F]{32,}'
  'password literal|[A-Za-z_]*(PASSWORD|PASSWD|SECRET)[A-Za-z_]*[ \t]*[:=][ \t]*["'"'"']?[A-Za-z0-9!@#%^&*_.+-]{6,}'
  'long token literal|[A-Za-z_]*TOKEN[A-Za-z_]*[ \t]*[:=][ \t]*["'"'"']?[A-Za-z0-9_.+-]{24,}'
  'k8s literal secret value|name:[ \t]*[A-Z_]*(PASSWORD|SECRET|TOKEN)[A-Z_]*[ \t]*$'
  'piped password to docker login|echo[ \t]+["'"'"'][^"'"'"']+["'"'"'][ \t]*\|[ \t]*docker login'
  'credentials in a URL|[a-z]+://[^/ :@"'"'"']+:[^/ @"'"'"'$]{3,}@'
)

found=0
while IFS= read -r f; do
  [ -z "$f" ] && continue
  for entry in "${PATTERNS[@]}"; do
    name="${entry%%|*}"; re="${entry#*|}"
    while IFS= read -r hit; do
      [ -z "$hit" ] && continue
      line="${hit#*:}"
      # Allow references: ${VAR}, $VAR, process.env.X, os.Getenv, valueFrom/secretKeyRef lines, empty values.
      if printf '%s' "$line" | grep -Eq '\$\{|\$[A-Z_]+|process\.env|Getenv|secretKeyRef|valueFrom|=[ \t]*$|=<|\.\.\.|your-|<[a-z-]+>|[:=][ \t]*["'"'"']?placeholder'; then continue; fi
      # A k8s "name: X_PASSWORD" line is only a finding if its value is a literal on the next line.
      if [ "$name" = "k8s literal secret value" ]; then
        n="${hit%%:*}"
        nxt=$(sed -n "$((n+1))p" "$root/$f")
        printf '%s' "$nxt" | grep -Eq 'value:[ \t]*"?[^"$ ]' || continue
      fi
      printf 'SECRET? [%s] %s:%s\n' "$name" "$f" "$hit"
      found=1
    done < <(grep -nEI -- "$re" "$root/$f" 2>/dev/null)
  done
done <<< "$files"

if [ "$found" -ne 0 ]; then
  echo
  echo "Possible credentials found. Move them to environment variables or a secret store;"
  echo "if the value was ever committed, rotate it — removing it from the file is not enough."
  exit 1
fi
echo "No credentials found in $(printf '%s\n' "$files" | grep -c .) files."
