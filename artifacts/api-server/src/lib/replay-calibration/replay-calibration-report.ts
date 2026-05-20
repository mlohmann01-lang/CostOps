import { compareReplayVsForecast } from "./replay-vs-forecast-engine"; export const computeReplayCalibrationReport=(i:any)=>({comparison:compareReplayVsForecast(i),lineage:i.lineage});
