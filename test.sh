#!/usr/bin/env bash
set -o pipefail

# We're going to create a temporary DB for testing
# Include a timestamp in the name, so it's unique
timestamp=$(date +%s)
testDb="full-stack-treats-test-${timestamp}"

# Drop the test database, when the script ends
function dropTestDb {
  echo "Dropping DB ${testDb}..."
  dropdb ${testDb}
}
trap dropTestDb EXIT

# Create the test database
echo "Creating DB ${testDb}..."
createdb ${testDb}

echo "Running treats.sql..."
psql -d ${testDb} -f ./treats.sql


# If we're running from Github Actions, use the github-actions-reporter
# so we can see test results in the workflow annotations
# https://github.com/cschleiden/jest-github-actions-reporter
reportersFlag=''
if [[ -n "${CI}" ]]; then
  set -e
  reportersFlag="--reporters=jest-github-actions-reporter"
fi

# Accept TEST_NAME_PATTERN env var
# eg. we can use this to only match Stretch goal tests
# with TEST_NAME_PATTERN="STRETCH"
# ...or to ignore STRETCH goals
# with TEST_NAME_PATTERN='^((?!STRETCH).)*$'
# see https://jestjs.io/docs/en/cli#--testnamepatternregex
testNamePatternFlag=''
if [[ -n "${TEST_NAME_PATTERN}" ]]; then
  testNamePatternFlag="--testNamePattern=${TEST_NAME_PATTERN}"
fi

# Run the rest tests
echo "Running tests...."
TEST_DB=${testDb} \
  ./node_modules/.bin/jest \
    --forceExit \
    --runInBand \
    --testTimeout=8000 \
    ${reportersFlag} \
    ${testNamePatternFlag}
echo "Tests complete."

# If we're running from Github Actions, show a "All tested passed!"
# message in the workflow annotations
if [[ -n "$CI" ]]; then
  echo "::warning::All tests passed! Great work!"
# If we're running locally, open the HTML report
# Uses jest-html-reporter
else
  echo "Testing complete!"
  open ./test-report.html
fi