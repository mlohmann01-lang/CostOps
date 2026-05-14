export function calculateAppPriority(appContext:any){ let score=0; const reasons:string[]=[]; const annual=Number(appContext.annualCost||0); if(annual>100000){score+=30;reasons.push("High annual cost");} else if(annual>25000){score+=15;}
 score+=Math.min(20,Number(appContext.entitlementCount||0)/5); score+=Math.min(10,Number(appContext.userCount||0)/20);
 const gap=(1-Number(appContext.onboardingConfidence||0)); score+=gap*25; if(!appContext.owner){score+=10;reasons.push("Ownership missing");} if(!appContext.annualCost&&!appContext.monthlyCost){score+=5;reasons.push("Pricing unknown");}
 return {priorityScore:Math.max(0,Math.min(100,Math.round(score))),priorityReasons:reasons}; }
