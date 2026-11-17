# LabTrack - Laboratory Tracking System

Comprehensive laboratory tracking system for JRMSU Dapitan with multi-device support.

## Tech Stack

**Backend**
- .NET 8 / ASP.NET Core - 22 controllers, 90+ REST endpoints
- PostgreSQL - primary database
- Entity Framework Core - ORM with soft delete
- Python FastAPI - AI microservice

**Frontend**
- React 18 + Vite + TypeScript
- TailwindCSS
- React Router

## Features

**Admin Portal (15 modules)**
Dashboard, Campuses, Assets, QR Management, Issues, Inventory,
Sessions, Financials, Analytics, Users, Notifications, AI, Audit, Profile

**Instructor Portal (10 modules)**
Dashboard, Reservations, Lab Availability, Student Sessions,
Problem Reporting, My Requests, Analytics, Notifications, AI, Profile

**Student Portal**
QR-based PC scanning (no login required), auto-session, problem reporting

## Cross-Device Support

- LAN access: http://192.168.x.x:3000
- Public access via Cloudflare tunnel
- Mobile-ready (iOS, Android)
- Dynamic QR host detection

## Quick Start

### Backend
```
cd backend/LabTrack.CSharp/src/LabTrack.Api
dotnet run
```
