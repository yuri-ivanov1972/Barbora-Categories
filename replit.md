# Barbora.lv Category Scraper Tool

## Overview

A web scraping utility tool designed to extract and display category hierarchies from Barbora.lv (a grocery e-commerce website). The application provides a professional developer tool interface for initiating scrapes, viewing progress, and exporting scraped category data in both hierarchical tree and flat table formats.

The tool uses Puppeteer for headless browser automation to scrape category structures, with real-time status updates displayed in the frontend.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack Query (React Query) for server state and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens following Fluent Design principles
- **Build Tool**: Vite with HMR support

The frontend follows a single-page application pattern with a focus on data visualization. Components display scraped categories in both tree view (hierarchical) and table view (flat) formats.

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Web Scraping**: Puppeteer for headless browser automation
- **API Design**: RESTful endpoints for scrape control (`/api/scrape/status`, `/api/scrape/start`, `/api/scrape/reset`)

The scraper maintains in-memory state for the current scraping operation. Results are stored temporarily in memory rather than persisted to a database, as this is designed as a utility tool for one-off scraping tasks.

### Data Flow
1. User initiates scrape via frontend button
2. Backend spawns Puppeteer browser instance
3. Scraper navigates Barbora.lv and extracts category hierarchy
4. Status updates are polled by frontend via `/api/scrape/status`
5. Completed results include both nested tree structure and flattened category list

### Database Schema
The project includes Drizzle ORM configuration with PostgreSQL, though the core scraping functionality uses in-memory storage. The database schema defines a basic users table for potential future authentication features. The scraping results use TypeScript interfaces defined in `shared/schema.ts`:
- `Category`: Nested hierarchical structure with children
- `FlatCategory`: Denormalized flat list with parent references
- `ScrapeResult`: Complete scrape output with metadata
- `ScrapeStatus`: Real-time scraping progress state

## External Dependencies

### Third-Party Services
- **Barbora.lv**: Target website for category scraping (external grocery e-commerce site)

### Key Libraries
- **Puppeteer**: Headless Chrome automation for web scraping
- **Drizzle ORM**: Database toolkit (PostgreSQL dialect configured)
- **TanStack Query**: Async state management for API calls
- **Radix UI**: Accessible UI primitive components
- **Zod**: Runtime type validation for API schemas

### Development Tools
- **Vite**: Frontend build and dev server
- **esbuild**: Production server bundling
- **TypeScript**: Full-stack type safety
- **Tailwind CSS**: Utility-first styling

### Database
- PostgreSQL connection configured via `DATABASE_URL` environment variable
- Drizzle Kit for schema migrations (output to `./migrations`)