import { useState, useEffect, useCallback } from "react";

const INITIAL_USERS = [
  { username:"Dungle",  password:"2141989", name:"Dũng Lê",  role:"admin" },
  { username:"Quoctri", password:"123456",  name:"Quốc Trí", role:"admin" },
  { username:"Vulinh",  password:"123456",  name:"Vũ Linh",  role:"member" },
  { username:"Anhquan", password:"123456",  name:"Anh Quân", role:"member" },
  { username:"Tuananh", password:"123456",  name:"Tuấn Anh", role:"member" },
  { username:"Hieu",    password:"123456",  name:"Hiếu",     role:"member" },
  { username:"Bachau",  password:"123456",  name:"Ba Châu",  role:"member" },
  { username:"Duong",   password:"123456",  name:"Dương",    role:"member" },
  { username:"Longti",  password:"123456",  name:"Long Tí",  role:"member" },
  { username:"Hoang",   password:"123456",  name:"Hoàng",    role:"member" },
];
const WIN_SCORE=13, FINE=20000, KEY="pickleball_v5";
const fmt=(n)=>Math.round(n).toLocaleString("vi-VN");
const shuffle=(arr)=>{const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const hueOf=(name)=>[...(name||"")].reduce((a,c)=>a+c.charCodeAt(0),0)%360;

function BeerIcon({size=16,color="#f6c90e"}){
  return(
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{display:"inline-block",verticalAlign:"middle"}}>
      <rect x="6" y="9" width="10" height="12" rx="2" fill={color} opacity=".9"/>
      <rect x="6" y="6" width="10" height="4" rx="1" fill={color}/>
      <rect x="8" y="3" width="6" height="4" rx="1" fill={color} opacity=".7"/>
      <rect x="16" y="11" width="3" height="6" rx="1.5" fill={color} opacity=".7"/>
      <rect x="8" y="12" width="2" height="5" rx="1" fill="white" opacity=".25"/>
      <rect x="6" y="9" width="10" height="3" rx="0" fill="white" opacity=".3"/>
    </svg>
  );
}

function BeerBadge({count,size="sm"}){
  if(!count||count===0)return null;
  const bottles=Math.min(count,5);
  const extra=count>5?count-5:0;
  return(
    <span style={{display:"inline-flex",alignItems:"center",gap:1,background:"#1a2a0d",borderRadius:6,padding:"2px 7px",fontSize:size==="sm"?11:13}}>
      {Array.from({length:bottles}).map((_,i)=><BeerIcon key={i} size={size==="sm"?13:16}/>)}
      {extra>0&&<span style={{color:"#9ae6b4",fontWeight:800,marginLeft:2,fontSize:size==="sm"?11:12}}>+{extra}</span>}
      <span style={{color:"#9ae6b4",fontWeight:700,marginLeft:3,fontSize:size==="sm"?10:11}}>{count} chai</span>
    </span>
  );
}

function Avatar({name,id,size=28}){
  const h=hueOf(name);
  return <div style={{width:size,height:size,borderRadius:"50%",background:`hsl(${h},45%,22%)`,border:`${size>30?2:1.5}px solid hsl(${h},55%,42%)`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,color:`hsl(${h},75%,72%)`,fontSize:size*0.42,flexShrink:0}}>{(name||"?").charAt(0)}</div>;
}

// Schedule generator
function generateSchedule(playerIds){
  const n=playerIds.length; if(n<4)return [];
  const mpr=Math.floor(n/4), sit=n-mpr*4;
  const pc={},sc={},plc={};
  playerIds.forEach(p=>{pc[p]={};sc[p]=0;plc[p]=0;});
  const maxR=Math.min(Math.max(n-1,Math.ceil(n*(n-1)/(mpr*4))),20);
  const rounds=[];
  for(let r=0;r<maxR;r++){
    let sitters=[];
    if(sit>0){const sorted=shuffle([...playerIds]).sort((a,b)=>sc[a]!==sc[b]?sc[a]-sc[b]:plc[b]-plc[a]);sitters=sorted.slice(0,sit);}
    const avail=playerIds.filter(p=>!sitters.includes(p));
    const used=new Set(),rm=[];
    for(let m=0;m<mpr;m++){
      const pool=shuffle(avail.filter(p=>!used.has(p))); if(pool.length<4)break;
      let bp=null,bs=Infinity;
      for(let i=0;i<pool.length;i++)for(let j=i+1;j<pool.length;j++){const c=pc[pool[i]][pool[j]]||0;if(c<2&&c<bs){bs=c;bp=[pool[i],pool[j]];}}
      if(!bp)bp=[pool[0],pool[1]];
      const [t1a,t1b]=bp,rest=pool.filter(p=>p!==t1a&&p!==t1b);
      let bo=null,bos=Infinity;
      for(let i=0;i<rest.length;i++)for(let j=i+1;j<rest.length;j++){const p2=pc[rest[i]][rest[j]]||0,oc=[t1a,t1b].reduce((s,a)=>s+(pc[a][rest[i]]||0)+(pc[a][rest[j]]||0),0);if(p2<2&&oc*10+p2<bos){bos=oc*10+p2;bo=[rest[i],rest[j]];}}
      if(!bo&&rest.length>=2)bo=[rest[0],rest[1]]; if(!bo)break;
      const [t2a,t2b]=bo;
      pc[t1a][t1b]=pc[t1b][t1a]=(pc[t1a][t1b]||0)+1;
      pc[t2a][t2b]=pc[t2b][t2a]=(pc[t2a][t2b]||0)+1;
      [t1a,t1b,t2a,t2b].forEach(p=>{used.add(p);plc[p]++;});
      rm.push({id:`r${r}_m${m}`,team1:[t1a,t1b],team2:[t2a,t2b],score1:null,score2:null,winner:null,locked:false});
    }
    sitters.forEach(p=>sc[p]++);
    if(rm.length)rounds.push({roundNum:r+1,matches:rm,sitters});
  }
  return rounds;
}

function calcSession(members,rounds){
  const s={};members.forEach(m=>{s[m.id]={id:m.id,name:m.name,wins:0,losses:0,pf:0,fine:0,played:0};});
  rounds.forEach(r=>r.matches.forEach(m=>{
    if(m.score1===null||m.score2===null)return;
    const s1=+m.score1,s2=+m.score2,w1=s1>s2;
    m.team1.forEach(p=>{if(!s[p])return;s[p].played++;w1?s[p].wins++:(s[p].losses++,s[p].fine+=FINE);s[p].pf+=s1;});
    m.team2.forEach(p=>{if(!s[p])return;s[p].played++;!w1?s[p].wins++:(s[p].losses++,s[p].fine+=FINE);s[p].pf+=s2;});
  }));
  return Object.values(s).filter(x=>x.played>0).sort((a,b)=>b.wins!==a.wins?b.wins-a.wins:b.pf-a.pf);
}

