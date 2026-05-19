export const adaptCausalityMemoryMetadata=(input:{primaryCause:string;recurrenceRisk:number})=>({sharedCausalityMetadata:[input.primaryCause],sharedRecurrenceMetadata:input.recurrenceRisk});
