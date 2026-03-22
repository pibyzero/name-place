# Name Place

A real-time, peer-to-peer multiplayer word game based on the classic "Name Place Animal Thing" — playable in the browser with no server required. Players join a room, get a random letter, and race to fill in categories (Name, Surname, Place, Animal, Food, Movie) before anyone else hits Stop. Answers are validated by majority vote. Built for anyone who wants a quick, fun word game with friends.

## Core Features

- **P2P multiplayer** — 2–20 players via WebRTC, no backend server
- **Room-based** — share a code or URL to join
- **Turn-based letter selection** — rotating among players each round
- **Majority-vote review** — players validate each other's answers
- **Cumulative scoring** — track points across configurable rounds (2–10)
- **In-game chat** — collapsible widget with unread notifications
- **Multi-language** — English and Nepali alphabet support

## Tech Stack

- **React 19** + **TypeScript 5.9** (strict mode)
- **PeerJS** — WebRTC abstraction for P2P connections
- **Tailwind CSS 3** — utility-first styling
- **Vite** — build tool, dev server on port 3000
- **GitHub Pages** — deployment target (`/name-place/`)
