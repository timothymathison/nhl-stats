import parseArgs from "minimist";
import axios from "./lib/axios.js";
import { getLocalISODate } from "./lib/utils.js";
import { startIngest, fetchLatestGameStats } from "./lib/ingest.js";

const SCHEDULE_POLL_INTERVAL = 5000;

const gameHandlers = {}; // stores injest handlers for each game
const processesedGames = new Set();

const coordinateIngest = async () => {
  const currentISODate = dateForIngest || getLocalISODate();
  try {
    const scheduleResponse = await axios.get("/schedule", {
      params: {
        date: currentISODate
      }
    });
    const games = scheduleResponse.data.dates[0].games;
    const finishedGames = games.filter(
      game => game.status.abstractGameState === "Final"
    );
    const liveGames = games.filter(
      game => game.status.abstractGameState === "Live"
    );
    const scheduledGames = games.filter(
      game => game.status.abstractGameState === "Preview"
    );
    console.log(
      `Game Status for ${currentISODate} - Finished: ${finishedGames.length}, Live: ${liveGames.length}, Scheduled: ${scheduledGames.length}, Total: ${games.length}`
    ); // TODO: update previous line
    liveGames.forEach(game => {
      const gameId = game.gamePk;
      if (!gameHandlers[gameId]) {
        console.log(`Game id: ${gameId} is now live. Starting ingest handler`);
        gameHandlers[gameId] = startIngest(gameId);
      }
    });
    finishedGames.forEach(game => {
      const gameId = game.gamePk;
      if (!processesedGames.has(gameId)) {
        if (gameHandlers[gameId]) {
          // game was previously live during this run
          gameHandlers[gameId].finishIngest();
        } else {
          // game was already final
          fetchLatestGameStats(gameId);
        }
        processesedGames.add(gameId);
      }
    });
  } catch (error) {
    console.error("Failed to load schedule", error);
    if (error.response) {
      console.error("Error response:", error.response);
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
  await coordinateIngest();
  process.exit(0); // TODO: can't exit like this. Need to actualy wait for async ingest functions to finish
}

setInterval(coordinateIngest, SCHEDULE_POLL_INTERVAL);
