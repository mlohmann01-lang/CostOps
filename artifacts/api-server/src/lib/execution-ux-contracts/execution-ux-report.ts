import { evaluateExecutionStateMachine } from "./execution-state-machine"; export const computeExecutionUxReport=(i:any)=>({state:evaluateExecutionStateMachine(i)});
