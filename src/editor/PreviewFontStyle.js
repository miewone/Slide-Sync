/** Resolve DrawingML script-specific and theme fonts before browser font discovery. */
export class PreviewFontStyle {
  /** @param {object} props Inherited run properties. @param {object} source DrawingML rPr. @param {object} theme Renderer theme. */
  static read(props,source,theme) {
    for(const [attribute,key] of [['b','bold'],['i','italic']]){
      if(source?.attrs?.[attribute]!==undefined)props[key]=['1','true'].includes(String(source.attrs[attribute]));
    }
    for(const [tag,key] of [['latin','fontLatin'],['ea','fontEA'],['cs','fontCS']]){
      const name=source?.[`a:${tag}`]?.attrs?.typeface;
      if(name)props[key]=name;
    }
    props.fontTheme=theme?.source?.['a:theme']?.['a:themeElements']?.['a:fontScheme'];
    return props;
  }
  /** @param {object} props Run defaults. @param {object} source Shape XML. @param {object} theme Renderer theme. */
  static inherit(props,source,theme) {
    const ref=source?.['p:style']?.['a:fontRef']?.attrs?.idx;
    if(['major','minor'].includes(ref))for(const [key,suffix] of [['fontLatin','lt'],['fontEA','ea'],['fontCS','cs']])props[key]??=`+${ref==='major'?'mj':'mn'}-${suffix}`;
    props.fontTheme??=theme?.source?.['a:theme']?.['a:themeElements']?.['a:fontScheme'];
    return props;
  }
  /** @param {string} value Font name or theme reference. @param {object} props Run properties. @param {string} script DrawingML script. */
  static resolve(value,props,script) {
    const ref=/^\+(mj|mn)-(lt|ea|cs)$/.exec(value||'');
    if(value&&!ref)return value;
    const group=props.fontTheme?.[`a:${ref?.[1]==='mj'?'major':'minor'}Font`];
    if(!group)return '';
    const kind=ref?.[2]||({latin:'lt',ea:'ea',cs:'cs'}[script]||'lt');
    const explicit=group[`a:${kind==='lt'?'latin':kind}`]?.attrs?.typeface;
    if(explicit)return explicit;
    const fonts=[].concat(group['a:font']||[]),lang=String(script==='ea'?(props.altLang||props.lang||''):(props.lang||'')).toLowerCase();
    const desired=script==='cs'?(lang.startsWith('he')?'Hebr':'Arab'):(lang.startsWith('ja')?'Jpan':lang.startsWith('zh')?(lang.includes('tw')?'Hant':'Hans'):'Hang');
    return fonts.find(font=>font.attrs?.script===desired)?.attrs?.typeface||group['a:latin']?.attrs?.typeface||'';
  }
  /** @param {HTMLElement} span Rendered run. @param {object} props Effective run properties. */
  static apply(span,props) {
    const text=span.textContent||'';
    if(!text)return;
    const runs=[];let previousScript='latin';
    for(const char of text){
      const script=/[\u1100-\u11ff\u2e80-\u9fff\uac00-\ud7af\uf900-\ufaff]/u.test(char)?'ea':/[\u0590-\u08ff]/u.test(char)?'cs':/[\s\p{P}\p{M}\u200c\u200d]/u.test(char)?previousScript:'latin';
      previousScript=script;
      const raw=props[{latin:'fontLatin',ea:'fontEA',cs:'fontCS'}[script]]||(!props.fontLatin&&!props.fontEA&&!props.fontCS?props.typeface:undefined);
      const family=this.resolve(raw,props,script)||this.resolve(props.fontLatin,props,'latin');
      if(runs.at(-1)?.family===family)runs.at(-1).text+=char;else runs.push({family,text:char});
    }
    if(runs.length===1){if(runs[0].family)span.style.fontFamily=JSON.stringify(runs[0].family);return;}
    span.style.removeProperty('font-family');span.replaceChildren();
    for(const run of runs){const child=span.ownerDocument.createElement('span');child.textContent=run.text;if(run.family)child.style.fontFamily=JSON.stringify(run.family);span.append(child);}
  }
}
