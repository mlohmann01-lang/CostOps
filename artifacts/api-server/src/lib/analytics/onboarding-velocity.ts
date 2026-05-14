export function onboardingVelocity(completedSteps:number, days:number){ return Number((completedSteps/Math.max(days,1)).toFixed(2)); }
