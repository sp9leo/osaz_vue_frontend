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
