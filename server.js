// Zero-dependency recipe server. Run: ADMIN_PASSWORD=yourpass node server.js
const http=require("http"),fs=require("fs"),path=require("path"),crypto=require("crypto");
try{require("fs").readFileSync(require("path").join(__dirname,".env"),"utf8").split(/\r?\n/).forEach(l=>{const m=l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);if(m&&!(m[1] in process.env))process.env[m[1]]=m[2].replace(/^["']|["']$/g,"")})}catch(e){}
const PORT=process.env.PORT||3000,PASS=process.env.ADMIN_PASSWORD||"changeme";
const DATA=path.join(__dirname,"data"),UP=path.join(DATA,"uploads"),FILE=path.join(DATA,"recipes.json"),PUB=path.join(__dirname,"public");
fs.mkdirSync(UP,{recursive:true});if(!fs.existsSync(FILE))fs.writeFileSync(FILE,"[]");
if(PASS==="changeme")console.warn("⚠ Using default admin password. Set ADMIN_PASSWORD before deploying.");
const sessions=new Set(),T={".html":"text/html",".css":"text/css",".js":"text/javascript",".png":"image/png",".jpg":"image/jpeg",".webp":"image/webp",".gif":"image/gif"};
const EXT={"image/png":".png","image/jpeg":".jpg","image/webp":".webp","image/gif":".gif"};
const read=()=>JSON.parse(fs.readFileSync(FILE,"utf8")),write=d=>fs.writeFileSync(FILE,JSON.stringify(d,null,2));
const isAdmin=q=>/(?:^|;\s*)sid=([a-f0-9]+)/.test(q.headers.cookie||"")&&sessions.has(RegExp.$1);
const json=(s,c,o,h={})=>{s.writeHead(c,{"Content-Type":"application/json",...h});s.end(JSON.stringify(o))};
const body=(q,max)=>new Promise((ok,no)=>{const b=[];let n=0;q.on("data",c=>{n+=c.length;if(n>max){no(new Error("big"));q.destroy()}else b.push(c)});q.on("end",()=>ok(Buffer.concat(b)))});
const clean=d=>({name:String(d.name||"").slice(0,120),category:String(d.category||"").slice(0,40),time:String(d.time||"").slice(0,40),servings:parseInt(d.servings,10)||0,photo:String(d.photo||"").startsWith("/uploads/")?d.photo:"",ingredients:(d.ingredients||[]).map(String).slice(0,200),steps:(d.steps||[]).map(String).slice(0,200),notes:String(d.notes||"").slice(0,2000),updated:Date.now()});
http.createServer(async(q,s)=>{
  try{
    const u=new URL(q.url,"http://x"),p=u.pathname,m=q.method;
    if(p==="/api/me")return json(s,200,{admin:isAdmin(q)});
    if(p==="/api/login"&&m==="POST"){const{password}=JSON.parse((await body(q,2e3)).toString()||"{}");
      const a=Buffer.from(String(password||"")),b=Buffer.from(PASS);
      if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return json(s,401,{error:"bad"});
      const t=crypto.randomBytes(24).toString("hex");sessions.add(t);return json(s,200,{ok:1},{"Set-Cookie":`sid=${t}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000`})}
    if(p==="/api/recipes"&&m==="GET")return json(s,200,read());
    if(p.startsWith("/api/")&&m!=="GET"&&!isAdmin(q))return json(s,401,{error:"admin only"});
    if(p==="/api/recipes"&&m==="POST"){const d=clean(JSON.parse((await body(q,2e5)).toString())),all=read();d.id="r"+Date.now().toString(36);all.push(d);write(all);return json(s,200,d)}
    const id=(p.match(/^\/api\/recipes\/([\w-]+)$/)||[])[1];
    if(id&&m==="PUT"){const d=clean(JSON.parse((await body(q,2e5)).toString())),all=read(),i=all.findIndex(r=>r.id===id);if(i<0)return json(s,404,{});all[i]={...d,id};write(all);return json(s,200,all[i])}
    if(id&&m==="DELETE"){write(read().filter(r=>r.id!==id));return json(s,200,{ok:1})}
    if(p==="/api/upload"&&m==="POST"){const ext=EXT[q.headers["content-type"]];if(!ext)return json(s,400,{error:"image only"});
      const f=crypto.randomBytes(8).toString("hex")+ext;fs.writeFileSync(path.join(UP,f),await body(q,8e6));return json(s,200,{url:"/uploads/"+f})}
    const base=p.startsWith("/uploads/")?UP:PUB,rel=p.startsWith("/uploads/")?p.slice(9):(p==="/"?"index.html":p.slice(1));
    const fp=path.join(base,rel);
    if(!fp.startsWith(base)||!fs.existsSync(fp)||fs.statSync(fp).isDirectory()){s.writeHead(404);return s.end("Not found")}
    s.writeHead(200,{"Content-Type":T[path.extname(fp)]||"application/octet-stream"});fs.createReadStream(fp).pipe(s);
  }catch(e){json(s,500,{error:"server error"})}
}).listen(PORT,()=>console.log("Recipes running on http://localhost:"+PORT));
