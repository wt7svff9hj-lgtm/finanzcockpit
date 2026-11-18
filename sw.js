/* Finanzcockpit – Offline-Speicher. Deine Finanzdaten liegen NICHT hier, sondern im Gerätespeicher der App. */
var C='fc-shell-v3', SHELL=['./','./index.html','./manifest.webmanifest','./apple-touch-icon.png','./icon-512.png'];
self.addEventListener('install',function(e){ e.waitUntil(caches.open(C).then(function(c){ return Promise.all(SHELL.map(function(u){ return c.add(new Request(u,{cache:'reload'})).catch(function(){}); })); }).then(function(){ return self.skipWaiting(); })); });
self.addEventListener('activate',function(e){ e.waitUntil(caches.keys().then(function(ks){ return Promise.all(ks.filter(function(k){ return k!==C&&k!=='fc-state'; }).map(function(k){ return caches.delete(k); })); }).then(function(){ return self.clients.claim(); })); });
function isApp(u){ return u.origin===location.origin&&(/\/$/.test(u.pathname)||/\/index\.html$/.test(u.pathname)); }
self.addEventListener('fetch',function(e){ var r=e.request; if(r.method!=='GET')return; var u=new URL(r.url);
  if(/github\.com$|githubusercontent\.com$/.test(u.hostname))return; /* Cloud-Abgleich nie zwischenspeichern */
  if(r.mode==='navigate'||isApp(u)){
    /* App selbst: erst Netz (max. 4 s), sonst gespeicherte Version */
    e.respondWith(new Promise(function(res){ var done=false, fb=function(){ if(done)return; caches.match('./index.html').then(function(m){ if(done)return; if(m){ done=true; res(m); } else caches.match('./').then(function(m2){ if(!done&&m2){ done=true; res(m2); } }); }); };
      var t=setTimeout(fb,4000);
      fetch(r).then(function(x){ clearTimeout(t); if(x&&x.ok&&!u.search){ var cp=x.clone(); caches.open(C).then(function(c){ c.put('./index.html',cp); }); } if(!done){ done=true; res(x); } }).catch(function(){ clearTimeout(t); fb(); setTimeout(function(){ if(!done){ done=true; res(new Response('Offline – die App wurde auf diesem Gerät noch nicht gespeichert. Öffne sie einmal mit Internet.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}})); } },1500); });
    })); return; }
  if(u.origin===location.origin||/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)){
    e.respondWith(caches.match(r).then(function(m){ return m||fetch(r).then(function(x){ if(x&&(x.ok||x.type==='opaque')){ var cp=x.clone(); caches.open(C).then(function(c){ c.put(r,cp); }); } return x; }); })); }
});
/* Mitteilungen (seit 3.8.0): Text kommt vom GitHub-Erinnerungsdienst, enthält keine Finanzdaten */
function iso(d){ return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); }
var MONN=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
function smart(d,st){ try{ if(!st)return d; var now=new Date(), t;
    if(d.tag==='ausgaben'&&st.xOn&&st.xStart){ var open=0; for(var k=1;k<=7;k++){ var x=new Date(now); x.setDate(x.getDate()-k); var i=iso(x); if(i<st.xStart)break; if((st.xDone||[]).indexOf(i)<0)open++; }
      if(!open)return {title:'Ausgaben ✓',body:'Gestern ist schon erledigt. Schönen Tag!',url:d.url,tag:d.tag}; if(open>1)return {title:'Ausgaben-Check',body:open+' Tage sind noch offen – kurz nachtragen oder „Nichts ausgegeben“ tippen.',url:d.url,tag:d.tag}; }
    if(d.tag==='einnahmen'&&st.zStart){ var mon=new Date(now); mon.setDate(mon.getDate()-((mon.getDay()+6)%7)); var open2=0; for(var j=1;j<=3;j++){ var w=new Date(mon); w.setDate(w.getDate()-7*j); var e=new Date(w); e.setDate(e.getDate()+6); if(iso(e)<st.zStart)break; if((st.zDone||[]).indexOf(iso(w))<0)open2++; }
      if(!open2)return {title:'Einnahmen ✓',body:'Letzte Woche ist schon erledigt.',url:d.url,tag:d.tag}; if(open2>1)return {title:'Einnahmen-Check',body:open2+' Wochen sind noch offen.',url:d.url,tag:d.tag}; }
    if(d.tag==='gehalt'){ t=iso(now).slice(0,7); if((st.ghDone||[]).indexOf(t)>=0)return {title:'Gehalt ✓',body:'Dein Gehalt für '+MONN[now.getMonth()]+' ist schon eingetragen.',url:d.url,tag:d.tag}; }
  }catch(e){} return d; }
self.addEventListener('push',function(e){ var d={}; try{ d=e.data?e.data.json():{}; }catch(x){ d={title:'Cockpit',body:e.data?e.data.text():''}; }
  e.waitUntil(caches.match('./__state').then(function(r){ return r?r.json():null; }).catch(function(){ return null; }).then(function(st){ var m=smart(d,st);
    return Promise.all([
      self.registration.showNotification(m.title||'Cockpit',{body:m.body||'',tag:m.tag||'fc',icon:'apple-touch-icon.png',badge:'apple-touch-icon.png',data:{url:m.url||'./'}}),
      (self.navigator&&self.navigator.setAppBadge&&!/✓/.test(m.title||''))?self.navigator.setAppBadge().catch(function(){}):Promise.resolve()
    ]); })); });
self.addEventListener('notificationclick',function(e){ e.notification.close(); var url=new URL((e.notification.data&&e.notification.data.url)||'./',self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(function(cs){ for(var i=0;i<cs.length;i++){ var c=cs[i]; if(c.url.indexOf(self.registration.scope)===0&&'focus' in c){ return c.focus().then(function(w){ return w&&w.navigate?w.navigate(url).catch(function(){ return w; }):w; }); } } return self.clients.openWindow?self.clients.openWindow(url):null; })); });
