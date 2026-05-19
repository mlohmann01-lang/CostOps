import type { OracleJavaSignal } from "./oracle-java-governance-types";
export const normalizeOracleJavaSignal=(input:Partial<OracleJavaSignal>):OracleJavaSignal=>({partitioning:"unknown",confidence:0.5,...input});
