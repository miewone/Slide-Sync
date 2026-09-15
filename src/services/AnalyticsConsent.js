const STORAGE_KEY='slide-sync-analytics-consent';
const LIFETIME=180*24*60*60*1000;
const denied={analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'};

/** Optional GA4 collection, gated on an explicit, expiring browser consent choice. */
export class AnalyticsConsent {
  /** @param {object} options Optional browser adapters, measurement ID and clock for testing. */
  constructor({window=globalThis.window,document=globalThis.document,storage,measurementId,now=Date.now}={}){
    Object.assign(this,{window,document,now});this.id=measurementId??document?.querySelector('meta[name="slide-sync-ga4"]')?.content??'';
    try{this.storage=storage===undefined?window?.localStorage:storage;}catch{this.storage=null;}
    this.enabled=/^G-[A-Z0-9]+$/.test(this.id);this.listeners=new Set();this.loaded=false;this.started=false;
    this.snapshot={choice:this.read(),open:false};
  }
  /** Read a versioned choice; invalid or expired values require a new decision. */
  read(){try{const saved=JSON.parse(this.storage?.getItem(STORAGE_KEY)||'null');if(saved?.version===1&&saved.id===this.id&&saved.expiresAt>this.now()&&['accepted','rejected'].includes(saved.choice))return saved.choice;}catch{}return null;}
  /** React external-store snapshot. */
  getSnapshot=()=>this.snapshot;
  /** @param {Function} listener State listener. Returns cleanup. */
  subscribe=listener=>{this.listeners.add(listener);return ()=>this.listeners.delete(listener);};
  /** @param {object} patch Consent presentation changes. */
  update(patch){this.snapshot={...this.snapshot,...patch};for(const listener of this.listeners)listener();}
  /** Start once per page. No Google tag or request is created for undecided/rejected visitors. */
  start(){
    if(this.started||!this.enabled)return;this.started=true;
    if(this.snapshot.choice==='accepted')this.enable();else this.disable();
    this.window.addEventListener('storage',event=>{
      if(event.key!==STORAGE_KEY&&event.key!==null)return;
      const choice=this.read();this.update({choice,open:false});choice==='accepted'?this.enable():this.disable();
    });
  }
  /** Reopen preferences without changing the current choice. */
  open(){if(this.enabled)this.update({open:true});}
  /** Close reopened preferences without changing consent. */
  close(){this.update({open:false});}
  /** @param {boolean} accept Whether optional analytics is allowed. */
  choose(accept){
    const choice=accept?'accepted':'rejected';
    try{this.storage?.setItem(STORAGE_KEY,JSON.stringify({version:1,id:this.id,choice,expiresAt:this.now()+LIFETIME}));}catch{}
    this.update({choice,open:false});accept?this.enable():this.disable();
  }
  /** Initialize GA4 after consent; advertising consent always remains denied. */
  enable(){
    if(!this.enabled)return;
    this.window[`ga-disable-${this.id}`]=false;
    if(this.loaded){this.window.gtag('consent','update',{...denied,analytics_storage:'granted'});return;}
    this.loaded=true;
    const win=this.window;win.dataLayer=win.dataLayer||[];win.gtag=function(){win.dataLayer.push(arguments);};
    win.gtag('consent','default',denied);
    win.gtag('consent','update',{...denied,analytics_storage:'granted'});
    win.gtag('js',new Date());
    win.gtag('config',this.id,{cookie_prefix:'slide_sync',cookie_domain:'none',cookie_expires:LIFETIME/1000,cookie_update:false,allow_google_signals:false,allow_ad_personalization_signals:false});
    const script=this.document.createElement('script');script.id='slide-sync-ga4';script.async=true;script.src=`https://www.googletagmanager.com/gtag/js?id=${this.id}`;this.document.head.append(script);
  }
  /** Stop collection and clear accessible GA cookies without clearing editor/Drive storage or reloading. */
  disable(){
    if(!this.enabled)return;
    this.window[`ga-disable-${this.id}`]=true;
    if(this.loaded)this.window.gtag('consent','update',denied);
    const host=this.window.location.hostname,parts=host.split('.');
    for(const item of this.document.cookie.split(';')){
      const name=item.split('=')[0].trim();if(!/^(?:slide_sync_ga|_ga)(?:_|$)/.test(name))continue;
      const cookie=`${name}=; Max-Age=0; Path=/; SameSite=Lax`;
      this.document.cookie=cookie;
      for(let i=0;i<parts.length;i++)this.document.cookie=`${cookie}; Domain=${parts.slice(i).join('.')}`;
    }
  }
}
export const analyticsConsent=new AnalyticsConsent();
