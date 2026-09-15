import {useId} from 'react';
import {Help} from './Help.jsx';

/** Shared native button. @param {object} props Native attributes, children and optional variant/full style. */
export function Button({variant, full = false, className = '', children, ...props}) {
  return <button type="button" className={['button', variant, full && 'full', className].filter(Boolean).join(' ')} {...props}>{children}</button>;
}

/** Labelled select. @param {object} props id, label, options ({value,label}[]), native attributes. */
export function SelectField({id, label, options, ...props}) {
  return <><label className="field-label" htmlFor={id}>{label}</label><select id={id} {...props}>
    {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
  </select></>;
}

/** Uncontrolled checkbox for native editor preferences. @param {object} props Label, optional helpKey, optional chip variant, and native input attributes. */
export function Checkbox({label, helpKey, variant, ...props}) {
  const generatedId=useId(),id=props.id??generatedId;
  if(!helpKey&&!variant)return <label><input type="checkbox" {...props}/> {label}</label>;
  return <span className={`option-with-help${variant==='chip'?' option-chip':''}`} onClick={event=>{
    if(variant==='chip'&&event.target===event.currentTarget)event.currentTarget.querySelector('input')?.click();
  }}>
    <input type="checkbox" {...props} id={id}/>
    {helpKey&&<Help helpKey={helpKey}/>}
    <label htmlFor={id}>{label}</label>
  </span>;
}

/** Numeric coordinate field. @param {object} props id, label, optional labelId and input attributes. */
export function NumberField({id, label, labelId, ...props}) {
  return <label><span id={labelId}>{label}</span><input id={id} type="number" step="0.1" {...props}/></label>;
}

/**
 * Native collapsible category; children stay mounted so editor drafts and handlers survive toggles.
 * @param {object} props Stable id, title, children and initiallyOpen preference.
 */
export function InspectorSection({id,title,children,initiallyOpen=true}) {
  return <details id={id} className="inspector-section" open={initiallyOpen}>
    <summary><h3>{title}</h3></summary>
    <div className="inspector-section-content">{children}</div>
  </details>;
}
