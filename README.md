# Family Contest

A self-hosted web application for running anonymous family competitions like pumpkin carving, gingerbread house building, and holiday craft contests.

## Overview

Family Contest automates the process of collecting submissions, running anonymous voting, and revealing results. Participants submit photos of their creations, vote on their favorites without knowing who made what, and then see the results once voting closes.

### How it works

1. **Create a contest** — Set a name, submission deadline, and voting deadline. You'll receive a shareable link and an admin PIN.
2. **Collect submissions** — Participants visit the link and upload a photo with their name. Only a submission count is displayed; no one sees the entries yet.
3. **Vote** — Once submissions close, all entries appear anonymously in a randomized gallery. Participants rank their top 3 favorites.
4. **Results** — After voting closes, names are revealed alongside vote tallies and final rankings.

## Requirements

- Docker and Docker Compose
- Approximately 100MB disk space plus storage for uploaded images

## Installation

```bash
git clone https://github.com/YOUR_USERNAME/family-contest.git
cd family-contest
cp .env.example .env
```

Edit `.env` to configure your timezone:

```
PORT=3000
TIMEZONE=America/New_York
MAX_FILE_SIZE_MB=25
```

Start the application:

```bash
docker compose up -d
```

The application will be available at `http://localhost:3000`.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Port to expose the application |
| `TIMEZONE` | `America/New_York` | Timezone for deadlines ([IANA format](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)) |
| `MAX_FILE_SIZE_MB` | `25` | Maximum upload size in megabytes |

## Data Storage

All persistent data is stored in two directories:

- `./data/` — SQLite database
- `./uploads/` — Uploaded images

These directories are created automatically and mounted as Docker volumes. Back them up to preserve your contest history.

## Deployment on TrueNAS Scale

### Option 1: Custom App (Docker Compose)

1. Navigate to **Apps > Discover Apps > Custom App**
2. Configure the container:
   - **Image**: Build from the repository, or push to a registry first
   - **Port**: Map host port to container port 3000
   - **Environment Variables**: Set `TZ`, `MAX_FILE_SIZE_MB` as needed
   - **Storage**: Mount host paths for `/app/data` and `/app/uploads`

### Option 2: SSH and Docker Compose

1. SSH into your TrueNAS Scale server
2. Clone the repository to a dataset (e.g., `/mnt/pool/apps/family-contest`)
3. Run `docker compose up -d`
4. Configure a reverse proxy or access directly via IP and port

For external access, place behind a reverse proxy (Traefik, nginx) with HTTPS.

## Reverse Proxy Configuration

Example nginx configuration:

```nginx
server {
    listen 443 ssl;
    server_name contest.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    client_max_body_size 25M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Administration

Each contest has an admin panel at `/contest/{contest-name}/admin`. Use the PIN set during contest creation to:

- Adjust submission and voting deadlines
- Manually change contest phases
- Remove entries

## Development

### Local development

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

The frontend dev server runs at `http://localhost:5173` and proxies API requests to the backend.

### Building

```bash
docker compose build
```

## Technical Details

- **Frontend**: React, Vite, Tailwind CSS
- **Backend**: Node.js, Express
- **Database**: SQLite
- **Storage**: Local filesystem

## License

MIT License. See [LICENSE](LICENSE) for details.
