Deployment Report
TaskFlow — Business Management Platform
PIDEV 4TWIN3 — Esprit School of Engineering — Academic Year 2025-2026

Document type: Engineering Deployment Evaluation
Prepared by: Nour Hasni, Ghassen Drira, Aziz Douagi, Med Karim Kebaili
Date: May 2026
Version: 1.0


---


1. Executive Summary

This document describes the deployment architecture, configuration, and procedures for the TaskFlow web application. It covers both the local development setup and the production-readiness assessment of the application infrastructure.

Production URL: Not yet deployed to a public environment. The application runs locally at http://localhost:4200 (frontend) and http://localhost:3000 (API Gateway).

Deployment status: Operational in local development. Production deployment is not active at the time of writing. The infrastructure required for production (Docker Compose, environment variable management, service orchestration) is in place and has been validated locally.

Date of last verified local deployment: May 2026

Environment used: macOS development environment with Docker Desktop, Node.js 20, Python 3, and PostgreSQL 15 managed through Docker.

Stability summary: The local stack is stable when all eight microservices, PostgreSQL, and Redis are running. A startup script (start-all.sh) automates the full initialization sequence including database creation, Prisma schema push, dependency installation, and service launch. The CI/CD infrastructure includes a Jenkins server and SonarQube instance, configured in a dedicated docker-compose.jenkins.yml file.


---


2. Production URL

Production URL: Not deployed at the time of this report.

Local frontend URL: http://localhost:4200
Local API Gateway URL: http://localhost:3000
PgAdmin URL: http://localhost:5050
Jenkins URL (when running): http://localhost:8080
SonarQube URL (when running): http://localhost:9000
Chatbot RAG URL: http://localhost:8001
ML Service URL: http://localhost:8000

No public domain, reverse proxy, or cloud hosting configuration was detected in the project files. A production deployment would require configuring a reverse proxy (such as nginx), HTTPS termination, and updated CORS origins in each NestJS service's main.ts bootstrap file.

The GitHub repository was referenced in the README as https://github.com/ghassendrira/Pi-project.


---


3. Deployment Architecture

3.1 Frontend Hosting

The frontend is an Angular 21 single-page application built with the @angular/build:application builder. In development, it is served by the Angular CLI development server on port 4200. For production deployment, it would be built with npm run build to generate static assets in the dist/taskflow-web/browser/ directory, which can then be served by any static file server or CDN.

No dedicated frontend hosting provider is configured. For a production deployment, the recommended approach would be to serve the built static assets from an nginx container or a platform such as Netlify, Vercel, or an Azure Static Web App.

3.2 Backend Hosting

Each of the eight NestJS microservices runs as an independent Node.js process. In Docker Compose mode, each service uses the node:20-alpine base image with the application source mounted as a volume. Services are started in development mode (npm run start:dev) within the Docker Compose configuration.

For production, each service would need to be built with npm run build and started with npm run start:prod. Dedicated Dockerfiles exist for each service (verified: Dockerfile present in api-gateway/, auth-service/, business-service/, expense-service/, invoice-service/, audit-service/).

3.3 Database Hosting

PostgreSQL 15 runs in a Docker container (taskflow-postgres) on port 5432. Seven isolated databases are used — one per microservice. Data persists across container restarts through a named Docker volume (postgres-data).

Redis 7 runs in a Docker container (taskflow-redis) on port 6379. It is used as the backing store for Bull job queues in the invoice service. Data persists through a named volume.

3.4 CI/CD Infrastructure

A separate Docker Compose file (docker-compose.jenkins.yml) configures a Jenkins LTS instance on port 8080 and a SonarQube Community instance on port 9000. Jenkins has access to the Docker socket, enabling it to build and manage containers.

SonarQube is configured via sonar-project.properties with the project key taskflow, scanning the backend directory and excluding node_modules, dist folders, and test specification files.

This CI/CD stack is configured but no active Jenkins pipeline file (Jenkinsfile) was detected in the project repository. The SonarQube token is stored in sonar-project.properties.

3.5 API Gateway

The API Gateway (port 3000) acts as the single entry point for all frontend requests. It proxies requests to the appropriate downstream microservice based on the URL path. It also performs JWT decoding to extract and propagate multi-tenant headers (x-tenant-id, x-user-id, x-user-role).

