import type { MatchConfig, ScoreAction, ScoreState } from "@/core/models/match";
import type { MatchSide } from "@/core/models/match";
import { emptyScoreState, type ScoringEngine } from "./types";

/**
 * Best-of-`rounds` rounds. A round is won outright ("round_win", a knockout
 * or the judges' call) or by damage points accumulated within it
 * ("point") — a combat-robotics judge decides which applies, this engine
 * just records whichever action comes in. `score.home`/`away` are rounds
 * won; cumulative points across the whole match live in `detail.totalPoints`.
 */
interface RoboFightDetail {
  roundPoints: { home: number; away: number };
  totalPoints: { home: number; away: number };
}

const detailOf = (state: ScoreState): RoboFightDetail =>
  (state.detail as unknown as RoboFightDetail) ?? { roundPoints: { home: 0, away: 0 }, totalPoints: { home: 0, away: 0 } };

export const roboFightEngine: ScoringEngine = {
  matches: ["robo fight", "robowar", "robo war", "battle bots", "combat robotics"],

  initialState(): ScoreState {
    return { ...emptyScoreState(), detail: { roundPoints: { home: 0, away: 0 }, totalPoints: { home: 0, away: 0 } } };
  },

  applyAction(state: ScoreState, action: ScoreAction, config: MatchConfig): { state: ScoreState; label: string } {
    const detail = detailOf(state);
    const roundsToWin = Math.ceil((config.rounds ?? 3) / 2);

    if (action.type === "point" && action.side) {
      const value = Math.max(0, Number(action.payload?.value ?? 1));
      const side: MatchSide = action.side;
      const roundPoints = { ...detail.roundPoints, [side]: detail.roundPoints[side] + value };
      const totalPoints = { ...detail.totalPoints, [side]: detail.totalPoints[side] + value };
      return {
        state: { ...state, detail: { roundPoints, totalPoints }, isComplete: false },
        label: "Point",
      };
    }

    if (action.type === "round_win" && action.side) {
      const side: MatchSide = action.side;
      const home = side === "home" ? state.home + 1 : state.home;
      const away = side === "away" ? state.away + 1 : state.away;
      const isComplete = (side === "home" ? home : away) >= roundsToWin;
      return {
        state: {
          ...state,
          home,
          away,
          detail: { roundPoints: { home: 0, away: 0 }, totalPoints: detail.totalPoints },
          displayHome: String(home),
          displayAway: String(away),
          isComplete,
        },
        label: "Round winner",
      };
    }

    return { state, label: "" };
  },
};
