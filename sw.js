/* Finanzcockpit – Offline-Speicher. Deine Finanzdaten liegen NICHT hier, sondern im Gerätespeicher der App. */
var C='fc-shell-v1', SHELL=['./','./index.html','./manifest.webmanifest','./apple-touch-icon.png','./icon-512.png'];
self.addEventListener('install',function(e){ e.waitUntil(caches.open(C).then(function(c){ return Promise.all(SHELL.map(function(u){ return c.add(new Request(u,{cache:'reload'})).catch(function(){}); })); }).then(function(){ return self.skipWaiting(); })); });
self.addEventListener('activate',function(e){ e.waitUntil(caches.keys().then(function(ks){ return Promise.all(ks.filter(function(k){ return k!==C; }).map(function(k){ return caches.delete(k); })); }).then(function(){ return self.clients.claim(); })); });
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
