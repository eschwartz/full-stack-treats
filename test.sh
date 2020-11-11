#!/usr/bin/env bash

timestamp=$(date +%s)
testDb="full-stack-treats-test-${timestamp}"

echo "Creating DB ${testDb}..."
createdb ${testDb}

echo "Running tests...."
TEST_DB=${testDb} \
  ./node_modules/.bin/jest --forceExit --runInBand --testTimeout=8000
open ./test-report.html
echo "Tests complete."

echo "Dropping DB ${testDb}..."
dropdb ${testDb}

echo "Testing complete!"