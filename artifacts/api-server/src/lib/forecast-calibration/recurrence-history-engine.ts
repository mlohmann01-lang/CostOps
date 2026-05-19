export const evaluateRecurrenceHistory=(i:{recurrenceEvents:number})=>({recurrenceRisk:i.recurrenceEvents>0?"HIGH":"LOW",confidenceImpact:i.recurrenceEvents>0?0.2:0});
