Accessibility Audit Report — WCAG 2.1 Compliance
TaskFlow — Business Management Platform
PIDEV 4TWIN3 — Esprit School of Engineering — Academic Year 2025-2026

Document type: Accessibility Engineering Evaluation
Standard: WCAG 2.1 (Web Content Accessibility Guidelines)
Target conformance level: AA
Prepared by: Nour Hasni, Ghassen Drira, Aziz Douagi, Med Karim Kebaili
Date: May 2026
Version: 1.0


---


1. Executive Summary

This document constitutes the accessibility audit report for the TaskFlow web application. Its purpose is to evaluate the degree to which the application conforms to the Web Content Accessibility Guidelines (WCAG) 2.1 at Level AA, and to document both the issues identified and the corrective measures that were applied or recommended.

The audit covers the Angular 21 frontend application, which consists of 45 components using inline TypeScript templates. Unlike traditional Angular applications with separate HTML files, all markup for TaskFlow components is embedded directly within component TypeScript files. This structural characteristic means that accessibility analysis of template code must be performed by reading TypeScript source files rather than HTML files.

The target conformance level for this evaluation is WCAG 2.1 Level AA. This level requires meeting all Level A and Level AA success criteria.

Summary of findings:

- A subset of components, including the login form, password visibility toggle, and theme toggle button, include ARIA labels and aria-live regions. These have been verified directly in the source code.
- The majority of components have not been subjected to automated accessibility scanning due to the absence of a running application instance at the time of writing. Findings marked "To be verified" require manual testing or automated tool execution against a live instance.
- No dedicated accessibility testing framework was integrated into the test suite at the time of this audit.
- No automated scan results from Lighthouse, axe, or WAVE are available in this report. The commands to generate them are documented in section 3.

This report distinguishes clearly between:
- Issues verified through source code inspection
- Issues requiring manual keyboard and screen reader testing
- Issues that are pending automated scan execution


---


2. Scope of the Audit

2.1 Audited Pages

The following pages were in scope for accessibility review, based on the Angular routing configuration verified in app.routes.ts:

- /home — Public landing page
- /auth/login — Authentication form (reviewed in source code)
- /auth/register — User registration form
- /forgot-password — Password recovery request form
- /reset-password — Password reset form
- /dashboard — Main dashboard with charts and summary metrics
- /invoices — Invoice list view
- /invoices/:id — Invoice detail view
- /expenses — Expense list and management
- /clients — Client management
- /ml/segmentation — Customer segmentation view
- /ml/cashflow — Cashflow forecasting view
- /ml/anomalies — Anomaly detection view
- /ml/risk — Payment risk assessment
- /ai-assistant — Financial chatbot interface
- /support — Support chat
- /admin/roles — Role and permissions management (admin only)
- /employees — Employee management
- /settings — User settings
- /team — Team management

2.2 Audited Components

Forms: Login form, registration form, forgot password form, invoice creation form, expense creation form, client management forms, employee forms, settings form, 2FA verification input

Navigation: Main sidebar navigation, top navigation bar, breadcrumb elements if present

Modals: Any modal dialogs used for confirmations, creation, or detail views

Buttons: Theme toggle, password visibility toggle, submit buttons, cancel buttons, action buttons in lists

Data display: Invoice lists, expense lists, client lists, table-like structures for employee and role management

Charts: Chart.js-based dashboard visualizations

Chat: Real-time team chat and support chat interfaces

Authentication overlays: 2FA code input, lockout indicators


---


3. Methodology

3.1 Automated Tools

The following tools are recommended for executing automated accessibility scans against the running application. At the time of this audit, these scans had not been executed. The commands below produce actionable reports.

Tool: Lighthouse Accessibility
Command:
  npx lighthouse http://localhost:4200/auth/login --only-categories=accessibility --output=html --output-path=./docs/evaluation/lighthouse-a11y-login.html
  npx lighthouse http://localhost:4200/dashboard --only-categories=accessibility --output=html --output-path=./docs/evaluation/lighthouse-a11y-dashboard.html
  npx lighthouse http://localhost:4200/invoices --only-categories=accessibility --output=html --output-path=./docs/evaluation/lighthouse-a11y-invoices.html

