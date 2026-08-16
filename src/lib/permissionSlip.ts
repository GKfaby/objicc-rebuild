import type{PermissionSlipTemplate} from '../types';

export type PrintSection='full'|'top'|'bottom';

export interface SlipForm{
  project:string;date:string;endDate:string;startTime:string;endTime:string;
  location:string;meetLocation:string;meetTime:string;body:string;
}
export interface SlipData{
  form:SlipForm;
  template:PermissionSlipTemplate;
  signature:string|null;
  sigPos:{x:number;y:number};
  sigScale:number;
  updatedAt?:any;
}

export const fmtDate=(iso:string)=>{
  if(!iso)return'';
  const d=new Date(iso+(iso.length===10?'T00:00:00':''));
  if(isNaN(d.getTime()))return iso;
  return d.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
};
export const fmtTime=(t:string)=>{
  if(!t)return'';
  const[h,m]=t.split(':').map(Number);
  if(isNaN(h))return t;
  const d=new Date();d.setHours(h,m||0);
  return d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
};

// Post.date is free-text (e.g. "Saturday, January 18, 2025"), but the
// native <input type="date"> picker only accepts strict YYYY-MM-DD.
// Best-effort convert; if it can't be parsed, leave the picker blank
// rather than showing an invalid/confusing value.
export const toISODate=(str?:string)=>{
  if(!str)return'';
  if(/^\d{4}-\d{2}-\d{2}$/.test(str))return str;
  const d=new Date(str);
  if(isNaN(d.getTime()))return'';
  return d.toISOString().slice(0,10);
};

// Builds a display-friendly date/time line, aware of multi-day events
// (e.g. a 7-day summer camp) where the end date differs from the start.
export const computeSchedule=(f:SlipForm)=>{
  const isRange=!!f.endDate&&f.endDate!==f.date;
  if(isRange){
    const dateLine=`${f.date?fmtDate(f.date):'—'} – ${fmtDate(f.endDate)}`;
    const timeLine=f.startTime||f.endTime?`${f.startTime?`Starts ${fmtTime(f.startTime)}`:''}${f.startTime&&f.endTime?' · ':''}${f.endTime?`Ends ${fmtTime(f.endTime)}`:''}`:'';
    return{dateLine,timeLine,isRange};
  }
  const dateLine=f.date?fmtDate(f.date):'—';
  const timeLine=f.startTime&&f.endTime?`${fmtTime(f.startTime)} – ${fmtTime(f.endTime)}`:(f.startTime?fmtTime(f.startTime):'');
  return{dateLine,timeLine,isRange};
};

export const fillTemplate=(tpl:string,f:SlipForm)=>{
  const{dateLine}=computeSchedule(f);
  return tpl
    .replace(/{project}/g,f.project||'________')
    .replace(/{date}/g,dateLine||'________')
    .replace(/{startTime}/g,f.startTime?fmtTime(f.startTime):'____')
    .replace(/{endTime}/g,f.endTime?fmtTime(f.endTime):'____')
    .replace(/{location}/g,f.location||'________')
    .replace(/{meetLocation}/g,f.meetLocation||f.location||'________')
    .replace(/{meetTime}/g,f.meetTime?fmtTime(f.meetTime):(f.startTime?fmtTime(f.startTime):'____'));
};

