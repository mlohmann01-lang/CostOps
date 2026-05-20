import { approvallatencybenchmark } from "./approval-latency-benchmark"; export const computeOrganizationalTimingReport=(i:{days:number})=>({approvalLag:approvallatencybenchmark(i.days)});
