const c=require('./app/src/main/assets/www/app-core.js');
let s=c.normalizeState({settings:{customFields:null,activityTypes:null},products:[]});
if(!Array.isArray(s.settings.customFields)) throw new Error('customFields null not healed');
if(!Array.isArray(s.settings.activityTypes)||s.settings.activityTypes.length<3) throw new Error('activity types defaults missing');
if(c.normalizeKey(' كاشي  ي ')!==c.normalizeKey('کاشی ی')) throw new Error('Persian normalization failed');
for (const x of [[1405,6,13],[1404,12,29],[1403,1,1]]) { const g=c.toGregorian(...x); const j=c.toJalaali(g.gy,g.gm,g.gd); if(j.jy!==x[0]||j.jm!==x[1]||j.jd!==x[2]) throw new Error('Jalali roundtrip failed '+x); }
console.log('CORE_TEST_OK');
