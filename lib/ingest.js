import axios from "./axios.js";
import prisma from "./prisma.js";

const GAME_STAT_INGEST_INTERVAL = 5000; // could be adjusted or made configurable

const createOrUpdateGame = async ({ id, final }) => {
  const game = {
    id,
    final
  };
  return await prisma.game.upsert({
    where: {
      id: id
    },
    create: game,
    update: game
  });
};

const createOrUpdateTeam = async ({ id, name }) => {
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

const saveGameStats = async (game, gameData) => {
  const { home: homeTeamData, away: awayTeamData } = gameData.teams;
  const homeTeam = await createOrUpdateTeam({
    id: homeTeamData.team.id,
    name: homeTeamData.team.name
  });
  const awayTeam = await createOrUpdateTeam({
    id: awayTeamData.team.id,
    name: awayTeamData.team.name
  });
  await saveTeamStats(game, homeTeam, true, homeTeamData);
  await saveTeamStats(game, awayTeam, false, awayTeamData);
  console.log(
    `Saved stats for game id: ${game.id} -- ${awayTeam.name} at ${homeTeam.name}`
  );
  return game;
};

const saveTeamStats = async (
  game,
  team,
  isHomeTeam,
  { teamStats, players }
) => {
  const { goals, hits, pim: penaltyMinutes } = teamStats.teamSkaterStats;
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
  await Promise.all(
    Object.values(players).map(playerGameData =>
      savePlayerAndStats(game, playerGameData)
    )
  );
  return teamGame;
};

const savePlayerAndStats = async (game, playerGameData) => {
  const {
    person: { id, firstName, lastName, fullName, currentTeam, primaryPosition },
    jerseyNumber
  } = playerGameData;

  const parsedNumber = parseInt(jerseyNumber);
  let player = {
    id,
    firstName,
    lastName,
    fullName,
    number: Number.isNaN(parsedNumber) ? undefined : parsedNumber,
    primaryPosition: primaryPosition && primaryPosition.name
  };
  if (currentTeam) {
    player.team = {
      connectOrCreate: {
        where: {
          id: currentTeam.id
        },
        create: { id: currentTeam.id, name: currentTeam.name }
      }
    };
  }
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
  const { goals, hits, assists, penaltyMinutes } = playerStats;
  const {
    person: { currentAge: playerAge },
    position: { name: position }
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

const fetchLatestGameStats = async gameId => {
  let gameOverviewReponse;
  let gameStatsResponse;
  try {
    gameOverviewReponse = await axios.get(`/game/${gameId}/linescore`);
    gameStatsResponse = await axios.get(`/game/${gameId}/boxscore`);
  } catch (error) {
    // axios error fetching game stats
    console.error(`Failed to fetch game stats for id: ${gameId}`, error);
    if (error.response) {
      console.error("Game stats error response:", error.response);
    }
    return null;
  }
  try {
    const gameIsFinal =
      gameOverviewReponse.data.currentPeriodTimeRemaining === "Final";
    const game = await createOrUpdateGame({
      id: gameId,
      final: gameIsFinal
    });
    return await saveGameStats(game, gameStatsResponse.data);
  } catch (error) {
    console.error(
      `Failed to processes and store game data for id: ${gameId}`,
      error
    );
  }
};

// delay for a certain period and then fetch/save game stats
const delayAndFetchLatestGameStats = gameId => {
  return new Promise((resolve, _) => {
    setTimeout(async () => {
      const game = await fetchLatestGameStats(gameId);
      resolve(game);
    }, GAME_STAT_INGEST_INTERVAL);
  });
};

export const initGameHandler = gameId => {
  const ingestUntilFinal = async () => {
    let game = await fetchLatestGameStats(gameId);
    while (!(game && game.final)) {
      game = await delayAndFetchLatestGameStats(gameId);
    }
    return game;
  };
  return {
    gameId,
    finalGame: ingestUntilFinal()
  };
};
