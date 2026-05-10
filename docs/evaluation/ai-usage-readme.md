AI Usage Documentation
TaskFlow — Business Management Platform
PIDEV 4TWIN3 — Esprit School of Engineering — Academic Year 2025-2026

Document type: AI-Assisted Development Transparency Report
Prepared by: Nour Hasni, Ghassen Drira, Aziz Douagi, Med Karim Kebaili
Date: May 2026
Version: 1.0


---


1. Purpose

This document serves as a transparent account of how artificial intelligence tools were used during the development of the TaskFlow project. It is prepared in the interest of academic integrity, traceability, and honest evaluation of the development process.

AI assistance was used selectively and purposefully throughout the project. Its primary role was to accelerate certain development tasks, improve code quality, support debugging, and assist with documentation drafts. In all cases, AI-generated output was reviewed, adapted, and validated by team members before being integrated into the codebase or documentation.

The use of AI tools did not replace the engineering judgment, architectural decisions, or responsibility of the development team. All final decisions — including technology choices, data model design, security architecture, and module structure — were made by the team.

This document also describes the AI features that are embedded within the TaskFlow product itself, such as the expense classifier, the invoice payment delay predictor, the machine learning microservice, and the financial chatbot.


---


2. AI Tools Used During Development

Tool: GitHub Copilot
Model or agent: GitHub Copilot powered by integrated language models (OpenAI Codex and successors)
Usage context: Real-time code completion within VS Code during backend and frontend development. Copilot was used to accelerate the writing of repetitive structures such as NestJS controller methods, Prisma query patterns, Angular reactive form definitions, and TypeScript DTO declarations.
Human validation: All Copilot suggestions were reviewed before acceptance. Suggestions that did not match the project's naming conventions, multi-tenant header requirements, or RBAC patterns were rejected or significantly modified.

Tool: Claude (Anthropic)
Model: Claude 3 Sonnet and Claude 3.5 Sonnet (accessed via claude.ai and the GitHub Copilot Chat integration in VS Code using Claude Sonnet 4.6)
Usage context: Used for longer-form reasoning tasks including architecture review, debugging complex multi-service issues, analyzing Prisma schema relationships, reviewing security configurations, and generating comprehensive documentation drafts. Also used for reviewing and explaining error messages that were difficult to trace across microservice boundaries.
Human validation: All Claude outputs were read carefully. Code suggestions were not copy-pasted directly. The team adapted Claude's explanations to match the actual project structure and tested all code changes.

Tool: ChatGPT (OpenAI)
Model: GPT-4 and GPT-4o
Usage context: Used for researching best practices related to multi-tenant architecture, explaining JWT authentication edge cases, and generating draft text for project documentation. Also used to verify understanding of WCAG accessibility guidelines and to review Angular routing patterns.
Human validation: Documentation drafts were rewritten to match the actual project rather than being used verbatim. Code examples provided by ChatGPT were verified against the NestJS and Angular documentation before adoption.

Tool: Ollama with llama3 (local LLM)
Usage context: This tool is integrated directly into the TaskFlow product, not used as a development assistant. The llama3 model running via Ollama is invoked at runtime by the invoice service to generate natural language summaries of unpaid invoice reports, and by the financial chatbot to produce responses based on retrieved context.
Human validation: Not applicable for the product integration. The model behavior was tested during development to verify that it produced coherent output.

Tool: Cursor (AI-first code editor)
Usage context: Used by some team members as an alternative to VS Code with Copilot for AI-assisted code editing and refactoring sessions. Cursor provides inline diff editing based on natural language instructions.
Human validation: Same review process as for Copilot. All modifications were reviewed before being committed.


---


3. Tasks Supported by AI

Task category: Architecture validation
Description: The project uses a microservices architecture with eight NestJS services, an API Gateway, and two Python services. Decisions about service boundaries, inter-service communication patterns, and multi-tenant data isolation were validated using AI discussion tools.
AI contribution: Claude was used to review the proposed multi-tenant header propagation strategy (x-tenant-id, x-user-id, x-user-role) and to identify risks in the initial design where all headers depended on the frontend sending them explicitly. This review contributed to the decision to implement JWT-based header extraction in the API Gateway proxy controller.
Human review applied: The final implementation was written by the team. The AI review identified the risk but the solution was designed and coded by the engineers.

Task category: Debugging cross-service issues
Description: The application experienced a significant bug where invoice reports showed "Unknown client" for all clients. This was caused by the invoice service calling the business service's protected endpoint without a JWT token, resulting in 401 Unauthorized responses.
AI contribution: Claude helped trace the issue by analyzing the error flow across the proxy controller, the invoice service HTTP call, and the business service guard configuration. It suggested the pattern of creating internal unguarded routes for service-to-service communication.
Human review applied: The implementation of ClientsInternalController and the batch endpoint were written by the development team. The AI suggestion was a starting point, not the final solution. The team verified that the internal routes were not exposed through the API Gateway.

