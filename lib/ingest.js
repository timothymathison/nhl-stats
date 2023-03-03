import {
  PrismaClient
} from "@prisma/client";
import axios from "./axios.js";

const SCHEDULE_POLL_INTERVAL = 5000; // could be adjusted or made configurable

const prisma = new PrismaClient();

const createOrUpdateTeam = async ({
  id,
  name
}) => {
  return await prisma.team.upsert({
    where: {
      id: id
    },
    create: {
      id,
      name
    },
    update: {
      id,
      name
    }
  });
};

const saveGameStats = async (gameId, gameData) => {
  const homeTeamData = gameData.teams.home;
  const awayTeamData = gameData.teams.away;
  const homeTeam = await createOrUpdateTeam({
    id: homeTeamData.team.id,
    name: homeTeamData.team.name
  });
  const awayTeam = await createOrUpdateTeam({
    id: awayTeamData.team.id,
    name: awayTeamData.team.name
  });
  let game = {
    id: gameId,
    homeTeamId: homeTeam.id,
    awayTeamId: awayTeam.id
  };
  game = await prisma.game.upsert({
    where: {
      id: gameId
    },
    create: game,
    update: game
  });
  console.log("Created or updated game:", game);
  return game;
};

const fetchLatestGameStats = async gameId => {
  let gameResponse;
  try {
    gameResponse = await axios.get(`/game/${gameId}/boxscore`);

  } catch (error) { // axios error fetching game stats
    // TODO: handle non fetch errors
    console.error(`Failed to fetch game stats for id: ${gameId}`, error);
  }
  try {
    return await saveGameStats(gameId, gameResponse.data);
  } catch (error) {
    console.error(`Failed to processes and store game data for id: ${gameId}`, error)
  }
};

export const startIngest = gameId => {
  // TODO: validate that game ID is passed
  // TODO: consider running ingest in separate thread or processes
  const fetchGameStats = async () => fetchLatestGameStats(gameId);
  fetchGameStats(); // go ahead and call right away
  const ingestPoller = setInterval(fetchGameStats, SCHEDULE_POLL_INTERVAL);

  const stopIngest = () => clearInterval(ingestPoller);

  return {
    gameId,
    stopIngest
  };
};