3.6 Machine Learning Services

The ml-service (Python FastAPI, port 8000) runs separately from the Docker Compose stack. It is started via the start-all.sh script using uvicorn. It has its own Dockerfile in backend/ml-service/ but is not included in the main docker-compose.yml.

The chatbot-finance service (Python FastAPI, port 8001) is also started via start-all.sh. It connects to a remote Qdrant Cloud vector database and a local Ollama LLM server.

3.7 External Services

Qdrant Cloud: Vector database hosted on AWS (sa-east-1 region), used by the financial chatbot. Connection requires a Qdrant API key.
Ollama: Local LLM server running llama3 model, required for the chatbot and for invoice report generation. Must be installed and running separately.

3.8 Reverse Proxy

No reverse proxy (nginx, Traefik, Caddy) is configured at this time. In a production deployment, a reverse proxy would be required to:
- Terminate TLS and serve HTTPS
- Route traffic from port 80/443 to individual services
- Provide static file serving for the Angular build output
- Enable Gzip or Brotli response compression


---


4. Environment Configuration

The following environment variables were identified by inspecting the .env files and docker-compose.yml configuration. Sensitive values are not exposed in this document.

Variable: PORT
Purpose: Port on which the service listens
Required: Yes
Environment: All NestJS services
Status: Configured

Variable: NODE_ENV
Purpose: Runtime environment (development or production)
Required: Yes
Environment: All NestJS services
Status: Configured as "development" in docker-compose.yml — must be changed to "production" for production deployment

Variable: DATABASE_URL
Purpose: Primary PostgreSQL connection string
Required: Yes
Environment: All NestJS services
Status: Configured — uses shared postgres Docker container host in Docker mode, localhost in local dev mode

Variable: DATABASE_URL_AUTH / DATABASE_URL_INVOICE / DATABASE_URL_EXPENSE / (per-service variants)
Purpose: Service-specific database connection strings used by Prisma
Required: Yes
Environment: Each respective service
Status: Configured

Variable: JWT_SECRET
Purpose: Secret key for signing and verifying JSON Web Tokens
Required: Yes
Environment: auth-service, expense-service, api-gateway
Status: Configured with default value "change-me" — this value must be replaced with a cryptographically strong random secret before any production deployment. Never commit the production value to version control.

Variable: JWT_EXPIRES_IN
Purpose: JWT token expiration time in seconds
Required: Yes
Environment: auth-service
Status: Configured — value is 604800 (7 days in seconds). Important: this must be set as a number in seconds, not as the string "7d", which causes passport-jwt to misinterpret the value.

Variable: OLLAMA_BASE_URL
Purpose: URL of the local Ollama LLM server
Required: Yes (for invoice report generation and chatbot)
Environment: auth-service (used for invoice AI report), chatbot-finance
Status: Configured — value is http://localhost:11434. Must be updated if Ollama runs in a container or on a different host.

Variable: OLLAMA_MODEL
Purpose: Name of the Ollama model to use for generation
Required: Yes
Environment: auth-service, chatbot-finance
Status: Configured — value is llama3

Variable: BUSINESS_SERVICE_URL
Purpose: Internal URL used by invoice-service and expense-service to call business-service directly
Required: Yes
Environment: invoice-service, expense-service
Status: Configured — value is http://localhost:3003 in local mode, http://business-service:3003 in Docker Compose mode

Variable: NOTIFICATION_SERVICE_URL
Purpose: Internal URL used by invoice-service to trigger PDF generation and email notifications
Required: Yes
Environment: invoice-service
Status: Configured

Variable: QDRANT_URL
Purpose: URL of the Qdrant Cloud vector database for the chatbot
Required: Yes
Environment: chatbot-finance
Status: To verify — configured in chatbot-finance runtime environment, not committed to source control

Variable: QDRANT_API_KEY
Purpose: Authentication key for Qdrant Cloud
Required: Yes
Environment: chatbot-finance
Status: To verify — must not be committed to version control

Variable: PGADMIN_DEFAULT_EMAIL / PGADMIN_DEFAULT_PASSWORD
Purpose: PgAdmin administrator credentials
Required: Yes for PgAdmin access
Environment: pgadmin container
Status: Configured in docker-compose.yml — change before any publicly accessible deployment


---


