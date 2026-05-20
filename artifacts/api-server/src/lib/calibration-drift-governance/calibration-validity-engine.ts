export const evaluateCalibrationValidity=(i:{ageDays:number;validityDays:number})=>({valid:i.ageDays<=i.validityDays});