function calcOverall(members,sessions){
  const s={};members.forEach(m=>{s[m.id]={id:m.id,name:m.name,total:0,wins:0,losses:0,pf:0,fine:0};});
  sessions.forEach(sess=>sess.rounds.forEach(r=>r.matches.forEach(m=>{
    if(m.score1===null||m.score2===null)return;
    const s1=+m.score1,s2=+m.score2,w1=s1>s2;
    m.team1.forEach(p=>{if(!s[p])return;s[p].total++;w1?s[p].wins++:(s[p].losses++,s[p].fine+=FINE);s[p].pf+=s1;});
    m.team2.forEach(p=>{if(!s[p])return;s[p].total++;!w1?s[p].wins++:(s[p].losses++,s[p].fine+=FINE);s[p].pf+=s2;});
  })));
  return Object.values(s).filter(x=>x.total>0).sort((a,b)=>{
    if(b.wins!==a.wins)return b.wins-a.wins;
    const ra=a.total?a.wins/a.total:0,rb=b.total?b.wins/b.total:0;
    if(Math.abs(rb-ra)>0.001)return rb-ra;
    return b.pf-a.pf;
  });
}

function getHistory(myId,sessions,members){
  const res=[];
  sessions.forEach(sess=>{
    sess.rounds.forEach(round=>{
      round.matches.forEach(m=>{
        if(m.score1===null||m.score2===null)return;
        const in1=m.team1.includes(myId),in2=m.team2.includes(myId);
        if(!in1&&!in2)return;
        const my=in1?m.team1:m.team2,opp=in1?m.team2:m.team1;
        const ms=in1?+m.score1:+m.score2,os=in1?+m.score2:+m.score1;
        res.push({date:sess.date,sessionId:sess.id,roundNum:round.roundNum,partner:my.filter(p=>p!==myId),opponents:opp,myScore:ms,oppScore:os,won:ms>os});
      });
    });
  });
  return res;
}

function getH2H(myId,sessions,members){
  const h={};
  members.forEach(m=>{if(m.id!==myId)h[m.id]={name:m.name,id:m.id,played:0,wins:0,losses:0,asPartner:0,asOpp:0,partWins:0,oppWins:0};});
  sessions.forEach(sess=>sess.rounds.forEach(r=>r.matches.forEach(m=>{
    if(m.score1===null||m.score2===null)return;
    const in1=m.team1.includes(myId),in2=m.team2.includes(myId);
    if(!in1&&!in2)return;
    const my=in1?m.team1:m.team2,opp=in1?m.team2:m.team1;
    const ms=in1?+m.score1:+m.score2,os=in1?+m.score2:+m.score1,won=ms>os;
    my.filter(p=>p!==myId).forEach(p=>{if(!h[p])return;h[p].asPartner++;h[p].played++;won?h[p].wins++:h[p].losses++;if(won)h[p].partWins++;});
    opp.forEach(p=>{if(!h[p])return;h[p].asOpp++;h[p].played++;won?h[p].wins++:h[p].losses++;if(won)h[p].oppWins++;});
  })));
  return Object.values(h).filter(x=>x.played>0).sort((a,b)=>b.played-a.played);
}

const CSS=`
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
*{box-sizing:border-box;font-family:'Nunito',sans-serif}
::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-thumb{background:#2d3748;border-radius:4px}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-7px)}40%,80%{transform:translateX(7px)}}
.card{background:#131825;border:1px solid #1e2535;border-radius:14px;padding:14px 16px;margin-bottom:12px;animation:slideUp .2s ease}
.btn-g{background:#276749;color:#9ae6b4;border:none;border-radius:10px;padding:10px 16px;font-weight:800;font-size:14px;cursor:pointer;transition:.15s;width:100%}
.btn-g:active{opacity:.85;transform:scale(.98)}
.btn-r{background:#742a2a;color:#fc8181;border:none;border-radius:10px;padding:10px 16px;font-weight:800;font-size:14px;cursor:pointer}
.btn-gray{background:#2d3748;color:#a0aec0;border:none;border-radius:10px;padding:10px 16px;font-weight:800;font-size:14px;cursor:pointer}
.btn-back{background:none;border:none;color:#68d391;font-weight:800;font-size:14px;cursor:pointer;padding:4px 0;display:flex;align-items:center;gap:6px;margin-bottom:14px}
.inp{width:100%;padding:11px 14px;border-radius:10px;border:1.5px solid #2d3748;background:#0d1117;color:#e2e8f0;font-size:14px;outline:none;transition:.2s}
.inp:focus{border-color:#38a169}
.sinp{width:52px;padding:8px 4px;border-radius:8px;border:1.5px solid #2d3748;background:#0d1117;color:#e2e8f0;font-size:20px;font-weight:900;text-align:center;outline:none;-moz-appearance:textfield}
.sinp:focus{border-color:#38a169;background:#0a1a10}
.sinp::-webkit-outer-spin-button,.sinp::-webkit-inner-spin-button{-webkit-appearance:none}
.sinp:disabled{opacity:.5}
.stab{flex:1;padding:7px 4px;background:none;border:none;font-size:12px;cursor:pointer;font-weight:600;border-bottom:2px solid transparent;color:#4a5568;transition:.2s}
.stab.on{border-bottom-color:#38a169;color:#68d391;font-weight:800}
`;

