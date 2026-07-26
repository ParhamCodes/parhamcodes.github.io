const PAY_ADDR="0x477c76f835b3223109569ddde2ff0597612b6e01";
const USDT="0x55d398326f99059ff775485246999027b3197955";
const TRANSFER_TOPIC="0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const RPCS=["https://bsc-dataseed.binance.org/","https://bsc-dataseed1.defibit.io/","https://rpc.ankr.com/bsc"];
const FREE_ROWS=15;
const CONTACT="parham125889+gigs@gmail.com";
pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
const $=id=>document.getElementById(id);
let rows=[], fileName="";
document.querySelectorAll("#contactSlot, #footContact").forEach(el=>{el.innerHTML=`<a href="mailto:${CONTACT}">${CONTACT}</a>`});
const unlocked=()=>localStorage.getItem("s2c_license")!==null;
$("pickBtn").onclick=e=>{e.stopPropagation();$("fileInput").click()};
$("dropZone").onclick=()=>$("fileInput").click();
$("dropZone").onkeydown=e=>{if(e.key==="Enter"||e.key===" ")$("fileInput").click()};
$("fileInput").onchange=e=>{if(e.target.files[0])handleFile(e.target.files[0])};
["dragover","dragenter"].forEach(ev=>$("dropZone").addEventListener(ev,e=>{e.preventDefault();$("dropZone").classList.add("over")}));
["dragleave","drop"].forEach(ev=>$("dropZone").addEventListener(ev,e=>{e.preventDefault();$("dropZone").classList.remove("over")}));
$("dropZone").addEventListener("drop",e=>{const f=e.dataTransfer.files[0];if(f&&f.type==="application/pdf")handleFile(f)});
async function handleFile(file){
fileName=file.name;
fetch("https://api.counterapi.dev/v1/s2c-parham/parses/up").catch(()=>{});
$("progress").hidden=false;
$("progressText").textContent="reading "+file.name+"…";
try{
const buf=await file.arrayBuffer();
const pdf=await pdfjsLib.getDocument({data:buf}).promise;
const lines=[];
for(let p=1;p<=pdf.numPages;p++){
$("progressText").textContent=`parsing page ${p}/${pdf.numPages}…`;
const page=await pdf.getPage(p);
const tc=await page.getTextContent();
const byY={};
for(const it of tc.items){const y=Math.round(it.transform[5]);(byY[y]=byY[y]||[]).push(it)}
Object.keys(byY).map(Number).sort((a,b)=>b-a).forEach(y=>{
const line=byY[y].sort((a,b)=>a.transform[4]-b.transform[4]).map(i=>i.str).join(" ").replace(/\s+/g," ").trim();
if(line)lines.push(line);
});
}
rows=extractTransactions(lines);
renderResult();
}catch(err){
$("progressText").textContent="could not read that PDF: "+err.message;
return;
}
$("progress").hidden=true;
}
const DATE_RE=/\b(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}|\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?(?:\s+\d{2,4})?|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{1,2}(?:,?\s+\d{2,4})?)\b/gi;
const AMT_RE=/[-+(]?\$?\s?(?:\d{1,3}(?:[.,]\d{3})+|\d+)[.,]\d{2}\)?-?(?!\d)/g;
const SUMMARY_RE=/\b(?:opening balance|closing balance|balance (?:carried|brought) forward|total|subtotal|statement period)\b/i;
function parseAmount(s){
const neg=/^[-(]|\)$/.test(s.trim())||s.includes("-");
let n=s.replace(/[^0-9.,]/g,"");
const lastDot=n.lastIndexOf("."), lastComma=n.lastIndexOf(",");
if(lastComma>lastDot)n=n.replace(/\./g,"").replace(",",".");
else n=n.replace(/,/g,"");
const v=parseFloat(n);
return neg?-Math.abs(v):v;
}
function extractTransactions(lines){
const candidates=[];
for(const line of lines){
const dates=line.match(DATE_RE)||[];
if(!dates.length)continue;
let amountLine=line;
for(const date of dates)amountLine=amountLine.replace(date," ".repeat(date.length));
const amts=[...amountLine.matchAll(AMT_RE)].map(m=>m[0]);
if(!amts.length)continue;
let desc=line;
for(const date of dates)desc=desc.replace(date,"");
for(const a of amts)desc=desc.replace(a,"");
desc=desc.replace(/\s+/g," ").trim().slice(0,120);
if(!desc||SUMMARY_RE.test(desc))continue;
candidates.push({date:dates[0],description:desc,amts});
}
const out=[];
for(const row of candidates){
const amount=row.amts[0];
const balance=row.amts.length>=2?row.amts[row.amts.length-1]:null;
out.push({date:row.date,description:row.description,amount:parseAmount(amount),balance:balance===null?null:parseAmount(balance)});
}
return out;
}
function renderResult(){
$("result").hidden=false;
$("resultTitle").textContent=fileName;
const shown=unlocked()?rows:rows.slice(0,FREE_ROWS);
$("resultMeta").textContent=rows.length+" transactions found"+(unlocked()?"":" · free preview shows first "+FREE_ROWS);
const t=$("txTable");
const hasBalance=rows.some(r=>r.balance!==null);
t.innerHTML=`<tr><th>Date</th><th>Description</th><th>Amount</th>${hasBalance?"<th>Balance</th>":""}</tr>`+shown.map(r=>`<tr><td>${esc(r.date)}</td><td>${esc(r.description)}</td><td class="amt ${r.amount<0?"neg":"pos"}">${r.amount.toFixed(2)}</td>${hasBalance?`<td class="amt ${r.balance!==null&&r.balance<0?"neg":"pos"}">${r.balance===null?"":r.balance.toFixed(2)}</td>`:""}</tr>`).join("");
const locked=rows.length-shown.length;
$("paywall").hidden=locked<=0;
if(locked>0)$("lockedCount").textContent=locked;
$("result").scrollIntoView({behavior:"smooth"});
}
function esc(s){return s.replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
function toCSV(list){const hasBalance=list.some(r=>r.balance!==null);return "date,description,amount"+(hasBalance?",balance":"")+"\n"+list.map(r=>`"${r.date}","${r.description.replace(/"/g,"\"\"")}",${r.amount.toFixed(2)}${hasBalance?`,${r.balance===null?"":r.balance.toFixed(2)}`:""}`).join("\n")}
$("csvBtn").onclick=()=>{
const list=unlocked()?rows:rows.slice(0,FREE_ROWS);
const blob=new Blob([toCSV(list)],{type:"text/csv"});
const a=document.createElement("a");
a.href=URL.createObjectURL(blob);
a.download=fileName.replace(/\.pdf$/i,"")+".csv";
a.click();
};
$("copyBtn").onclick=async()=>{
const list=unlocked()?rows:rows.slice(0,FREE_ROWS);
const hasBalance=list.some(r=>r.balance!==null);
await navigator.clipboard.writeText(list.map(r=>`${r.date}\t${r.description}\t${r.amount.toFixed(2)}${hasBalance?`\t${r.balance===null?"":r.balance.toFixed(2)}`:""}`).join("\n"));
$("copyBtn").textContent="Copied";
setTimeout(()=>$("copyBtn").textContent="Copy for Excel",1500);
};
$("unlockBtn").onclick=()=>$("payDialog").showModal();
$("unlockAnytime").onclick=()=>$("payDialog").showModal();
if(unlocked())$("unlockLine").hidden=true;
$("copyAddr").onclick=()=>{navigator.clipboard.writeText(PAY_ADDR);$("copyAddr").textContent="copied";setTimeout(()=>$("copyAddr").textContent="copy",1500)};
async function rpc(method,params){
for(const url of RPCS){
try{
const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method,params})});
const j=await r.json();
if(j.result!==undefined)return j.result;
}catch(e){}
}
throw new Error("all RPC endpoints failed");
}
$("verifyBtn").onclick=async()=>{
const hash=$("txHash").value.trim();
const st=$("payStatus");
if(!/^0x[0-9a-fA-F]{64}$/.test(hash)){st.textContent="that does not look like a tx hash";return}
st.textContent="checking BSC…";
try{
const rec=await rpc("eth_getTransactionReceipt",[hash]);
if(!rec){st.textContent="tx not found yet, wait a few seconds after sending and retry";return}
if(rec.status!=="0x1"){st.textContent="that transaction failed on-chain";return}
const log=(rec.logs||[]).find(l=>l.address.toLowerCase()===USDT&&l.topics[0]===TRANSFER_TOPIC&&"0x"+l.topics[2].slice(26).toLowerCase()===PAY_ADDR);
if(!log){st.textContent="no USDT transfer to our address in that tx";return}
const amount=parseInt(log.data,16)/1e18;
if(amount<6.9){st.textContent=`only ${amount.toFixed(2)} USDT received, need 7`;return}
localStorage.setItem("s2c_license",hash);
$("unlockLine").hidden=true;
st.textContent="verified. unlocked forever on this browser, keep the hash as your key.";
setTimeout(()=>{$("payDialog").close();renderResult()},1200);
}catch(err){st.textContent="verification error: "+err.message}
};
fetch("https://api.counterapi.dev/v1/s2c-parham/visits/up").catch(()=>{});
document.addEventListener("visibilitychange",()=>{});