Tool: axe DevTools (browser extension)
Procedure: Install the axe DevTools browser extension, open the application at each route, activate the axe panel in DevTools, and run the full scan. Export results to JSON for documentation.

Tool: WAVE (Web Accessibility Evaluation Tool)
Procedure: Use the WAVE browser extension or navigate to https://wave.webaim.org (once the application is deployed to a public URL) to scan each key page.

Tool: Unlighthouse (site-wide accessibility scan)
Command:
  npx unlighthouse --site http://localhost:4200 --reporter json

3.2 Manual Testing Procedures

Manual testing must be performed for the following WCAG criteria that automated tools cannot fully evaluate:

Keyboard navigation test procedure:
- Load each key page in the application
- Press Tab to move focus forward through interactive elements
- Press Shift+Tab to move focus backward
- Verify that focus is visible on every focused element
- Press Enter to activate buttons and links
- Press Space to activate checkboxes and buttons
- Press Escape to close modal dialogs and dropdown menus
- Verify that focus is not trapped in any area outside of intentional modal dialogs
- Verify that the tab order is logical and follows the visual reading order

Screen reader test procedure:
- Enable VoiceOver (macOS) or NVDA (Windows)
- Navigate to each page and read the entire content
- Verify that all interactive elements have meaningful names
- Verify that form errors are announced when they occur
- Verify that dynamic content updates (chat messages, loading states) are announced

Visible focus test procedure:
- Disable the mouse and navigate using only the keyboard
- Verify that a visible focus indicator is present on every interactive element
- Verify that the focus indicator has sufficient contrast against its background

Color contrast test procedure:
- Use the axe DevTools or the Chrome DevTools color picker to measure the contrast ratio of text against its background
- Verify that normal text meets a minimum contrast ratio of 4.5:1
- Verify that large text meets a minimum contrast ratio of 3:1


---


4. WCAG 2.1 Compliance Mapping

The following section maps key WCAG 2.1 Level A and AA success criteria to the TaskFlow codebase. Each criterion is evaluated based on source code inspection or marked as pending automated or manual verification.

WCAG Criterion: 1.1.1 Non-text Content
Level: A
Status: Partially verified
Evidence: Inspecting frontend component files reveals 13 occurrences of alt= attributes across the codebase. However, since all templates are inline in TypeScript files, a complete audit of all image elements requires full source review. Icon-only buttons have been found to use aria-label in some components (login page theme toggle, password toggle).
Corrective action: Verify that all informative images have descriptive alt text. Verify that all decorative images have empty alt attributes. Verify that icon-only buttons that use SVG icons have aria-label attributes.

WCAG Criterion: 1.3.1 Info and Relationships
Level: A
Status: To be verified
Evidence: Pending full template analysis. The login form uses label elements with associated inputs. Complex data structures such as invoice lists and expense tables should be verified for correct semantic HTML (proper use of ul/ol for lists, thead/tbody/th for tables).
Corrective action: Ensure that data grids and list views use semantically appropriate HTML elements with proper header associations.

WCAG Criterion: 1.3.3 Sensory Characteristics
Level: A
Status: To be verified
Evidence: Pending manual review. Status indicators for invoices (DRAFT, SENT, PAID, OVERDUE, CANCELED) must not rely solely on color to convey their meaning.
Corrective action: Verify that invoice and expense status indicators include text labels or icons alongside color coding.

WCAG Criterion: 1.4.3 Contrast Minimum
Level: AA
Status: To be measured
Evidence: The application uses CSS custom properties (var(--tf-muted), var(--tf-primary), var(--tf-surface)) for theming with both light and dark modes. Actual contrast ratios depend on the resolved values of these variables. Measurement is required.
Corrective action: Run Lighthouse or axe DevTools to identify failing contrast ratios. Adjust custom property values to meet the 4.5:1 minimum for normal text and 3:1 for large text.

WCAG Criterion: 1.4.4 Resize Text
Level: AA
Status: To be verified
Evidence: TailwindCSS uses responsive utility classes. Verify that the application layout remains usable when text is scaled to 200% without horizontal scrolling.

