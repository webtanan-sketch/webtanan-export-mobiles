'use strict';

const APP_VERSION = '1.0.0';
const DB_KEY = 'instagram_goharfaam_mobile_state_v1';

function uid(prefix='id') { return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`; }
function todayISO(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function faNum(v){ return String(v??'').replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]); }
function esc(s){ return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function normalizeKey(v){ return String(v??'').trim().toLowerCase().replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/[\u200c\u200d\ufeff]/g,'').replace(/\s+/g,' '); }
function safeArray(v){ return Array.isArray(v) ? v : []; }
function safeObj(v){ return v && typeof v==='object' && !Array.isArray(v) ? v : {}; }
function clone(v){ return JSON.parse(JSON.stringify(v)); }

function defaultState(){
  return {
    schemaVersion: 1,
    appVersion: APP_VERSION,
    products: [],
    admins: [],
    activities: [],
    settings: {
      brandName: 'اینستاگرام گهرفام',
      instagramId: '@Goharfaamtile',
      activityTypes: [
        {id:'post',name:'پست'},
        {id:'story',name:'استوری'},
        {id:'reel',name:'ریلز'}
      ],
      productCategories: ['کاشی استخری','پرسلان استخری','چسب','سایر'],
      productStatuses: ['فعال','آرشیو'],
      adminRoles: ['ادمین پیج','تولید محتوا','مدیر'],
      customFields: [],
      subjectOptions: ['بدون محصول مشخص','محتوای عمومی','پروژه اجرا','پشت صحنه'],
      monthlyTargets: {post:12,story:90,reel:12}
    },
    meta: {createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}
  };
}

function normalizeState(raw){
  const d = defaultState();
  raw = safeObj(raw);
  const s = safeObj(raw.settings);
  const out = {
    schemaVersion: 1,
    appVersion: APP_VERSION,
    products: safeArray(raw.products).map(p=>({
      id:p.id||uid('prd'), name:String(p.name||''), code:String(p.code||''), category:String(p.category||''), status:String(p.status||'فعال'),
      notes:String(p.notes||''), mainImage:String(p.mainImage||''), gallery:safeArray(p.gallery).filter(Boolean),
      components:safeArray(p.components).map(c=>({code:String(c.code||''),name:String(c.name||''),count:Number(c.count)||0})),
      custom:safeObj(p.custom), createdAt:p.createdAt||new Date().toISOString(), updatedAt:p.updatedAt||new Date().toISOString()
    })),
    admins: safeArray(raw.admins).map(a=>({id:a.id||uid('adm'),name:String(a.name||''),role:String(a.role||'ادمین پیج'),active:a.active!==false})),
    activities: safeArray(raw.activities).map(a=>({
      id:a.id||uid('act'), date:String(a.date||todayISO()), adminId:String(a.adminId||''), typeId:String(a.typeId||'post'),
      quantity:Math.max(1,Number(a.quantity)||1), productId:String(a.productId||''), subject:String(a.subject||''), notes:String(a.notes||''), createdAt:a.createdAt||new Date().toISOString()
    })),
    settings: {
      brandName:String(s.brandName||d.settings.brandName),
      instagramId:String(s.instagramId||d.settings.instagramId),
      activityTypes:safeArray(s.activityTypes).length ? safeArray(s.activityTypes).map(x=>({id:String(x.id||uid('typ')),name:String(x.name||'نوع محتوا')})) : d.settings.activityTypes,
      productCategories:safeArray(s.productCategories).length ? safeArray(s.productCategories).map(String) : d.settings.productCategories,
      productStatuses:safeArray(s.productStatuses).length ? safeArray(s.productStatuses).map(String) : d.settings.productStatuses,
      adminRoles:safeArray(s.adminRoles).length ? safeArray(s.adminRoles).map(String) : d.settings.adminRoles,
      customFields:safeArray(s.customFields).map(f=>({id:String(f.id||uid('fld')),label:String(f.label||'فیلد'),type:String(f.type||'text'),options:safeArray(f.options).map(String)})),
      subjectOptions:safeArray(s.subjectOptions).length ? safeArray(s.subjectOptions).map(String) : d.settings.subjectOptions,
      monthlyTargets:safeObj(s.monthlyTargets)
    },
    meta:{...d.meta,...safeObj(raw.meta),updatedAt:new Date().toISOString()}
  };
  return out;
}

function nativeAvailable(){ return typeof Android !== 'undefined' && Android && typeof Android.loadState === 'function'; }
function loadState(){
  let raw='';
  try { raw = nativeAvailable() ? Android.loadState() : localStorage.getItem(DB_KEY)||''; } catch(e) { raw=''; }
  if(!raw) return defaultState();
  try { return normalizeState(JSON.parse(raw)); } catch(e){ return defaultState(); }
}
let state = loadState();
function saveState(){
  state = normalizeState(state); state.meta.updatedAt = new Date().toISOString();
  const raw=JSON.stringify(state);
  try { if(nativeAvailable()) Android.saveState(raw); else localStorage.setItem(DB_KEY,raw); } catch(e){ console.error(e); }
}
function toast(msg){ try{ if(nativeAvailable() && Android.toast) Android.toast(msg); else alert(msg); }catch(e){ alert(msg); } }

function div(a,b){ return ~~(a/b); }
function mod(a,b){ return a-~~(a/b)*b; }
function jalCal(jy){
  const breaks=[-61,9,38,199,426,686,756,818,1111,1181,1210,1635,2060,2097,2192,2262,2324,2394,2456,3178];
  let bl=breaks.length,gy=jy+621,leapJ=-14,jp=breaks[0],jm,jump,n,i;
  if(jy<jp||jy>=breaks[bl-1]) throw new Error('Jalali year out of range');
  for(i=1;i<bl;i++){jm=breaks[i];jump=jm-jp;if(jy<jm)break;leapJ+=div(jump,33)*8+div(mod(jump,33),4);jp=jm;}
  n=jy-jp;leapJ+=div(n,33)*8+div(mod(n,33)+3,4);if(mod(jump,33)===4&&jump-n===4)leapJ++;
  const leapG=div(gy,4)-div((div(gy,100)+1)*3,4)-150;const march=20+leapJ-leapG;
  if(jump-n<6)n=n-jump+div(jump+4,33)*33;let leap=mod(mod(n+1,33)-1,4);if(leap===-1)leap=4;
  return {leap,gy,march};
}
function g2d(gy,gm,gd){let d=div((gy+div(gm-8,6)+100100)*1461,4)+div(153*mod(gm+9,12)+2,5)+gd-34840408;d=d-div(div(gy+100100+div(gm-8,6),100)*3,4)+752;return d;}
function d2g(jdn){let j=4*jdn+139361631;j=j+div(div(4*jdn+183187720,146097)*3,4)*4-3908;const i=div(mod(j,1461),4)*5+308;const gd=div(mod(i,153),5)+1;const gm=mod(div(i,153),12)+1;const gy=div(j,1461)-100100+div(8-gm,6);return {gy,gm,gd};}
function j2d(jy,jm,jd){const r=jalCal(jy);return g2d(r.gy,3,r.march)+(jm-1)*31-div(jm,7)*(jm-7)+jd-1;}
function d2j(jdn){const g=d2g(jdn),gy=g.gy,jy=gy-621,r=jalCal(jy),jdn1f=g2d(gy,3,r.march);let k=jdn-jdn1f,jm,jd,jy2=jy;if(k>=0){if(k<=185){jm=1+div(k,31);jd=mod(k,31)+1;return{jy:jy2,jm,jd};}k-=186;}else{jy2-=1;k+=179;if(r.leap===1)k+=1;}jm=7+div(k,30);jd=mod(k,30)+1;return{jy:jy2,jm,jd};}
function toJalaali(gy,gm,gd){return d2j(g2d(gy,gm,gd));}
function toGregorian(jy,jm,jd){return d2g(j2d(jy,jm,jd));}
function isoToJ(iso){ const [y,m,d]=String(iso).split('-').map(Number); return toJalaali(y,m,d); }
function jToISO(jy,jm,jd){ const g=toGregorian(jy,jm,jd); return `${g.gy}-${String(g.gm).padStart(2,'0')}-${String(g.gd).padStart(2,'0')}`; }
const jMonthNames=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
function jDaysInMonth(jy,jm){ if(jm<=6)return 31;if(jm<=11)return 30;return jalCal(jy).leap===0?30:29; }
function dateLabel(iso){try{const j=isoToJ(iso);return `${faNum(j.jy)}/${faNum(String(j.jm).padStart(2,'0'))}/${faNum(String(j.jd).padStart(2,'0'))}`;}catch(e){return iso;}}

let route='dashboard';
let calendarCursor=(()=>{const j=isoToJ(todayISO());return{jy:j.jy,jm:j.jm};})();
let reportCursor={...calendarCursor};
let modalOpen=false;
const view=()=>document.getElementById('view');
const modalRoot=()=>document.getElementById('modalRoot');

function setHeader(title,sub){ document.getElementById('pageTitle').textContent=title; document.getElementById('pageSubtitle').textContent=sub||''; }
function setRoute(r){ route=r; document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.route===r)); render(); }
function typeName(id){ return state.settings.activityTypes.find(x=>x.id===id)?.name || id || 'محتوا'; }
function adminName(id){ return state.admins.find(x=>x.id===id)?.name || 'بدون ادمین'; }
function productName(id){ return state.products.find(x=>x.id===id)?.name || ''; }
function currentMonthActivities(cur){ return state.activities.filter(a=>{try{const j=isoToJ(a.date);return j.jy===cur.jy&&j.jm===cur.jm;}catch(e){return false;}}); }
function totalByType(acts,id){return acts.filter(a=>a.typeId===id).reduce((s,a)=>s+(Number(a.quantity)||1),0);}

if(typeof module!=='undefined'&&module.exports){module.exports={defaultState,normalizeState,normalizeKey,safeArray,toJalaali,toGregorian,jDaysInMonth};}
