'use strict';
const escapeHTML = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const listText = value => Array.isArray(value) ? (value.filter(Boolean).join(', ') || 'None recorded') : (String(value || '').trim() || 'None recorded');
async function loadSharedRecord(){
  const root=document.querySelector('#record');
  const token=new URLSearchParams(location.search).get('t');
  if(!token){root.innerHTML='<div class="error"><h1>Invalid QR link</h1><p>This shared record link is incomplete.</p></div>';return;}
  try{
    const response=await fetch(`/api/v1/shared-record/${encodeURIComponent(token)}`,{cache:'no-store'});
    const payload=await response.json();
    if(!response.ok)throw new Error(payload.message||'This shared record is unavailable.');
    const p=payload.data;
    const updated=p.lastUpdatedAt?new Date(p.lastUpdatedAt).toLocaleString('en-IN'):'Not available';
    root.innerHTML=`<div class="head"><p>DOCTOR VIEW · READ ONLY</p><h1>${escapeHTML(p.name||'Patient')}</h1><div class="meta">Latest securely shared record · Updated ${escapeHTML(updated)}</div></div><div class="grid"><div class="field"><small>Age</small><strong>${escapeHTML(p.age||'Not recorded')}</strong></div><div class="field"><small>Gender</small><strong>${escapeHTML(p.gender||'Not recorded')}</strong></div><div class="field"><small>Blood group</small><strong>${escapeHTML(p.bloodGroup||'Not recorded')}</strong></div><div class="field"><small>ABHA number</small><strong>${escapeHTML(p.abhaIdMasked||'Not linked')}</strong></div><div class="field"><small>Conditions</small><strong>${escapeHTML(listText(p.conditions))}</strong></div><div class="field"><small>Allergies</small><strong>${escapeHTML(listText(p.allergies))}</strong></div><div class="field"><small>Village</small><strong>${escapeHTML(p.village||'Not recorded')}</strong></div><div class="field"><small>Primary health centre</small><strong>${escapeHTML(p.primaryHealthCenter||'Not selected')}</strong></div></div><p class="notice">This is a read-only patient-shared summary. Confirm identity and clinical details with the patient before making care decisions.</p>`;
  }catch(error){root.innerHTML=`<div class="error"><h1>Record unavailable</h1><p>${escapeHTML(error.message)}</p></div>`;}
}
loadSharedRecord();
