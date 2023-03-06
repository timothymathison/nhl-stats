# NHL Stat Ingest Pipeline

## Getting Started

### Dependencies

You will need `docker` at a minimum.
This project was tested with:

```sh
Docker version 20.10.12, build 20.10.12-0ubuntu2~18.04.1
```

To run the app natively on your machine, install:

- `node v19`
- `yarn`

### Running

First copy the example env file:

```
cp example.env .env
```

Then change the postgres password if you wish.

#### In Docker

```sh
docker compose up
```

Above command should automatically run the `postgres` database, run the migrations, and then start the app.

By default the app will ingest stats from any games that already took place on the current day,
and then monitor for live games and ingest stats in real time.

To ingest games from past dates or seasons, use one of the supported environment variable combinations to configure the dates to ingest:

- `DATE=yyyy-mm-dd` - to ingest game stats from a particular day in the past
- `START_DATE=yyyy-mm-dd END_DATE=yyyy-mm-dd` - to ingest game stats from a range of days in the past
- `SEASON=yyyyyyyy` (ex: `20222023`) - to ingest all game stats (for final games) for a given season

When running the app via `docker`, these environment variables can be set in the `.env` file.

#### Native

If you wish to run the app natively, use `yarn` to install the dependencies:

```sh
yarn
```

Use docker to run just `postgres`:

```sh
docker compose up -d postgres
```

Then run the db migrations if you haven't already (see `package.json` for command).

Change the `POSTGRES_HOST` value in `.env` to `localhost`.
Then start the app with `yarn`:

```sh
yarn start
```

Configure DATE environment configurations on the command line like:

```sh
DATE=2022-03-06 yarn start
```

## Design

The data ingest/pipeline app consists of two primary components:

1. The coordination logic in `coordinator.js`
2. The game specific ingest logic in `lib/ingest.js`.

I opted to run everything in a single OS processes and relied heavliy on async logic using promises -- for sudo parallelism.
Since app is very IO, heavy I didn't see enough value in the extra complexity of running separate main threads or processes.
The app should not be limited by raw parallel compute capacity (that would be enhanced with separate threads or processes).
Instead it spends most of its time waiting on IO -- in the form of db queries and http requests -- which node's async capabilities are well suited for.

I did run into issues with high IO concurrency, when ingesting game stats for entire seasons.
Too many separate game handlers would start trying to make http calls and db queries at the same time, leading to a lot of http and db connection timeouts.
To mitigate this issue, I added a batch size to limit the number of games for which stats are ingested in parallel.

### Accessing Ingested Data

The `postgres` database can be queried from any standard database client or from insde the `psql` CLI tool instead the container which you can access (with the `postgres` container running) with:

```sh
docker exec -it nhl-stats_postgres_1 psql -U postgres
```

_Note:_ Database data is persisted across container restarts inside of the configured docker volume.

The database schema can be found in `db/schemma.prisma` which should be straight forward to interpret.
Here's an example query for team stats for a particular game:

```sql
SELECT * FROM team_games
WHERE game_id=<id>
```

Or for player stats from a particular game:

```sql
SELECT * FROM player_games
WHERE game_id=<id>
```