5. Build and Deployment Procedure

The following steps describe the full build and deployment procedure for the TaskFlow application, adapted to the actual files present in the project.

Step 1 — Clone the repository and navigate to the project root
  git clone https://github.com/ghassendrira/Pi-project
  cd Pi-project

Step 2 — Start the database and supporting infrastructure
  docker compose up -d postgres redis pgadmin
  docker compose ps

Step 3 — Install backend dependencies for all services
  for service in api-gateway auth-service tenant-service business-service notification-service invoice-service expense-service audit-service; do
    cd backend/$service && npm install && cd ../..
  done

Step 4 — Generate Prisma clients and push database schemas
  for service in auth-service tenant-service business-service notification-service invoice-service expense-service audit-service; do
    cd backend/$service && npx prisma generate && npx prisma db push && cd ../..
  done

Step 5 — Install frontend dependencies
  cd frontend/taskflow-web && npm install && cd ../..

Step 6 — Build the frontend for production
  cd frontend/taskflow-web && npm run build && cd ../..
  The production build output is written to frontend/taskflow-web/dist/taskflow-web/browser/

Step 7 — Build each backend service (production compilation)
  for service in api-gateway auth-service tenant-service business-service notification-service invoice-service expense-service audit-service; do
    cd backend/$service && npm run build && cd ../..
  done

Step 8 — Seed the databases (development and testing only)
  cd backend && node seed-all.mjs && cd ..

Step 9 — Install Python dependencies for the ML service
  cd backend/ml-service && pip install -r requirements.txt && cd ../..

Step 10 — Install Python dependencies for the chatbot
  cd chatbot-finance && pip install fastapi uvicorn qdrant-client sentence-transformers numpy httpx pydantic && cd ..

Step 11 — Start Ollama and pull the required model
  ollama serve &
  ollama pull llama3

Step 12 — Start all services using the provided script
  chmod +x start-all.sh
  ./start-all.sh

The start-all.sh script handles the full startup sequence: Docker services, database initialization, .env file generation for each service, npm dependency installation, Prisma schema push, seed, Ollama, ML service, all eight NestJS microservices, the Angular frontend, and the chatbot service. Service PID files are written to the runtime-logs/ directory.

Alternative — using Docker Compose for backend services
  docker compose up -d
  Note: The current docker-compose.yml runs services in development mode. For production, replace npm run start:dev with npm run start:prod in each service's command definition and rebuild images.

Step 13 — Verify the deployment
  curl http://localhost:3000/
  curl http://localhost:4200/
  curl http://localhost:8000/docs
  curl http://localhost:8001/health


---


6. Deployment Validation Checklist

The following checklist should be verified after each deployment, whether to a local development environment or to a production server.

Infrastructure:
- Docker containers for postgres and redis are running and healthy: To verify (run docker compose ps)
- PgAdmin is accessible at http://localhost:5050: To verify
- All seven PostgreSQL databases exist and were pushed correctly: To verify

Backend services:
- api-gateway responds at http://localhost:3000: To verify
- auth-service responds at http://localhost:3001: To verify
- tenant-service responds at http://localhost:3002: To verify
- business-service responds at http://localhost:3003: To verify
- notification-service responds at http://localhost:3004: To verify
- invoice-service responds at http://localhost:3005: To verify
- expense-service responds at http://localhost:3006: To verify
- audit-service responds at http://localhost:3008: To verify

Frontend:
- Angular development server or built static files are served at http://localhost:4200: To verify
- Application loads without console errors: To verify
- Route navigation works (login, dashboard, invoices): To verify

Authentication and authorization:
- POST /auth/signin returns a valid JWT token for the admin account: To verify
- JWT contains tenantId, roles, and sub fields: To verify
- Role-protected routes correctly deny unauthorized access: To verify

API Gateway routing:
- Proxied request to /invoices returns invoice data with a valid token: To verify
- Proxied request to /clients returns client data: To verify
- Internal routes /clients/internal/:id are not exposed via the gateway: To verify

ML and AI services:
- ML service responds at http://localhost:8000: To verify
- Chatbot service responds at http://localhost:8001/health: To verify
- Expense classifier returns a prediction for POST /ai/expense-classifier/predict: To verify

