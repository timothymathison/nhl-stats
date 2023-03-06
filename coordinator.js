import axios from "./lib/axios.js";
import {
  getLocalISODate,
  validateDate,
  compact,
  validateSeason
} from "./lib/utils.js";
import { initGameHandler } from "./lib/ingest.js";

const SCHEDULE_POLL_INTERVAL = 5000;

const startTime = new Date();
const gameHandlers = {}; // stores injest handlers for each game

const coordinateIngest = (dateConfigurations, batchSize = 50) => async () => {
  const dateParams = dateConfigurations || {
    date: getLocalISODate()
  };
  try {
    const scheduleResponse = await axios.get("/schedule", {
      params: dateParams
    });
    const games = scheduleResponse.data.dates.map(d => d.games).flat();
    const finalGames = games.filter(
      game => game.status.abstractGameState === "Final"
    );
    const liveGames = games.filter(
      game => game.status.abstractGameState === "Live"
    );
    const previewGames = games.filter(
      game => game.status.abstractGameState === "Preview"
    );
    console.log(
      `Game Status for ${JSON.stringify(dateParams)} - Final: ${
        finalGames.length
      }, Live: ${liveGames.length}, Preview: ${previewGames.length}, Total: ${
        games.length
      }`
    );
    const gamesToIngest = finalGames.concat(liveGames);
    for (let index = 0; index < gamesToIngest.length; index++) {
      const game = gamesToIngest[index];
      const gameId = game.gamePk;
      const gameState = game.status.abstractGameState;
      if (!gameHandlers[gameId]) {
        console.log(
          `Game id: ${gameId} is ${gameState}. Starting game ingest handler`
        );
        gameHandlers[gameId] = initGameHandler(gameId);
      }
      if ((index + 1) % batchSize === 0) {
        // if we've initialized a full batch, wait until all game handlers are complete
        console.log("wait");
        await gameHandlersComplete();
      }
    }
  } catch (error) {
    console.error("Failed to load schedule", error);
    if (error.response) {
      console.error("Schedule error response:", error.response);
    }
  }
};

const gameHandlersComplete = async () => {
  await Promise.all(
    Object.values(gameHandlers).map(handler => handler.finalGame)
  );
  return true;
};

console.log("Starting NHL stat ingest Coordinator...");

const {
  DATE: date,
  START_DATE: startDate,
  END_DATE: endDate,
  SEASON: season
} = process.env;
validateDate(date);
validateDate(startDate);
validateDate(endDate);
validateSeason(season);
const localDate = getLocalISODate();
if (date && (startDate || endDate)) {
  console.error(
    "Start date and end date cannot be set at the same time as date"
  );
  process.exit(1);
} else if (!!startDate !== !!endDate) {
  console.error("Start date and end date must both be provided");
  process.exit(1);
} else if (startDate > endDate) {
  console.error("Start date cannot be after end date");
  process.exit(1);
} else if (date >= localDate || endDate >= localDate) {
  console.error("Only dates in the past are supported for one time ingest");
  process.exit(1);
}
// TODO: validate that season is not in the future and dates are not configured at the same time

const dateConfigurations = compact({
  date,
  startDate,
  endDate,
  season
});

if (Object.keys(dateConfigurations).length) {
  console.log(
    `Starting one time ingest for ${JSON.stringify(dateConfigurations)}`
  );
  await coordinateIngest(dateConfigurations)();
  // wait for all game ingest handlers to finish before exiting
  await gameHandlersComplete();
  console.log(
    `Done with one time ingest for ${JSON.stringify(
      dateConfigurations
    )}. Exiting.`
  );
  const endTime = new Date();
  console.log(`Ran for ${(endTime - startTime) / 1000} seconds`);
  process.exit(0);
}

// if no date configurations provided, ingest games from today and future
setInterval(coordinateIngest(), SCHEDULE_POLL_INTERVAL);