WCAG Criterion: 1.4.10 Reflow
Level: AA
Status: To be verified
Evidence: Verify that all content is accessible at 320px viewport width (equivalent to 400% zoom on a 1280px screen) without loss of content or functionality.

WCAG Criterion: 2.1.1 Keyboard
Level: A
Status: To be verified
Evidence: Manual keyboard testing is required. The Angular Router supports keyboard navigation by default. Custom interactive components (modals, dropdowns, chat input) must be verified individually.
Corrective action: Ensure all interactive elements (buttons, links, form controls, custom widgets) are reachable and operable by keyboard alone.

WCAG Criterion: 2.1.2 No Keyboard Trap
Level: A
Status: To be verified
Evidence: Modal dialogs and overlays must not trap keyboard focus unless the user can exit using the Escape key or a clearly labeled close button. Manual testing required.
Corrective action: Implement focus trapping only within modal dialogs, with Escape key support for dismissal.

WCAG Criterion: 2.4.3 Focus Order
Level: A
Status: To be verified
Evidence: Angular Router manages focus during route transitions. Whether focus returns to a logical position after navigation depends on the application's focus management strategy. Manual testing required.

WCAG Criterion: 2.4.4 Link Purpose
Level: A
Status: Partially verified
Evidence: Action buttons in the codebase should have accessible names either through visible text or aria-label. The login form submit button has visible text. Verify that icon-only action buttons throughout the application have adequate aria-label attributes.

WCAG Criterion: 2.4.6 Headings and Labels
Level: AA
Status: To be verified
Evidence: Pending inspection of heading hierarchy across all page templates. Inline TypeScript templates must be reviewed for correct use of h1 through h6 elements.

WCAG Criterion: 2.4.7 Focus Visible
Level: AA
Status: To be verified
Evidence: TailwindCSS provides focus: utility classes. Verify that the application does not globally suppress the browser focus outline (outline: none or outline: 0) without providing a custom visible focus replacement.
Corrective action: Ensure every interactive element has a visible focus state with sufficient contrast.

WCAG Criterion: 3.3.1 Error Identification
Level: A
Status: Partially verified
Evidence: The login component includes an aria-live="polite" region for displaying error messages related to failed authentication and account lockout. This was verified in the login.component.ts source file. Registration and expense creation forms must be separately verified.
Corrective action: Add aria-live regions or aria-describedby associations to form error messages across all forms.

WCAG Criterion: 3.3.2 Labels or Instructions
Level: A
Status: Partially verified
Evidence: The login form uses label elements above the email and password inputs. The 2FA input field has an associated label. Verify that all other forms across the application follow this pattern.
Corrective action: Ensure all form inputs are associated with a label element using either the for/id pattern or by nesting the input within the label.

WCAG Criterion: 4.1.2 Name, Role, Value
Level: A
Status: Partially verified
Evidence: The login form password toggle button has aria-label="Afficher le mot de passe" (verified in source code). The theme toggle button has aria-label="Basculer le thème" (verified in source code). Custom interactive components such as the chat interface and dropdown menus require manual verification.
Corrective action: Ensure all custom interactive elements expose their accessible name, role, and current state to assistive technologies.


---


5. Detected Accessibility Issues

The following issues were identified through source code inspection. Additional issues are expected to surface upon automated scanning and manual testing.

Issue ID: A-001
Severity: High
WCAG criterion: 1.4.3 Contrast Minimum (Level AA)
Location: Global CSS custom properties — var(--tf-muted) used for label text
Description: Multiple form labels use the CSS variable --tf-muted for their text color. This variable is described in code comments as a muted secondary color. Depending on its resolved value in both light and dark modes, it may fail the 4.5:1 contrast ratio requirement for normal-sized text.
Impact: Users with low vision who do not use assistive technologies may be unable to read form labels.
Fix implemented: Not yet implemented
Status: Pending measurement — run Lighthouse or axe to confirm.

Issue ID: A-002
Severity: Medium
WCAG criterion: 2.4.7 Focus Visible (Level AA)
Location: Global stylesheet (src/styles.scss)
Description: TailwindCSS normalizes focus styles by default in some configurations. If outline: none or focus:outline-none is applied globally without providing a replacement visible focus indicator, keyboard users will be unable to track focus.
Impact: Keyboard-only users cannot track their position within the interface.
Fix implemented: To be verified
Status: Pending — inspect styles.scss for global focus suppression.

