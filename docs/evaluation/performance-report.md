Performance Report
TaskFlow — Business Management Platform
PIDEV 4TWIN3 — Esprit School of Engineering — Academic Year 2025-2026

Document type: Engineering Performance Evaluation
Prepared by: Nour Hasni, Ghassen Drira, Aziz Douagi, Med Karim Kebaili
Date: May 2026
Version: 1.0


---


1. Executive Summary

This document constitutes the formal performance evaluation report for the TaskFlow web application, developed as part of the PIDEV engineering project at Esprit School of Engineering (Tunis, 2025-2026). Its objective is to provide a structured and honest account of the performance characteristics of the application, covering the frontend user experience, backend API response behavior, and infrastructure efficiency.

The evaluation scope encompasses the Angular 21 frontend application served at port 4200, the NestJS API Gateway at port 3000, and the eight backend microservices operating on ports 3001 through 3008. The Python-based machine learning service running at port 8000 and the financial chatbot at port 8001 are referenced but benchmarked separately due to their distinct runtime environment.

The test environment for which this report was prepared is the local development setup running on macOS, with Docker-managed PostgreSQL 15 and Redis 7. No cloud-hosted production deployment was active at the time of writing. Performance metrics that require a running instance and have not been collected due to environment constraints are clearly documented with the exact commands needed to retrieve them.

Confirmed optimizations applied to the codebase include full route-level lazy loading across all Angular components, production build optimization with script and style minification enabled, output filename hashing for cache busting, and response time improvements through internal batch API calls between microservices. These items are verified directly in the source code and configuration files.

Core Web Vitals, Lighthouse scores, and API benchmark results remain pending measurement and are marked accordingly throughout this document.


---


2. Application Overview

TaskFlow is a full-stack SaaS web application designed to help Tunisian small and medium-sized enterprises manage invoices, expenses, clients, and team operations. It operates as a multi-tenant platform where each business maintains isolated data.

2.1 Detected Architecture

The application follows a microservices architecture composed of a single API Gateway acting as the unified entry point, behind which eight specialized NestJS services handle distinct business domains. The frontend is a standalone Angular 21 application communicating exclusively with the API Gateway over HTTP.

Frontend technologies:
- Framework: Angular 21 with standalone components (no NgModules)
- Language: TypeScript
- Styling: TailwindCSS with global SCSS
- Routing: Angular Router with lazy component loading
- HTTP: Angular HttpClient via a centralized ApiService
- Real-time communication: Socket.io-client for team chat
- PDF generation: jsPDF with html2canvas

Backend technologies:
- Framework: NestJS (Node.js 20)
- Language: TypeScript
- Architecture: Microservices pattern with HTTP proxy routing
- Authentication: JWT (passport-jwt), bcrypt, TOTP-based 2FA
- ORM: Prisma (per-service schema isolation)
- Real-time: Socket.io (notification-service)
- Queue processing: Bull queues backed by Redis 7
- API Gateway: NestJS proxy controller with JWT extraction and header propagation

Database:
- PostgreSQL 15 running in Docker (port 5432)
- Seven isolated databases, one per backend service
- Soft delete enforced on all entities (deletedAt field)
- Redis 7 (port 6379) for Bull job queues in the invoice service

Machine learning services:
- Python FastAPI ml-service on port 8000: scikit-learn models for client segmentation, cashflow prediction, anomaly detection, and fraud scoring
- Python FastAPI chatbot-finance on port 8001: RAG-based financial assistant using Qdrant Cloud, SentenceTransformers, and Ollama (llama3)
- Embedded AI module within the API Gateway: Naive Bayes text classifier for expense categorization and a Random Forest model for invoice payment delay prediction

2.2 Critical Performance Points

The following areas present the most significant performance considerations for this architecture:

- Initial bundle size: The Angular application uses inline TypeScript templates for all 45 components rather than separate HTML files. While this consolidates component logic, it increases the size of individual TypeScript compilation units.

