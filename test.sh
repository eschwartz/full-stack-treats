#!/usr/bin/env bash
set -o pipefail


timestamp=$(date +%s)
testDb="full-stack-treats-test-${timestamp}"


function dropTestDb {
  echo "Dropping DB ${testDb}..."
  dropdb ${testDb}
}

trap dropTestDb EXIT

echo "Creating DB ${testDb}..."
createdb ${testDb}

echo "Running tests...."

# https://github.com/cschleiden/jest-github-actions-reporter

reportersFlag=''
if [[ -n "${CI}" ]]; then
  set -e
  reportersFlag="--reporters=jest-github-actions-reporter"
fi

TEST_DB=${testDb} \
  ./node_modules/.bin/jest \
    --forceExit \
    --runInBand \
    --testTimeout=8000 \
    ${reportersFlag}
echo "Tests complete."


if [[ -n "$CI" ]]; then
  echo "::warning::All tests passed! Great work!"
else
  open ./test-report.html
fi


echo "Testing complete!"