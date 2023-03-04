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
  const {
    home: homeTeamData,
    away: awayTeamData
  } = gameData.teams;
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
  };
  game = await prisma.game.upsert({
    where: {
      id: gameId
    },
    create: game,
    update: game
  });
  await saveTeamStats(game, homeTeam, true, homeTeamData);
  await saveTeamStats(game, awayTeam, false, awayTeamData);
  console.log(`Saved stats for game id: ${game.id} -- ${awayTeam.name} at ${homeTeam.name}`);
  return game;
};

const saveTeamStats = async (game, team, isHomeTeam, {
  teamStats,
  players
}) => {
  const {
    goals,
    hits,
    pim: penaltyMinutes
  } = teamStats.teamSkaterStats;
  let teamGame = {
    home: isHomeTeam,
    goals,
    hits,
    penaltyMinutes,
    game: {
      connect: {
        id: game.id
      }
    },
    team: {
      connect: {
        id: team.id
      }
    }
  };
  teamGame = await prisma.teamGame.upsert({
    where: {
      teamId_gameId: {
        teamId: team.id,
        gameId: game.id
      }
    },
    create: teamGame,
    update: teamGame
  });
  await Promise.all(Object.values(players).map(playerGameData => savePlayerAndStats(game, playerGameData)));
  return teamGame;
};

const savePlayerAndStats = async (game, playerGameData) => {
  const {
    person: {
      id,
      firstName,
      lastName,
      fullName,
      currentTeam: {
        id: teamId
      },
      primaryPosition: {
        name: primaryPosition
      },
    },
    jerseyNumber: number,
  } = playerGameData;
  let player = {
    id,
    firstName,
    lastName,
    fullName,
    number: parseInt(number),
    primaryPosition,
    team: {
      connect: {
        id: teamId
      }
    }
  };
  player = await prisma.player.upsert({
    where: {
      id: player.id
    },
    create: player,
    update: player
  });
  return await savePlayerStats(game, player, playerGameData);
};

const savePlayerStats = async (game, player, playerGameData) => {
  const playerStats = playerGameData.stats.skaterStats;
  if (!playerStats) {
    return null; // some players on the team have no stats returned
    // alternatively, could save playerGame with all status set to 0
  }
  const {
    goals,
    hits,
    assists,
    penaltyMinutes
  } = playerStats;
  const {
    person: {
      currentAge: playerAge
    },
    position: {
      name: position
    }
  } = playerGameData;
  let playerGame = {
    playerAge,
    position,
    goals,
    hits,
    assists,
    points: goals + assists,
    penaltyMinutes,
    player: {
      connect: {
        id: player.id
      }
    },
    game: {
      connect: {
        id: game.id
      }
    }
  };
  playerGame = await prisma.playerGame.upsert({
    where: {
      playerId_gameId: {
        playerId: player.id,
        gameId: game.id
      }
    },
    create: playerGame,
    update: playerGame
  });
  return playerGame;
};

export const fetchLatestGameStats = async gameId => {
  let gameResponse;
  try {
    gameResponse = await axios.get(`/game/${gameId}/boxscore`);
  } catch (error) { // axios error fetching game stats
    // TODO: handle non fetch errors
    console.error(`Failed to fetch game stats for id: ${gameId}`, error);
    if (error.response) {
      console.error("Game stats error response:", error.response);
    }
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

  const finishIngest = () => {
    clearInterval(ingestPoller)
    fetchGameStats(); // make sure to fetch final stats
  };

  return {
    gameId,
    finishIngest
  };
};
