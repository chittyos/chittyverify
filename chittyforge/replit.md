# ChittyID Identity Management System

## Overview

ChittyID is a universal identity verification and management platform built as part of the ChittyOS ecosystem. The system provides deterministic, privacy-preserving digital identities with progressive verification, badge collection, and comprehensive audit trails. Users can create unique ChittyIDs, complete various verification methods (email, phone, government ID, biometric), earn badges, and share their verified identities with others.

### Current Status (August 2025)
The system now features a complete consumer-friendly interface with gamified verification, visual trust metrics, badge collection, and activity tracking. A demo user showcases the full verification journey with progressive trust scoring and achievement unlocking.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React with TypeScript**: Modern component-based UI using React 18 with TypeScript for type safety
- **Vite Build System**: Fast development server and optimized production builds
- **Wouter Routing**: Lightweight client-side routing for single-page application navigation
- **shadcn/ui Component Library**: Comprehensive design system built on Radix UI primitives with Tailwind CSS styling
- **TanStack Query**: Server state management with caching, background updates, and optimistic updates
- **Custom Design System**: Electric blue and mint green color scheme with dark theme, custom CSS variables for consistent theming

### Backend Architecture
- **Express.js Server**: RESTful API server with TypeScript support
- **In-Memory Storage**: Currently using memory-based storage with interface for future database integration
- **Modular Route System**: Organized API endpoints for authentication, verification, badges, and identity sharing
- **Development/Production Split**: Vite integration for development with separate production build process

### Data Storage Solutions
- **Drizzle ORM**: Type-safe database toolkit configured for PostgreSQL
- **Neon Database**: Cloud PostgreSQL database for production
- **Schema-First Design**: Centralized schema definitions in shared directory with validation using Zod
- **Migration Support**: Database schema versioning with drizzle-kit

### Authentication and Authorization
- **bcrypt Password Hashing**: Secure password storage with salt rounds
- **Session-Based Auth**: User sessions for maintaining authentication state
- **Username/Password System**: Traditional authentication with plans for OAuth integration
- **Protected Routes**: API endpoint protection for authenticated operations

### Core Data Models
- **Users**: Identity profiles with ChittyID, trust levels, and verification status
- **Verification Methods**: Multi-step verification process (email, phone, government ID, biometric)
- **Badge System**: Achievement-based progression with categories and requirements
- **Activity Logs**: Comprehensive audit trail of all user actions
- **Identity Sharing**: Secure sharing mechanisms with expiration and access controls

### API Architecture
- **RESTful Design**: Standard HTTP methods with JSON payloads
- **Type-Safe Validation**: Request/response validation using Zod schemas
- **Error Handling**: Centralized error middleware with structured error responses
- **Logging**: Detailed request/response logging for debugging and monitoring

### Security and Privacy
- **Input Validation**: Comprehensive validation on all API endpoints
- **Password Security**: bcrypt hashing with configurable salt rounds
- **CORS Configuration**: Cross-origin request handling for web security
- **Data Privacy**: Sensitive information handling with audit trails

## External Dependencies

### Frontend Dependencies
- **React Ecosystem**: React 18, React DOM, React Router (Wouter)
- **UI Framework**: Radix UI primitives, shadcn/ui components
- **Styling**: Tailwind CSS, PostCSS, Autoprefixer
- **State Management**: TanStack React Query for server state
- **Utilities**: clsx, class-variance-authority for conditional styling
- **Date Handling**: date-fns for date manipulation and formatting

### Backend Dependencies
- **Server Framework**: Express.js with TypeScript support
- **Database**: Drizzle ORM, Neon serverless PostgreSQL
- **Security**: bcrypt for password hashing
- **Development**: tsx for TypeScript execution, esbuild for production builds
- **Session Management**: connect-pg-simple for PostgreSQL session storage

### Development Tools
- **Build System**: Vite with React plugin and TypeScript support
- **Type Checking**: TypeScript compiler with strict mode
- **Code Quality**: ESLint configuration (implied by modern React setup)
- **Development Experience**: Replit integration with runtime error overlay

### Third-Party Services
- **Neon Database**: Cloud PostgreSQL hosting with serverless architecture
- **Replit Platform**: Development environment with integrated deployment
- **Font Assets**: Google Fonts integration (Inter, Architects Daughter, DM Sans, Fira Code, Geist Mono)

### Future Integration Points
- **ChittyChain**: Blockchain integration for immutable identity records
- **OAuth Providers**: Social login integration for enhanced verification
- **Biometric Services**: Third-party biometric verification APIs
- **Government ID Services**: Integration with official ID verification providers
- **Notification Services**: Email and SMS providers for verification workflows