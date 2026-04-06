# TaskFlow – Business Management Platform

## Overview
This project was developed as part of the PIDEV – 4th Year 
Engineering Program at **Esprit School of Engineering** 
(Academic Year 2025–2026).

TaskFlow is a full-stack SaaS web application that allows 
Tunisian SMEs to manage invoices, expenses, clients and 
team collaboration efficiently.

## Features
- Multi-tenant Architecture
- Invoice Management
- Expense Management with OCR
- Client Portal
- Team Collaboration
- Role-Based Access Control
- AI-powered Reports

## Tech Stack

### Frontend
- Angular
- TypeScript
- HTML5 / CSS3

### Backend
- NestJS (Node.js)
- Microservices Architecture
- RESTful APIs
- JWT Authentication
- PostgreSQL (Prisma ORM)
- Redis (Caching)

## Architecture
Hybrid Multi-Tenancy Architecture based on Microservices,
with shared database and tenant-based isolation.

## Contributors
- Nour Hasni
- Ghassen Drira
- Aziz Douagi
- Med Karim Kebaili

## Academic Context
Developed at **Esprit School of Engineering – Tunisia**
PIDEV – 4Twin3 | 2025–2026

## Getting Started

### Prerequisites
- Node.js
- PostgreSQL
- Docker

### Installation
```bash
git clone https://github.com/ghassendrira/Pi-project
cd Pi-project
npm install
npx prisma migrate dev
npm run start:dev
```

## Acknowledgments
Esprit School of Engineering – Tunisia
