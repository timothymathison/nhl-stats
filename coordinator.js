import parseArgs from "minimist";
import axios from "./lib/axios.js";
import { getLocalISODate } from "./lib/utils.js";
import { initGameHandler } from "./lib/ingest.js";

const SCHEDULE_POLL_INTERVAL = 5000;

const gameHandlers = {}; // stores injest handlers for each game
const processedGames = new Set();

const coordinateIngest = configuredDate => async () => {
  const gameDate = configuredDate || getLocalISODate();
  try {
    const scheduleResponse = await axios.get("/schedule", {
      params: {
        date: gameDate
      }
    });
    const games = scheduleResponse.data.dates[0].games;
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
      `Game Status for ${gameDate} - Final: ${finalGames.length}, Live: ${liveGames.length}, Preview: ${previewGames.length}, Total: ${games.length}`
    );
    finalGames.concat(liveGames).forEach(game => {
      const gameId = game.gamePk;
      const gameState = game.status.abstractGameState;
      if (!gameHandlers[gameId]) {
        console.log(
          `Game id: ${gameId} is ${gameState}. Starting game ingest handler`
        );
        gameHandlers[gameId] = initGameHandler(gameId);
      }
    });
  } catch (error) {
    console.error("Failed to load schedule", error);
    if (error.response) {
      console.error("Schedule error response:", error.response);
    }
  }
};

console.log("Starting NHL stat ingest Coordinator...");

// processes args
const argv = parseArgs(process.argv.slice(2));
const dateForIngest = argv.date || argv.d; // TODO: format check

if (dateForIngest) {
  // just do one time injest of final game stats for that date
  if (dateForIngest >= getLocalISODate()) {
    console.error("Cannot do one time ingest for date that is not in the past");
    process.exit(1);
  }
  await coordinateIngest(dateForIngest)();
  // wait for all game ingest handlers to finish before exiting
  await Promise.all(
    Object.values(gameHandlers).map(handler => handler.finalGame)
  );
  console.log(`Done with one time ingest for ${dateForIngest}. Exiting.`);
  process.exit(0);
}

setInterval(coordinateIngest(), SCHEDULE_POLL_INTERVAL);
