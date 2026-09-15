const staticFaces=(files)=>Object.entries(files).map(([weight,file])=>({weight:Number(weight),file}));

/** Curated, locally hosted Korean fonts; aliases identify the same family, never lookalikes. */
export class FontCatalogue {
  static families=[
    {id:'nanum-gothic',name:'나눔고딕',family:'NanumGothic',aliases:['Nanum Gothic','나눔고딕','NanumGothicOTF'],faces:staticFaces({300:'NanumGothicLight.otf',400:'NanumGothic.otf',700:'NanumGothicBold.otf',800:'NanumGothicExtraBold.otf'})},
    {id:'nanum-barun-gothic',name:'나눔바른고딕',family:'NanumBarunGothic',aliases:['Nanum Barun Gothic','나눔바른고딕','NanumBarunGothicOTF'],faces:staticFaces({200:'NanumBarunGothicUltraLight.otf',300:'NanumBarunGothicLight.otf',400:'NanumBarunGothic.otf',700:'NanumBarunGothicBold.otf'})},
    {id:'nanum-square',name:'나눔스퀘어',family:'NanumSquare',aliases:['Nanum Square','나눔스퀘어','NanumSquareOTF'],faces:staticFaces({300:'NanumSquareL.otf',400:'NanumSquareR.otf',700:'NanumSquareB.otf',800:'NanumSquareEB.otf'})},
    {id:'nanum-myeongjo',name:'나눔명조',family:'NanumMyeongjo',aliases:['Nanum Myeongjo','나눔명조','NanumMyeongjoOTF'],faces:staticFaces({400:'NanumMyeongjo.otf',700:'NanumMyeongjoBold.otf',800:'NanumMyeongjoExtraBold.otf'})},
    {id:'maru-buri',name:'마루부리',family:'MaruBuri',aliases:['Maru Buri','마루 부리'],faces:staticFaces({200:'MaruBuri-ExtraLight.otf',300:'MaruBuri-Light.otf',400:'MaruBuri-Regular.otf',600:'MaruBuri-SemiBold.otf',700:'MaruBuri-Bold.otf'})},
    {id:'pretendard',name:'Pretendard',family:'Pretendard',aliases:['프리텐다드','Pretendard Variable'],faces:[{weight:'100 900',file:'PretendardVariable.woff2'}]},
    {id:'noto-sans-kr',name:'Noto Sans KR',family:'Noto Sans KR',aliases:['NotoSansKR'],faces:[{weight:'100 900',file:'NotoSansKR.ttf'}]},
    {id:'noto-serif-kr',name:'Noto Serif KR',family:'Noto Serif KR',aliases:['NotoSerifKR'],faces:[{weight:'200 900',file:'NotoSerifKR.ttf'}]},
  ];
  static weights={thin:100,ultralight:200,extralight:200,light:300,regular:400,normal:400,medium:500,semibold:600,demibold:600,bold:700,extrabold:800,heavy:800,black:900,l:300,r:400,b:700,eb:800};
  /** @param {string} name Family or face name; normalize spelling, not visual similarity. */
  static key(name) {return String(name).normalize('NFKC').replace(/^["']|["']$/g,'').replace(/[\s_-]/g,'').toLowerCase();}
  /** @param {string} name Original family/face. Return exact catalogue family and optional named weight. */
  static match(name) {
    const key=this.key(name);
    for(const font of this.families)for(const alias of [font.family,...font.aliases]){
      const base=this.key(alias);
      if(key===base)return {font,weight:null};
      if(key.startsWith(base)&&Object.hasOwn(this.weights,key.slice(base.length)))return {font,weight:this.weights[key.slice(base.length)]};
    }
    return null;
  }
  /** @param {string} id Catalogue identifier. */
  static get(id) {return this.families.find(font=>font.id===id);}
  /** @param {string} name Original name. Return only known equivalents of that same family. */
  static names(name) {
    const match=this.match(name);
    const native=[['맑은 고딕','Malgun Gothic','MalgunGothic'],['굴림','Gulim'],['돋움','Dotum'],['바탕','Batang'],['궁서','Gungsuh'],
      ['Arial','ArialMT'],['Times New Roman','TimesNewRomanPSMT'],['Courier New','CourierNewPSMT'],['Segoe UI','SegoeUI']];
    return [...new Set([name,...(match?[match.font.family,...match.font.aliases]:native.find(group=>group.some(item=>this.key(item)===this.key(name)))||[])])];
  }
  /** @param {object} font Catalogue family. @param {number} weight Requested CSS weight. */
  static face(font,weight) {return font.faces.find(face=>typeof face.weight==='string')||[...font.faces].sort((a,b)=>Math.abs(a.weight-weight)-Math.abs(b.weight-weight))[0];}
  /** @param {string} style OS font style label. Return only recognized weights rather than guessing a different face. */
  static styleWeight(style) {
    const key=this.key(style).replace(/italic|oblique/g,'');
    return this.weights[key]??({book:400,보통:400,굵게:700}[key])??null;
  }
}
