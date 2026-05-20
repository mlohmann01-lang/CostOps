import { SemanticWeight } from './semantic-weight-types';
export const weightConfidence=(w:SemanticWeight,now:number)=> now>w.validityWindow.to?0.4:w.evidenceGrade==='A'?1:w.evidenceGrade==='B'?0.8:0.6;