- Service startup chain: The Docker Compose configuration defines service dependencies that require auth-service, tenant-service, business-service, notification-service, invoice-service, and expense-service to all be in a started state before the API Gateway becomes available. Cold start time for the full stack can be substantial.

- Cross-service API calls: The invoice service performs HTTP calls to the business service to resolve client names. A batch internal endpoint was implemented to replace per-invoice individual lookups, reducing N+1 HTTP requests in the unpaid invoice report generation.

- JWT parsing at the gateway: The proxy controller decodes JWT tokens on every proxied request to extract tenant, user, and role headers. This is executed in JavaScript without a dedicated cache, adding a small but consistent overhead per request.

- Machine learning inference latency: The scikit-learn models loaded in the Python FastAPI service are loaded from serialized pickle files. Cold inference latency after service startup may be elevated.


---


3. Initial Performance State

The initial performance state reflects the application before the optimizations described in section 7 were applied. Because no Lighthouse run or network analysis was performed against a live instance prior to these modifications, initial values are documented as pending measurement. This is an honest representation of the evaluation process.

Metric: Page load time (full interactive)
Initial value: To be measured
Measurement tool: Chrome DevTools, Lighthouse
Status: Pending measurement
Notes: Run Lighthouse against http://localhost:4200 while the application is running locally.

Metric: First Contentful Paint
Initial value: To be measured
Measurement tool: Lighthouse
Status: Pending measurement
Notes: Command: npx lighthouse http://localhost:4200 --only-categories=performance --output=json --output-path=./lighthouse-report.json

Metric: Largest Contentful Paint
Initial value: To be measured
Measurement tool: Lighthouse
Status: Pending measurement
Notes: Measures when the largest visible content element in the viewport is rendered.

Metric: Total Blocking Time
Initial value: To be measured
Measurement tool: Lighthouse
Status: Pending measurement
Notes: Reflects the total time during which the main thread was blocked from responding to user input.

Metric: Cumulative Layout Shift
Initial value: To be measured
Measurement tool: Lighthouse
Status: Pending measurement
Notes: Measures unexpected layout shifts during page load. Inline templates and TailwindCSS utility classes reduce the risk of layout instability from external stylesheet loading.

Metric: Speed Index
Initial value: To be measured
Measurement tool: Lighthouse
Status: Pending measurement

Metric: Time to Interactive
Initial value: To be measured
Measurement tool: Lighthouse
Status: Pending measurement

Metric: Frontend production bundle size
Initial value: To be measured
Measurement tool: Angular CLI build output
Status: Pending measurement
Notes: Run cd frontend/taskflow-web && npm run build to obtain exact sizes.
The angular.json budget sets a maximum warning threshold at 500 kilobytes and a maximum error threshold at 1 megabyte for the initial bundle. Any component stylesheet exceeding 4 kilobytes will trigger a warning.

Metric: Number of HTTP requests on initial load
Initial value: To be measured
Measurement tool: Chrome DevTools Network tab
Status: Pending measurement

Metric: API Gateway average response time (authenticated request)
Initial value: To be measured
Measurement tool: curl, autocannon, or k6
Status: Pending measurement


---


4. Tools and Methodology

4.1 Recommended Performance Measurement Tools

The following tools are recommended or used for measuring and analyzing the performance of TaskFlow. Commands are adapted to the actual project structure.

Frontend performance:

Tool: Lighthouse (CLI)
Purpose: Automated performance, accessibility, and best practices auditing
Commands:
  npx lighthouse http://localhost:4200 --view
  npx lighthouse http://localhost:4200 --only-categories=performance --output=json --output-path=./docs/evaluation/lighthouse-result.json
  npx lighthouse http://localhost:4200/dashboard --output=html --output-path=./docs/evaluation/dashboard-lighthouse.html

Tool: Unlighthouse
Purpose: Site-wide automated Lighthouse scanning across all routes
Command:
  npx unlighthouse --site http://localhost:4200

Tool: Chrome DevTools Performance and Network panels
Purpose: Real-time flame graph analysis, network waterfall, bundle analysis
Procedure: Open DevTools, navigate to Performance tab, start recording, load the page, stop recording, analyze results.

