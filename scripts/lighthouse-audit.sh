#!/bin/bash

# La Brecha - Lighthouse Audit Script
# Runs Lighthouse audit and generates a summary report

set -e
shopt -s inherit_errexit

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
URL="${1:-http://localhost:3000}"
FORM_FACTOR="${2:-desktop}"
OUTPUT_DIR="$(dirname "$0")/../lighthouse-reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
JSON_REPORT="${OUTPUT_DIR}/lighthouse-${TIMESTAMP}-${FORM_FACTOR}.report.json"
HTML_REPORT="${OUTPUT_DIR}/lighthouse-${TIMESTAMP}-${FORM_FACTOR}.report.html"
SUMMARY_REPORT="${OUTPUT_DIR}/lighthouse-summary-${TIMESTAMP}-${FORM_FACTOR}.txt"

# Create output directory
mkdir -p "${OUTPUT_DIR}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  La Brecha Lighthouse Audit${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "URL: ${YELLOW}${URL}${NC}"
echo -e "Device: ${YELLOW}${FORM_FACTOR}${NC}"
echo -e "Timestamp: ${YELLOW}${TIMESTAMP}${NC}"
echo ""

# Check if URL is accessible
echo -e "${BLUE}Checking if server is running...${NC}"
HTTP_STATUS="$(curl -s -o /dev/null -w "%{http_code}" "${URL}" || true)"
if [[ "${HTTP_STATUS}" != *200* ]]; then
    echo -e "${RED}Error: Server at ${URL} is not accessible${NC}"
    echo -e "${YELLOW}Please start the server first:${NC}"
    echo -e "  cd web && pnpm run build && pnpm run start"
    exit 1
fi
echo -e "${GREEN}✓ Server is running${NC}"
echo ""

# Run Lighthouse
echo -e "${BLUE}Running Lighthouse audit...${NC}"

if [[ "${FORM_FACTOR}" = "mobile" ]]; then
    pnpm exec lighthouse "${URL}" \
        --output=json \
        --output=html \
        --output-path="${OUTPUT_DIR}/lighthouse-${TIMESTAMP}-${FORM_FACTOR}" \
        --chrome-flags="--headless --no-sandbox --disable-gpu" \
        --only-categories=performance,accessibility,best-practices,seo \
        --screenEmulation.mobile \
        --form-factor=mobile \
        --quiet
else
    pnpm exec lighthouse "${URL}" \
        --output=json \
        --output=html \
        --output-path="${OUTPUT_DIR}/lighthouse-${TIMESTAMP}-${FORM_FACTOR}" \
        --chrome-flags="--headless --no-sandbox --disable-gpu" \
        --only-categories=performance,accessibility,best-practices,seo \
        --form-factor=desktop \
        --screenEmulation.mobile=false \
        --quiet
fi

# Wait for files to be written
sleep 2

# Verify files were created
if [[ ! -f "${JSON_REPORT}" ]]; then
    echo -e "${RED}Error: JSON report not created${NC}"
    echo "Expected: ${JSON_REPORT}"
    ls -la "${OUTPUT_DIR}/"
    exit 1
fi

echo -e "${GREEN}✓ Audit completed${NC}"
echo ""

# Parse and generate summary
echo -e "${BLUE}Generating summary...${NC}"

# Extract scores from JSON
PERFORMANCE=$(python3 -c "import sys,json; d=json.load(sys.stdin); print(int(d['categories']['performance']['score']*100))" < "${JSON_REPORT}")
ACCESSIBILITY=$(python3 -c "import sys,json; d=json.load(sys.stdin); print(int(d['categories']['accessibility']['score']*100))" < "${JSON_REPORT}")
BEST_PRACTICES=$(python3 -c "import sys,json; d=json.load(sys.stdin); print(int(d['categories']['best-practices']['score']*100))" < "${JSON_REPORT}")
SEO=$(python3 -c "import sys,json; d=json.load(sys.stdin); print(int(d['categories']['seo']['score']*100))" < "${JSON_REPORT}")

# Function to get color based on score
get_color() {
    if [[ "$1" -ge 90 ]]; then
        echo "${GREEN}"
    elif [[ "$1" -ge 50 ]]; then
        echo "${YELLOW}"
    else
        echo "${RED}"
    fi
}

# Function to get status icon
get_icon() {
    if [[ "$1" -ge 90 ]]; then
        echo "✓"
    elif [[ "$1" -ge 50 ]]; then
        echo "!"
    else
        echo "✗"
    fi
}

# Display summary in terminal
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Lighthouse Score Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

PERF_COLOR=$(get_color "${PERFORMANCE}")
ACC_COLOR=$(get_color "${ACCESSIBILITY}")
BP_COLOR=$(get_color "${BEST_PRACTICES}")
SEO_COLOR=$(get_color "${SEO}")

