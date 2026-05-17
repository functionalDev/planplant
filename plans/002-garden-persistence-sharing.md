# Garden Persistence & Sharing

## Overview
Implement local garden persistence using IndexedDB with anonymous device-based identity. Design sharing model (stubbed) for future cloud sync. Mobile-first layout with bottom navigation bar.

## Data Model

### Device
- `deviceId: string` (UUID, auto-generated on first launch)
- `displayName: string` (e.g. "Garden Explorer #4821", user-editable)
- `createdAt: Date`

### Garden
- `id: string` (UUID)
- `name: string`
- `description: string`
- `ownerId: string` (deviceId)
- `createdAt: Date`
- `updatedAt: Date`

### ShareLink
- `id: string` (UUID, used in URL)
- `gardenId: string`
- `permission: 'temp-readonly' | 'readonly' | 'readwrite'`
- `expiresAt: Date | null` (15 days for temp-readonly, null for permanent)
- `createdAt: Date`

### GardenAccess
- `id: string`
- `gardenId: string`
- `deviceId: string`
- `permission: 'owner' | 'readwrite' | 'readonly' | 'temp-readonly'`
- `origin: 'owner' | 'share-link'`
- `grantedAt: Date`

## Permission Levels

| Permission | View | Edit | Manage Access | Expires |
|------------|------|------|---------------|---------|
| owner | Yes | Yes | Yes | Never |
| readwrite | Yes | Yes | No | Never |
| readonly | Yes | No | No | Never |
| temp-readonly | Yes | No | No | 15 days |

## Storage Architecture

- `StorageAdapter` interface abstracts all DB operations
- `IndexedDBAdapter` implements it using the `idb` library
- Future `CloudAdapter` can be swapped in without changing services/UI

## Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | List owned + shared gardens |
| `/garden/new` | CreateGarden | Create a new garden |
| `/garden/:id` | GardenView | View/edit garden map |
| `/garden/:id/settings` | GardenSettings | Manage access, sharing, delete |
| `/camera` | Camera | Photo capture |
| `/settings` | Settings | App/device settings |
| `*404` | NotFound | 404 page |

## Mobile-First Layout

- **Mobile (<=768px)**: Minimal top header (logo only) + bottom nav bar with 4 tabs (Home, Garden, Camera, Settings)
- **Desktop (>768px)**: Full top header with nav links, no bottom bar

## New File Structure

```
src/
├── db/
│   ├── adapter.ts              # StorageAdapter interface
│   ├── indexeddb.ts            # IndexedDB implementation (idb)
│   └── schema.ts              # DB schema version + migrations
├── models/
│   ├── device.ts              # Device type + factory
│   ├── garden.ts              # Garden type + factory
│   ├── share.ts               # ShareLink + GardenAccess types
│   └── permissions.ts         # Permission enum + helpers
├── services/
│   ├── device.service.ts      # Get/create device identity
│   ├── garden.service.ts      # CRUD gardens
│   └── share.service.ts       # Create/revoke share links (stubbed)
├── stores/
│   ├── device.store.ts        # SolidJS reactive store for device
│   └── garden.store.ts        # SolidJS reactive store for gardens
├── pages/
│   ├── Home/                  # Updated: list gardens
│   ├── Garden/                # Updated: garden map view by ID
│   ├── GardenSettings/        # NEW: manage access
│   ├── CreateGarden/          # NEW: create garden form
│   ├── Settings/              # NEW: app/device settings
│   ├── Camera/                # Existing
│   └── NotFound/              # Existing
├── components/
│   ├── Layout/                # Updated: mobile bottom bar + desktop top nav
│   ├── BottomNav/             # NEW: mobile bottom navigation
│   ├── GardenCard/            # NEW: garden list item
│   └── ShareDialog/           # NEW: share link dialog (stubbed)
```

## Dependencies to Add
- `idb` - Promise-based IndexedDB wrapper
- `uuid` - UUID generation (or use crypto.randomUUID)
