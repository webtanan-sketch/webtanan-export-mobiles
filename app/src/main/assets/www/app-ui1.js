function render(){
  if(route==='dashboard') renderDashboard();
  else if(route==='products') renderProducts();
  else if(route==='calendar') renderCalendar();
  else if(route==='reports') renderReports();
  else renderSettings();
}

function renderDashboard(){
  setHeader('اینستاگرام گهرفام','خلاصه عملکرد این ماه');
  const j=isoToJ(todayISO()), acts=currentMonthActivities(j), types=state.settings.activityTypes;
  const stats=types.slice(0,3).map(t=>`<div class="card stat"><div class="small muted">${esc(t.name)} این ماه</div><div class="num">${faNum(totalByType(acts,t.id))}</div><div class="small">هدف: ${faNum(Number(state.settings.monthlyTargets[t.id])||0)}</div></div>`).join('');
  const recent=[...state.activities].sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt)).slice(0,5);
  view().innerHTML=`
    <div class="card hero"><h2>${esc(state.settings.brandName)}</h2><p>${esc(state.settings.instagramId)}<br>آرشیو محصول + تقویم + کنترل عملکرد ادمین</p></div>
    <div class="section-title"><h2>آمار ${jMonthNames[j.jm-1]}</h2><button class="btn secondary" data-go="reports">گزارش کامل</button></div>
    <div class="grid grid2">${stats}<div class="card stat"><div class="small muted">محصولات آرشیو</div><div class="num">${faNum(state.products.length)}</div><div class="small">ادمین فعال: ${faNum(state.admins.filter(a=>a.active).length)}</div></div></div>
    <div class="section-title"><h2>آخرین فعالیت‌ها</h2><button class="btn secondary" data-add-act>ثبت فعالیت</button></div>
    <div class="card">${recent.length?recent.map(activityRow).join(''):'<div class="empty">هنوز فعالیتی ثبت نشده است.</div>'}</div>
  `;
  view().querySelector('[data-go="reports"]')?.addEventListener('click',()=>setRoute('reports'));
  view().querySelector('[data-add-act]')?.addEventListener('click',()=>openActivityModal());
}

function activityRow(a){
  return `<div class="activity-item"><div class="activity-icon">${faNum(a.quantity)}</div><div><b>${esc(typeName(a.typeId))}</b> <span class="small muted">${esc(adminName(a.adminId))}</span><div class="small muted">${dateLabel(a.date)}${a.productId?' · '+esc(productName(a.productId)):''}${a.subject?' · '+esc(a.subject):''}</div>${a.notes?`<div class="small">${esc(a.notes)}</div>`:''}</div><button class="btn danger small" data-del-act="${esc(a.id)}">حذف</button></div>`;
}

function renderProducts(){
  setHeader('آرشیو محصولات','نام و کد تکراری ثبت نمی‌شود');
  view().innerHTML=`
    <div class="search"><input id="productSearch" placeholder="جستجو در نام، کد یا قطعات..." /></div>
    <div id="productList" class="grid"></div>
    <button class="fab" id="addProduct">＋</button>`;
  const list=document.getElementById('productList'), inp=document.getElementById('productSearch');
  function draw(){
    const q=normalizeKey(inp.value); const items=state.products.filter(p=>!q||normalizeKey([p.name,p.code,p.category,p.components.map(c=>`${c.code} ${c.name}`).join(' ')].join(' ')).includes(q));
    list.innerHTML=items.length?items.map(p=>`<div class="card product-card" data-open-product="${esc(p.id)}">${p.mainImage?`<img class="product-thumb" src="${p.mainImage}">`:'<div class="product-thumb placeholder">بدون عکس</div>'}<div><h3>${esc(p.name)}</h3><div class="small muted">${esc(p.code||'بدون کد')} · ${esc(p.category||'بدون دسته')}</div><div class="chips"><span class="chip">${faNum(p.components.reduce((s,c)=>s+(Number(c.count)||0),0))} قطعه</span><span class="chip ${p.status==='فعال'?'green':''}">${esc(p.status)}</span></div></div><span>‹</span></div>`).join(''):'<div class="card empty">محصولی پیدا نشد.</div>';
    list.querySelectorAll('[data-open-product]').forEach(el=>el.addEventListener('click',()=>openProductModal(el.dataset.openProduct)));
  }
  inp.addEventListener('input',draw); document.getElementById('addProduct').addEventListener('click',()=>openProductModal()); draw();
}

