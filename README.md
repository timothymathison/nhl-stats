# NHL Stat Ingest Pipeline

## Getting Started

### Setup and Dependencies

_TODO_

### Running

_TODO_

## Development Checklist

- [x] Working live game ingest
- [x] Working ingest for games from previous day
- [ ] Working ingest for games from previous seasons or date ranges
- [ ] Unit tests with mocka or jest
- [ ] Fully containerized (docker compose) run configurations
  - [ ] Docker image
  - [ ] Override host for db for internal docker network routing
- [ ] Finish readme docs

## Design

_TODO_

### DB Schema

#### Team (team)

- id
- name

#### Player (player)

_Many -> One with `team`_

- id
- full_name (first and last?)
- number
- position
- dateOfBirth (age will not be constant)
- team_id

#### Game (game)

_Many <-> Many with `team`_
_Many <-> Many with `player`_

- id
- final

#### TeamGame (team_game)

_One <-> One with `team`_
_One <-> One with `game`_

- id
- game_id
- team_id
- opponnet_team_id
- goals
- hits
- points

#### PlayerGame (player_game)

_One -> One with `player`_
_One -> One with `game`_

- id
- player_id
- game_id
- player_age
- goals
- hits
- points
- assists
- penalty_minutes