Tool: Angular Build Analyzer
Purpose: Visualize bundle composition
Command:
  cd frontend/taskflow-web && npm run build -- --stats-json
  npx webpack-bundle-analyzer dist/taskflow-web/browser/stats.json

Backend and API performance:

Tool: autocannon
Purpose: HTTP load testing against backend endpoints
Commands:
  npx autocannon -d 30 -c 50 http://localhost:3000/invoices
  npx autocannon -d 30 -c 100 http://localhost:3000/auth/signin -m POST -H "Content-Type: application/json" -b '{"email":"admin@taskflow.local","password":"Admin1234!"}'

Tool: k6
Purpose: Scripted HTTP load testing with detailed scenario control
Command:
  k6 run ./k6-load-test.js

Tool: curl with timing format
Purpose: Quick latency measurement for individual API endpoints
Command:
  curl -o /dev/null -s -w "HTTP Status: %{http_code}\nTime to first byte: %{time_starttransfer}s\nTotal time: %{time_total}s\n" -H "Authorization: Bearer <TOKEN>" http://localhost:3000/invoices

Tool: Apache Bench
Purpose: Concurrent request load testing
Command:
  ab -n 1000 -c 50 -H "Authorization: Bearer <TOKEN>" http://localhost:3000/invoices

4.2 Frontend Build Commands

  cd frontend/taskflow-web
  npm install
  npm run build
  npm run lint
  npm test

4.3 Backend Build and Health Check

  cd backend/api-gateway && npm run build
  curl http://localhost:3000/
  curl http://localhost:3001/
  curl http://localhost:3005/

4.4 Docker Compose Configuration Validation

  docker compose config
  docker compose ps
  docker compose logs -f api-gateway


---


5. Core Web Vitals

Core Web Vitals are the subset of Google's Web Vitals metrics that are considered most important for user experience. All values below require measurement against a running application instance.

Metric: LCP (Largest Contentful Paint)
Recommended threshold: under 2.5 seconds (Good), 2.5 to 4.0 seconds (Needs Improvement), above 4.0 seconds (Poor)
Measured value: To be measured
Status: Pending measurement
Interpretation: LCP is primarily affected by the time needed to load the dominant visual element on the page. In TaskFlow, this is likely the main dashboard chart area or the invoice list container. Lazy loading of route components may delay LCP if the dashboard component is deferred.

Metric: INP (Interaction to Next Paint)
Recommended threshold: under 200 milliseconds (Good), 200 to 500 milliseconds (Needs Improvement), above 500 milliseconds (Poor)
Measured value: To be measured
Status: Pending measurement
Interpretation: INP replaces FID in modern Lighthouse versions. In Angular applications with reactive forms and real-time data updates (such as the chat module), high INP values can indicate main thread saturation.

Metric: CLS (Cumulative Layout Shift)
Recommended threshold: under 0.1 (Good), 0.1 to 0.25 (Needs Improvement), above 0.25 (Poor)
Measured value: To be measured
Status: Pending measurement
Interpretation: TaskFlow uses TailwindCSS utility classes applied at render time. Layout shifts are less likely than with asynchronously loaded external stylesheets. The risk area is chart rendering via Chart.js, which may cause layout recalculation on data arrival.

Metric: FCP (First Contentful Paint)
Recommended threshold: under 1.8 seconds (Good), 1.8 to 3.0 seconds (Needs Improvement)
Measured value: To be measured
Status: Pending measurement
Interpretation: FCP measures when the browser first renders any DOM content. In Angular 21 with standalone components and a single main.ts entry point, the first paint depends on the time required to parse and execute the main JavaScript bundle.

Metric: TTFB (Time to First Byte)
Recommended threshold: under 800 milliseconds (Good)
Measured value: To be measured
Status: Pending measurement
Interpretation: TTFB for the frontend reflects the time for the local Angular dev server or production server to respond. For API calls through the gateway, TTFB includes gateway processing and downstream service latency.

