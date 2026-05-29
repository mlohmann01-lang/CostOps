import { useWorkspace } from '../lib/workspaceContext'
import { useDemoRuntimeStore } from '../lib/demoRuntimeStore'

export function useDriftData(){
 const w=useWorkspace();
 const demo=useDemoRuntimeStore();
 if(w.mode==='demo') return { isEmptyLive:false, data:demo.drift }
 return { isEmptyLive:!w.dataReady, data: [] }
}
