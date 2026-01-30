# /accessibility Command

Run accessibility testing and generate compliance reports.

## Trigger
User runs `/accessibility` or asks to "check accessibility", "run a11y tests", "test for WCAG compliance"

## Workflow

### Step 1: Check for Frontend Project
Verify this is a frontend project with testable UI:

```bash
# Check for common frontend indicators
if [ -f "package.json" ]; then
  if grep -qE '"react"|"vue"|"angular"|"svelte"' package.json; then
    echo "Frontend framework detected"
  fi
fi

# Check for HTML files
if find . -name "*.html" -o -name "*.tsx" -o -name "*.vue" | head -1 | grep -q .; then
  echo "UI files found"
fi
```

### Step 2: Setup Testing Tools
Ensure accessibility testing tools are available:

**Required packages:**
```bash
npm install --save-dev @axe-core/playwright playwright
npx playwright install
```

**Alternative for static analysis:**
```bash
npm install --save-dev axe-core pa11y
```

### Step 3: Run Accessibility Scans

**Using Playwright + axe-core (recommended):**
```bash
npx playwright test --grep "@a11y"
```

**Using pa11y for quick checks:**
```bash
npx pa11y http://localhost:3000 --standard WCAG2AA
```

**Using axe-cli:**
```bash
npx axe http://localhost:3000 --rules wcag2aa
```

### Step 4: Analyze Results
Parse violations and categorize by severity:

| Impact | Description | Action Required |
|--------|-------------|-----------------|
| Critical | Blocks users entirely | Fix immediately |
| Serious | Major barriers | Fix before release |
| Moderate | Causes difficulty | Plan to fix |
| Minor | Minor inconvenience | Nice to fix |

### Step 5: Generate Report

```markdown
## Accessibility Report

**Standard:** WCAG 2.1 Level AA
**Pages Tested:** 5
**Violations Found:** 12

### Summary by Impact
| Impact | Count | Status |
|--------|-------|--------|
| Critical | 0 | ✅ |
| Serious | 2 | ❌ Must fix |
| Moderate | 5 | ⚠️ Should fix |
| Minor | 5 | 📝 Consider |

### Critical Issues
None found ✅

### Serious Issues (Must Fix)

#### 1. Missing form labels
**Rule:** label (WCAG 1.3.1, 4.1.2)
**Impact:** Screen reader users cannot identify form inputs

**Locations:**
- `/login` - Email input (line 23)
- `/signup` - Password input (line 45)

**Fix:**
```html
<!-- Before -->
<input type="email" placeholder="Email">

<!-- After -->
<label for="email">Email</label>
<input id="email" type="email" placeholder="Email">
```

#### 2. Low color contrast
**Rule:** color-contrast (WCAG 1.4.3)
**Impact:** Users with low vision cannot read text

**Locations:**
- Header navigation links (#666 on #fff, ratio 4.48:1)
- Footer text (#999 on #f5f5f5, ratio 2.85:1)

**Fix:** Increase contrast ratio to at least 4.5:1
- Navigation: Change to #595959 (ratio 7:1)
- Footer: Change to #767676 (ratio 4.54:1)

### Moderate Issues (Should Fix)

1. **Images missing alt text** - 3 instances
2. **Links not distinguishable** - 2 instances
3. **Focus order incorrect** - 1 instance

### Keyboard Navigation
- ✅ All interactive elements are focusable
- ✅ Focus order follows visual order
- ⚠️ Skip link missing (add for better navigation)
- ✅ No keyboard traps detected

### Screen Reader Compatibility
- ✅ Landmarks properly defined
- ✅ Headings follow hierarchy
- ⚠️ Some buttons lack accessible names

### Recommendations
1. Add visible labels to all form inputs
2. Increase color contrast for navigation and footer
3. Add alt text to decorative images (use alt="")
4. Add skip link to main content
5. Review button labels for clarity

### Resources
- [WCAG Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [axe-core Rules](https://dequeuniversity.com/rules/axe/)
- [Color Contrast Checker](https://webaim.org/resources/contrastchecker/)
```

## Example Usage

```
User: /accessibility

Claude: Running accessibility tests against WCAG 2.1 AA...

Starting dev server on http://localhost:3000...
Testing 5 pages across 3 viewports...

## Accessibility Report

**Standard:** WCAG 2.1 Level AA
**Status:** ⚠️ Issues found

### Summary
| Impact | Count |
|--------|-------|
| Critical | 0 ✅ |
| Serious | 2 ❌ |
| Moderate | 3 ⚠️ |
| Minor | 4 |

### Must Fix (Serious)

1. **Missing form labels** on /login
   ```tsx
   // Add label association
   <label htmlFor="email">Email</label>
   <input id="email" type="email" />
   ```

2. **Color contrast insufficient** in navigation
   Current: 4.48:1, Required: 4.5:1
   Fix: Change text color from #666 to #595959

### Should Fix (Moderate)
- Add alt="" to decorative images
- Add aria-label to icon buttons
- Implement skip link

Full report: `reports/accessibility/index.html`

Run `npx playwright show-report` to view detailed results.
```

## Quick Checks (No Server Required)

For static HTML analysis:

```bash
# Check a single file
npx pa11y ./dist/index.html --standard WCAG2AA

# Check built files
npx pa11y-ci --sitemap http://localhost:3000/sitemap.xml
```

## Integration with CI

Add to `.github/workflows/ci.yml`:

```yaml
accessibility:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
    - run: npm ci
    - run: npm run build
    - run: npm run start &
    - run: npx wait-on http://localhost:3000
    - run: npm run test:a11y
    - uses: actions/upload-artifact@v4
      if: always()
      with:
        name: accessibility-report
        path: playwright-report/
```

## WCAG Conformance Levels

| Level | Description | Required For |
|-------|-------------|--------------|
| A | Minimum | All web content |
| AA | Standard | Most regulations (ADA, Section 508) |
| AAA | Enhanced | Specialized accessibility needs |

Default testing targets **WCAG 2.1 Level AA**.
