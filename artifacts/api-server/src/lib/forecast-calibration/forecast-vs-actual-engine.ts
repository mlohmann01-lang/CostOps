import type { CalibrationInput } from "./forecast-calibration-types"; export const evaluateForecastVsActual=(i:CalibrationInput)=>({variance:i.actual-i.forecast,replaySafe:true});