Collection command for all Core Web Vitals:
  npx lighthouse http://localhost:4200 --only-categories=performance --output=json --output-path=./docs/evaluation/cwv-report.json


---


6. API Response Benchmarks

The following endpoints were identified by inspecting the controllers across all backend microservices. Measurements are pending execution of load tests against a running backend instance. For each endpoint, the HTTP method, expected tenant isolation requirements, and suggested test command are documented.

Endpoint: POST /auth/signin
Method: POST
Service: auth-service (port 3001)
Authentication required: No
Average response time: Pending measurement
P95: Pending measurement
P99: Pending measurement
Error rate: Pending measurement
Notes: Run npx autocannon -d 20 -c 20 -m POST -H "Content-Type: application/json" -b '{"email":"admin@taskflow.local","password":"Admin1234!"}' http://localhost:3000/auth/signin

Endpoint: GET /invoices
Method: GET
Service: invoice-service (port 3005) via gateway (port 3000)
Authentication required: Yes (Bearer token + x-tenant-id header)
Average response time: Pending measurement
P95: Pending measurement
P99: Pending measurement
Error rate: Pending measurement
Notes: This endpoint triggers a database query filtered by businessId. It has historically had N+1 issues when enriching with client names; these were addressed through a batch internal endpoint.

Endpoint: POST /invoices/report/unpaid
Method: POST
Service: invoice-service (port 3005)
Authentication required: Yes
Average response time: Pending measurement
P95: Pending measurement
Notes: This endpoint triggers AI report generation via Ollama. Response time is expected to be significantly higher than standard endpoints. Recommend measuring separately with a longer timeout.

Endpoint: GET /expenses
Method: GET
Service: expense-service (port 3006) via gateway
Authentication required: Yes
Average response time: Pending measurement
P95: Pending measurement
Notes: Standard paginated listing endpoint. Run curl with timing headers to estimate.

Endpoint: GET /clients
Method: GET
Service: business-service (port 3003) via gateway
Authentication required: Yes
Average response time: Pending measurement
Notes: Returns the full client list for the authenticated business. For tenants with large client counts (3,015 total clients in production seed data), pagination and indexing are critical.

Endpoint: POST /ai/expense-classifier/predict
Method: POST
Service: api-gateway (port 3000) — embedded Naive Bayes classifier
Authentication required: No
Average response time: Pending measurement
Notes: This endpoint runs entirely within the API Gateway process. Response time should be very low (sub-millisecond for inference). Run npx autocannon -d 10 -c 50 -m POST -H "Content-Type: application/json" -b '{"text":"hotel accommodation business travel"}' http://localhost:3000/ai/expense-classifier/predict

Endpoint: POST /ai/invoice-delay/predict
Method: POST
Service: api-gateway (port 3000) — embedded Random Forest model
Authentication required: No
Average response time: Pending measurement
Notes: Random Forest inference is more compute-intensive than Naive Bayes. Measure separately.

Endpoint: GET /ml/segmentation
Method: GET
Service: ml-service (port 8000), Python FastAPI
Authentication required: No (direct access)
Average response time: Pending measurement
Notes: scikit-learn inference with database query. Run uvicorn main:app --port 8000 then curl -s -w "\nTime: %{time_total}s\n" http://localhost:8000/segmentation


---


7. Optimizations Applied

The following optimizations were identified as implemented in the codebase through direct source code inspection. Evidence is based on file content, not on measured performance deltas.

Optimization: Route-level lazy loading for all Angular components
Area: Frontend routing
Before: Not applicable (project started with lazy loading as the default pattern)
After: All 45+ components use loadComponent() with dynamic import() in app.routes.ts
Impact: Reduces the initial JavaScript bundle to only the code required for the landing page and the router itself
Evidence: Verified in frontend/taskflow-web/src/app/app.routes.ts — every route definition uses loadComponent() or loadChildren() with an async import