// Builds the full printable HTML document for a permission slip.
// section: 'full' prints both halves (Legal paper recommended so the
// parent slip doesn't spill to a second page); 'top' or 'bottom' print
// just that half alone on Letter paper with no cut-line needed.
export const buildSlipHTML=(data:SlipData,section:PrintSection,orgName:string,logoUrl?:string)=>{
  const{form,template,signature,sigPos,sigScale}=data;
  const logo=logoUrl?`<img src="${logoUrl}" style="height:56px;width:auto"/>`:'';
  const bodyHtml=form.body.split(/\n{2,}/).map(p=>`<p style="margin:0 0 12px">${p.replace(/\n/g,'<br/>')}</p>`).join('');
  const sig=signature?`<img src="${signature}" style="position:absolute;left:${sigPos.x}%;top:${sigPos.y}%;width:${sigScale*190}px;transform:translate(-50%,-50%);pointer-events:none"/>`:'';
  const{dateLine,timeLine}=computeSchedule(form);

  const topHalf=`
    <div class="header">${logo}<div><h1>${orgName.toUpperCase()}</h1><h2>Permission Slip</h2></div></div>
    <div class="date">${new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</div>
    <p style="margin-bottom:14px">${template.salutation}</p>
    ${bodyHtml}
    <div class="details">
      <div><b>Location:</b> ${form.location||'—'}</div>
      <div><b>Date:</b> ${dateLine}</div>
      ${timeLine?`<div><b>Time:</b> ${timeLine}</div>`:''}
      <div><b>Project:</b> ${form.project||'—'}</div>
    </div>
    <p style="margin:16px 0">Kindly sign the permission slip below.</p>
    <div class="closing">
      <p>Yours truly,</p>
      <div class="sigspace">${sig}</div>
      <p class="name">${template.closingName}</p>
      <p class="title">${template.closingTitle}</p>
      <p class="org">${template.closingOrgLine}</p>
    </div>
    <div class="vision">Vision: "${template.visionLine}"</div>`;

  const bottomHalf=`
    <div class="slip-title">PERMISSION SLIP</div>
    <p style="margin-bottom:14px">Date <span class="line">&nbsp;</span></p>
    <p style="margin-bottom:14px">I <span class="line">&nbsp;</span> parent/guardian, give permission to <span class="line">&nbsp;</span> my (child/ward), of <span class="line">&nbsp;</span> High School to attend <b>${form.project||'this event'}</b>${form.location?` at ${form.location}`:''}, on ${dateLine}. I will give my child/ward bottled water, juice, snacks and spending money.</p>
    <div class="indemnity">${template.indemnityText}</div>
    <p>Yours truly,</p>
    <div class="sigrow">
      <div>Print name of parent/guardian</div>
      <div>Signature</div>
      <div>Contact number</div>
    </div>`;

  const cutLine=`<div class="cut"><span>✂ CUT HERE AND SEND BOTTOM HALF</span></div>`;

  let content='';
  if(section==='full')content=topHalf+cutLine+bottomHalf;
  else if(section==='top')content=topHalf;
  else content=bottomHalf;

  return`<!DOCTYPE html><html><head><title>Permission Slip — ${form.project}${section!=='full'?` (${section==='top'?'Top':'Parent Slip'})`:''}</title><style>
    @page{size:${section==='full'?'legal':'letter'};margin:0.5in}
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Georgia,'Times New Roman',serif;font-size:11pt;color:#111;padding:40px 48px;line-height:1.55}
    .header{display:flex;align-items:center;gap:16px;border-bottom:3px solid #0a2540;padding-bottom:14px;margin-bottom:20px}
    .header h1{font-size:16pt;letter-spacing:0.5px}
    .header h2{font-size:12pt;font-weight:400;color:#444;margin-top:2px}
    .date{margin-bottom:16px;font-size:10pt;color:#333}
    .details{background:#f7f8fa;border-left:4px solid #0a2540;border-radius:4px;padding:14px 18px;margin:18px 0;font-size:10pt}
    .details div{margin-bottom:4px}
    .details b{display:inline-block;width:70px;color:#0a2540}
    .closing{margin-top:32px;position:relative}
    .closing .sigspace{height:90px}
    .closing .name{font-weight:700;margin-top:4px}
    .closing .title,.closing .org{font-size:9.5pt;color:#555}
    .cut{border-top:1px dashed #888;margin:34px 0 10px;text-align:center;font-size:8pt;color:#888;position:relative;top:-8px}
    .cut span{background:#fff;padding:0 10px}
    .slip-title{text-align:center;font-weight:700;letter-spacing:2px;font-size:10pt;margin-bottom:16px}
    .line{border-bottom:1px solid #333;display:inline-block;min-width:160px}
    .indemnity{font-style:italic;font-size:9pt;color:#333;border-top:1px solid #ddd;border-bottom:1px solid #ddd;padding:10px 0;margin:16px 0}
    .sigrow{display:flex;justify-content:space-between;margin-top:40px;font-size:9pt}
    .sigrow div{border-top:1px solid #333;padding-top:4px;width:30%;text-align:center;color:#555}
    .vision{text-align:center;font-style:italic;color:#888;font-size:9pt;margin-top:30px}
    @media print{body{padding:24px 40px}}
  </style></head><body>${content}</body></html>`;
};

export const printSlip=(data:SlipData,section:PrintSection,orgName:string,logoUrl?:string)=>{
  const win=window.open('','_blank','width=900,height=1000');if(!win)return;
  win.document.write(buildSlipHTML(data,section,orgName,logoUrl));win.document.close();win.focus();
  setTimeout(()=>win.print(),300);
};
