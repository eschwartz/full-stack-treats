#!/usr/bin/env bash

timestamp=$(date +%s)
testDb="full-stack-treats-test-${timestamp}"

echo "Creating DB ${testDb}..."
createdb ${testDb}

echo "Running tests...."

# https://github.com/cschleiden/jest-github-actions-reporter

TEST_DB=${testDb} \
CI=true \
  ./node_modules/.bin/jest \
    --forceExit \
    --runInBand \
    --testTimeout=8000 \
    --reporters=default --reporters=jest-github-actions-reporter
open ./test-report.html
echo "Tests complete."

echo "Dropping DB ${testDb}..."
dropdb ${testDb}

echo "Testing complete!"