# OSAZ Vue Frontend

Vue 3 frontend for OSAZ, integrated with Frappe backend.

## Project Structure

```
src/
├── main.js                 # App entry point
├── App.vue                 # Root component
├── router/
│   └── index.js            # Vue Router configuration
├── api/
│   └── frappe.js           # Frappe API client (axios)
├── stores/                 # Pinia stores (future use)
│   └── auth.js             # Authentication state
├── components/             # Shared UI components
│   ├── WeatherWidget.vue   # Ecowitt weather API display
│   ├── LiveClock.vue       # Real-time clock
│   ├── EventCard.vue       # Event display (single/multiday)
│   ├── SearchFilter.vue    # Search + category filter
│   └── MonthNav.vue        # Archive month navigation
├── modules/                # Feature modules
│   ├── calendar/           # Event calendar module
│   │   ├── views/
│   │   │   ├── HomePage.vue       # Upcoming events
│   │   │   ├── ArchivePage.vue    # All events with filters
│   │   │   └── EventDetailPage.vue # Event detail view
│   │   ├── components/     # Calendar-specific components
│   │   └── api/
│   │       └── events.js   # Dogodek API calls
│   ├── planner/            # [Future] Event planner
│   └── dashboard/          # [Future] User dashboard
├── views/                  # Standalone pages
│   └── LoginPage.vue       # Login page
└── assets/
    └── styles/
        └── main.css        # Global styles
```

## Modules

### Calendar Module
- **HomePage**: Displays upcoming events with weather widget and live clock
- **ArchivePage**: All events with search/filter and month navigation
- **EventDetailPage**: Individual event view

### [Future] Planner Module
Reserved for event planning functionality.

### [Future] Dashboard Module
Reserved for user dashboard functionality.

## Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your Frappe URL

# Development
npm run dev

# Build
npm run build
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| VITE_FRAPPE_URL | Frappe server URL | http://localhost:8000 |

### Quick event entry

The "Hitri vpis" button in the toolbar lets anyone post an event after entering a 6-digit PIN,
without a full Frappe login. Every user has their own PIN; the PIN identifies the person, who is
then stored as "Dodal" on the event.

People live in the Frappe DocType `HitriVpis` and are maintained in Desk, not in this app. Fields:

| Field | Owner | Purpose |
|-------|-------|---------|
| `display` | Desk | shown name, e.g. `Blatnik Tea` |
| `priimek_ime` | Desk | folder-style id, e.g. `Blatnik_Tea`, matching the reports app |
| `user` | Desk | Frappe email of the user |
| `aktivna` | Desk | inactive users cannot use quick entry |
| `pin_hash` | app | PBKDF2 hash of the PIN |
| `sol` | app | site-wide salt, identical on every row |

Create the DocType once by importing `frappe/HitriVpis.json` (Desk → Customize → Import Doc Type).
It ships with read permission for Guest, because the PIN screen compares hashes in the browser.

The page at `/admin/uporabniki` (Administrator and System Manager only) only assigns PINs - it
cannot add or edit people. That split is deliberate: the Frappe Desk cannot hash, so PINs would be
stored in plaintext if they were typed there, and the DocType has to stay Guest-readable for the
browser check. Only this page writes `pin_hash` and `sol`, so the plaintext PIN exists nowhere -
the value is generated (or typed), shown once, hashed, and discarded.

`pin_hash` holds the PBKDF2-SHA256 derivation of the PIN with 600 000 iterations
(`PBKDF2_ITERATIONS` in `src/api/quickEntry.js`); changing that constant invalidates every PIN
that has been set. `PIN_LENGTH` lives in the same file and is the single source for both the
admin page and the PIN screen - changing it invalidates every PIN too. Derivation uses
`crypto.subtle`, so the app must be served over HTTPS (or localhost) - `crypto.subtle` does not
exist on a page served over plain HTTP, and the PIN screens will refuse to run with a message
saying so. The salt is shared by all rows so a single derivation per login is enough - per-user
salts would require one derivation per user, since PIN-only login has no username to key on.

The field model deliberately mirrors `teachers.json` in the separate reports app
(`osaz2026/reports`). The two apps run against **different Frappe instances**, so nothing syncs
between them. Note that the PIN length does not match the reports app, which uses 8 digits - the
same code therefore works in only one of the two apps.

Note that the hash is readable by anyone who opens developer tools on the PIN screen. PBKDF2 only
makes offline cracking expensive, not impossible. Treat PINs as kiosk convenience, not security,
and move the check to a whitelisted server method when that starts to matter.

## Frappe API Integration

The app uses Frappe's REST API:
- `GET /api/resource/{doctype}` - List documents
- `GET /api/resource/{doctype}/{name}` - Get document
- `POST /api/method/login` - Login
- `POST /api/method/{method}` - Call custom method

Authentication uses Frappe's session cookie (withCredentials: true).

## Development Notes

- Each module should be self-contained with its own API layer
- Shared components go in `src/components/`
- Module-specific components go in `src/modules/{module}/components/`
- Keep the modular structure for future scalability

## Docker Deployment

### Prerequisites
- Docker
- Docker Compose

### Quick Start

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f vue-app

# Stop
docker-compose down
```

The app will be available at `http://localhost:3000`

### Configuration

The nginx container proxies API requests to Frappe. Update `nginx.conf` if your Frappe server is at a different URL.

### Building without Docker

```bash
npm run build
# Serve the dist folder with any web server
```
