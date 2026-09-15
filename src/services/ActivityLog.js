/** Shared, bounded, in-memory user activity log with immutable snapshots. */
export class ActivityLog {
  /** @param {object} options Maximum retained entries and an injectable clock. */
  constructor({limit=200,clock=Date.now}={}) {
    this.limit=Math.max(1,Math.min(1000,Math.trunc(Number(limit)||200)));this.clock=clock;this.nextId=0;this.listeners=new Set();
    this.snapshot=Object.freeze({entries:Object.freeze([]),total:0,latestId:0});
  }
  /** Read the same snapshot until an entry is added or history is cleared. */
  getSnapshot=()=>this.snapshot;
  /** @param {Function} listener Subscriber notified on log changes; returns cleanup. */
  subscribe=listener=>{this.listeners.add(listener);return ()=>this.listeners.delete(listener);};
  /**
   * Record a localized event; parameters are copied now, not evaluated against future editor state.
   * @param {string} key Translation key.
   * @param {object} params Plain string/number/boolean message parameters.
   * @param {object} options Severity and optional originating file name.
   */
  record(key,params={}, {level='info',fileName=''}={}) {
    const values={};
    for(const [name,value] of Object.entries(params||{}).slice(0,16))if(['string','number','boolean'].includes(typeof value))values[name]=typeof value==='string'?value.slice(0,2048):value;
    const entry=Object.freeze({id:++this.nextId,time:this.clock(),key:String(key).slice(0,256),params:Object.freeze(values),
      level:['info','success','warning','error'].includes(level)?level:'info',fileName:String(fileName).slice(0,512)});
    this.snapshot=Object.freeze({entries:Object.freeze([...this.snapshot.entries,entry].slice(-this.limit)),total:this.snapshot.total+1,latestId:entry.id});
    for(const listener of this.listeners)listener();
    return entry.id;
  }
  /** @param {string} message Already formatted user-facing text. @param {object} options Severity/file context. */
  write(message,options) {return this.record('activity.message',{message:String(message)},options);}
  /** Clear this session's history and count; no event is created by clearing the log. */
  clear() {
    if(!this.snapshot.total)return;
    this.snapshot=Object.freeze({entries:Object.freeze([]),total:0,latestId:0});
    for(const listener of this.listeners)listener();
  }
}