Issue ID: A-003
Severity: Medium
WCAG criterion: 3.3.2 Labels or Instructions (Level A)
Location: Multiple forms beyond the login component (register, expense creation, invoice creation)
Description: While the login form includes label elements, the accessibility of other forms has not been verified. Without visible, programmatically associated labels, screen readers cannot announce the purpose of input fields.
Impact: Screen reader users cannot understand what is expected in unlabeled input fields.
Fix implemented: To be verified
Status: Pending source code and manual review of all forms.

Issue ID: A-004
Severity: Medium
WCAG criterion: 1.3.1 Info and Relationships (Level A)
Location: Invoice list, expense list, client list components
Description: Data presented in list-like or table-like views may use generic div elements rather than semantic table, thead, th, tbody, and td elements. This prevents screen readers from providing context such as column headers when reading data cells.
Impact: Screen reader users cannot understand the structure of tabular data.
Fix implemented: To be verified
Status: Pending source code review of list components.

Issue ID: A-005
Severity: Low
WCAG criterion: 4.1.2 Name, Role, Value (Level A)
Location: Chart.js visualizations on the dashboard and ML pages
Description: Chart.js canvases are rendered as pixel graphics. Without an accessible alternative (aria-label on the canvas element or a linked data table), screen reader users receive no information about the chart content.
Impact: Users who rely on screen readers cannot access the financial data presented in charts.
Fix implemented: To be verified
Status: Pending review — add aria-label or role="img" with a descriptive aria-label to each canvas element, or provide a data table alternative.

Issue ID: A-006
Severity: Low
WCAG criterion: 1.1.1 Non-text Content (Level A)
Location: Status badge icons, action icons in tables, SVG decorative icons
Description: Decorative SVG icons within status badges and action buttons may not have empty alt attributes or aria-hidden="true" set, causing screen readers to attempt to read their content.
Impact: Screen reader users may hear meaningless SVG markup announced.
Fix implemented: To be verified
Status: Pending source code review.


---


6. Corrective Measures Implemented

The following accessibility corrections were confirmed as implemented through source code inspection.

Accessible label on the password visibility toggle button:
- Component: login.component.ts
- Implementation: The toggle button uses aria-label="Afficher le mot de passe" to provide an accessible name for screen readers.
- Status: Implemented and verified.

Accessible label on the theme toggle button:
- Component: login.component.ts (and shared layout)
- Implementation: The theme toggle button uses aria-label="Basculer le thème"
- Status: Implemented and verified.

Live region for authentication error messages:
- Component: login.component.ts
- Implementation: The error message container uses aria-live="polite", ensuring that authentication failures and account lockout messages are announced to screen reader users without interrupting the current reading position.
- Status: Implemented and verified.

Label elements for the login form email and password fields:
- Component: login.component.ts
- Implementation: The email and password inputs are preceded by label elements.
- Status: Implemented and verified.

Label for the 2FA verification input:
- Component: login.component.ts
- Implementation: The OTP input field is preceded by a label element.
- Status: Implemented and verified.

The following corrections are recommended but have not yet been confirmed as implemented:

- Adding aria-live="assertive" or aria-live="polite" regions to all form error messages across registration, expense creation, and invoice forms
- Adding aria-label or role="img" with descriptive text to Chart.js canvas elements
- Adding aria-hidden="true" to decorative icons
- Auditing all form labels across the application for programmatic association
- Verifying that focus is managed correctly after route transitions


---


7. Accessibility Checklist

The following checklist reflects the WCAG 2.1 Level AA requirements most relevant to TaskFlow. Each item is marked based on the evidence available from source code inspection or lack thereof.

General structure:
- Page has a meaningful title element: To be verified
- Page uses a logical heading hierarchy (h1 through h6): To be verified
- Landmarks are present (main, nav, header, footer): To be verified
- Skip navigation link is provided: To be verified (not observed in source code review)

