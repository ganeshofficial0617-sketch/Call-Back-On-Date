const KEY="callback_reminder_v1";
const PINKEY="callback_reminder_pin_v1";
let callbacks=JSON.parse(localStorage.getItem(KEY)||"[]");
let pin=localStorage.getItem(PINKEY);
const $=id=>document.getElementById(id);
const today=()=>new Date().toISOString().slice(0,10);
const fmtMoney=v=>{if(!v)return ""; let n=String(v).replace(/[₹,\s]/g,""); if(!n)return v; let x=Number(n); return Number.isFinite(x)?"₹ "+x.toLocaleString("en-IN"):v};
function save(){localStorage.setItem(KEY,JSON.stringify(callbacks)); render()}
function toast(s){$("toast").textContent=s;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2400)}
function openApp(){ $("pinScreen").style.display="none"; $("app").hidden=false; render(); requestNotifications(); checkDue(); }
function setupPin(){
  if(!pin){$("pinSubtitle").textContent="Create a 4-digit PIN";$("pinBtn").textContent="Set PIN";$("pinHint").textContent="This PIN protects your saved callbacks."; }
  $("pinInput").focus();
}
$("pinBtn").onclick=()=>{
  let p=$("pinInput").value;
  if(!/^\d{4}$/.test(p)){ $("pinHint").textContent="Enter exactly 4 digits."; return; }
  if(!pin){ localStorage.setItem(PINKEY,p); pin=p; $("pinInput").value=""; $("pinSubtitle").textContent="PIN created. Enter it to unlock."; $("pinBtn").textContent="Unlock"; $("pinHint").textContent=""; return; }
  if(p===pin){$("pinInput").value="";openApp()} else {$("pinHint").textContent="Incorrect PIN."; $("pinInput").value=""}
};
$("pinInput").addEventListener("keydown",e=>{if(e.key==="Enter")$("pinBtn").click()});
$("lockBtn").onclick=()=>{ $("app").hidden=true;$("pinScreen").style.display="grid";$("pinInput").value="";$("pinHint").textContent="";setupPin() };

function requestNotifications(){
  if("Notification" in window && Notification.permission==="default") Notification.requestPermission().catch(()=>{});
}
function notify(c){
  const msg=`${c.name}${c.phone?" • "+c.phone:""}${c.amount?" • "+fmtMoney(c.amount):""}`;
  if("Notification" in window && Notification.permission==="granted"){
    try{new Notification("📞 Callback Reminder",{body:msg,tag:"cb-"+c.id})}catch(e){}
  }
}
function checkDue(){
  const now=Date.now();
  let changed=false;
  callbacks.forEach(c=>{
    if(!c.completed && !c.notified && new Date(c.datetime).getTime()<=now){
      c.notified=true; changed=true; notify(c);
      toast("📞 Callback due: "+c.name);
    }
  });
  if(changed) localStorage.setItem(KEY,JSON.stringify(callbacks));
}
setInterval(()=>{if(!$("app").hidden)checkDue()},15000);

$("callbackForm").onsubmit=e=>{
  e.preventDefault();
  const id=$("editId").value;
  const data={
    id:id||crypto.randomUUID(),
    name:$("name").value.trim(),
    phone:$("phone").value.trim(),
    amount:$("amount").value.trim(),
    reason:$("reason").value.trim(),
    date:$("date").value,time:$("time").value,
    datetime:$("date").value+"T"+$("time").value,
    notes:$("notes").value.trim(),
    completed:false,notified:false,
    createdAt:Date.now()
  };
  if(id){
    const old=callbacks.find(x=>x.id===id);
    data.completed=old?.completed||false; data.notified=old?.notified||false; data.createdAt=old?.createdAt||Date.now();
    callbacks=callbacks.map(x=>x.id===id?data:x);
    toast("Callback updated");
  }else{callbacks.push(data);toast("Callback saved")}
  save(); resetForm();
};
function resetForm(){
  $("callbackForm").reset();$("editId").value="";$("formTitle").textContent="Add Callback";$("cancelEdit").hidden=true;
  $("date").value=today();
  let d=new Date(Date.now()+30*60000); $("time").value=d.toTimeString().slice(0,5);
}
$("cancelEdit").onclick=resetForm;

function edit(id){
 const c=callbacks.find(x=>x.id===id);if(!c)return;
 $("editId").value=c.id;$("name").value=c.name;$("phone").value=c.phone;$("amount").value=c.amount;$("reason").value=c.reason;
 $("date").value=c.date;$("time").value=c.time;$("notes").value=c.notes;$("formTitle").textContent="Edit Callback";$("cancelEdit").hidden=false;
 scrollTo({top:0,behavior:"smooth"});
}
function del(id){if(confirm("Delete this callback?")){callbacks=callbacks.filter(x=>x.id!==id);save();toast("Deleted")}}
function done(id){callbacks=callbacks.map(c=>c.id===id?{...c,completed:!c.completed}:c);save()}
function callPhone(p){if(p)location.href="tel:"+p.replace(/[^\d+]/g,"")}

function render(){
 const q=$("search").value.trim().toLowerCase();
 const list=callbacks.filter(c=>(c.name+" "+c.phone+" "+c.reason).toLowerCase().includes(q))
   .sort((a,b)=>new Date(a.datetime)-new Date(b.datetime));
 $("pendingCount").textContent=callbacks.filter(c=>!c.completed).length;
 $("todayCount").textContent=callbacks.filter(c=>c.date===today()&&!c.completed).length;
 $("doneCount").textContent=callbacks.filter(c=>c.completed).length;
 $("callbackList").innerHTML="";
 $("empty").style.display=list.length?"none":"block";
 list.forEach(c=>{
   const due=!c.completed&&new Date(c.datetime)<new Date();
   const div=document.createElement("div");div.className="callback"+(c.completed?" done":"")+(due?" overdue":"");
   div.innerHTML=`
    <div class="callback-head"><div class="callback-name">${esc(c.name)}</div><div class="callback-time">${esc(c.date)} • ${esc(c.time)}</div></div>
    <div class="meta">📞 ${esc(c.phone)} ${c.amount?` • 💰 ${esc(fmtMoney(c.amount))}`:""}</div>
    ${c.reason?`<div class="reason">${esc(c.reason)}</div>`:""}
    ${c.notes?`<div class="notes">📝 ${esc(c.notes)}</div>`:""}
    <div class="actions">
      ${c.phone?`<button class="call" onclick="callPhone('${escAttr(c.phone)}')">📞 Call</button>`:""}
      <button class="complete" onclick="done('${c.id}')">${c.completed?"↩️ Pending":"✅ Complete"}</button>
      <button class="edit" onclick="edit('${c.id}')">✏️ Edit</button>
      <button class="delete" onclick="del('${c.id}')">🗑️</button>
    </div>`;
   $("callbackList").appendChild(div);
 });
}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function escAttr(s){return String(s??"").replace(/\\/g,"\\\\").replace(/'/g,"\\'")}
$("search").oninput=render;
$("clearDone").onclick=()=>{callbacks=callbacks.filter(c=>!c.completed);save();toast("Completed callbacks cleared")};
$("changePin").onclick=()=>{
 let old=prompt("Enter current 4-digit PIN"); if(old!==pin)return alert("Incorrect PIN.");
 let np=prompt("Enter new 4-digit PIN"); if(!/^\d{4}$/.test(np))return alert("PIN must be 4 digits.");
 localStorage.setItem(PINKEY,np);pin=np;toast("PIN changed");
};
resetForm();setupPin();
