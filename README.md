# nhl-stats

## DB Schema

### Team (team)

- id
- name

### Player (player)

_Many -> One with `team`_

- id
- full_name (first and last?)
- number
- position
- dateOfBirth (age will not be constant)
- team_id

### Game (game)

_Many <-> Many with `team`_
_Many <-> Many with `player`_

- id
- home_team_id
- away_team_id

### TeamGame (team_game)

_One <-> One with `team`_
_One <-> One with `game`_

- id
- game_id
- team_id
- opponnet_team_id
- goals
- hits
- points

### PlayerGame (player_game)

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