Images and icons:
- Informative images have descriptive alt text: Partially verified (13 occurrences found)
- Decorative images have empty alt attributes: To be verified
- Icon-only buttons have aria-label: Partially verified (login page buttons confirmed)
- SVG icons that are decorative have aria-hidden="true": To be verified
- Chart.js canvases have aria-label or data table alternatives: To be verified

Forms:
- All inputs are associated with label elements: Partially verified (login form confirmed)
- Required fields are indicated programmatically: To be verified
- Error messages are associated with their input via aria-describedby: To be verified
- Error messages are announced via aria-live regions: Partially verified (login errors confirmed)
- Form validation errors are clear and descriptive: To be verified
- Submit buttons have accessible names via visible text or aria-label: Partially verified

Navigation and focus:
- All interactive elements are keyboard accessible: To be verified (manual test required)
- Tab order is logical and follows visual reading order: Manual test required
- Focus is visible on all interactive elements: To be verified
- Focus is not suppressed globally via outline: none: To be verified
- No keyboard trap exists outside intentional modal focus management: Manual test required
- Modal dialogs trap focus while open: Manual test required
- Pressing Escape closes modal dialogs: Manual test required
- Focus returns to the triggering element after a modal closes: Manual test required

Color and contrast:
- Normal text contrast ratio meets 4.5:1: To be measured (run Lighthouse)
- Large text contrast ratio meets 3:1: To be measured
- Color is not the only means of conveying status information: To be verified (invoice/expense status badges)
- UI components and focus indicators have 3:1 contrast against adjacent colors: To be measured

Dynamic content and ARIA:
- Dynamic content updates are announced via aria-live: Partially verified (login errors confirmed)
- Chat messages in the real-time chat are announced: To be verified
- Loading states are communicated to assistive technologies: To be verified
- Custom interactive widgets (dropdowns, modals) use appropriate ARIA roles: To be verified

Responsive and text scaling:
- Content remains usable at 200% browser zoom: To be verified
- Layout does not require horizontal scrolling at 320px width: To be verified
- Text can be resized up to 200% without loss of content: To be verified


---


8. Final Accessibility Status

Achieved conformance level: Partial WCAG 2.1 Level A

At the time of this audit, the application demonstrates intentional accessibility implementation in its authentication components: form labels, aria-live regions, and aria-label attributes on icon-only buttons are present and verified in the login component. This provides a baseline that suggests the development team was aware of WCAG requirements.

However, full WCAG 2.1 Level AA conformance has not been verified across the entire application. The primary gaps are:

- No automated accessibility scan has been executed against a running instance
- Accessibility coverage beyond the authentication module has not been reviewed
- Color contrast ratios have not been measured
- Keyboard navigation has not been tested across all page types
- Chart.js visualizations have no accessible alternatives confirmed

Residual issues ranked by severity:

High priority:
- Color contrast ratios for muted text and label text (A-001)
- Chart.js accessibility for dashboard and ML pages (A-005)

Medium priority:
- Global focus style verification (A-002)
- Form label coverage across all forms (A-003)
- Table semantics in data list views (A-004)

Lower priority:
- Decorative icon aria-hidden attributes (A-006)

Recommendations:
- Integrate automated accessibility testing into the CI pipeline using axe-core via Cypress or Playwright before each deployment
- Execute a Lighthouse accessibility scan against all key routes and resolve issues rated critical or serious
- Conduct a manual keyboard navigation session covering at least the login, invoice creation, and dashboard routes
- Add a skip navigation link to the main layout component
- Review and document the heading hierarchy for each page


---


9. Conclusion

The TaskFlow application has a partially implemented accessibility foundation. The authentication module shows deliberate use of WCAG-aligned patterns including label elements, aria-live error regions, and aria-label on icon-only controls. These elements confirm that accessibility was considered during development of at least the most critical user-facing components.

The application cannot be declared conformant with WCAG 2.1 Level AA without completing automated scanning and manual keyboard testing across all routes. The issues identified and the procedures documented in this report provide a clear remediation path. Prioritizing color contrast verification, chart accessibility, and full-application keyboard testing would move the application significantly closer to full Level AA conformance.

For academic evaluation purposes, this report documents the current state transparently, distinguishing between what has been confirmed in the source code and what remains to be measured.
