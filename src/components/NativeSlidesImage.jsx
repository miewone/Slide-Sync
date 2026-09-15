import {createContext,useContext,useEffect,useId,useRef,useState} from 'react';
import {t} from '../i18n/I18n.js';
import {NativeImageGeometry} from '../editor/google/NativeImageGeometry.js';

export const NativeSlidesMediaContext=createContext(null);

/** Native image with fixed geometry, browser image decoding and one bounded URL refresh. @param {object} props Native ID, content URL, dimensions and image properties. */
export function NativeSlidesImage({objectId,url,width,height,properties={}}){
  const media=useContext(NativeSlidesMediaContext),clip=useId().replace(/:/g,''),[state,setState]=useState({url,source:url,media,error:false,retried:false});
  const generation=useRef(0);
  const current=state.source===url&&state.media===media?state:{url,source:url,media,error:false,retried:false};
  useEffect(()=>{generation.current++;setState({url,source:url,media,error:false,retried:false});return ()=>{generation.current++;};},[url,media]);
  useEffect(()=>{
    if(current.url||current.error||!media)return;
    let cancelled=false;
    media.refresh(objectId,null).then(fresh=>{if(!cancelled)setState({url:fresh,source:url,media,error:false,retried:true});}).catch(()=>{if(!cancelled)setState({url:null,source:url,media,error:true,retried:true});});
    return ()=>{cancelled=true;};
  },[objectId,url,media,current.url,current.error]);
  const failed=()=>{
    if(current.retried||!media){setState({...current,error:true});return;}
    const token=generation.current;setState({...current,retried:true});
    media.refresh(objectId,current.url).then(fresh=>{if(token===generation.current)setState({url:fresh,source:url,media,error:false,retried:true});}).catch(()=>{if(token===generation.current)setState({...current,retried:true,error:true});});
  };
  const layout=NativeImageGeometry.layout(width,height,properties.cropProperties,current.natural);
  return <g data-native-image={objectId} data-image-state={current.error?'error':current.loaded?'loaded':current.url?'loading':'missing'}>
    <defs><clipPath id={clip}><rect width={width} height={height}/></clipPath></defs>
    <g clipPath={`url(#${clip})`}>
      {current.url&&!current.error?<g transform={layout.transform}><foreignObject width={layout.width} height={layout.height}>
        <img src={current.url} alt="" draggable={false} referrerPolicy="no-referrer" onError={failed} onLoad={event=>setState({...current,loaded:true,natural:{width:event.currentTarget.naturalWidth,height:event.currentTarget.naturalHeight}})}
          style={{display:'block',width:'100%',height:'100%',objectFit:'fill',opacity:1-Math.max(0,Math.min(1,properties.transparency||0))}}/>
      </foreignObject></g>:<><rect width={width} height={height} fill="#f4f6fa" stroke="#9baabd" strokeDasharray="4 3"/><text x="4" y="14" fontSize="10" fill="#647188">{t(current.error||!media?'native.imageFailed':'drive.working')}</text></>}
    </g>
  </g>;
}