Optimization: Production build script and style optimization
Area: Frontend build configuration
Before: Development mode builds include source maps and unminified output
After: Production configuration in angular.json sets optimization.scripts to true and optimization.styles to true
Impact: Minified JavaScript and CSS output, reduced download size
Evidence: Verified in frontend/taskflow-web/angular.json under configurations.production

Optimization: Output filename hashing
Area: Frontend caching
Before: Static filenames for bundles prevent efficient browser caching
After: angular.json production configuration sets outputHashing to "all"
Impact: Long-lived cache headers can be set on production assets without cache invalidation risk on deployments
Evidence: Verified in frontend/taskflow-web/angular.json

Optimization: Bundle size budget enforcement
Area: Frontend build validation
Before: No automatic size enforcement
After: angular.json enforces a 500kB warning and 1MB error threshold for the initial bundle, and a 4kB warning threshold per component stylesheet
Impact: Prevents bundle size regressions from being merged silently
Evidence: Verified in frontend/taskflow-web/angular.json under configurations.production.budgets

Optimization: Batch cross-service client resolution
Area: Backend — invoice service
Before: The unpaid invoice report resolved client names one by one via individual HTTP calls to the business service, each requiring a separate round trip — an N+1 request pattern
After: The invoice service calls GET /clients/internal-by-business/:businessId once per report, loading all client records in a single batch and building an in-memory map for name resolution
Impact: Reduces HTTP overhead from O(n) to O(1) per report generation where n is the number of unique clients in the report
Evidence: Verified in backend/invoice-service/src/invoices/invoices.service.ts, methods fetchClientsByBusiness and generateUnpaidReport

Optimization: Internal cross-service routes without JWT
Area: Backend — service-to-service communication
Before: Service-to-service calls passed through the API Gateway and required JWT authentication, causing unnecessary token validation overhead and 401 errors when no token was available
After: Dedicated /internal/ routes declared in ClientsInternalController (without security guards) allow microservices to communicate directly without passing through the gateway
Impact: Eliminates authentication overhead for internal calls and removes failure modes caused by missing tokens in service-to-service HTTP requests
Evidence: Verified in backend/business-service/src/clients/clients-internal.controller.ts

Optimization: Redis-backed job queue for invoice processing
Area: Backend — invoice service
Before: Not applicable (Bull queue was designed in from the outset)
After: Redis 7 is declared in docker-compose.yml and integrated with Bull queues in the invoice service for background job processing
Impact: Long-running operations such as PDF generation and email dispatch are offloaded from the HTTP request cycle, improving API response times
Evidence: Verified in docker-compose.yml Redis service definition and invoice-service package.json

Optimization: JWT header extraction at the API Gateway
Area: Backend — gateway
Before: Each downstream service was expected to receive tenant and user headers explicitly from the client
After: The proxy controller in api-gateway extracts tenantId, userId, and userRole from the JWT payload if the headers are not already present, and propagates them to downstream services
Impact: Reduces the number of headers the frontend must manage explicitly and provides a consistent security boundary at the gateway
Evidence: Verified in backend/api-gateway/src/proxy.controller.ts

Optimization: Angular standalone components (no NgModule)
Area: Frontend architecture
Before: Traditional Angular module-based architecture introduces extra bundle weight from module glue code
After: All components use the standalone: true flag, eliminating NgModule overhead
Impact: Smaller per-component compilation output, more precise tree-shaking
Evidence: Verified across all component files in frontend/taskflow-web/src/app/features/


---


8. Final Performance State

Because initial measurements were not collected before optimizations were applied, a direct before-after comparison based on numerical values is not available for this iteration. The following reflects the verified final state of the application at submission time, with optimization status for each dimension.

Metric: Frontend initial bundle size
Before optimization: Not measured
After optimization: To be measured after running npm run build
Improvement: Budget enforced at 500kB warning / 1MB error
Status: Pending final measurement

Metric: Route loading strategy
Before optimization: Not applicable
After optimization: 100% of routes use lazy loading (verified in source code)
Improvement: Initial bundle contains only the router bootstrap and core interceptors
Status: Verified

