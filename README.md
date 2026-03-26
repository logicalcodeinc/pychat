# PyChat

A real-time, IRC-style chat application built with Flask and React. Users can connect with a username, create and join channels, and exchange messages over WebSockets.

## Features

- **Real-time messaging** via Socket.IO
- **Channel management** — create channels with optional topics, browse and join existing ones
- **User presence** — live user list per channel with join/leave notifications
- **IRC-inspired dark theme** UI

## Prerequisites

- Python 3.x
- Node.js and npm

## Getting Started

### Install

```bash
npm run install:backend   # Creates Python venv and installs dependencies
npm run install:frontend  # Installs React dependencies
```

### Run

```bash
npm run dev
```

This starts both the Flask backend (http://localhost:5000) and the React frontend (http://localhost:3000) concurrently.

You can also run them separately:

```bash
npm run backend   # Flask server on :5000
npm run frontend  # React dev server on :3000
```

## Configuration

| Variable | Default | Description |
|---|---|---|
| `REACT_APP_SOCKET_URL` | `http://localhost:5000` | WebSocket server URL for the frontend |

## Architecture

```text
backend/
  app.py              # Flask + Socket.IO server
  requirements.txt    # Python dependencies
frontend/
  src/App.js          # Main React component
  src/App.css         # Styles
package.json          # Root scripts for running both services
```

**Backend** — Flask with Flask-SocketIO. Channels and users are stored in memory. Exposes a REST API for channel management and Socket.IO events for real-time messaging.

**Frontend** — React SPA using socket.io-client. Features a sidebar with channel list, main chat area, and a user presence panel.

## Limitations

- All state is in-memory — data is lost on server restart
- No authentication beyond username uniqueness
- No message persistence or history
- No private/direct messages