Security:
- JWT_SECRET is not set to the default "change-me" value in production: Critical — must be changed
- CORS origin is restricted to the production frontend URL in production: To verify
- PgAdmin credentials are changed from defaults in production: Critical — must be changed
- No sensitive credentials are committed to the repository: To verify
- HTTPS is enabled in production: Not yet configured — requires reverse proxy with TLS

Monitoring:
- Service logs are available and contain no critical startup errors: To verify (check runtime-logs/ directory)
- SonarQube scan passes without critical issues: To verify (run sonar-scanner or configure in Jenkins)


---


7. Stability and Monitoring

7.1 Logs

Each service writes logs to stdout. When started via start-all.sh, process IDs are stored in runtime-logs/*.pid files. Logs from each service can be viewed by tailing their output or by examining the terminal where they were started.

For production, logs should be redirected to a centralized log aggregation system. Recommended options include the ELK stack (Elasticsearch, Logstash, Kibana) or Grafana Loki. Docker logging drivers can forward container logs to external systems.

7.2 Health Checks

PostgreSQL and Redis containers have health checks defined in docker-compose.yml. NestJS services expose a root endpoint (GET /) that returns the service identity.

Recommended addition: Implement a dedicated /health endpoint in each NestJS service that verifies the database connection and returns a structured health object. This endpoint can be monitored by load balancers and uptime check services.

Example health response format:
  {
    "status": "ok",
    "service": "invoice-service",
    "database": "connected",
    "timestamp": "2026-05-04T10:00:00.000Z"
  }

7.3 Error Tracking

No error tracking service (Sentry, Bugsnag, Rollbar) is integrated at this time. For production, integrating Sentry in both the Angular frontend (@sentry/angular) and each NestJS service (@sentry/node) is recommended. Sentry captures unhandled exceptions, promise rejections, and HTTP errors with full stack traces and release tracking.

7.4 Monitoring

No Prometheus/Grafana monitoring stack is configured. For a production deployment, integrating prom-client in each NestJS service to expose /metrics endpoints and scraping them with Prometheus would provide operational visibility.

7.5 Uptime Checks

No uptime monitoring service is configured. After a production deployment, configuring an external uptime monitor (UptimeRobot, Better Uptime, or a custom script) against the API Gateway and frontend URL is recommended.

7.6 Backup Strategy

The postgres-data Docker volume contains all application data. For production:
- Schedule daily pg_dump backups for each of the seven databases
- Store backups in a separate location (object storage, separate server)
- Test restoration from backup before going live

7.7 Rollback Strategy

The current project does not have a formal rollback procedure. For a production deployment, the recommended approach is:
- Use tagged Docker images for each release
- Keep the previous image tag available for quick rollback
- Maintain database migration rollback scripts for Prisma schema changes


---


8. Known Deployment Risks

Risk: JWT_SECRET default value in production
Severity: Critical
Description: The docker-compose.yml file sets JWT_SECRET to the string "change-me". Any production deployment using this value would be critically insecure, as any attacker who knows this value can forge valid JWT tokens.
Mitigation: Replace with a cryptographically random 64+ character string before any production deployment. Store in a secrets manager (HashiCorp Vault, AWS Secrets Manager, or environment-level secrets in the deployment platform). Never commit the production value to version control.

Risk: CORS origin set to localhost in production
Severity: High
Description: Each NestJS service's main.ts configures CORS to allow only http://localhost:4200. In production, this must be updated to the actual production frontend URL.
Mitigation: Set the CORS origin from an environment variable in each service bootstrap file. Update the environment variable for each service during production deployment.

Risk: No HTTPS in current configuration
Severity: High for production
Description: No TLS configuration or reverse proxy is set up. All traffic is currently unencrypted.
Mitigation: Place nginx or Traefik in front of the API Gateway with Let's Encrypt TLS certificates for production.

Risk: Database credentials in docker-compose.yml
Severity: High for production
Description: The postgres password (taskflow2026) is hardcoded in docker-compose.yml and in each service's .env file.
Mitigation: Use Docker secrets or environment variable injection from a secrets manager. Remove all credential values from committed files before public deployment.

Risk: Ollama LLM server must be running separately
Severity: Medium
Description: Invoice report generation and the chatbot depend on a locally running Ollama server. If Ollama is not available, these features fail silently or with an error.
Mitigation: Add a health check for the Ollama endpoint before invoking it. Implement graceful degradation or a user-facing error message when the LLM is unavailable.

Risk: Qdrant Cloud dependency
Severity: Medium
Description: The chatbot-finance service requires a live connection to Qdrant Cloud. If the Qdrant service is unavailable or the API key expires, the chatbot will fail.
Mitigation: Implement error handling in the chatbot that returns a meaningful error message rather than an unhandled exception when Qdrant is unreachable.

Risk: Cross-service dependency startup order
Severity: Medium
Description: The API Gateway depends on all six downstream services being started. In Docker Compose, service_started conditions are used (not service_healthy), meaning the gateway can start proxying before downstream services are fully ready.
Mitigation: Add health check endpoints to all services and update docker-compose.yml to use service_healthy conditions.

Risk: No database migration management for non-auth services
Severity: Medium
Description: Most services use npx prisma db push rather than formal Prisma migrations. While db push is acceptable for development, it does not provide a migration history or safe rollback path for schema changes.
Mitigation: Transition to npx prisma migrate dev for schema changes in production-bound services.

Risk: SonarQube token committed in sonar-project.properties
Severity: Medium
Description: The sonar-project.properties file contains a SonarQube token value in plaintext. This token should be stored as a CI/CD environment secret rather than committed to the repository.
Mitigation: Remove the token from sonar-project.properties and configure it as a Jenkins credential or environment variable.


---


9. Final Deployment Status

Requirement: All Docker services start and reach healthy state
Status: Verified locally (postgres, redis, pgadmin confirmed in docker-compose.yml with health checks)
Evidence: docker-compose.yml health check definitions for postgres and redis
Notes: Requires Docker Desktop running on the host

Requirement: All eight NestJS microservices start without errors
Status: Verified locally via start-all.sh
Evidence: start-all.sh startup sequence and PID files in runtime-logs/
Notes: Service startup depends on successful database connection

Requirement: Angular frontend builds without error
Status: To be verified
Evidence: Run cd frontend/taskflow-web && npm run build
Notes: Angular build budget enforces 500kB warning threshold on initial bundle

Requirement: Authentication flow works end-to-end
Status: To be verified
Evidence: Test with POST http://localhost:3000/auth/signin using admin@taskflow.local credentials
Notes: JWT token returned must contain tenantId, sub, and roles fields

Requirement: JWT_SECRET replaced with a secure value for production
Status: Not completed — default value "change-me" remains in docker-compose.yml
Evidence: Inspected docker-compose.yml line defining JWT_SECRET
Notes: This is a critical security requirement before any public deployment

Requirement: HTTPS enabled and CORS updated for production domain
Status: Not configured
Evidence: No nginx or reverse proxy configuration detected in the repository
Notes: Required before any production deployment

Requirement: SonarQube code quality gate passes
Status: To be verified
Evidence: Run sonar-scanner or trigger Jenkins pipeline after starting docker-compose.jenkins.yml
Notes: SonarQube project key is taskflow, host is http://host.docker.internal:9000

Requirement: Chatbot finance service connects to Qdrant Cloud successfully
Status: To be verified
Evidence: Run curl http://localhost:8001/health after starting the chatbot service
Notes: Requires valid QDRANT_API_KEY and an active Qdrant Cloud cluster

Requirement: Backup strategy implemented for all seven databases
Status: Not implemented
Notes: Manual pg_dump commands must be scheduled for production use


---


10. Conclusion

The TaskFlow application has a complete and functional local deployment infrastructure. The Docker Compose orchestration, the startup automation script, and the Prisma schema management for all seven databases provide a reproducible development environment that can be started with a single command.

The CI/CD foundation exists in the form of a Jenkins and SonarQube Docker Compose configuration and a sonar-project.properties file. However, the Jenkins pipeline has not been formalized with a Jenkinsfile, and the production deployment target has not been configured.

The primary blockers for a production deployment are the default JWT secret value, the absence of HTTPS configuration, the hardcoded CORS origin pointing to localhost, and database credentials visible in committed files. These are standard pre-production security requirements and are well understood by the team.

The deployment report documents the current state honestly, provides the procedures for completing the deployment, and identifies the remaining risks with clear mitigations. This report can serve as the basis for a production hardening checklist when a cloud or on-premises deployment is undertaken.
