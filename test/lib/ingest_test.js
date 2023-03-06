import chai from "chai";
import spies from "chai-spies";
import chaiAsPromised from "chai-as-promised";
import axios from "../../lib/axios.js"
import {
  initGameHandler
} from "../../lib/ingest.js";

chai.should();
chai.use(spies);
chai.use(chaiAsPromised);

const gameId = 99;
const gameLineScoreData = {
  currentPeriodTimeRemaining: "Final",
};
const gameBoxScoreData = {
  teams: {
    home: {
      team: {
        id: 1,
        name: "Team 1"
      },
      teamStats: {
        teamSkaterStats: {
          goals: 2,
          pim: 4,
          shots: 36,
          hits: 1
        }
      },
      players: {
        ID1: {
          person: {
            id: 1,
            fullName: "Player One",
            firstName: "Player",
            lastName: "One",
            primaryNumber: "10",
            currentAge: 26,
            currentTeam: {
              id: 1,
              name: "Team 1"
            },
            primaryPosition: {
              code: "C",
              name: "Center",
              type: "Forward",
              abbreviation: "C"
            }
          },
          jerseyNumber: "10",
          position: {
            code: "C",
            name: "Center",
            type: "Forward",
            abbreviation: "C"
          },
          stats: {
            skaterStats: {
              assists: 1,
              goals: 1,
              shots: 4,
              hits: 0,
            }
          }
        }
      }
    },
    away: {
      team: {
        id: 2,
        name: "Team 2",
      },
      teamStats: {
        teamSkaterStats: {
          goals: 3,
          pim: 8,
          hits: 2
        }
      },
      players: {
        ID2: {
          person: {
            id: 2,
            fullName: "Player Two",
            firstName: "Player",
            lastName: "Two",
            primaryNumber: "20",
            currentAge: 28,
            currentTeam: {
              id: 2,
              name: "Team 2"
            },
            primaryPosition: {
              code: "C",
              name: "Center",
              type: "Forward",
              abbreviation: "C"
            }
          },
          jerseyNumber: "20",
          position: {
            code: "C",
            name: "Center",
            type: "Forward",
            abbreviation: "C"
          },
          stats: {
            skaterStats: {
              assists: 1,
              goals: 2,
              shots: 4,
              hits: 0,
            }
          }
        }
      },
    },
  }
};

const axiosGetSpy = chai.spy.on(axios, 'get', (url) => {
  return new Promise((resolve, reject) => {
    if (url === `/game/${gameId}/linescore`) {
      resolve({
        data: gameLineScoreData
      });
    } else if (url === `/game/${gameId}/boxscore`) {
      resolve({
        data: gameBoxScoreData
      });
    } else {
      reject(new Error(`Requst to wrong url: ${url}`))
    }
  });
});

describe("ingest", () => {
  describe("#initGameHandler", () => {
    it("initializes game handler that ingests game stats", () => {
      const gameHandler = initGameHandler(gameId);
      gameHandler.should.have.property("gameId", gameId);
      return gameHandler.finalGame.should.eventually.include({
        id: gameId,
        final: true
      })
      // TODO: check that spy was called correct number of times
      // TODO: mock db calls
    });
  });
});