Task category: Code generation for repetitive patterns
Description: NestJS microservices follow a consistent pattern: module, controller, service, DTO files. Writing these structures from scratch for each of the eight services would have been highly repetitive.
AI contribution: GitHub Copilot and Claude generated initial scaffold code for new controllers and service methods following the established pattern. Expense service routes, notification service endpoints, and audit service methods were partially scaffolded with AI assistance.
Human review applied: All generated code was reviewed for correctness, naming convention compliance, proper use of Prisma client, and multi-tenant guard application.

Task category: Prisma schema design
Description: The data model for the application includes complex relationships (User to Role via UserTenantMembership, Invoice with soft delete, Expense with category and ownership).
AI contribution: ChatGPT was used to review draft Prisma schema definitions and suggest index placements for frequently queried fields such as tenantId, businessId, and deletedAt.
Human review applied: Final schema decisions were made by the team. Index suggestions were evaluated against the actual query patterns in the service code.

Task category: Security review
Description: The application handles JWT authentication, 2FA, bcrypt hashing, RBAC, and multi-tenant data isolation.
AI contribution: Claude reviewed the JWT extraction logic in the proxy controller and identified that the authorization header was being duplicated before the fix that ensured only a single Authorization header was forwarded to downstream services. It also flagged the risk of the default "change-me" JWT secret value.
Human review applied: All security-related code was written and verified by the team. AI suggestions were treated as advisory, not authoritative.

Task category: Unit test suggestions
Description: NestJS services include test specification files generated by the NestJS CLI.
AI contribution: GitHub Copilot suggested test case structures for service methods and controller endpoints. These suggestions served as a starting point for unit test development.
Human review applied: Tests were adapted to match the actual service behavior and the team's understanding of the expected outcomes.

Task category: Documentation generation
Description: Project documentation including this document, the performance report, the accessibility audit, and the deployment report.
AI contribution: Claude was used to generate structured documentation drafts based on the actual project structure, source code analysis, and inspection of configuration files.
Human review applied: All documentation was reviewed by the team for accuracy. Claims not verified against the codebase were marked as "To be verified" or "Pending measurement". No metric was fabricated.

Task category: Accessibility review
Description: WCAG compliance assessment of the Angular frontend.
AI contribution: Claude was used to identify which WCAG criteria were most relevant to the application's component types (forms, charts, chat, tables) and to generate the audit structure.
Human review applied: Specific findings were verified against the actual TypeScript source files. Only issues supported by source code evidence were reported as confirmed.

Task category: Performance analysis
Description: Identifying optimization opportunities in the Angular routing configuration and the NestJS backend.
AI contribution: Claude helped identify the N+1 HTTP request pattern in the invoice report generation and suggested the batch resolution approach.
Human review applied: The optimization was implemented by the development team, tested against the real database, and verified to produce correct results.

Task category: Refactoring assistance
Description: Refactoring the proxy controller to handle multi-tenant header extraction from JWT, and consolidating duplicate service call patterns.
AI contribution: GitHub Copilot provided inline suggestions during refactoring sessions. Claude provided guidance on the correct approach for base64url JWT payload decoding in Node.js.
Human review applied: All refactored code was reviewed, tested with authentication flows, and committed only after verifying it did not break existing functionality.


---


4. Prompt Examples

The following examples represent the type of prompts used during the project. They are representative rather than verbatim transcripts.

Debugging prompt example:
"In my NestJS invoice service, when generating an unpaid invoice report, the client name resolution always returns null even though the clients exist in the database. The invoice service calls GET /clients/:id on the business service, which returns 401 Unauthorized. Both services are running. The business service route requires a JWT guard. How should I redesign this to allow the invoice service to call the business service without a token?"

Performance audit prompt example:
"I have an Angular 21 application with 45 standalone components. All routes use loadComponent() with dynamic imports. The angular.json production configuration enables script and style optimization and output hashing. What are the remaining performance optimizations I should consider for the initial bundle size and Core Web Vitals?"

Accessibility prompt example:
"I have an Angular login component with inline template. There is a label above the email input but it is not associated with the input using for/id. The password visibility toggle button uses aria-label. There is an error message div with aria-live='polite'. What WCAG 2.1 Level AA criteria does this implementation satisfy, and what is still missing?"

Deployment prompt example:
"My docker-compose.yml has JWT_SECRET set to 'change-me'. My NestJS services have CORS configured to allow only http://localhost:4200. I do not have a reverse proxy. What are the critical security and configuration changes required before a production deployment?"

Documentation prompt example:
"Analyze this NestJS proxy controller code and describe in plain English how it propagates multi-tenant headers from the JWT payload when client headers are missing. Write this for an engineering evaluation document."

Code review prompt example:
"Review this Prisma schema. The Role model has two unique constraints: [name, tenantId] and [name, company_id]. The model also has indexes on tenantId and company_id. Is this correct for a multi-tenant application where tenantId and company_id are semantically the same field? What are the risks?"

Test generation prompt example:
"Generate a unit test for this NestJS invoice service method that calls an internal HTTP endpoint on the business service. The test should mock the HTTP call, verify that the method handles a 404 response gracefully, and verify that the returned invoice object has clientName set to an empty string when the client is not found."


