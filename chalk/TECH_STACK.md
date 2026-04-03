# Chalk - Technology Stack

## Overview
Chalk is a modern web application built with React and Vite, featuring a rich text editor and real-time synchronization with a cloud database.

---

## Languages

- **JavaScript (ES6+)** - Core application logic
- **JSX** - React component syntax for UI
- **CSS** - Styling and layout

---

## Frontend Frameworks & Libraries

### Core Framework
- **React 19.2.0** - JavaScript library for building user interfaces with component-based architecture
- **Vite 7.3.1** - Next-generation frontend build tool providing fast development server and optimized production builds

### Routing
- **React Router DOM 7.13.1** - Client-side routing for single-page application navigation

### Styling
- **Tailwind CSS 4.2.1** - Utility-first CSS framework for rapid UI development
- **@tailwindcss/vite 4.2.1** - Vite plugin for Tailwind CSS integration

### Rich Text Editor
- **Tiptap 3.20.2** - Headless, framework-agnostic rich text editor
  - `@tiptap/react` - React bindings for Tiptap
  - `@tiptap/starter-kit` - Core editor extensions
  - `@tiptap/extension-bubble-menu` - Floating context menu
  - `@tiptap/extension-font-family` - Font customization
  - `@tiptap/extension-placeholder` - Input placeholder support
  - `@tiptap/extension-text-align` - Text alignment options
  - `@tiptap/extension-text-style` - Inline text styling
  - `@tiptap/extension-typography` - Typography rules
  - `@tiptap/extension-underline` - Text underline support
  - `@tiptap/pm` - ProseMirror integration

### UI Components
- **Lucide React 0.577.0** - Icon library with React components

---

## Development Tools

### Linting & Code Quality
- **ESLint 9.39.1** - JavaScript linter for code quality
  - `@eslint/js` - ESLint's built-in rules
  - `eslint-plugin-react-hooks` - React Hooks linting rules
  - `eslint-plugin-react-refresh` - React Fast Refresh support
  - `globals` - Global variables for Node.js and browser environments

### Build & Development
- **@vitejs/plugin-react 5.1.1** - Vite plugin for React with Fast Refresh support

### Type Definitions (Development)
- `@types/react` - TypeScript type definitions for React
- `@types/react-dom` - TypeScript type definitions for React DOM

---

## Database

### Backend Service
- **Supabase** - Open-source Firebase alternative providing:
  - PostgreSQL database
  - Real-time synchronization
  - Authentication
  - RESTful API access

### Database Client
- **@supabase/supabase-js 2.98.0** - JavaScript SDK for Supabase integration
  - Manages database connections
  - Handles authentication
  - Provides real-time subscriptions

---

## Project Structure

```
chalk/
├── src/
│   ├── components/       # React components (layout, routing, UI)
│   ├── pages/           # Page components (dashboard, journals, etc.)
│   ├── lib/             # Utility libraries (Supabase, data helpers)
│   ├── assets/          # Static assets
│   ├── App.jsx          # Main app component
│   ├── main.jsx         # React DOM entry point
│   ├── App.css          # Global styles
│   └── index.css        # Index styles
├── public/              # Static public files
├── vite.config.js       # Vite configuration
├── eslint.config.js     # ESLint configuration
├── package.json         # Project dependencies
└── index.html           # HTML entry point
```

---

## Features Enabled by This Stack

- **Fast Development** - Vite's instant hot module replacement (HMR)
- **Rich Text Editing** - Tiptap provides a fully customizable editor
- **Real-time Data** - Supabase enables live database synchronization
- **Responsive Design** - Tailwind CSS for mobile-first styling
- **Type Safety** - TypeScript definitions for better IDE support
- **Clean Code** - ESLint ensures code quality and consistency
- **Icon System** - Lucide React provides consistent, scalable icons
- **Client-side Routing** - Seamless navigation with React Router

---

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run ESLint
npm run lint
```

---

## Environment Variables

Required environment variables (typically in `.env.local`):
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