function renderCalendar(){
  setHeader('تقویم پیج','ثبت و شمارش فعالیت روزانه');
  const {jy,jm}=calendarCursor, days=jDaysInMonth(jy,jm); const firstG=toGregorian(jy,jm,1); const firstDate=new Date(firstG.gy,firstG.gm-1,firstG.gd); const firstIndex=(firstDate.getDay()+1)%7;
  const prev=jm===1?{jy:jy-1,jm:12}:{jy,jm:jm-1}; const next=jm===12?{jy:jy+1,jm:1}:{jy,jm:jm+1}; const prevDays=jDaysInMonth(prev.jy,prev.jm);
  let cells=[];
  for(let i=0;i<42;i++){
    let y=jy,m=jm,d=i-firstIndex+1,out=false;
    if(d<1){y=prev.jy;m=prev.jm;d=prevDays+d;out=true;} else if(d>days){y=next.jy;m=next.jm;d=d-days;out=true;}
    const iso=jToISO(y,m,d); const acts=state.activities.filter(a=>a.date===iso); const badges=state.settings.activityTypes.map(t=>{const n=totalByType(acts,t.id);return n?`<span class="mini-badge">${esc(t.name)} ${faNum(n)}</span>`:''}).join('');
    cells.push(`<div class="day ${out?'out':''} ${iso===todayISO()?'today':''}" data-day="${iso}"><span class="n">${faNum(d)}</span><div class="dots">${badges}</div></div>`);
  }
  view().innerHTML=`<div class="calendar-head"><button class="btn ghost" id="nextMonth">ماه بعد</button><b>${jMonthNames[jm-1]} ${faNum(jy)}</b><button class="btn ghost" id="prevMonth">ماه قبل</button></div><div class="calendar-grid">${['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه'].map(x=>`<div class="weekday">${x}</div>`).join('')}${cells.join('')}</div><button class="fab" id="addCal">＋</button>`;
  document.getElementById('prevMonth').onclick=()=>{calendarCursor=prev;renderCalendar();}; document.getElementById('nextMonth').onclick=()=>{calendarCursor=next;renderCalendar();}; document.getElementById('addCal').onclick=()=>openActivityModal();
  view().querySelectorAll('[data-day]').forEach(el=>el.addEventListener('click',()=>openDayModal(el.dataset.day)));
}

function renderReports(){
  setHeader('گزارش عملکرد','کنترل فعالیت ادمین‌ها');
  const acts=currentMonthActivities(reportCursor), types=state.settings.activityTypes, prev=reportCursor.jm===1?{jy:reportCursor.jy-1,jm:12}:{jy:reportCursor.jy,jm:reportCursor.jm-1}, next=reportCursor.jm===12?{jy:reportCursor.jy+1,jm:1}:{jy:reportCursor.jy,jm:reportCursor.jm+1};
  const totals=types.map(t=>`<div class="card stat"><div class="small muted">${esc(t.name)}</div><div class="num">${faNum(totalByType(acts,t.id))}</div><div class="progress"><i style="width:${Math.min(100,Math.round(totalByType(acts,t.id)/Math.max(1,Number(state.settings.monthlyTargets[t.id])||1)*100))}%"></i></div></div>`).join('');
  const admins=state.admins.map(ad=>{ const aa=acts.filter(a=>a.adminId===ad.id); return `<tr><td>${esc(ad.name)}</td>${types.map(t=>`<td>${faNum(totalByType(aa,t.id))}</td>`).join('')}<td>${faNum(new Set(aa.map(a=>a.date)).size)}</td></tr>`;}).join('');
  view().innerHTML=`<div class="calendar-head"><button class="btn ghost" id="repNext">ماه بعد</button><b>${jMonthNames[reportCursor.jm-1]} ${faNum(reportCursor.jy)}</b><button class="btn ghost" id="repPrev">ماه قبل</button></div><div class="grid grid2">${totals}</div><div class="section-title"><h2>عملکرد ادمین‌ها</h2></div><div class="table-wrap"><table><thead><tr><th>ادمین</th>${types.map(t=>`<th>${esc(t.name)}</th>`).join('')}<th>روز فعال</th></tr></thead><tbody>${admins||`<tr><td colspan="${types.length+2}">ادمینی ثبت نشده است.</td></tr>`}</tbody></table></div><div class="section-title"><h2>ریز فعالیت ماه</h2></div><div class="card">${acts.length?[...acts].sort((a,b)=>b.date.localeCompare(a.date)).map(activityRow).join(''):'<div class="empty">فعالیتی برای این ماه ثبت نشده است.</div>'}</div>`;
  document.getElementById('repPrev').onclick=()=>{reportCursor=prev;renderReports();}; document.getElementById('repNext').onclick=()=>{reportCursor=next;renderReports();}; bindDeleteActivity();
}

