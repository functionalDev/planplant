# PlanPlant 🌱

A garden documentation app built with SolidJS. Track your plants, map your garden, identify species, and share everything with your family.

## Features (Planned)

- 🗺️ **Garden Map** – Visualize your garden layout and place plants on an interactive map
- 📷 **Photo & Identify** – Take photos of plants, insects, and animals; identify them with AI
- 🌿 **Plant Database** – Document all plants in your garden with notes, photos, and care info
- 👨‍👩‍👧 **Shared Database** – Collaborate with family members on your garden documentation

## Tech Stack

| Concern | Technology |
|---------|-----------|
| Framework | [SolidJS](https://www.solidjs.com/) |
| Build Tool | [Vite 8](https://vite.dev/) |
| Language | TypeScript |
| Styling | CSS Modules |
| Routing | [@solidjs/router](https://github.com/solidjs/solid-router) |
| Package Manager | pnpm |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 9+

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build

```bash
pnpm build
```

### Preview Production Build

```bash
pnpm preview
```

### Linting & Formatting

```bash
pnpm lint
pnpm format
```

## Project Structure

```
src/
├── assets/              # Static assets (images, icons)
├── components/          # Reusable UI components
│   └── Layout/          # App shell with navigation
├── pages/               # Route-level page components
│   ├── Home/            # Dashboard / overview
│   ├── Garden/          # Garden map view
│   ├── Camera/          # Photo capture & identification
│   └── NotFound/        # 404 page
├── App.tsx              # Root component with route definitions
├── index.tsx            # Entry point
├── index.css            # Global styles
└── css-modules.d.ts     # TypeScript declarations for CSS Modules
```

## License

Private – All rights reserved.
