import axios from "./lib/axios.js";
import {
  getLocalISODate
} from "./lib/utils.js";
import {
  startIngest
} from "./lib/ingest.js";

const SCHEDULE_POLL_INTERVAL = 5000;

const gameHandlers = {}; // stores injest handlers for each game

console.log("Starting coordinator...");

setInterval(async () => {
  const currentISODate = getLocalISODate(); // TODO: might want to manually set timezone used for this date query
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
      `Games Today (${currentISODate}) - Finished: ${finishedGames.length}, Live: ${liveGames.length}, Scheduled: ${scheduledGames.length}, Total: ${games.length}`
    ); // TODO: update previous line
    liveGames.forEach(game => {
      const gameId = game.gamePk;
      if (!gameHandlers[gameId]) {
        console.log(`Game id: ${gameId} is now live. Starting ingest handler`);
        gameHandlers[gameId] = startIngest(gameId);
      }
    });
    // TODO: check for previosly live games that are now complete and stop the ingest for those games
  } catch (error) {
    console.error("Failed to load schedule", error);
    if (error.response) {
      console.error("Error response:", error.response);
    }
  }
}, SCHEDULE_POLL_INTERVAL);