---


5. Human Oversight and Validation

The use of AI tools in this project was governed by a consistent review process applied by all team members. The following principles were followed throughout development:

All AI-generated code was reviewed line by line before integration. No code block was committed to the repository without at least one team member reading and understanding it. Code that was not understood was either explained by another team member, rewritten manually, or discarded.

AI suggestions were adapted to the actual project context. Generic code patterns suggested by AI tools were modified to conform to the project's naming conventions, the multi-tenant header requirements, the Prisma schema structure, and the NestJS module organization documented in CLAUDE.md.

Tests were executed when possible. Changes to backend service logic, especially in the invoice and authentication flows, were tested against the running application before being considered complete.

Final decisions remained with the team. The architecture decisions — choosing NestJS over Express, choosing Prisma over TypeORM, the multi-tenant header strategy, the decision to use internal /internal/ routes for cross-service communication — were made by the engineering team based on their understanding of the requirements. AI tools provided input and options but did not determine outcomes.

AI assistance did not extend to the protected chatbot-finance module. The chatbot's RAG pipeline, data preparation scripts, and embedding pipeline were implemented by the team member responsible for that component and were not subjected to AI refactoring.

Documentation generated with AI assistance was reviewed for factual accuracy. Any measurement not confirmed by executing a command against the actual application was explicitly marked as "To be measured" or "To be verified". No performance numbers, accessibility scores, or deployment metrics were fabricated.


---


6. Limitations of AI Assistance

The team encountered the following limitations when using AI tools during the project:

Hallucination risk in code generation: AI language models occasionally generate code that appears syntactically correct but is semantically wrong for the specific context. Two notable cases occurred: a Prisma query suggestion that used an incorrect field name that matched a similarly named field in a different service's schema, and a NestJS decorator combination that would have bypassed a required guard. Both were caught during review.

Command verification requirement: Several commands suggested by AI tools were correct in principle but required adaptation to the specific project structure. Package names, file paths, and environment variable names in AI suggestions were always verified against the actual project before being used.

Security review is not sufficient from AI alone: AI tools identified the JWT_SECRET default value risk and the CORS localhost restriction, but they could not perform a comprehensive security audit. A thorough manual security review or a dedicated penetration test would be required before production deployment.

AI tools do not understand the full project context: When asking questions about specific bugs, the full context (service code, Prisma schema, environment variables, request headers) had to be provided explicitly. Without this context, AI suggestions were often too generic.

Generated documentation requires project-specific adaptation: First-draft documentation produced by AI tools used generic descriptions that did not match the actual component names, port numbers, or service responsibilities. Significant rewriting was required to make the documentation accurate.

Risk of over-reliance: There is a risk that relying heavily on AI code completion reduces the team's deep understanding of the code being produced. The team mitigated this by requiring each team member to be able to explain any AI-assisted code they committed before it was accepted for integration.


---


7. Ethical and Academic Transparency

This document is provided as part of the academic evaluation submission for the PIDEV 4th year engineering project at Esprit School of Engineering, Tunisia, academic year 2025-2026.

The team declares that:

AI tools were used as productivity and quality assistance tools, not as a replacement for engineering work. The intellectual contributions of the team — the architecture design, the multi-tenant data model, the RBAC implementation, the machine learning pipeline, the RAG chatbot, and the integration strategy — represent genuine engineering effort.

The use of AI tools is disclosed openly and completely in this document. All instances of AI assistance identified by the team are documented here. There are no undisclosed uses of AI-generated code or text in this submission.

All AI-generated content that was incorporated into the project was reviewed, validated, and adapted by human team members. The team takes full responsibility for all code and documentation submitted as part of this project evaluation.

Academic integrity: The team acknowledges that the use of AI assistance in academic projects must be transparent and must not misrepresent the level of individual effort. This document fulfills that transparency requirement. The evaluation committee is invited to ask any team member to explain any part of the codebase, and the team is confident in its ability to do so.


---


8. Conclusion

The use of AI assistance during the TaskFlow project was deliberate, bounded, and transparent. GitHub Copilot provided day-to-day coding velocity, Claude contributed to architectural reasoning and documentation quality, and ChatGPT supported research and best-practice verification. These tools accelerated several development phases without substituting for the core engineering work of the team.

The most significant AI contribution to the project's technical quality was in debugging the cross-service client resolution issue, which would have been difficult to trace without the ability to discuss the multi-service request flow in natural language and receive structured analysis. The resulting solution — internal unguarded routes for service-to-service communication — is a sound architectural pattern that improves both reliability and performance.

The team approached AI assistance with the discipline required for professional software engineering: reviewing all suggestions, testing all changes, and retaining full ownership of the technical decisions. This approach ensured that AI tools enhanced the quality of the project without creating a dependency that would compromise the team's ability to maintain, extend, or explain the codebase.

This document is provided not only for evaluation purposes but as a model of the kind of honest, structured AI usage disclosure that the engineering profession will increasingly need to adopt as these tools become standard components of the development workflow.