PERF_ICON=$(get_icon "${PERFORMANCE}")
ACC_ICON=$(get_icon "${ACCESSIBILITY}")
BP_ICON=$(get_icon "${BEST_PRACTICES}")
SEO_ICON=$(get_icon "${SEO}")

echo -e "${PERF_COLOR}${PERF_ICON} Performance:      ${PERFORMANCE}/100${NC}"
echo -e "${ACC_COLOR}${ACC_ICON} Accessibility:    ${ACCESSIBILITY}/100${NC}"
echo -e "${BP_COLOR}${BP_ICON} Best Practices:   ${BEST_PRACTICES}/100${NC}"
echo -e "${SEO_COLOR}${SEO_ICON} SEO:              ${SEO}/100${NC}"
echo ""

# Calculate average
AVERAGE=$(( (PERFORMANCE + ACCESSIBILITY + BEST_PRACTICES + SEO) / 4 ))
AVG_COLOR=$(get_color "${AVERAGE}")
echo -e "${AVG_COLOR}Average Score: ${AVERAGE}/100${NC}"
echo ""

# Save summary to file
REPORT_DATE="$(date)"
{
    echo "========================================="
    echo "  La Brecha Lighthouse Audit Summary"
    echo "========================================="
    echo ""
    echo "Date: ${REPORT_DATE}"
    echo "URL: ${URL}"
    echo ""
    echo "Scores:"
    echo "  Performance:      ${PERFORMANCE}/100"
    echo "  Accessibility:    ${ACCESSIBILITY}/100"
    echo "  Best Practices:   ${BEST_PRACTICES}/100"
    echo "  SEO:              ${SEO}/100"
    echo ""
    echo "  Average:          ${AVERAGE}/100"
    echo ""
    echo "========================================="
    echo ""
} > "${SUMMARY_REPORT}"

# Extract key issues
echo -e "${BLUE}Key Issues to Address:${NC}"
echo ""

# Performance issues
PERF_ISSUES=$(python3 -c "
import sys, json
data = json.load(sys.stdin)
audits = data['audits']
issues = []
for key, audit in audits.items():
    if audit.get('score') is not None and audit['score'] < 1.0:
        if 'performance' in data['categories']['performance'].get('auditRefs', [{}]):
            if any(ref['id'] == key for ref in data['categories']['performance']['auditRefs']):
                title = audit.get('title', key)
                score = int(audit['score'] * 100) if audit['score'] is not None else 0
                if score < 90:
                    issues.append(f'{title}: {score}/100')
for i, issue in enumerate(issues[:5], 1):
    print(f'{i}. {issue}')
" < "${JSON_REPORT}" 2>/dev/null || echo "  No issues found or unable to parse")

echo ""

# Accessibility issues
echo -e "${BLUE}Accessibility Issues:${NC}"
ACC_ISSUES=$(python3 -c "
import sys, json
data = json.load(sys.stdin)
audits = data['audits']
issues = []
for key, audit in audits.items():
    if audit.get('score') is not None and audit['score'] < 1.0:
        for ref in data['categories']['accessibility'].get('auditRefs', []):
            if ref['id'] == key and audit['score'] < 1.0:
                title = audit.get('title', key)
                issues.append(f'{title}')
                break
for i, issue in enumerate(issues[:5], 1):
    print(f'{i}. {issue}')
if not issues:
    print('  No major issues found')
" < "${JSON_REPORT}" 2>/dev/null || echo "  Unable to parse")

echo ""

# Report locations
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Report Files Generated${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "JSON Report:    ${YELLOW}${JSON_REPORT}${NC}"
echo -e "HTML Report:    ${YELLOW}${HTML_REPORT}${NC}"
echo -e "Summary:        ${YELLOW}${SUMMARY_REPORT}${NC}"
echo ""
echo -e "${GREEN}To view HTML report:${NC}"
echo -e "  xdg-open ${HTML_REPORT}"
echo ""

# Append to summary file
{
    echo "Performance Issues:"
    echo "${PERF_ISSUES}"
    echo ""
    echo "Accessibility Issues:"
    echo "${ACC_ISSUES}"
    echo ""
    echo "Report Files:"
    echo "  JSON: ${JSON_REPORT}"
    echo "  HTML: ${HTML_REPORT}"
} >> "${SUMMARY_REPORT}"

# Exit with appropriate code
if [[ "${AVERAGE}" -lt 90 ]]; then
    echo -e "${YELLOW}⚠ Average score is below 90. Review the issues above.${NC}"
    exit 1
else
    echo -e "${GREEN}✓ All scores are above 90!${NC}"
    exit 0
fi
