#!/usr/bin/env bash
set -eo pipefail


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

ghaReporterFlag='';
if [[ -n "${CI}" ]]; then
  ghaReporterFlag="--reporters=jest-github-actions-reporter"
fi

TEST_DB=${testDb} \
  ./node_modules/.bin/jest \
    --forceExit \
    --runInBand \
    --testTimeout=8000 \
    --reporters=default ${ghaReporterFlag}
echo "Tests complete."

echo "CI? $CI";

#if [[ -n "$CI" ]]; then
  echo "::warning::All tests passed! Great work!"
#fi


echo "Testing complete!"