// LOGIN
function Login({onLogin,extraUsers=[]}){
  const [u,setU]=useState(""),[ p,setP]=useState(""),[ err,setErr]=useState(""),[ sh,setSh]=useState(false);
  const allUsers=[...INITIAL_USERS,...extraUsers.filter(x=>!INITIAL_USERS.find(iu=>iu.username.toLowerCase()===x.username?.toLowerCase()))];
  function go(){
    const user=allUsers.find(x=>x.username.toLowerCase()===u.toLowerCase()&&x.password===p);
    if(user)onLogin(user); else{setErr("Sai tên đăng nhập hoặc mật khẩu");setSh(true);setTimeout(()=>setSh(false),600);}
  }
  return(
    <div style={{minHeight:"100vh",background:"#0d1117",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <style>{CSS}</style>
      <div style={{width:"100%",maxWidth:380,animation:"fadeIn .4s ease"}}>
        <div style={{textAlign:"center",marginBottom:28}}><div style={{fontSize:52,marginBottom:6}}>🏓</div><div style={{fontSize:24,fontWeight:900,color:"#68d391"}}>Pickleball Club</div><div style={{fontSize:13,color:"#4a7c59",marginTop:4}}>Hệ thống quản lý thi đấu</div></div>
        <div style={{background:"#131825",border:"1px solid #1e2535",borderRadius:18,padding:"22px 18px",animation:sh?"shake .5s":"none"}}>
          <div style={{marginBottom:12}}><div style={{fontSize:10,color:"#4a5568",fontWeight:800,textTransform:"uppercase",letterSpacing:".07em",marginBottom:6}}>Tên đăng nhập</div><input className="inp" value={u} onChange={e=>setU(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} placeholder="Username..." autoCapitalize="none"/></div>
          <div style={{marginBottom:18}}><div style={{fontSize:10,color:"#4a5568",fontWeight:800,textTransform:"uppercase",letterSpacing:".07em",marginBottom:6}}>Mật khẩu</div><input type="password" className="inp" value={p} onChange={e=>setP(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} placeholder="••••••"/></div>
          {err&&<div style={{color:"#fc8181",fontSize:12,fontWeight:700,marginBottom:12,textAlign:"center"}}>⚠️ {err}</div>}
          <button className="btn-g" onClick={go} style={{fontSize:15,padding:13,borderRadius:12}}>Đăng nhập →</button>
        </div>
        <div style={{marginTop:14,background:"#0f1828",border:"1px solid #1e2535",borderRadius:14,padding:"12px 14px"}}>
          <div style={{fontSize:10,color:"#4a5568",fontWeight:800,marginBottom:10,textTransform:"uppercase",letterSpacing:".06em"}}>Chọn nhanh thành viên</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
            {allUsers.map(x=>(
              <button key={x.username} onClick={()=>setU(x.username)} style={{padding:"7px 10px",borderRadius:9,border:`1.5px solid ${u===x.username?"#38a169":"transparent"}`,background:u===x.username?"#1a3a27":"#131825",cursor:"pointer",display:"flex",alignItems:"center",gap:8}}>
                <Avatar name={x.name} id={x.username} size={26}/>
                <div style={{textAlign:"left"}}><div style={{fontSize:12,fontWeight:800,color:x.role==="admin"?"#f6c90e":"#c4cfe0"}}>{x.role==="admin"?"👑 ":""}{x.name}</div><div style={{fontSize:10,color:"#4a5568"}}>@{x.username}</div></div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// MAIN APP
export default function App(){
  const [db,setDb]=useState(null),[ load,setLoad]=useState(true),[ user,setUser]=useState(null),[ tab,setTab]=useState("session"),[ toast,setToast]=useState(null);
  useEffect(()=>{
    async function loadData(){
      try{const r=await window.storage.get(KEY,true);if(r?.value)setDb(JSON.parse(r.value));else{const m=INITIAL_USERS.map((u,i)=>({id:(i+1).toString(),name:u.name,username:u.username,role:u.role,password:u.password}));setDb({members:m,sessions:[],activeSession:null});}}
      catch{const m=INITIAL_USERS.map((u,i)=>({id:(i+1).toString(),name:u.name,username:u.username,role:u.role,password:u.password}));setDb({members:m,sessions:[],activeSession:null});}
      setLoad(false);
    }loadData();
  },[]);
  const save=useCallback(async(d)=>{setDb(d);try{await window.storage.set(KEY,JSON.stringify(d),true);}catch{}},[]);
  const showToast=(msg,type="success")=>{setToast({msg,type});setTimeout(()=>setToast(null),2500);};

  if(load)return(<div style={{minHeight:"100vh",background:"#0d1117",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}><style>{CSS}</style><div style={{width:44,height:44,border:"3px solid #38a169",borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite"}}/><div style={{color:"#68d391",marginTop:14,fontWeight:600}}>Đang tải...</div></div>);
  // Build extraUsers list from db for login (members added via UI)
  const extraUsers=(db?.members||[]).filter(m=>m.password).map(m=>({username:m.username,password:m.password,name:m.name,role:m.role}));
  if(!user)return <Login onLogin={setUser} extraUsers={extraUsers}/>;

  const isAdmin=user.role==="admin";
  const {members,sessions,activeSession}=db;

  return(
    <div style={{minHeight:"100vh",background:"#0d1117",color:"#e2e8f0",maxWidth:520,margin:"0 auto"}}>
      <style>{CSS}</style>
      <div style={{background:"linear-gradient(135deg,#1a2a1a,#0d1f1a)",borderBottom:"1px solid #1e3a2a",padding:"13px 14px 0",position:"sticky",top:0,zIndex:50}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:20}}>🏓</span><div><div style={{fontWeight:900,fontSize:15,color:"#68d391"}}>Pickleball Club</div><div style={{fontSize:10,color:"#4a7c59"}}>{members.length} thành viên · {sessions.length} buổi</div></div></div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{textAlign:"right"}}><div style={{fontSize:13,fontWeight:800,color:isAdmin?"#f6c90e":"#e2e8f0"}}>{isAdmin?"👑 ":""}{user.name}</div><div style={{fontSize:10,color:"#4a5568"}}>{isAdmin?"Quản trị viên":"Thành viên"}</div></div>
            {isAdmin&&<button onClick={()=>{const d=JSON.stringify(db);const a=document.createElement("a");a.href="data:text/json;charset=utf-8,"+encodeURIComponent(d);a.download="pickleball-backup-"+new Date().toLocaleDateString("vi-VN").replace(/\//g,"-")+".json";a.click();}} style={{background:"#1a2535",border:"1px solid #276749",borderRadius:8,padding:"5px 8px",color:"#4a7c59",fontSize:11,fontWeight:700,cursor:"pointer"}} title="Xuất dữ liệu backup">💾</button>}
            {isAdmin&&<label style={{background:"#1a2535",border:"1px solid #276749",borderRadius:8,padding:"5px 8px",color:"#4a7c59",fontSize:11,fontWeight:700,cursor:"pointer"}} title="Nhập dữ liệu từ backup"><input type="file" accept=".json" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>{try{const d=JSON.parse(ev.target.result);save(d);showToast("Đã nhập dữ liệu thành công!");}catch{showToast("File không hợp lệ","error");}};r.readAsText(f);e.target.value="";}}/>📥</label>}
            <button onClick={()=>setUser(null)} style={{background:"#1a2535",border:"1px solid #2d3748",borderRadius:8,padding:"5px 10px",color:"#4a5568",fontSize:11,fontWeight:700,cursor:"pointer"}}>Đăng xuất</button>
          </div>
        </div>
        <div style={{display:"flex"}}>
          {[["session","🏸 Thi đấu"],["standings","🏆 Tổng sắp"],["personal","👤 Của tôi"],["members","👥 TV"]].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)} style={{flex:1,padding:"8px 4px",background:"none",border:"none",borderBottom:`2.5px solid ${tab===k?"#38a169":"transparent"}`,color:tab===k?"#68d391":"#4a5568",fontWeight:tab===k?900:600,fontSize:11,cursor:"pointer",whiteSpace:"nowrap"}}>{l}</button>
          ))}
        </div>
      </div>
      <div style={{padding:14,paddingBottom:36}}>
        {tab==="members"&&<Members db={db} isAdmin={isAdmin} save={save} showToast={showToast}/>}
        {tab==="session"&&<Session db={db} isAdmin={isAdmin} save={save} showToast={showToast}/>}
        {tab==="standings"&&<Standings members={members} sessions={sessions}/>}
        {tab==="personal"&&<Personal db={db} currentUser={user}/>}
      </div>
      {toast&&<div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:toast.type==="success"?"#276749":"#742a2a",color:toast.type==="success"?"#9ae6b4":"#fc8181",padding:"10px 22px",borderRadius:12,fontWeight:800,fontSize:13,zIndex:1000,animation:"fadeIn .2s",whiteSpace:"nowrap",boxShadow:"0 4px 20px rgba(0,0,0,.5)"}}>{toast.msg}</div>}
    </div>
  );
}

// MEMBERS
const DEFAULT_PASSWORD="123456";
function Members({db,isAdmin,save,showToast}){
  const {members}=db;
  const [nm,setNm]=useState(""),[ nu,setNu]=useState(""),[ nr,setNr]=useState("member"),[ np,setNp]=useState(DEFAULT_PASSWORD);
  const [resetId,setResetId]=useState(null),[ resetPw,setResetPw]=useState("");
  function add(){if(!isAdmin){showToast("Chỉ Admin","error");return;}if(!nm.trim()||!nu.trim()){showToast("Nhập đủ thông tin","error");return;}if(members.find(m=>m.username?.toLowerCase()===nu.toLowerCase())){showToast("Username đã tồn tại","error");return;}const pw=np.trim()||DEFAULT_PASSWORD;save({...db,members:[...members,{id:Date.now().toString(),name:nm.trim(),username:nu.trim(),role:nr,password:pw}]});setNm("");setNu("");setNp(DEFAULT_PASSWORD);showToast("Đã thêm "+nm.trim()+" (MK: "+pw+")");}
  function doReset(id){if(!isAdmin)return;const m=members.find(x=>x.id===id);if(!m)return;const pw=resetPw.trim()||DEFAULT_PASSWORD;save({...db,members:members.map(x=>x.id===id?{...x,password:pw}:x)});setResetId(null);setResetPw("");showToast("Đã đổi MK "+m.name+" -> "+pw);}
  function del(id){if(!isAdmin){showToast("Chỉ Admin","error");return;}if(!window.confirm("Xoá?"))return;save({...db,members:members.filter(m=>m.id!==id)});showToast("Đã xoá");}
  return(
    <div>
      {isAdmin&&<div className="card"><div style={{fontSize:11,color:"#4a7c59",fontWeight:800,marginBottom:10,textTransform:"uppercase",letterSpacing:".06em"}}>Thêm thành viên mới</div><div style={{display:"flex",flexDirection:"column",gap:8}}><input className="inp" value={nm} onChange={e=>setNm(e.target.value)} placeholder="Tên hiển thị..."/><div style={{display:"flex",gap:8}}><input className="inp" value={nu} onChange={e=>setNu(e.target.value)} placeholder="Username..." style={{flex:1}} autoCapitalize="none"/><select value={nr} onChange={e=>setNr(e.target.value)} style={{padding:"11px 10px",borderRadius:10,border:"1.5px solid #2d3748",background:"#0d1117",color:"#e2e8f0",fontSize:13,outline:"none"}}><option value="member">Thành viên</option><option value="admin">Admin</option></select></div><input className="inp" type="text" value={np} onChange={e=>setNp(e.target.value)} placeholder={"MK mac dinh: "+DEFAULT_PASSWORD}/><button className="btn-g" onClick={add} style={{padding:11,fontSize:14,borderRadius:11}}>+ Thêm thành viên</button></div></div>}
      <div style={{fontSize:11,color:"#4a5568",fontWeight:700,marginBottom:10,textTransform:"uppercase",letterSpacing:".06em"}}>Danh sách · {members.length} người</div>
      {resetId&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:20}}>
          <div style={{background:"#1a2535",border:"1px solid #2d3748",borderRadius:16,padding:"22px 18px",maxWidth:320,width:"100%"}}>
            <div style={{fontWeight:800,fontSize:15,marginBottom:14}}>🔑 Đổi mật khẩu</div>
            <div style={{fontSize:12,color:"#4a5568",marginBottom:10}}>{members.find(x=>x.id===resetId)?.name} · @{members.find(x=>x.id===resetId)?.username}</div>
            <input className="inp" type="text" value={resetPw} onChange={e=>setResetPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doReset(resetId)} placeholder={"MK moi (bo trong = "+DEFAULT_PASSWORD+")"} autoFocus/>
            <div style={{display:"flex",gap:8,marginTop:12}}>
              <button onClick={()=>{setResetId(null);setResetPw("");}} className="btn-gray" style={{flex:1,padding:"9px 0",fontSize:13,width:"auto"}}>Huỷ</button>
              <button onClick={()=>doReset(resetId)} className="btn-g" style={{flex:1,padding:"9px 0",fontSize:13}}>Lưu mật khẩu</button>
            </div>
          </div>
        </div>
      )}
      {members.map(m=>(
        <div key={m.id} className="card" style={{display:"flex",alignItems:"center",padding:"11px 14px",marginBottom:8}}>
          <Avatar name={m.name} id={m.id} size={36}/>
          <div style={{flex:1,marginLeft:12}}>
            <div style={{fontWeight:800,fontSize:14}}>{m.role==="admin"&&"👑 "}{m.name}</div>
            <div style={{fontSize:11,color:"#4a5568"}}>@{m.username} · {m.role==="admin"?"Admin":"Thành viên"}</div>
            {isAdmin&&<div style={{fontSize:11,color:"#2d4a6a",marginTop:2}}>MK: {m.password?"•".repeat(m.password.length):"chưa có"}</div>}
          </div>
          {isAdmin&&<div style={{display:"flex",gap:6}}>
            <button onClick={()=>{setResetId(m.id);setResetPw("");}} style={{background:"#1a2a3a",border:"1px solid #2d4a6a",borderRadius:8,padding:"5px 10px",fontSize:11,color:"#60a5fa",cursor:"pointer",fontWeight:700}}>🔑</button>
            <button className="btn-r" onClick={()=>del(m.id)} style={{padding:"5px 12px",fontSize:12}}>Xoá</button>
          </div>}
        </div>
      ))}
    </div>
  );
}

// SESSION
function Session({db,isAdmin,save,showToast}){
  const {members,sessions,activeSession}=db;
  const [sel,setSel]=useState({});
  const [view,setView]=useState(activeSession?"matches":"setup");
  const [confirm,setConfirm]=useState(false);
  useEffect(()=>{setView(activeSession?"matches":"setup");},[activeSession]);
  const gn=(id)=>members.find(m=>m.id===id)?.name||id;

  function create(){
    const ids=Object.entries(sel).filter(([,v])=>v).map(([k])=>k);
    if(ids.length<4){showToast("Cần ít nhất 4 người","error");return;}
    const rounds=generateSchedule(ids);
    const mpr=Math.floor(ids.length/4);
    save({...db,activeSession:{id:Date.now().toString(),date:new Date().toLocaleDateString("vi-VN"),players:ids,rounds,finished:false,matchesPerRound:mpr,sitOutPerRound:ids.length-mpr*4}});
    showToast(`Đã tạo lịch! ${rounds.length} vòng, ${mpr} trận/vòng`);
  }

  function finish(force=false){
    if(!isAdmin){showToast("Chỉ Admin","error");return;}
    const total=activeSession.rounds.flatMap(r=>r.matches).length;
    const done=activeSession.rounds.flatMap(r=>r.matches).filter(m=>m.score1!==null&&m.score2!==null).length;
    if(done<total&&!force){setConfirm(true);return;}
    setConfirm(false);
    save({...db,activeSession:null,sessions:[...sessions,{...activeSession,finished:true}]});
    showToast("✅ Đã lưu kết quả!");setView("summary");
  }

  function cancel(){if(!isAdmin){showToast("Chỉ Admin","error");return;}if(!window.confirm("Huỷ buổi?"))return;save({...db,activeSession:null});setSel({});}

  function upScore(ri,mi,team,val){
    const v=val===""?null:Math.max(0,Math.min(WIN_SCORE,+val));
    const upd={...activeSession};
    upd.rounds=upd.rounds.map((r,rI)=>rI!==ri?r:{...r,matches:r.matches.map((m,mI)=>{if(mI!==mi)return m;const nm={...m,[team===1?"score1":"score2"]:v};if(nm.score1!==null&&nm.score2!==null)nm.winner=nm.score1>nm.score2?1:2;else nm.winner=null;return nm;})});
    save({...db,activeSession:upd});
  }

  function lock(ri,mi){if(!isAdmin){showToast("Chỉ Admin","error");return;}const upd={...activeSession};upd.rounds=upd.rounds.map((r,rI)=>rI!==ri?r:{...r,matches:r.matches.map((m,mI)=>mI!==mi?m:{...m,locked:!m.locked})});save({...db,activeSession:upd});}

  const last=sessions[sessions.length-1];
  if(view==="summary"&&last){
    const st=calcSession(members,last.rounds);
    return(
      <div style={{animation:"fadeIn .3s ease"}}>
        <div style={{textAlign:"center",padding:"8px 0 20px"}}><div style={{fontSize:44}}>🏆</div><div style={{fontWeight:900,fontSize:20,color:"#68d391",marginTop:8}}>Kết quả buổi {last.date}</div><div style={{fontSize:12,color:"#4a7c59",marginTop:4}}>{last.rounds.flatMap(r=>r.matches).filter(m=>m.score1!==null).length}/{last.rounds.flatMap(r=>r.matches).length} trận đã đánh</div></div>
        <div className="card">
          <div style={{fontWeight:800,color:"#68d391",marginBottom:12}}>📊 Bảng xếp hạng buổi</div>
          {st.length===0&&<div style={{color:"#4a5568",fontSize:13}}>Chưa có trận nào</div>}
          {st.map((s,i)=>(<div key={s.id} style={{display:"flex",alignItems:"center",padding:"10px 0",borderBottom:i<st.length-1?"1px solid #1e2535":"none"}}><div style={{width:28,fontSize:16,fontWeight:900,color:["#f6c90e","#c0c0c0","#cd7f32"][i]||"#4a5568"}}>{["🥇","🥈","🥉"][i]||`${i+1}.`}</div><div style={{flex:1,fontWeight:800}}>{s.name}</div><span style={{color:"#68d391",fontWeight:800,marginRight:6}}>{s.wins}W</span><span style={{color:"#fc8181",fontWeight:800,marginRight:8}}>{s.losses}L</span>{s.fine>0&&<BeerBadge count={s.losses}/>}</div>))}
          {st.reduce((a,x)=>a+x.fine,0)>0&&<div style={{marginTop:12,paddingTop:12,borderTop:"1px solid #1e2535",display:"flex",justifyContent:"space-between"}}><span style={{fontWeight:700,color:"#a0aec0"}}>🍺 Tổng đóng góp</span><span style={{fontWeight:900,color:"#9ae6b4"}}>{st.reduce((a,x)=>a+x.losses,0)} chai</span></div>}
        </div>
        <button className="btn-gray" onClick={()=>setView("setup")} style={{width:"100%",marginTop:4}}>← Tạo buổi mới</button>
      </div>
    );
  }

  if(!activeSession){
    const sc=Object.values(sel).filter(Boolean).length,mpr=Math.floor(sc/4);
    return(
      <div>
        <div className="card">
          <div style={{fontWeight:800,fontSize:15,marginBottom:4}}>Chọn người tham gia hôm nay</div>
          {sc>=4&&<div style={{fontSize:12,color:"#68d391",fontWeight:700,marginBottom:10,background:"#1a3a27",borderRadius:8,padding:"6px 10px"}}>✅ {sc} người → {mpr} trận/vòng · {sc-mpr*4} người nghỉ/vòng</div>}
          <div style={{display:"flex",gap:8,marginBottom:12}}>
            <button className="btn-gray" onClick={()=>{const s={};members.forEach(m=>s[m.id]=true);setSel(s);}} style={{padding:"7px 14px",fontSize:12,width:"auto"}}>Chọn tất cả</button>
            <button className="btn-gray" onClick={()=>setSel({})} style={{padding:"7px 14px",fontSize:12,width:"auto"}}>Bỏ chọn</button>
            <span style={{marginLeft:"auto",background:"#1a2535",padding:"7px 12px",borderRadius:8,fontSize:13,fontWeight:800,color:"#68d391"}}>{sc}/{members.length}</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {members.map(m=>(<button key={m.id} onClick={()=>setSel(s=>({...s,[m.id]:!s[m.id]}))} style={{padding:"10px 12px",borderRadius:10,border:`1.5px solid ${sel[m.id]?"#38a169":"#2d3748"}`,background:sel[m.id]?"#1a3a27":"#131825",color:sel[m.id]?"#68d391":"#718096",fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:8,fontSize:14}}><span>{sel[m.id]?"✅":"⬜"}</span>{m.name}</button>))}
          </div>
        </div>
        <button className="btn-g" onClick={create} style={{padding:14,fontSize:15,borderRadius:12}}>🎾 Tạo lịch thi đấu ngẫu nhiên</button>
      </div>
    );
  }

  const allM=activeSession.rounds.flatMap(r=>r.matches);
  const done=allM.filter(m=>m.score1!==null&&m.score2!==null).length,total=allM.length;
  const pct=total?Math.round(done/total*100):0;
  const st2=calcSession(members,activeSession.rounds);

  return(
    <div>
      {confirm&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:20}}>
          <div style={{background:"#1a2535",border:"1px solid #2d3748",borderRadius:16,padding:"24px 20px",maxWidth:320,width:"100%",textAlign:"center"}}>
            <div style={{fontSize:32,marginBottom:10}}>⚠️</div>
            <div style={{fontWeight:800,fontSize:15,marginBottom:8}}>Kết thúc sớm?</div>
            <div style={{fontSize:13,color:"#a0aec0",marginBottom:20,lineHeight:1.6}}>Còn <strong style={{color:"#fc8181"}}>{total-done} trận</strong> chưa có kết quả. Chỉ tính trận đã hoàn thành.</div>
            <div style={{display:"flex",gap:10}}><button onClick={()=>setConfirm(false)} className="btn-gray" style={{flex:1,padding:"10px 0",fontSize:13,width:"auto"}}>Quay lại</button><button onClick={()=>finish(true)} className="btn-g" style={{flex:1,padding:"10px 0",fontSize:13}}>Kết thúc</button></div>
          </div>
        </div>
      )}
      <div className="card" style={{padding:"12px 14px"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontWeight:900,color:"#68d391"}}>Buổi {activeSession.date}</span><span style={{fontSize:12,fontWeight:700,color:"#4a7c59"}}>{done}/{total} ({pct}%)</span></div>
        <div style={{fontSize:11,color:"#4a5568",marginBottom:6}}>{activeSession.players.length} người · {activeSession.matchesPerRound} trận/vòng · {activeSession.sitOutPerRound} nghỉ/vòng</div>
        <div style={{background:"#1a2535",borderRadius:6,height:5,overflow:"hidden",marginBottom:10}}><div style={{height:"100%",width:pct+"%",background:"#276749",transition:".3s"}}/></div>
        <div style={{display:"flex",gap:8}}>
          {isAdmin&&<button onClick={()=>finish(false)} className="btn-g" style={{flex:1,padding:"9px 0",fontSize:13,borderRadius:10}}>{done===total?"✅ Kết thúc buổi":`⏹ Kết thúc (${done}/${total})`}</button>}
          {isAdmin&&<button className="btn-r" onClick={cancel} style={{padding:"9px 14px",fontSize:13}}>Huỷ</button>}
          {!isAdmin&&<div style={{fontSize:12,color:"#4a5568",padding:"9px 0"}}>Nhập điểm trận đấu bên dưới</div>}
        </div>
      </div>

      {activeSession.rounds.map((round,ri)=>(
        <div key={ri} className="card">
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <div style={{fontSize:12,fontWeight:900,color:"#68d391",textTransform:"uppercase",letterSpacing:".08em"}}>Vòng {round.roundNum}</div>
            {round.sitters?.length>0&&<div style={{fontSize:11,color:"#4a5568"}}>Nghỉ: {round.sitters.map(id=>gn(id)).join(", ")}</div>}
          </div>
          {round.matches.map((match,mi)=>{
            const h1=hueOf(gn(match.team1[0])||""),h2=hueOf(gn(match.team2[0])||"");
            return(
              <div key={match.id} style={{background:"#0d1117",borderRadius:12,padding:12,marginBottom:mi<round.matches.length-1?8:0,border:`1px solid ${match.winner===1?"#276749":match.winner===2?"#742a2a":"#1e2535"}`}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                  <div style={{flex:1}}>{match.team1.map(pid=>(<div key={pid} style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}><Avatar name={gn(pid)} id={pid} size={22}/><span style={{fontSize:13,fontWeight:800,color:match.winner===1?"#68d391":match.winner===2?"#fc8181":"#e2e8f0"}}>{gn(pid)}</span></div>))}</div>
                  <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                    <input type="number" min={0} max={WIN_SCORE} className="sinp" value={match.score1??""} onChange={e=>!match.locked&&upScore(ri,mi,1,e.target.value)} disabled={match.locked} style={{color:match.winner===1?"#68d391":"#e2e8f0"}}/>
                    <span style={{color:"#4a5568",fontWeight:900,fontSize:18}}>–</span>
                    <input type="number" min={0} max={WIN_SCORE} className="sinp" value={match.score2??""} onChange={e=>!match.locked&&upScore(ri,mi,2,e.target.value)} disabled={match.locked} style={{color:match.winner===2?"#68d391":"#e2e8f0"}}/>
                  </div>
                  <div style={{flex:1,textAlign:"right"}}>{match.team2.map(pid=>(<div key={pid} style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:6,marginBottom:2}}><span style={{fontSize:13,fontWeight:800,color:match.winner===2?"#68d391":match.winner===1?"#fc8181":"#e2e8f0"}}>{gn(pid)}</span><Avatar name={gn(pid)} id={pid} size={22}/></div>))}</div>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8}}>
                  <div style={{fontSize:11,fontWeight:800,color:match.winner===1?"#68d391":"#fc8181"}}>{match.winner?`✅ ${(match.winner===1?match.team1:match.team2).map(gn).join(" & ")} thắng`:""}</div>
                  {isAdmin&&<button onClick={()=>lock(ri,mi)} style={{background:match.locked?"#1e3a27":"#1a2535",border:`1px solid ${match.locked?"#276749":"#2d3748"}`,borderRadius:6,padding:"3px 10px",fontSize:11,color:match.locked?"#68d391":"#4a5568",cursor:"pointer",fontWeight:700}}>{match.locked?"🔒 Đã khoá":"🔓 Khoá"}</button>}
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {st2.length>0&&(
        <div className="card">
          <div style={{fontWeight:800,color:"#68d391",marginBottom:10}}>📊 Bảng tạm thời</div>
          {st2.map((s,i)=>(<div key={s.id} style={{display:"flex",alignItems:"center",padding:"7px 0",borderBottom:i<st2.length-1?"1px solid #1e2535":"none"}}><span style={{width:24,fontWeight:900,fontSize:15,color:["#f6c90e","#c0c0c0","#cd7f32"][i]||"#4a5568"}}>{["🥇","🥈","🥉"][i]||`${i+1}`}</span><span style={{flex:1,fontWeight:700}}>{s.name}</span><span style={{color:"#4a7c59",fontSize:11,marginRight:6}}>{s.played}tr</span><span style={{color:"#68d391",fontWeight:800,marginRight:6}}>{s.wins}W</span><span style={{color:"#fc8181",fontWeight:800,marginRight:8}}>{s.losses}L</span>{s.fine>0&&<BeerBadge count={s.losses}/>}</div>))}
        </div>
      )}
    </div>
  );
}

// STANDINGS
function Standings({members,sessions}){
  const [detail,setDetail]=useState(null);
  const stats=calcOverall(members,sessions);
  const gn=(id)=>members.find(m=>m.id===id)?.name||id;

  if(detail){
    const sess=sessions.find(s=>s.id===detail);
    if(!sess){setDetail(null);return null;}
    const st=calcSession(members,sess.rounds);
    return(
      <div style={{animation:"fadeIn .25s ease"}}>
        <button className="btn-back" onClick={()=>setDetail(null)}>← Quay lại tổng sắp</button>
        <div style={{marginBottom:16}}><div style={{fontWeight:900,fontSize:18,color:"#68d391"}}>📅 Buổi {sess.date}</div><div style={{fontSize:12,color:"#4a7c59",marginTop:2}}>{sess.players?.length||0} người · {sess.rounds.flatMap(r=>r.matches).filter(m=>m.score1!==null&&m.score2!==null).length} trận đã đánh</div></div>
        <div className="card">
          <div style={{fontWeight:800,color:"#68d391",marginBottom:10}}>🏅 Xếp hạng buổi</div>
          {st.map((s,i)=>(<div key={s.id} style={{display:"flex",alignItems:"center",padding:"9px 0",borderBottom:i<st.length-1?"1px solid #1e2535":"none"}}><div style={{width:28,fontSize:15,fontWeight:900,color:["#f6c90e","#c0c0c0","#cd7f32"][i]||"#4a5568"}}>{["🥇","🥈","🥉"][i]||`${i+1}.`}</div><div style={{flex:1,fontWeight:800}}>{s.name}</div><span style={{color:"#4a7c59",fontSize:11,marginRight:6}}>{s.played}tr</span><span style={{color:"#68d391",fontWeight:800,marginRight:6}}>{s.wins}W</span><span style={{color:"#fc8181",fontWeight:800,marginRight:8}}>{s.losses}L</span>{s.fine>0&&<BeerBadge count={s.losses}/>}</div>))}
          {st.reduce((a,x)=>a+x.fine,0)>0&&<div style={{marginTop:10,paddingTop:10,borderTop:"1px solid #1e2535",display:"flex",justifyContent:"space-between"}}><span style={{fontWeight:700,color:"#a0aec0",fontSize:13}}>🍺 Tổng đóng góp</span><span style={{fontWeight:900,color:"#9ae6b4"}}>{st.reduce((a,x)=>a+x.losses,0)} chai</span></div>}
        </div>
        <div style={{fontSize:11,color:"#4a5568",fontWeight:700,marginBottom:8,textTransform:"uppercase",letterSpacing:".06em"}}>Chi tiết các trận</div>
        {sess.rounds.map((round,ri)=>(
          <div key={ri} className="card">
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><div style={{fontSize:11,fontWeight:900,color:"#68d391",textTransform:"uppercase",letterSpacing:".07em"}}>Vòng {round.roundNum}</div>{round.sitters?.length>0&&<div style={{fontSize:11,color:"#4a5568"}}>Nghỉ: {round.sitters.map(gn).join(", ")}</div>}</div>
            {round.matches.map((m,mi)=>{
              if(m.score1===null||m.score2===null)return(<div key={m.id} style={{padding:"8px 10px",background:"#0d1117",borderRadius:8,marginBottom:mi<round.matches.length-1?6:0,fontSize:12,color:"#4a5568",fontStyle:"italic"}}>{m.team1.map(gn).join(" & ")} vs {m.team2.map(gn).join(" & ")} — Chưa có kết quả</div>);
              return(<div key={m.id} style={{display:"flex",alignItems:"center",padding:"8px 10px",background:"#0d1117",borderRadius:8,marginBottom:mi<round.matches.length-1?6:0,border:`1px solid ${m.winner===1?"#1e3a27":"#3a1e1e"}`}}>
                <div style={{flex:1}}>{m.team1.map(pid=>(<div key={pid} style={{fontSize:12,fontWeight:800,color:m.winner===1?"#68d391":"#fc8181"}}>{gn(pid)}</div>))}</div>
                <div style={{padding:"2px 12px",fontFamily:"monospace",fontWeight:900,fontSize:16,flexShrink:0}}><span style={{color:m.winner===1?"#68d391":"#fc8181"}}>{m.score1}</span><span style={{color:"#4a5568",margin:"0 4px"}}>–</span><span style={{color:m.winner===2?"#68d391":"#fc8181"}}>{m.score2}</span></div>
                <div style={{flex:1,textAlign:"right"}}>{m.team2.map(pid=>(<div key={pid} style={{fontSize:12,fontWeight:800,color:m.winner===2?"#68d391":"#fc8181"}}>{gn(pid)}</div>))}</div>
              </div>);
            })}
          </div>
        ))}
      </div>
    );
  }

  if(!stats.length)return(<div style={{textAlign:"center",padding:"48px 16px",color:"#4a5568"}}><div style={{fontSize:40,marginBottom:12}}>🏆</div><div style={{fontWeight:700,fontSize:16}}>Chưa có dữ liệu</div></div>);

  const topFine=[...stats].sort((a,b)=>b.fine-a.fine)[0];
  const botFine=[...stats].sort((a,b)=>a.fine-b.fine)[0];

  return(
    <div>
      <div className="card" style={{background:"linear-gradient(135deg,#1a2a1a,#0d1f1a)",border:"1px solid #276749"}}>
        <div style={{fontWeight:900,color:"#68d391",marginBottom:12,textTransform:"uppercase",letterSpacing:".06em",fontSize:11}}>🎖️ Vinh danh CLB</div>
        <div style={{display:"flex",gap:10}}>
          {[{icon:"💰",label:"Cống hiến nhiều nhất",m:topFine,c:"#f6c90e",vc:"#fc8181"},{icon:"🌟",label:"Cống hiến ít nhất",m:botFine,c:"#68d391",vc:"#68d391"}].map(({icon,label,m,c,vc})=>(
            <div key={label} style={{flex:1,background:"#0d1117",borderRadius:10,padding:"10px 12px"}}><div style={{fontSize:20,marginBottom:4}}>{icon}</div><div style={{fontSize:10,color:"#4a7c59",fontWeight:800,textTransform:"uppercase",marginBottom:4}}>{label}</div><div style={{fontWeight:900,color:c,fontSize:14}}>{m?.name||"—"}</div><div style={{marginTop:4,display:"flex",alignItems:"center",gap:2,flexWrap:"wrap"}}>{Array.from({length:Math.min(m?Math.floor(m.fine/FINE):0,5)}).map((_,i)=><BeerIcon key={i} size={16}/>)}{m&&Math.floor(m.fine/FINE)>5&&<span style={{color:"#9ae6b4",fontSize:11,fontWeight:800}}>+{Math.floor(m.fine/FINE)-5}</span>}</div><div style={{fontSize:11,color:vc,fontWeight:700,marginTop:2}}>{m?`${Math.floor(m.fine/FINE)} chai`:"0 chai"}</div></div>
          ))}
        </div>
      </div>

      <div className="card" style={{padding:"12px 0"}}>
        <div style={{fontWeight:900,color:"#68d391",fontSize:14,padding:"0 14px",marginBottom:10}}>Bảng tổng sắp · {sessions.length} buổi</div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead><tr style={{borderBottom:"1px solid #1e2535"}}>{["#","Tên","Trận","W","L","Điểm","Tỉ lệ","Đóng góp 🍺"].map((h,i)=>(<th key={i} style={{padding:"6px 10px",textAlign:i>1?"center":"left",color:"#4a5568",fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:".04em",whiteSpace:"nowrap"}}>{h}</th>))}</tr></thead>
            <tbody>
              {stats.map((s,i)=>(<tr key={s.id} style={{borderBottom:"1px solid #1e2535",background:i%2?"rgba(255,255,255,.01)":"transparent"}}>
                <td style={{padding:"9px 10px",fontWeight:900,fontSize:15,color:["#f6c90e","#c0c0c0","#cd7f32"][i]||"#4a5568"}}>{["🥇","🥈","🥉"][i]||i+1}</td>
                <td style={{padding:"9px 10px",fontWeight:800}}>{s.name}</td>
                <td style={{padding:"9px 10px",textAlign:"center",color:"#718096"}}>{s.total}</td>
                <td style={{padding:"9px 10px",textAlign:"center",color:"#68d391",fontWeight:800}}>{s.wins}</td>
                <td style={{padding:"9px 10px",textAlign:"center",color:"#fc8181",fontWeight:800}}>{s.losses}</td>
                <td style={{padding:"9px 10px",textAlign:"center",fontWeight:900}}>{s.wins}</td>
                <td style={{padding:"9px 10px",textAlign:"center",color:"#a0aec0"}}>{s.total?(s.wins/s.total*100).toFixed(0):0}%</td>
                <td style={{padding:"9px 10px",textAlign:"center",fontWeight:800,color:s.losses>0?"#f6c90e":"#4a5568"}}>{s.losses>0?s.losses+"🍺":""}</td>
              </tr>))}
            </tbody>
          </table>
        </div>
        <div style={{padding:"6px 14px 0",fontSize:11,color:"#4a5568"}}>Xếp theo: Điểm (W) → Tỉ lệ W/Tổng → Tổng điểm ghi</div>
      </div>

      <div style={{fontSize:11,color:"#4a5568",fontWeight:700,marginBottom:8,textTransform:"uppercase",letterSpacing:".06em"}}>Lịch sử các buổi · bấm để xem chi tiết</div>
      {[...sessions].reverse().map((sess)=>{
        const st=calcSession(members,sess.rounds);
        const done=sess.rounds.flatMap(r=>r.matches).filter(m=>m.score1!==null&&m.score2!==null).length;
        const top=st[0];
        return(
          <button key={sess.id} onClick={()=>setDetail(sess.id)} style={{width:"100%",background:"#131825",border:"1px solid #1e2535",borderRadius:12,padding:"12px 14px",marginBottom:8,cursor:"pointer",textAlign:"left",transition:".15s"}} onMouseOver={e=>e.currentTarget.style.borderColor="#276749"} onMouseOut={e=>e.currentTarget.style.borderColor="#1e2535"}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div><div style={{fontWeight:800,fontSize:14,color:"#e2e8f0"}}>📅 Buổi {sess.date}</div><div style={{fontSize:11,color:"#4a5568",marginTop:2}}>{sess.players?.length||0} người · {done} trận{top?` · 🥇 ${top.name} (${top.wins}W)`:""}</div></div>
              <span style={{color:"#276749",fontSize:20,fontWeight:900}}>›</span>
            </div>
          </button>
        );
      })}
      {sessions.length===0&&<div style={{textAlign:"center",color:"#4a5568",fontSize:13,padding:"16px 0"}}>Chưa có buổi nào</div>}
    </div>
  );
}

// PERSONAL TAB
function Personal({db,currentUser}){
  const {members,sessions}=db;
  const [sub,setSub]=useState("history");
  const myM=members.find(m=>m.username===currentUser.username);
  const gn=(id)=>members.find(m=>m.id===id)?.name||id;

  if(!myM)return(<div style={{textAlign:"center",padding:"48px 16px",color:"#4a5568"}}>Không tìm thấy thành viên</div>);

  const hist=getHistory(myM.id,sessions,members);
  const h2h=getH2H(myM.id,sessions,members);
  const wins=hist.filter(h=>h.won).length,losses=hist.filter(h=>!h.won).length;
  const wr=hist.length?(wins/hist.length*100).toFixed(0):0;

  return(
    <div>
      <div className="card" style={{background:"linear-gradient(135deg,#1a2a1a,#0d1f1a)",border:"1px solid #276749"}}>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:14}}>
          <Avatar name={myM.name} id={myM.id} size={52}/>
          <div><div style={{fontWeight:900,fontSize:18,color:"#e2e8f0"}}>{currentUser.role==="admin"?"👑 ":""}{myM.name}</div><div style={{fontSize:12,color:"#4a7c59"}}>@{currentUser.username}</div></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8}}>
          {[{l:"Đã đánh",v:hist.length,c:"#e2e8f0"},{l:"Thắng",v:wins,c:"#68d391"},{l:"Thua",v:losses,c:"#fc8181"},{l:"Tỉ lệ W",v:`${wr}%`,c:"#60a5fa"}].map(({l,v,c})=>(
            <div key={l} style={{background:"#0d1117",borderRadius:8,padding:"8px 6px",textAlign:"center"}}><div style={{fontSize:17,fontWeight:900,color:c}}>{v}</div><div style={{fontSize:9,color:"#4a5568",fontWeight:700,textTransform:"uppercase",letterSpacing:".04em",marginTop:2}}>{l}</div></div>
          ))}
        </div>
        {losses>0&&<div style={{marginTop:10,background:"#0d1117",borderRadius:8,padding:"8px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:12,color:"#a0aec0",fontWeight:700}}>🍺 Tổng đóng góp đã nộp</span><span style={{fontWeight:900,color:"#9ae6b4"}}>{losses} chai</span></div>}
      </div>

      <div style={{display:"flex",borderBottom:"1px solid #1e2535",marginBottom:14}}>
        <button className={sub==="history"?"stab on":"stab"} onClick={()=>setSub("history")}>📋 Lịch sử ({hist.length})</button>
        <button className={sub==="h2h"?"stab on":"stab"} onClick={()=>setSub("h2h")}>⚔️ Đối đầu ({h2h.length})</button>
      </div>

      {sub==="history"&&(
        <div>
          {hist.length===0&&<div style={{textAlign:"center",padding:"32px 16px",color:"#4a5568"}}><div style={{fontSize:36,marginBottom:8}}>🎾</div><div style={{fontWeight:600}}>Chưa có trận nào</div></div>}
          {[...hist].reverse().map((h,i)=>(
            <div key={i} className="card" style={{padding:"12px 14px",marginBottom:8,border:`1px solid ${h.won?"#1e3a27":"#3a1e1e"}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{fontSize:11,color:"#4a5568",fontWeight:700}}>📅 {h.date}</span><span style={{fontSize:11,color:"#4a5568"}}>· Vòng {h.roundNum}</span></div>
                <span style={{fontSize:12,fontWeight:900,color:h.won?"#68d391":"#fc8181",background:h.won?"#1a3a27":"#2a1418",padding:"2px 10px",borderRadius:6}}>{h.won?"🏆 THẮNG":"💸 THUA"}</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:10,color:"#4a7c59",fontWeight:700,textTransform:"uppercase",marginBottom:4}}>Cặp của tôi</div>
                  <div style={{fontSize:13,fontWeight:800,color:h.won?"#68d391":"#fc8181"}}>{myM.name}</div>
                  {h.partner.map(pid=>(<div key={pid} style={{fontSize:12,fontWeight:700,color:h.won?"#4a9a6a":"#a05060",display:"flex",alignItems:"center",gap:4,marginTop:2}}><Avatar name={gn(pid)} id={pid} size={18}/>{gn(pid)}</div>))}
                </div>
                <div style={{textAlign:"center",flexShrink:0}}>
                  <div style={{fontFamily:"monospace",fontSize:20,fontWeight:900}}><span style={{color:h.won?"#68d391":"#fc8181"}}>{h.myScore}</span><span style={{color:"#4a5568",margin:"0 4px"}}>–</span><span style={{color:h.won?"#fc8181":"#68d391"}}>{h.oppScore}</span></div>
                  {!h.won&&<div style={{display:"flex",alignItems:"center",gap:4,marginTop:2}}><BeerIcon size={13}/><span style={{fontSize:11,color:"#9ae6b4",fontWeight:700}}>1 chai</span></div>}
                </div>
                <div style={{flex:1,textAlign:"right"}}>
                  <div style={{fontSize:10,color:"#4a5568",fontWeight:700,textTransform:"uppercase",marginBottom:4}}>Đối thủ</div>
                  {h.opponents.map(pid=>(<div key={pid} style={{fontSize:12,fontWeight:700,color:h.won?"#a05060":"#4a9a6a",display:"flex",alignItems:"center",justifyContent:"flex-end",gap:4,marginBottom:2}}>{gn(pid)}<Avatar name={gn(pid)} id={pid} size={18}/></div>))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {sub==="h2h"&&(
        <div>
          {h2h.length===0&&<div style={{textAlign:"center",padding:"32px 16px",color:"#4a5568"}}><div style={{fontSize:36,marginBottom:8}}>⚔️</div><div style={{fontWeight:600}}>Chưa có dữ liệu đối đầu</div></div>}
          <div style={{fontSize:11,color:"#4a5568",marginBottom:10,lineHeight:1.6}}>Thống kê kết quả của <strong style={{color:"#68d391"}}>{myM.name}</strong> với từng thành viên (bao gồm cả trận cùng đội và đối đầu)</div>
          {h2h.map((h)=>{
            const wr2=h.played>0?(h.wins/h.played*100).toFixed(0):0;
            return(
              <div key={h.id} className="card" style={{padding:"12px 14px",marginBottom:8}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <Avatar name={h.name} id={h.id} size={38}/>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:800,fontSize:14}}>{h.name}</div>
                    <div style={{fontSize:11,color:"#4a5568",marginTop:2}}>
                      {h.asPartner>0&&`🤝 ${h.asPartner} trận cùng đội`}
                      {h.asPartner>0&&h.asOpp>0&&" · "}
                      {h.asOpp>0&&`⚔️ ${h.asOpp} trận đối đầu`}
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontWeight:900,fontSize:15}}><span style={{color:"#68d391"}}>{h.wins}W</span><span style={{color:"#4a5568",margin:"0 4px"}}>-</span><span style={{color:"#fc8181"}}>{h.losses}L</span></div>
                    <div style={{fontSize:11,color:+wr2>=50?"#68d391":"#fc8181",fontWeight:700}}>{wr2}% thắng</div>
                  </div>
                </div>
                <div style={{marginTop:10}}>
                  <div style={{display:"flex",background:"#1e2535",borderRadius:4,height:5,overflow:"hidden"}}>
                    {h.wins>0&&<div style={{width:wr2+"%",background:"#38a169",transition:".3s"}}/>}
                    {h.losses>0&&<div style={{width:(100-+wr2)+"%",background:"#742a2a",transition:".3s"}}/>}
                  </div>
                  {h.asPartner>0&&h.asOpp>0&&<div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:11,color:"#4a5568"}}><span>Cùng đội: {h.partWins}W / {h.asPartner-h.partWins}L</span><span>Đối đầu: {h.oppWins}W / {h.asOpp-h.oppWins}L</span></div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
