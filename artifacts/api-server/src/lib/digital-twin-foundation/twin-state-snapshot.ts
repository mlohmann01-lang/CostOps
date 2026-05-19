export const snapshotTwinState=(input:Record<string,unknown>)=>({snapshotAt:"deterministic",digitalTwin:true,state:input,replaySafe:true});