Metric: Cross-service client resolution in report generation
Before optimization: N individual HTTP calls per report
After optimization: One batch HTTP call per report
Improvement: HTTP round-trip count reduced from O(n) to O(1) per report
Status: Verified

Metric: API Gateway authentication overhead for internal calls
Before optimization: Full JWT validation path for all requests including internal service calls
After optimization: Internal /internal/ routes bypass JWT validation entirely
Status: Verified

Metric: LCP
Before optimization: Not measured
After optimization: To be measured
Status: Pending

Metric: CLS
Before optimization: Not measured
After optimization: To be measured
Status: Pending

Metric: Core Web Vitals (composite)
Before optimization: Not measured
After optimization: To be measured with Lighthouse
Status: Pending


---


9. Remaining Risks and Recommendations

9.1 Points to Monitor

JWT decoding on every proxied request: The API Gateway decodes the JWT payload on every request to extract multi-tenant headers. While this is lightweight, it adds a consistent overhead per request. Caching decoded claims with a short TTL in an in-process LRU cache would eliminate this cost.

Cold start latency for Python services: Both the ml-service and the chatbot-finance service load scikit-learn models and SentenceTransformer embeddings on startup. On resource-constrained environments, the first inference request after startup may take several seconds. Implementing a warm-up endpoint called during container health checks would address this.

Absence of rate limiting on the API Gateway: No rate limiting middleware was detected in the API Gateway codebase. For a production deployment, tools such as nestjs-rate-limiter or a reverse proxy with rate limiting (nginx, Kong) should be configured.

Absence of response compression: The NestJS services do not appear to configure Gzip or Brotli compression middleware. Enabling compression with the compression npm package would reduce response payload sizes for large API responses (invoice lists, client lists).

No HTTP/2: The current setup exposes NestJS services directly over HTTP/1.1. A reverse proxy (nginx) configured with HTTP/2 and TLS would improve multiplexed request handling.

Database query indexing: Prisma schema files define indexes on tenantId and company_id for the Role model. Other frequently filtered fields (businessId, deletedAt) should be reviewed across all schemas to ensure adequate indexing is in place.

9.2 Recommended Monitoring Stack

For a production deployment of TaskFlow, the following monitoring components are recommended:

Application metrics: Prometheus with a NestJS Prometheus exporter (nestjs-prometheus or prom-client) to expose /metrics endpoints on each service. A Grafana dashboard aggregating metrics from all eight services would provide operational visibility.

Error tracking: Sentry (or a self-hosted equivalent) integrated into both the Angular frontend and each NestJS service. Sentry captures uncaught exceptions, promise rejections, and HTTP errors with full stack traces.

Distributed tracing: OpenTelemetry with a Jaeger or Zipkin backend to trace requests from the API Gateway through each microservice hop. This is particularly valuable for diagnosing latency in multi-service operations such as the unpaid invoice report.

Uptime monitoring: An external health check tool (UptimeRobot, Better Uptime, or a simple cron job against the health endpoints) to alert on service unavailability.

Log aggregation: ELK stack (Elasticsearch, Logstash, Kibana) or Loki with Grafana to centralize logs from all services. Currently, logs are written to individual files in the runtime-logs/ directory.


---


10. Conclusion

The TaskFlow application demonstrates a mature performance foundation for an academic SaaS project. The decision to adopt lazy loading across all routes from the outset eliminates one of the most common Angular performance regressions. The production build configuration with minification and output hashing is correctly set up and ready for deployment. The resolution of the N+1 client lookup issue in the invoice report service is a concrete and verified backend optimization.

The remaining gaps are primarily in measurement rather than implementation. Core Web Vitals, Lighthouse scores, and API benchmark numbers have not been collected due to the absence of a continuously available deployment environment at the time of writing. The commands and procedures documented in this report provide a complete path to closing those gaps once a running instance is available.

The monitoring recommendations, particularly around rate limiting, response compression, and distributed tracing, represent the next phase of maturity for the application as it moves toward a production-grade deployment.
