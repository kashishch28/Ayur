/* =========================================================
   AyurWell — script.js
   Part 1: original site interactions (cart, quiz, canvases, hex shop)
   Part 2: new app modules (auth, catalog, doctors, dashboard,
           smart reminders, real Razorpay payment integration)
   ========================================================= */

/* ==================== CART STATE ==================== */
var cartItems=[];
var cartSidebarOpen=false;

function openCart(){
  document.getElementById('cartSidebar').classList.add('open');
  document.getElementById('cartOverlay').classList.add('open');
  cartSidebarOpen=true;
  renderCart();
}
function closeCart(){
  document.getElementById('cartSidebar').classList.remove('open');
  document.getElementById('cartOverlay').classList.remove('open');
  cartSidebarOpen=false;
}

function addCart(name,price,icon){
  var existing=cartItems.find(function(i){return i.name===name});
  if(existing){existing.qty++;}
  else{cartItems.push({name:name,price:price||450,icon:icon||'🌿',qty:1});}
  var total=cartItems.reduce(function(s,i){return s+i.qty},0);
  document.getElementById('cc').textContent=total;
  toast('Added '+name+' to cart 🛒');
  if(cartSidebarOpen)renderCart();
}

function removeCartItem(name){
  cartItems=cartItems.filter(function(i){return i.name!==name});
  var total=cartItems.reduce(function(s,i){return s+i.qty},0);
  document.getElementById('cc').textContent=total;
  renderCart();
}

function changeQty(name,delta){
  var item=cartItems.find(function(i){return i.name===name});
  if(!item)return;
  item.qty+=delta;
  if(item.qty<=0){removeCartItem(name);return;}
  var total=cartItems.reduce(function(s,i){return s+i.qty},0);
  document.getElementById('cc').textContent=total;
  renderCart();
}

function renderCart(){
  var container=document.getElementById('cartItems');
  var footer=document.getElementById('cartFooter');
  var empty=document.getElementById('cartEmpty');
  var label=document.getElementById('cartCountLabel');
  var totalItems=cartItems.reduce(function(s,i){return s+i.qty},0);
  label.textContent=totalItems>0?'('+totalItems+' item'+(totalItems>1?'s':'')+')':'';
  container.querySelectorAll('.cart-item').forEach(function(e){e.remove()});
  if(cartItems.length===0){
    empty.style.display='flex';footer.style.display='none';return;
  }
  empty.style.display='none';footer.style.display='block';
  var subtotal=0;
  cartItems.forEach(function(item,idx){
    subtotal+=item.price*item.qty;
    var div=document.createElement('div');
    div.className='cart-item';
    div.dataset.name=item.name;
    div.innerHTML=
      '<div class="ci-icon">'+item.icon+'</div>'+
      '<div class="ci-info">'+
        '<div class="ci-name">'+item.name+'</div>'+
        '<div class="ci-dose">Ayurvedic Supplement · 60 caps</div>'+
        '<div class="ci-price">₹'+(item.price*item.qty).toLocaleString('en-IN')+'</div>'+
        '<div class="ci-qty">'+
          '<button class="qm">−</button>'+
          '<span>'+item.qty+'</span>'+
          '<button class="qp">+</button>'+
        '</div>'+
      '</div>'+
      '<button class="ci-remove" title="Remove">🗑</button>';
    (function(name){
      div.querySelector('.qm').onclick=function(){changeQty(name,-1)};
      div.querySelector('.qp').onclick=function(){changeQty(name,1)};
      div.querySelector('.ci-remove').onclick=function(){removeCartItem(name)};
    })(item.name);
    container.appendChild(div);
  });
  document.getElementById('cartSubtotal').textContent='₹'+subtotal.toLocaleString('en-IN');
  document.getElementById('cartTotalAmt').textContent='₹'+subtotal.toLocaleString('en-IN');
  var payTotal=document.getElementById('payTotalDisplay');
  if(payTotal)payTotal.textContent='₹'+subtotal.toLocaleString('en-IN');
  var rzpAmt=document.getElementById('rzpAmount');
  if(rzpAmt)rzpAmt.textContent='₹'+subtotal.toLocaleString('en-IN');
}

function checkoutFromCart(){
  if(cartItems.length===0){toast('Add items to cart first 🌿');return;}
  closeCart();
  document.getElementById('pay').scrollIntoView({behavior:'smooth'});
  setTimeout(function(){toast('🔒 Checkout ready — complete your payment below')},600);
}

/* ==================== TOAST ==================== */
function toast(msg){var t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(function(){t.classList.remove('show')},2800)}

/* ==================== NOTIFICATION TABS ==================== */
/* ntab() and tog() now live in the new app-logic module below —
   they need access to currentUser/prefs, so they're data-driven there. */

/* ==================== LIGHT MODE ==================== */
function toggleLM(){
  document.body.classList.toggle('light');
  var isLight=document.body.classList.contains('light');
  var btn=document.getElementById('lmBtn');
  btn.childNodes[0].textContent=isLight?'🌙 ':'☀️ ';
  localStorage.setItem('lm',isLight?'1':'0');
}
(function(){
  if(localStorage.getItem('lm')==='1'){
    document.body.classList.add('light');
    var btn=document.getElementById('lmBtn');
    if(btn)btn.childNodes[0].textContent='🌙 ';
  }
})();

/* ==================== PAYMENT ==================== */
var curPayMode='card';
function pm(b,mode){
  document.querySelectorAll('.pm-tabs .pm').forEach(function(x){x.classList.remove('on')});
  b.classList.add('on');curPayMode=mode;
  document.getElementById('pay-card-panel').style.display=mode==='card'?'block':'none';
  document.getElementById('pay-upi-panel').style.display=mode==='upi'?'block':'none';
  document.getElementById('pay-bank-panel').style.display=mode==='bank'?'block':'none';
}
function selUpi(b){document.querySelectorAll('#pay-upi-panel .pm').forEach(function(x){x.classList.remove('on')});b.classList.add('on')}
function fmt(i){var v=i.value.replace(/\D/g,'').substring(0,16);i.value=v.replace(/(.{4})/g,'$1 ').trim()}
function fmtExp(i){var v=i.value.replace(/\D/g,'').substring(0,4);if(v.length>=2)v=v.substring(0,2)+' / '+v.substring(2);i.value=v}
function pay(){
  var valid=true,msg='';
  if(curPayMode==='card'){
    var name=document.getElementById('p-name').value.trim();
    var num=document.getElementById('p-num').value.replace(/\s/g,'');
    var exp=document.getElementById('p-exp').value.trim();
    var cvv=document.getElementById('p-cvv').value.trim();
    if(!name){msg='Please enter cardholder name';valid=false;}
    else if(num.length<16){msg='Please enter a valid 16-digit card number';valid=false;}
    else if(exp.length<7){msg='Please enter expiry as MM / YY';valid=false;}
    else if(cvv.length<3){msg='Please enter a valid CVV';valid=false;}
  } else if(curPayMode==='upi'){
    var upi=document.getElementById('p-upi').value.trim();
    if(!upi||!upi.includes('@')){msg='Please enter a valid UPI ID (e.g. name@upi)';valid=false;}
  } else if(curPayMode==='bank'){
    var bank=document.getElementById('p-bank').value;
    if(!bank){msg='Please select your bank';valid=false;}
  }
  if(!valid){toast('⚠️ '+msg);return;}
  var subtotal=cartItems.reduce(function(s,i){return s+i.price*i.qty},0);
  if(subtotal===0){toast('⚠️ Add items to cart before paying');return;}
  var btn=document.getElementById('simulateBtn');
  var totalStr='₹'+subtotal.toLocaleString('en-IN');
  btn.textContent='⏳ Processing '+totalStr+'...';btn.disabled=true;
  var snapshotItems=cartItems.map(function(i){return {name:i.name,qty:i.qty,price:i.price}});
  setTimeout(function(){
    btn.textContent='🔒 Pay Securely';btn.disabled=false;
    toast('✅ Payment '+totalStr+' confirmed! Order placed 🌿');
    recordOrder(snapshotItems,subtotal,curPayMode);
    cartItems=[];document.getElementById('cc').textContent=0;
    var disp=document.getElementById('payTotalDisplay');if(disp)disp.textContent='₹0';
    renderCart();
  },2200);
}

/* ==================== SCROLL REVEAL ==================== */
function chkRv(){document.querySelectorAll('.rv').forEach(function(e){if(e.getBoundingClientRect().top<window.innerHeight-60)e.classList.add('in')})}
window.addEventListener('scroll',chkRv,{passive:true});setTimeout(chkRv,100);

/* ==================== DOSHA QUIZ ==================== */
var quizQs=[
  {q:"How would you describe your body frame?",opts:[{t:"Thin, light, hard to gain weight",d:"V"},{t:"Medium, muscular build",d:"P"},{t:"Heavier, tends to gain weight easily",d:"K"}]},
  {q:"How is your skin usually?",opts:[{t:"Dry, rough, or cool to touch",d:"V"},{t:"Oily, warm, prone to redness/acne",d:"P"},{t:"Thick, smooth, pale or moist",d:"K"}]},
  {q:"How would you describe your digestion?",opts:[{t:"Irregular — sometimes strong, sometimes weak",d:"V"},{t:"Strong — gets irritable if meals are skipped",d:"P"},{t:"Slow but steady — rarely very hungry",d:"K"}]},
  {q:"How do you sleep?",opts:[{t:"Light sleeper, tend to wake up easily",d:"V"},{t:"Moderate — fall asleep well, wake refreshed",d:"P"},{t:"Heavy sleeper — love long sleep, hard to wake",d:"K"}]},
  {q:"How do you handle stress?",opts:[{t:"Tend to feel anxious or worried",d:"V"},{t:"Become irritable or angry",d:"P"},{t:"Withdraw and become quiet",d:"K"}]},
  {q:"How is your energy level through the day?",opts:[{t:"Variable — bursts of energy then fatigue",d:"V"},{t:"Consistent and purposeful",d:"P"},{t:"Steady and sustained but low drive",d:"K"}]},
  {q:"How do you make decisions?",opts:[{t:"Quickly but may change mind often",d:"V"},{t:"Decisively with confidence",d:"P"},{t:"Slowly and carefully",d:"K"}]},
  {q:"What weather do you prefer?",opts:[{t:"Warm and humid",d:"V"},{t:"Cool and well-ventilated",d:"P"},{t:"Dry and warm",d:"K"}]},
];
var quizIdx=0,scores={V:0,P:0,K:0};
function openQuiz(){quizIdx=0;scores={V:0,P:0,K:0};document.getElementById('quizModal').style.display='flex';renderQ();}
function closeQuiz(){document.getElementById('quizModal').style.display='none';}
document.getElementById('quizModal').addEventListener('click',function(e){if(e.target===this)closeQuiz();});
function renderQ(){
  var q=quizQs[quizIdx];
  document.getElementById('quizBar').style.width=Math.round((quizIdx/quizQs.length)*100)+'%';
  var html='<div style="font-size:.72rem;color:rgba(255,255,255,.4);margin-bottom:.5rem;letter-spacing:.08em;text-transform:uppercase">Question '+(quizIdx+1)+' of '+quizQs.length+'</div>';
  html+='<h3 style="font-size:1.15rem;font-weight:700;color:#fff;margin-bottom:1.5rem;line-height:1.45">'+q.q+'</h3>';
  html+='<div style="display:flex;flex-direction:column;gap:.65rem">';
  q.opts.forEach(function(o,i){
    html+='<button onclick="answerQ(\''+o.d+'\')" style="text-align:left;padding:1rem 1.2rem;border-radius:12px;background:rgba(255,255,255,.05);border:1.5px solid rgba(255,255,255,.1);color:rgba(255,255,255,.85);font-size:.9rem;cursor:pointer;font-family:inherit;transition:.2s;line-height:1.5" onmouseover="this.style.background=\'rgba(201,168,76,.12)\';this.style.borderColor=\'rgba(201,168,76,.4)\'" onmouseout="this.style.background=\'rgba(255,255,255,.05)\';this.style.borderColor=\'rgba(255,255,255,.1)\'">'+(i+1)+'. '+o.t+'</button>';
  });
  html+='</div>';
  if(quizIdx>0)html+='<button onclick="prevQ()" style="margin-top:1rem;background:none;border:none;color:rgba(255,255,255,.4);font-size:.8rem;cursor:pointer;font-family:inherit">← Back</button>';
  document.getElementById('quizInner').innerHTML=html;
}
function answerQ(d){scores[d]++;quizIdx++;if(quizIdx>=quizQs.length){showResult();return;}renderQ();}
function prevQ(){if(quizIdx>0){quizIdx--;renderQ();}}

var doshaHerbMap={
  V:['Ashwagandha','Shatavari'],
  P:['Brahmi Oil','Moringa'],
  K:['Triphala','Triphala+','Guduchi']
};

function showResult(){
  document.getElementById('quizBar').style.width='100%';
  var top=Object.keys(scores).sort(function(a,b){return scores[b]-scores[a]})[0];
  var info={
    V:{name:'Vata',icon:'💨',color:'#93C4D8',desc:'You are predominantly Vata — the energy of movement. Creative, quick-minded, and enthusiastic, but may struggle with anxiety and irregular routines.',herbs:'Ashwagandha, Shatavari, Sesame Oil, Warm Milk with Nutmeg',tips:'Maintain regular meals & sleep. Favor warm, nourishing foods. Oil massage (Abhyanga) daily.'},
    P:{name:'Pitta',icon:'🔥',color:'#F5A370',desc:'You are predominantly Pitta — the energy of transformation. Sharp, focused, and driven, but prone to irritability and inflammation.',herbs:'Brahmi, Neem, Amla, Coriander, Coconut Oil',tips:'Avoid spicy & fermented foods. Spend time in nature. Stay cool and practice patience.'},
    K:{name:'Kapha',icon:'🌊',color:'#85BF85',desc:'You are predominantly Kapha — the energy of structure. Calm, caring, and grounded, but may struggle with lethargy and attachment.',herbs:'Triphala, Trikatu, Ginger, Honey, Turmeric',tips:'Stay active & energized. Eat light, warm foods. Embrace change and variety in routines.'}
  };
  var r=info[top];var total=scores.V+scores.P+scores.K;
  window._lastQuizResult={scores:Object.assign({},scores),primary:top};
  var html='<div style="text-align:center;padding:.5rem 0 1.5rem">';
  html+='<div style="font-size:3.5rem;margin-bottom:.8rem">'+r.icon+'</div>';
  html+='<div style="font-size:.72rem;color:rgba(255,255,255,.4);letter-spacing:.1em;text-transform:uppercase;margin-bottom:.3rem">Your Primary Dosha</div>';
  html+='<h2 style="font-size:2rem;font-weight:800;color:'+r.color+';margin-bottom:.8rem">'+r.name+'</h2>';
  html+='<p style="font-size:.9rem;color:rgba(255,255,255,.65);line-height:1.75;margin-bottom:1.5rem;max-width:420px;margin-left:auto;margin-right:auto">'+r.desc+'</p>';
  html+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:.5rem;margin-bottom:1.5rem">';
  [{d:'V',n:'Vata',c:'#93C4D8'},{d:'P',n:'Pitta',c:'#F5A370'},{d:'K',n:'Kapha',c:'#85BF85'}].forEach(function(x){
    var pct=Math.round(scores[x.d]/total*100);
    html+='<div><div style="font-size:.7rem;color:rgba(255,255,255,.4);margin-bottom:.3rem">'+x.n+'</div><div style="height:6px;background:rgba(255,255,255,.08);border-radius:6px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:'+x.c+';border-radius:6px;transition:.8s"></div></div><div style="font-size:.72rem;color:'+x.c+';margin-top:.2rem">'+pct+'%</div></div>';
  });
  html+='</div>';
  html+='<div style="background:rgba(255,255,255,.04);border-radius:12px;padding:1rem;text-align:left;margin-bottom:1rem">';
  html+='<div style="font-size:.72rem;text-transform:uppercase;letter-spacing:.08em;color:var(--gold);margin-bottom:.5rem">Recommended Herbs</div>';
  html+='<div style="font-size:.85rem;color:rgba(255,255,255,.7)">'+r.herbs+'</div></div>';
  html+='<div style="background:rgba(255,255,255,.04);border-radius:12px;padding:1rem;text-align:left;margin-bottom:1.5rem">';
  html+='<div style="font-size:.72rem;text-transform:uppercase;letter-spacing:.08em;color:var(--gold);margin-bottom:.5rem">Lifestyle Tips</div>';
  html+='<div style="font-size:.85rem;color:rgba(255,255,255,.7)">'+r.tips+'</div></div>';
  html+='<div style="display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap">';
  html+='<button onclick="exploreHerbs(\''+top+'\')" style="padding:.75rem 1.8rem;background:var(--gold);color:#000;border:none;border-radius:30px;cursor:pointer;font-size:.9rem;font-weight:700;font-family:inherit">🌿 Explore Herbs →</button>';
  html+='<button onclick="saveQuizResult()" style="padding:.75rem 1.6rem;background:rgba(61,90,74,.5);color:#fff;border:none;border-radius:30px;cursor:pointer;font-size:.88rem;font-weight:700;font-family:inherit">💾 Save to Profile</button>';
  html+='<button onclick="openQuiz()" style="padding:.75rem 1.5rem;background:transparent;color:rgba(255,255,255,.6);border:1.5px solid rgba(255,255,255,.2);border-radius:30px;cursor:pointer;font-size:.88rem;font-family:inherit">Retake</button>';
  html+='</div></div>';
  document.getElementById('quizInner').innerHTML=html;
}

function exploreHerbs(dosha){
  closeQuiz();
  document.getElementById('catalog').scrollIntoView({behavior:'smooth'});
  var recommended=doshaHerbMap[dosha]||[];
  setTimeout(function(){
    document.querySelectorAll('.hexcell').forEach(function(cell){
      var name=cell.querySelector('.hc-name');
      if(!name)return;
      if(recommended.indexOf(name.textContent.trim())!==-1){
        cell.style.transform='scale(1.2)';cell.style.zIndex='20';
        cell.style.filter='brightness(1.4) drop-shadow(0 0 16px rgba(201,168,76,.6))';
        setTimeout(function(){cell.style.transform='';cell.style.zIndex='';cell.style.filter='';},2400);
      }
    });
    toast('✨ Highlighted your '+['Vata','Pitta','Kapha'][['V','P','K'].indexOf(dosha)]+' herbs below!');
  },700);
}

/* ===================== HELIX BG ===================== */
(function(){
  var c=document.getElementById('helixCanvas');
  var ctx=c.getContext('2d');
  var W,H;
  function resize(){W=c.width=c.offsetWidth;H=c.height=c.offsetHeight}
  window.addEventListener('resize',resize);resize();
  var herbs=['A','B','T','Br','Tr','Sh','G','Tu'];
  var t=0;
  function draw(){
    ctx.clearRect(0,0,W,H);
    var cols=Math.floor(W/160)+2;
    for(var col=0;col<cols;col++){
      var cx=col*160-40;
      var nodes=20;
      for(var i=0;i<nodes;i++){
        var prog=i/nodes;
        var y=prog*H;
        var phase=(i/nodes)*Math.PI*5+t*.025+col*1.3;
        var spread=55;
        var x1=cx+Math.cos(phase)*spread;
        var x2=cx+Math.cos(phase+Math.PI)*spread;
        var z1=Math.sin(phase),z2=Math.sin(phase+Math.PI);
        var a1=(.15+.3*((z1+1)/2));
        var a2=(.15+.3*((z2+1)/2));
        var r1=2.5+2.5*((z1+1)/2),r2=2.5+2.5*((z2+1)/2);
        if(i>0){
          var pp=(i-1)/nodes;
          var yp=pp*H;
          var pphase=((i-1)/nodes)*Math.PI*5+t*.025+col*1.3;
          var px1=cx+Math.cos(pphase)*spread;
          var px2=cx+Math.cos(pphase+Math.PI)*spread;
          ctx.beginPath();ctx.moveTo(px1,yp);ctx.lineTo(x1,y);
          ctx.strokeStyle='rgba(201,168,76,0.07)';ctx.lineWidth=1;ctx.stroke();
          ctx.beginPath();ctx.moveTo(px2,yp);ctx.lineTo(x2,y);
          ctx.strokeStyle='rgba(61,90,74,0.07)';ctx.lineWidth=1;ctx.stroke();
        }
        if(i%3===0){
          ctx.beginPath();ctx.moveTo(x1,y);ctx.lineTo(x2,y);
          ctx.strokeStyle='rgba(201,168,76,0.05)';ctx.lineWidth=.8;ctx.stroke();
        }
        ctx.beginPath();ctx.arc(x1,y,r1,0,Math.PI*2);
        ctx.fillStyle='rgba(201,168,76,'+a1+')';ctx.fill();
        ctx.beginPath();ctx.arc(x2,y,r2,0,Math.PI*2);
        ctx.fillStyle='rgba(61,90,74,'+a2+')';ctx.fill();
        if(a1>.35&&r1>3.5){
          ctx.fillStyle='rgba(255,255,255,.5)';ctx.font='bold 7px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
          ctx.fillText(herbs[(i+col*3)%herbs.length],x1,y);
        }
      }
    }
    t++;requestAnimationFrame(draw);
  }
  draw();
})();

/* ===================== TORUS ===================== */
(function(){
  var c=document.getElementById('torusCanvas');
  var ctx=c.getContext('2d');
  var W,H;
  function resize(){W=c.width=c.offsetWidth;H=c.height=c.offsetHeight||500}
  window.addEventListener('resize',resize);resize();
  var chakras=['#FF4444','#FF8C00','#FFD700','#4CAF50','#2196F3','#7B1FA2','#9C27B0'];
  var t=0;
  var mouse={x:0,y:0};
  c.addEventListener('mousemove',function(e){var r=c.getBoundingClientRect();mouse.x=(e.clientX-r.left)/W-.5;mouse.y=(e.clientY-r.top)/H-.5});
  function draw(){
    var isLight=document.body.classList.contains('light');
    ctx.fillStyle=isLight?'rgba(212,201,184,0.22)':'rgba(7,3,0,0.18)';
    ctx.fillRect(0,0,W,H);
    var cx=W/2,cy=H/2;
    var R=Math.min(W,H)*.28;
    var r=R*.32;
    var tubeSteps=180,ringSteps=12;
    var rotY=t*.012+mouse.x*.4;
    var rotX=.42+mouse.y*.3;
    var pts=[];
    for(var ti=0;ti<tubeSteps;ti++){
      var u=(ti/tubeSteps)*Math.PI*2;
      for(var ri=0;ri<ringSteps;ri++){
        var v=(ri/ringSteps)*Math.PI*2;
        var x3=(R+r*Math.cos(v))*Math.cos(u);
        var y3=(R+r*Math.cos(v))*Math.sin(u);
        var z3=r*Math.sin(v);
        var x2=x3*Math.cos(rotY)-z3*Math.sin(rotY);
        var z2=x3*Math.sin(rotY)+z3*Math.cos(rotY);
        var y2=y3*Math.cos(rotX)-z2*Math.sin(rotX);
        var z1=y3*Math.sin(rotX)+z2*Math.cos(rotX);
        var fov=600;
        var scale=fov/(fov+z1+R*.5);
        var px=cx+x2*scale;
        var py=cy+y2*scale;
        var depth=(z1+R+r)/(2*(R+r));
        var ci=Math.floor(((ti/tubeSteps)+(ri/ringSteps)*.5)%1*chakras.length);
        pts.push({px:px,py:py,depth:depth,r:scale*3.2,color:chakras[ci%chakras.length],z:z1});
      }
    }
    pts.sort(function(a,b){return a.z-b.z});
    pts.forEach(function(p){
      var a=.08+p.depth*.75;
      ctx.beginPath();ctx.arc(p.px,p.py,p.r,0,Math.PI*2);
      ctx.fillStyle=p.color;
      ctx.globalAlpha=a;ctx.fill();ctx.globalAlpha=1;
    });
    var glowR=R*.22;
    var grd=ctx.createRadialGradient(cx,cy,0,cx,cy,glowR);
    grd.addColorStop(0,'rgba(255,220,100,0.18)');
    grd.addColorStop(1,'rgba(255,220,100,0)');
    ctx.beginPath();ctx.arc(cx,cy,glowR,0,Math.PI*2);
    ctx.fillStyle=grd;ctx.fill();
    t++;requestAnimationFrame(draw);
  }
  draw();
})();

/* ===================== HEX GRID SHOP (teaser) ===================== */
(function(){
  var products=[
    {icon:'🌿',name:'Ashwagandha',price:'₹450',color:'rgba(61,90,74,.25)',border:'rgba(107,143,113,.5)',size:145,delay:'0s'},
    {icon:'🟡',name:'Turmeric',price:'₹300',color:'rgba(201,168,76,.2)',border:'rgba(201,168,76,.5)',size:135,delay:'.1s'},
    {icon:'🍵',name:'Triphala',price:'₹375',color:'rgba(61,90,74,.2)',border:'rgba(93,202,165,.4)',size:140,delay:'.2s'},
    {icon:'🫙',name:'Brahmi Oil',price:'₹400',color:'rgba(127,119,221,.18)',border:'rgba(127,119,221,.4)',size:135,delay:'.3s'},
    {icon:'🌸',name:'Shatavari',price:'₹520',color:'rgba(212,83,126,.15)',border:'rgba(212,83,126,.4)',size:150,delay:'.4s'},
    {icon:'🌰',name:'Triphala+',price:'₹480',color:'rgba(181,82,42,.18)',border:'rgba(181,82,42,.4)',size:130,delay:'.5s'},
    {icon:'💚',name:'Moringa',price:'₹350',color:'rgba(99,153,34,.18)',border:'rgba(99,153,34,.4)',size:140,delay:'.6s'},
    {icon:'🌾',name:'Shankhpushpi',price:'₹430',color:'rgba(55,138,221,.15)',border:'rgba(55,138,221,.4)',size:132,delay:'.7s'},
    {icon:'⭐',name:'Guduchi',price:'₹390',color:'rgba(186,117,23,.2)',border:'rgba(239,159,39,.4)',size:138,delay:'.8s'},
  ];
  var grid=document.getElementById('hexGrid');
  products.forEach(function(p){
    var el=document.createElement('div');
    el.className='hexcell';
    el.style.cssText='width:'+p.size+'px;height:'+p.size+'px;background:'+p.color+';border:1.5px solid '+p.border+';animation:hexPulse 2.5s ease-in-out infinite;animation-delay:'+p.delay;
    el.innerHTML='<span class="hc-icon">'+p.icon+'</span><span class="hc-name" style="color:rgba(255,255,255,.85)">'+p.name+'</span><span class="hc-price" style="color:rgba(201,168,76,.9)">'+p.price+'</span>';
    el.addEventListener('click',function(){addCart(p.name,parseInt(p.price.replace('₹','')),p.icon);openCart();});
    grid.appendChild(el);
  });
})();
var s=document.createElement('style');
s.textContent='@keyframes hexPulse{0%,100%{filter:brightness(1)}50%{filter:brightness(1.2)}}';
document.head.appendChild(s);

/* ============ NEW APP MODULES ============ */

/* ---------- tiny utils ---------- */
function escapeHtml(s){return (s||'').replace(/[&<>"']/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]})}
function fmtDate(iso){var d=new Date(iso);return d.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
function todayKey(){var d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()}
function money(n){return '₹'+Number(n).toLocaleString('en-IN')}

/* ---------- persistence layer (mock backend) ---------- */
function loadUsers(){try{return JSON.parse(localStorage.getItem('aw_users')||'[]')}catch(e){return []}}
function saveUsers(u){localStorage.setItem('aw_users',JSON.stringify(u))}
function getSessionEmail(){return localStorage.getItem('aw_session')||null}
function setSessionEmail(email){email?localStorage.setItem('aw_session',email):localStorage.removeItem('aw_session')}
function loadUserData(email){try{return JSON.parse(localStorage.getItem('aw_data_'+email)||'null')||{orders:[],appointments:[],doshaHistory:[],routine:{}}}catch(e){return {orders:[],appointments:[],doshaHistory:[],routine:{}}}}
function saveUserData(email,data){localStorage.setItem('aw_data_'+email,JSON.stringify(data))}

var currentUser=null; // {name,email}

function hydrateSession(){
  var email=getSessionEmail();
  if(!email)return;
  var u=loadUsers().find(function(x){return x.email===email});
  if(u)currentUser={name:u.name,email:u.email};
}

/* ==================== AUTH ==================== */
function openAuth(mode){document.getElementById('authModal').classList.add('open');switchAuthTab(mode||'login')}
function closeAuth(){document.getElementById('authModal').classList.remove('open')}

function switchAuthTab(tab){
  var isLogin=tab==='login';
  document.getElementById('authTabLogin').classList.toggle('active',isLogin);
  document.getElementById('authTabLogin').classList.toggle('text-white/50',!isLogin);
  document.getElementById('authTabSignup').classList.toggle('active',!isLogin);
  document.getElementById('authTabSignup').classList.toggle('text-white/50',isLogin);
  document.getElementById('authTitle').textContent=isLogin?'Welcome Back':'Create Your Account';
  document.getElementById('authSub').textContent=isLogin?'Sign in to track your dosha, orders & routines':'Takes 20 seconds — no spam, ever';
  var area=document.getElementById('authFormArea');
  if(isLogin){
    area.innerHTML=
      '<div class="flex flex-col gap-3">'+
      '<div><label class="block text-xs uppercase tracking-wide text-white/40 mb-1">Email</label><input id="loEmail" type="email" placeholder="you@example.com" class="w-full bg-white/[.08] border border-white/[.15] rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-gold/60"></div>'+
      '<div><label class="block text-xs uppercase tracking-wide text-white/40 mb-1">Password</label><input id="loPass" type="password" placeholder="••••••••" class="w-full bg-white/[.08] border border-white/[.15] rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-gold/60"></div>'+
      '<button onclick="doLogin()" class="mt-2 w-full py-2.5 rounded-full bg-gold text-black font-bold text-sm hover:bg-gold-light transition">Sign In</button>'+
      '<div class="text-center text-xs text-white/40 mt-1">New to AyurWell? <button onclick="switchAuthTab(\'signup\')" class="text-gold font-semibold">Create an account</button></div>'+
      '<div class="text-center text-[11px] text-white/25 mt-2">Demo: any account you create below works instantly — this is a client-side mock, not a live server.</div>'+
      '</div>';
  }else{
    area.innerHTML=
      '<div class="flex flex-col gap-3">'+
      '<div><label class="block text-xs uppercase tracking-wide text-white/40 mb-1">Full Name</label><input id="suName" placeholder="Your name" class="w-full bg-white/[.08] border border-white/[.15] rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-gold/60"></div>'+
      '<div><label class="block text-xs uppercase tracking-wide text-white/40 mb-1">Email</label><input id="suEmail" type="email" placeholder="you@example.com" class="w-full bg-white/[.08] border border-white/[.15] rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-gold/60"></div>'+
      '<div><label class="block text-xs uppercase tracking-wide text-white/40 mb-1">Password</label><input id="suPass" type="password" placeholder="At least 6 characters" class="w-full bg-white/[.08] border border-white/[.15] rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-gold/60"></div>'+
      '<button onclick="doSignup()" class="mt-2 w-full py-2.5 rounded-full bg-gold text-black font-bold text-sm hover:bg-gold-light transition">Create Account</button>'+
      '<div class="text-center text-xs text-white/40 mt-1">Already have an account? <button onclick="switchAuthTab(\'login\')" class="text-gold font-semibold">Sign in</button></div>'+
      '</div>';
  }
}

function doLogin(){
  var email=(document.getElementById('loEmail').value||'').trim().toLowerCase();
  var pass=document.getElementById('loPass').value||'';
  if(!email||!pass){toast('⚠️ Enter your email and password');return}
  var users=loadUsers();
  var u=users.find(function(x){return x.email===email&&x.password===pass});
  if(!u){toast('⚠️ Invalid email or password');return}
  currentUser={name:u.name,email:u.email};
  setSessionEmail(u.email);
  closeAuth();renderAuthNav();renderNotifications();
  toast('👋 Welcome back, '+u.name.split(' ')[0]+'!');
}

function doSignup(){
  var name=(document.getElementById('suName').value||'').trim();
  var email=(document.getElementById('suEmail').value||'').trim().toLowerCase();
  var pass=document.getElementById('suPass').value||'';
  if(!name||!email||!pass){toast('⚠️ Fill in every field');return}
  if(!/^\S+@\S+\.\S+$/.test(email)){toast('⚠️ Enter a valid email address');return}
  if(pass.length<6){toast('⚠️ Password must be at least 6 characters');return}
  var users=loadUsers();
  if(users.find(function(x){return x.email===email})){toast('⚠️ An account already exists — sign in instead');switchAuthTab('login');return}
  users.push({name:name,email:email,password:pass});
  saveUsers(users);
  saveUserData(email,{orders:[],appointments:[],doshaHistory:[],routine:{}});
  currentUser={name:name,email:email};
  setSessionEmail(email);
  closeAuth();renderAuthNav();renderNotifications();
  toast('🌿 Account created — welcome to AyurWell, '+name.split(' ')[0]+'!');
}

function logout(){
  setSessionEmail(null);currentUser=null;
  closeDashboard();renderAuthNav();renderNotifications();
  toast('Logged out — see you soon 🌿');
}

function renderAuthNav(){
  var area=document.getElementById('navAuthArea');
  if(currentUser){
    area.innerHTML='<button class="nb1" onclick="openDashboard()">👤 '+escapeHtml(currentUser.name.split(' ')[0])+'</button>';
  }else{
    area.innerHTML='<button class="nb1" onclick="openAuth(\'login\')">Sign In</button>';
  }
}

/* Hook: save dosha-quiz result to the logged-in user's profile */
function saveQuizResult(){
  if(!window._lastQuizResult){return}
  if(!currentUser){
    closeQuiz();
    toast('Create a free account to save your results');
    openAuth('signup');
    return;
  }
  var data=loadUserData(currentUser.email);
  data.doshaHistory.unshift({date:new Date().toISOString(),scores:window._lastQuizResult.scores,primary:window._lastQuizResult.primary});
  saveUserData(currentUser.email,data);
  renderNotifications();
  toast('✅ Saved to your Dosha History');
}

/* Hook: called from pay() after a successful mock payment */
function recordOrder(items,total,method){
  if(!currentUser)return; // guest checkouts still succeed, just aren't tracked in a dashboard
  var data=loadUserData(currentUser.email);
  data.orders.unshift({id:'AW'+Date.now().toString().slice(-6),date:new Date().toISOString(),items:items,total:total,method:method,status:'Confirmed'});
  saveUserData(currentUser.email,data);
}

/* ==================== REAL PAYMENTS — Razorpay Checkout ====================
   This talks to the small Node/Express API in /backend (deploy it separately —
   see backend/README.md). The flow is the standard, secure Razorpay pattern:

     1. Frontend asks the backend to create an order  (POST /api/create-order)
     2. Backend calls Razorpay using the SECRET key (never exposed to the browser)
        and returns an order_id
     3. Frontend opens Razorpay's own Checkout widget with that order_id —
        card/UPI/netbanking entry happens inside Razorpay's UI, not ours,
        so raw card numbers never touch our server (this is *why* real
        integrations don't use a custom card form like the "Simulate
        Payment" button above — it keeps you out of PCI-DSS scope)
     4. On success, the frontend sends the signed response back to the
        backend (POST /api/verify-payment), which recomputes the HMAC
        signature with the SECRET key to confirm it's genuinely from
        Razorpay before the order is marked paid
   ============================================================================ */
var PAYMENT_CONFIG={
  // 1. Deploy /backend (see backend/README.md) then paste its URL here, e.g. 'https://ayurwell-api.onrender.com'
  backendUrl:'https://your-backend-url.example.com',
  // 2. Paste your Razorpay TEST Key ID from https://dashboard.razorpay.com/app/keys (starts with rzp_test_)
  keyId:'rzp_test_XXXXXXXXXXXXXX'
};

function isPaymentConfigured(){
  return PAYMENT_CONFIG.backendUrl.indexOf('your-backend-url')===-1 && PAYMENT_CONFIG.keyId.indexOf('XXXXXXXX')===-1;
}
function updateRzpConfigStatus(){
  var el=document.getElementById('rzpConfigStatus');
  if(!el)return;
  if(isPaymentConfigured()){el.textContent='backend connected';el.style.color='#85BF85'}
  else{el.textContent='backend not configured — see backend/README.md';el.style.color='#F5A370'}
}

function payWithRazorpay(){
  var subtotal=cartItems.reduce(function(s,i){return s+i.price*i.qty},0);
  if(subtotal===0){toast('⚠️ Add items to cart before paying');return}
  if(typeof Razorpay==='undefined'){toast('⚠️ Razorpay script failed to load — check your connection');return}
  if(!isPaymentConfigured()){
    toast('⚠️ Set PAYMENT_CONFIG.backendUrl & keyId first — see backend/README.md');
    return;
  }
  var btn=document.getElementById('razorpayBtn');
  var originalLabel=btn.innerHTML;
  btn.disabled=true;btn.textContent='⏳ Creating order…';

  var snapshotItems=cartItems.map(function(i){return {name:i.name,qty:i.qty,price:i.price}});

  fetch(PAYMENT_CONFIG.backendUrl+'/api/create-order',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({amount:subtotal})
  })
  .then(function(r){if(!r.ok)throw new Error('create-order failed');return r.json()})
  .then(function(order){
    btn.disabled=false;btn.innerHTML=originalLabel;

    var options={
      key:PAYMENT_CONFIG.keyId,
      amount:order.amount,
      currency:order.currency||'INR',
      order_id:order.id,
      name:'AyurWell',
      description:'Ayurvedic Herbs Order',
      prefill:{name:currentUser?currentUser.name:'',email:currentUser?currentUser.email:''},
      theme:{color:'#C9A84C'},
      handler:function(response){
        fetch(PAYMENT_CONFIG.backendUrl+'/api/verify-payment',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            razorpay_order_id:response.razorpay_order_id,
            razorpay_payment_id:response.razorpay_payment_id,
            razorpay_signature:response.razorpay_signature
          })
        })
        .then(function(r){return r.json()})
        .then(function(result){
          if(result.verified){
            toast('✅ Payment verified — order placed 🌿');
            recordOrder(snapshotItems,subtotal,'razorpay');
            cartItems=[];document.getElementById('cc').textContent=0;
            renderCart();
          }else{
            toast('⚠️ Payment could not be verified — contact support');
          }
        })
        .catch(function(){toast('⚠️ Verification request failed — is the backend running?')});
      },
      modal:{ondismiss:function(){toast('Payment window closed')}}
    };
    var rzp=new Razorpay(options);
    rzp.on('payment.failed',function(resp){toast('❌ Payment failed: '+resp.error.description)});
    rzp.open();
  })
  .catch(function(err){
    btn.disabled=false;btn.innerHTML=originalLabel;
    toast('⚠️ Could not reach backend — is it deployed & is CORS enabled?');
    console.error(err);
  });
}

/* ==================== PRODUCT CATALOG ==================== */
var catalogProducts=[
  {id:'ashwagandha',icon:'🌿',name:'Ashwagandha',category:'Adaptogen',dosha:['V','K'],price:450,rating:4.8,reviews:342,pop:98,
    desc:'A cornerstone adaptogenic root used for centuries to help the body adapt to stress, steady energy, and support restful sleep.',
    benefits:['Eases everyday stress & anxiety','Supports deep, restorative sleep','Builds strength & stamina over time','Calms an aggravated Vata mind'],
    ingredients:'100% Withania somnifera root extract (KSM-66), vegetable capsule shell.',
    usage:'1 capsule twice daily with warm milk or water, morning and night.'},
  {id:'turmeric',icon:'🟡',name:'Turmeric',category:'Immunity',dosha:['P','K'],price:300,rating:4.6,reviews:210,pop:80,
    desc:'Golden Haldi root standardized for curcumin — the everyday anti-inflammatory staple of the Ayurvedic kitchen and medicine cabinet alike.',
    benefits:['Supports joint comfort & mobility','Everyday anti-inflammatory support','Aids healthy digestion','Rich in antioxidants'],
    ingredients:'Curcuma longa root extract (95% curcuminoids), black pepper extract for absorption.',
    usage:'1 capsule daily with a meal.'},
  {id:'triphala',icon:'🍵',name:'Triphala',category:'Digestive',dosha:['V','P','K'],price:375,rating:4.7,reviews:289,pop:92,
    desc:'The tridoshic classic — three fruits (Amalaki, Bibhitaki, Haritaki) combined into Ayurveda\'s most trusted gentle digestive tonic.',
    benefits:['Supports regular, comfortable digestion','Gently detoxifies over time','Balances all three doshas','Rich source of natural Vitamin C'],
    ingredients:'Equal parts Amalaki, Bibhitaki & Haritaki fruit powder.',
    usage:'1 tsp in warm water before bed, or as directed by your practitioner.'},
  {id:'brahmi-oil',icon:'🫙',name:'Brahmi Oil',category:'Oil & Topical',dosha:['P'],price:400,rating:4.5,reviews:156,pop:70,
    desc:'A cooling herb-infused sesame oil traditionally massaged into the scalp to calm an overactive Pitta mind and support focus.',
    benefits:['Cools an overheated, irritable mind','Traditionally supports memory & focus','Nourishes hair & scalp','Calming before sleep'],
    ingredients:'Sesame oil base infused with Bacopa monnieri (Brahmi) leaf.',
    usage:'Warm slightly and massage into scalp 2–3 times a week, leave 30 min before washing.'},
  {id:'shatavari',icon:'🌸',name:'Shatavari',category:'Adaptogen',dosha:['V','P'],price:520,rating:4.9,reviews:198,pop:88,
    desc:'"She who has a hundred husbands" — a cooling, nourishing root revered as Ayurveda\'s premier rejuvenative for women\'s hormonal balance.',
    benefits:['Supports hormonal balance','Cooling & nourishing rasayana','Soothes Vata & Pitta together','Supports healthy lactation'],
    ingredients:'100% Asparagus racemosus root extract.',
    usage:'1 capsule twice daily with warm milk.'},
  {id:'triphala-plus',icon:'🌰',name:'Triphala+',category:'Digestive',dosha:['K'],price:480,rating:4.4,reviews:87,pop:55,
    desc:'Classic Triphala boosted with warming Trikatu spices — built for sluggish Kapha digestion that needs a gentle push.',
    benefits:['Kindles sluggish digestive fire (Agni)','Helps clear heaviness after meals','Supports healthy metabolism'],
    ingredients:'Triphala blend + Trikatu (ginger, black pepper, long pepper).',
    usage:'1/2 tsp in warm water after meals.'},
  {id:'moringa',icon:'💚',name:'Moringa',category:'Superfood',dosha:['K'],price:350,rating:4.3,reviews:132,pop:62,
    desc:'The "miracle tree" leaf, dense in micronutrients — an energizing daily green for Kapha types who need a gentle lift.',
    benefits:['Naturally energizing, non-jittery','Dense in vitamins & minerals','Supports healthy metabolism'],
    ingredients:'100% Moringa oleifera leaf powder, capsule shell.',
    usage:'2 capsules daily with breakfast.'},
  {id:'shankhpushpi',icon:'🌾',name:'Shankhpushpi',category:'Nervine',dosha:['V','P'],price:430,rating:4.6,reviews:97,pop:58,
    desc:'A gentle nervine herb traditionally used to quiet a racing mind — well suited to Vata anxiety and Pitta over-thinking alike.',
    benefits:['Calms a racing, overstimulated mind','Traditionally supports focus & memory','Gentle enough for daily use'],
    ingredients:'100% Convolvulus pluricaulis extract.',
    usage:'1 capsule in the evening.'},
  {id:'guduchi',icon:'⭐',name:'Guduchi',category:'Immunity',dosha:['P','K'],price:390,rating:4.7,reviews:176,pop:76,
    desc:'Called "Amrita" — the nectar of immortality — for its reputation as Ayurveda\'s premier immune-supporting rasayana.',
    benefits:['Broad daily immune support','Traditionally used to clear heat & toxins','Supports healthy liver function'],
    ingredients:'100% Tinospora cordifolia stem extract.',
    usage:'1 capsule twice daily.'},
  {id:'neem',icon:'🍃',name:'Neem Capsules',category:'Skin & Detox',dosha:['P','K'],price:320,rating:4.4,reviews:143,pop:60,
    desc:'Bitter, cooling, and famously purifying — Neem is the go-to herb for clear skin and gentle internal detoxification.',
    benefits:['Supports clear, healthy-looking skin','Gentle blood purifier','Cooling for aggravated Pitta'],
    ingredients:'100% Azadirachta indica leaf extract.',
    usage:'1 capsule daily with food.'},
  {id:'chyawanprash',icon:'🍯',name:'Chyawanprash',category:'Immunity',dosha:['V','P','K'],price:550,rating:4.8,reviews:421,pop:95,
    desc:'A rich, jam-like blend of 40+ herbs anchored by Amla — Ayurveda\'s most iconic daily rasayana for immunity and vitality.',
    benefits:['Tridoshic daily immunity support','Rich source of natural Vitamin C','Builds long-term vitality (Ojas)'],
    ingredients:'Amla fruit pulp base with 40+ classical herbs, honey, ghee.',
    usage:'1–2 tsp daily, ideally in the morning, on its own or with warm milk.'},
  {id:'sesame-oil',icon:'💧',name:'Sesame Massage Oil',category:'Oil & Topical',dosha:['V'],price:380,rating:4.5,reviews:88,pop:50,
    desc:'Warm, grounding Abhyanga oil — the single most recommended daily ritual in Ayurveda for calming Vata.',
    benefits:['Grounds & calms Vata dryness','Nourishes skin deeply','Supports better sleep when used before bed'],
    ingredients:'Cold-pressed sesame oil, warming herb infusion.',
    usage:'Warm and self-massage whole body 2–4x weekly before bathing.'}
];

function initCatalogFilters(){
  var cats=[];
  catalogProducts.forEach(function(p){if(cats.indexOf(p.category)===-1)cats.push(p.category)});
  var wrap=document.getElementById('catCatChips');
  wrap.innerHTML=cats.map(function(c){
    return '<button data-c="'+c+'" onclick="toggleChip(this)" class="chip text-xs px-3 py-1 rounded-full border border-white/15 text-white/60">'+c+'</button>';
  }).join('');
}

function toggleChip(el){el.classList.toggle('active');renderCatalog()}

function clearCatalogFilters(){
  document.getElementById('catSearch').value='';
  document.getElementById('catSort').value='pop';
  document.querySelectorAll('#catDoshaChips .chip, #catCatChips .chip').forEach(function(c){c.classList.remove('active')});
  renderCatalog();
}

function renderCatalog(){
  var search=(document.getElementById('catSearch').value||'').toLowerCase();
  var doshas=Array.from(document.querySelectorAll('#catDoshaChips .chip.active')).map(function(b){return b.dataset.d});
  var cats=Array.from(document.querySelectorAll('#catCatChips .chip.active')).map(function(b){return b.dataset.c});
  var sort=document.getElementById('catSort').value;

  var list=catalogProducts.filter(function(p){
    if(search&&p.name.toLowerCase().indexOf(search)===-1)return false;
    if(doshas.length&&!doshas.some(function(d){return p.dosha.indexOf(d)!==-1}))return false;
    if(cats.length&&cats.indexOf(p.category)===-1)return false;
    return true;
  });

  if(sort==='priceLow')list.sort(function(a,b){return a.price-b.price});
  else if(sort==='priceHigh')list.sort(function(a,b){return b.price-a.price});
  else if(sort==='rating')list.sort(function(a,b){return b.rating-a.rating});
  else list.sort(function(a,b){return b.pop-a.pop});

  var doshaColor={V:'text-vata border-vata/40',P:'text-pitta border-pitta/40',K:'text-kapha border-kapha/40'};
  var doshaLabel={V:'Vata',P:'Pitta',K:'Kapha'};

  document.getElementById('catCount').textContent=list.length+' of '+catalogProducts.length+' herbs';
  document.getElementById('catEmpty').classList.toggle('hidden',list.length>0);

  document.getElementById('catalogGrid').innerHTML=list.map(function(p){
    var chips=p.dosha.map(function(d){return '<span class="text-[10px] px-2 py-0.5 rounded-full border '+doshaColor[d]+'">'+doshaLabel[d]+'</span>'}).join(' ');
    return '<div class="pc-card bg-white/[.03] border border-white/[.08] rounded-2xl p-5 cursor-pointer hover:border-gold/30" onclick="openProductModal(\''+p.id+'\')">'+
      '<div class="flex items-start justify-between mb-3">'+
        '<div class="text-3xl">'+p.icon+'</div>'+
        '<div class="text-[11px] text-gold-light">★ '+p.rating+' <span class="text-white/30">('+p.reviews+')</span></div>'+
      '</div>'+
      '<div class="text-white font-semibold text-sm mb-1">'+p.name+'</div>'+
      '<div class="text-white/40 text-xs mb-3">'+p.category+'</div>'+
      '<div class="flex gap-1.5 flex-wrap mb-4">'+chips+'</div>'+
      '<div class="flex items-center justify-between">'+
        '<span class="text-gold font-bold text-sm">'+money(p.price)+'</span>'+
        '<button onclick="event.stopPropagation();addCart(\''+p.name.replace(/'/g,"\\'")+'\','+p.price+',\''+p.icon+'\')" class="text-xs font-semibold bg-gold/15 text-gold-light border border-gold/30 rounded-full px-3 py-1.5 hover:bg-gold hover:text-black transition">+ Add</button>'+
      '</div>'+
    '</div>';
  }).join('');
}

function openProductModal(id){
  var p=catalogProducts.find(function(x){return x.id===id});
  if(!p)return;
  var doshaLabel={V:'Vata',P:'Pitta',K:'Kapha'};
  var benefits=p.benefits.map(function(b){return '<li class="flex gap-2 text-sm text-white/70"><span class="text-gold">✓</span>'+b+'</li>'}).join('');
  var reviews=[
    {n:'A. Sharma',d:'Vata',r:5,q:'Genuinely noticed a difference in my sleep within two weeks. Will reorder.'},
    {n:'P. Nair',d:'Pitta',r:5,q:'No fillers, clean ingredient list, and it actually works with my routine.'},
    {n:'R. Gupta',d:'Kapha',r:4,q:'Good quality, packaging could be sturdier for shipping but the product is solid.'}
  ].map(function(r){
    return '<div class="border-b border-white/5 pb-3 mb-3 last:border-0"><div class="flex items-center justify-between mb-1"><span class="text-sm font-semibold text-white">'+r.n+' <span class="text-white/30 font-normal">· '+r.d+'</span></span><span class="text-gold text-xs">'+'★'.repeat(r.r)+'<span class="text-white/15">'+'★'.repeat(5-r.r)+'</span></span></div><p class="text-xs text-white/50 leading-relaxed">'+r.q+'</p></div>';
  }).join('');

  document.getElementById('productModalInner').innerHTML=
    '<button onclick="closeProductModal()" class="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 z-10">✕</button>'+
    '<div class="p-7">'+
      '<div class="flex items-start gap-4 mb-5">'+
        '<div class="text-5xl">'+p.icon+'</div>'+
        '<div class="flex-1">'+
          '<div class="text-xs text-gold uppercase tracking-wide font-semibold mb-1">'+p.category+'</div>'+
          '<h3 class="font-display text-2xl font-bold text-white mb-1">'+p.name+'</h3>'+
          '<div class="text-xs text-gold-light">★ '+p.rating+' · '+p.reviews+' reviews</div>'+
        '</div>'+
        '<div class="text-2xl font-bold text-gold">'+money(p.price)+'</div>'+
      '</div>'+
      '<div class="flex gap-1.5 mb-5">'+p.dosha.map(function(d){return '<span class="text-[11px] px-2.5 py-1 rounded-full bg-white/5 text-white/60 border border-white/10">Balances '+doshaLabel[d]+'</span>'}).join('')+'</div>'+
      '<p class="text-sm text-white/60 leading-relaxed mb-5">'+p.desc+'</p>'+
      '<div class="grid sm:grid-cols-2 gap-5 mb-6">'+
        '<div><div class="text-xs uppercase tracking-wide text-gold font-semibold mb-2">Benefits</div><ul class="flex flex-col gap-1.5">'+benefits+'</ul></div>'+
        '<div>'+
          '<div class="text-xs uppercase tracking-wide text-gold font-semibold mb-2">Ingredients</div><p class="text-sm text-white/60 mb-4">'+p.ingredients+'</p>'+
          '<div class="text-xs uppercase tracking-wide text-gold font-semibold mb-2">How to Use</div><p class="text-sm text-white/60">'+p.usage+'</p>'+
        '</div>'+
      '</div>'+
      '<div class="text-xs uppercase tracking-wide text-gold font-semibold mb-2">Reviews</div>'+
      '<div class="mb-6">'+reviews+'</div>'+
      '<div class="flex items-center gap-3 sticky bottom-0 bg-[#111810] pt-3 -mx-7 px-7 border-t border-white/5">'+
        '<div class="flex items-center gap-2 bg-white/5 rounded-full px-1.5 py-1.5">'+
          '<button onclick="pmQty(-1)" class="w-7 h-7 rounded-full bg-white/10 text-white">−</button>'+
          '<span id="pmQty" class="w-6 text-center text-sm text-white font-semibold">1</span>'+
          '<button onclick="pmQty(1)" class="w-7 h-7 rounded-full bg-white/10 text-white">+</button>'+
        '</div>'+
        '<button onclick="addFromModal(\''+p.id+'\')" class="flex-1 py-2.5 rounded-full bg-gold text-black font-bold text-sm hover:bg-gold-light transition">Add to Cart</button>'+
      '</div>'+
    '</div>';
  document.getElementById('productModal').classList.add('open');
}
window._pmQty=1;
function pmQty(d){window._pmQty=Math.max(1,window._pmQty+d);document.getElementById('pmQty').textContent=window._pmQty}
function addFromModal(id){
  var p=catalogProducts.find(function(x){return x.id===id});
  addCart(p.name,p.price,p.icon,window._pmQty);
  window._pmQty=1;
  closeProductModal();openCart();
}
function closeProductModal(){document.getElementById('productModal').classList.remove('open');window._pmQty=1}

/* addCart upgraded to accept a quantity (keeps old 3-arg calls working) */
function addCart(name,price,icon,qty){
  qty=qty||1;
  var existing=cartItems.find(function(i){return i.name===name});
  if(existing){existing.qty+=qty}
  else{cartItems.push({name:name,price:price||450,icon:icon||'🌿',qty:qty})}
  var total=cartItems.reduce(function(s,i){return s+i.qty},0);
  document.getElementById('cc').textContent=total;
  toast('Added '+name+' to cart 🛒');
  if(cartSidebarOpen)renderCart();
}

/* ==================== DOCTOR CONSULTATION ==================== */
var doctors=[
  {id:'d1',name:'Dr. Anjali Verma',spec:'General Ayurveda',exp:12,rating:4.9,fee:499,color:'#3D5A4A',bio:'BAMS, MD (Kayachikitsa) — 12 years diagnosing Prakriti imbalances and building sustainable daily routines.',slots:['9:00 AM','10:30 AM','2:00 PM','5:30 PM']},
  {id:'d2',name:'Dr. Rohan Mehta',spec:'Panchakarma',exp:9,rating:4.7,fee:699,color:'#8B6914',bio:'Specialist in Panchakarma detox therapies — Abhyanga, Shirodhara, and seasonal cleansing protocols.',slots:['11:00 AM','1:00 PM','4:00 PM']},
  {id:'d3',name:'Dr. Sunita Nair',spec:'Nutrition',exp:7,rating:4.8,fee:399,color:'#1A5E7A',bio:'Ayurvedic nutritionist focused on dosha-specific diet plans and digestive health (Agni).',slots:['9:30 AM','12:00 PM','3:00 PM','6:00 PM']},
  {id:'d4',name:'Dr. Vikram Iyer',spec:'Dermatology',exp:15,rating:4.6,fee:599,color:'#B5522A',bio:'Twak Roga specialist treating skin conditions through internal + topical Ayurvedic protocols.',slots:['10:00 AM','1:30 PM']},
  {id:'d5',name:"Dr. Meera Joshi",spec:"Women's Health",exp:10,rating:4.9,fee:549,color:'#7B1FA2',bio:'Prasuti Tantra specialist — hormonal balance, fertility support, and postpartum Ayurvedic care.',slots:['9:00 AM','11:30 AM','4:30 PM']},
  {id:'d6',name:'Dr. Karan Chopra',spec:'Stress & Sleep',exp:6,rating:4.5,fee:449,color:'#2196F3',bio:'Manas Roga specialist helping patients rebuild sleep cycles and manage stress the Ayurvedic way.',slots:['12:30 PM','3:30 PM','7:00 PM']}
];
var activeDocSpec='All';

function initDoctorFilters(){
  var specs=['All'];
  doctors.forEach(function(d){if(specs.indexOf(d.spec)===-1)specs.push(d.spec)});
  document.getElementById('docSpecFilter').innerHTML=specs.map(function(s){
    return '<button data-s="'+s+'" onclick="filterDocs(this)" class="chip text-xs px-3.5 py-1.5 rounded-full border '+(s==='All'?'active border-gold':'border-white/15 text-white/60')+'">'+s+'</button>';
  }).join('');
}
function filterDocs(el){
  document.querySelectorAll('#docSpecFilter .chip').forEach(function(c){c.classList.remove('active')});
  el.classList.add('active');
  activeDocSpec=el.dataset.s;
  renderDoctors();
}
function renderDoctors(){
  var list=doctors.filter(function(d){return activeDocSpec==='All'||d.spec===activeDocSpec});
  document.getElementById('doctorsGrid').innerHTML=list.map(function(d){
    var initials=d.name.replace('Dr. ','').split(' ').map(function(w){return w[0]}).join('');
    return '<div class="bg-white/[.03] border border-white/[.08] rounded-2xl p-6 hover:border-gold/30 transition">'+
      '<div class="flex items-center gap-3 mb-4">'+
        '<div class="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style="background:'+d.color+'">'+initials+'</div>'+
        '<div class="min-w-0">'+
          '<div class="text-white font-semibold text-sm truncate">'+d.name+'</div>'+
          '<div class="text-gold-light text-xs">'+d.spec+'</div>'+
        '</div>'+
      '</div>'+
      '<div class="text-xs text-white/40 mb-3">'+d.exp+' yrs experience · ★ '+d.rating+'</div>'+
      '<p class="text-xs text-white/55 leading-relaxed mb-4">'+d.bio+'</p>'+
      '<div class="flex items-center justify-between">'+
        '<span class="text-gold font-bold text-sm">'+money(d.fee)+'<span class="text-white/30 font-normal text-xs"> /session</span></span>'+
        '<button onclick="openBooking(\''+d.id+'\')" class="text-xs font-semibold bg-gold text-black rounded-full px-4 py-2 hover:bg-gold-light transition">Book</button>'+
      '</div>'+
    '</div>';
  }).join('');
}

var bookingState={doctorId:null,date:null,slot:null,mode:'Video'};
var flatpickrInstance=null;

function openBooking(doctorId){
  var d=doctors.find(function(x){return x.id===doctorId});
  if(!d)return;
  bookingState={doctorId:doctorId,date:null,slot:null,mode:'Video'};
  var initials=d.name.replace('Dr. ','').split(' ').map(function(w){return w[0]}).join('');
  document.getElementById('bookingModalInner').innerHTML=
    '<button onclick="closeBooking()" class="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20">✕</button>'+
    '<div class="flex items-center gap-3 mb-5">'+
      '<div class="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style="background:'+d.color+'">'+initials+'</div>'+
      '<div><div class="text-white font-semibold text-sm">'+d.name+'</div><div class="text-gold-light text-xs">'+d.spec+' · '+money(d.fee)+'</div></div>'+
    '</div>'+
    '<label class="block text-xs uppercase tracking-wide text-white/40 mb-1.5">Choose a date</label>'+
    '<input id="bookDate" placeholder="Select date" readonly class="w-full bg-white/[.08] border border-white/[.15] rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-gold/60 mb-4 cursor-pointer">'+
    '<label class="block text-xs uppercase tracking-wide text-white/40 mb-1.5">Available slots</label>'+
    '<div class="flex flex-wrap gap-2 mb-4" id="slotWrap">'+d.slots.map(function(s){return '<button onclick="selSlot(this,\''+s+'\')" class="chip text-xs px-3 py-1.5 rounded-full border border-white/15 text-white/60">'+s+'</button>'}).join('')+'</div>'+
    '<label class="block text-xs uppercase tracking-wide text-white/40 mb-1.5">Consultation mode</label>'+
    '<div class="flex gap-2 mb-4">'+
      '<button onclick="selMode(this,\'Video\')" class="chip active flex-1 text-xs px-3 py-2 rounded-lg border border-gold">🎥 Video Call</button>'+
      '<button onclick="selMode(this,\'In-Clinic\')" class="chip flex-1 text-xs px-3 py-2 rounded-lg border border-white/15 text-white/60">🏥 In-Clinic</button>'+
    '</div>'+
    '<div class="grid grid-cols-2 gap-3 mb-4">'+
      '<div><label class="block text-xs uppercase tracking-wide text-white/40 mb-1.5">Your Name</label><input id="bkName" value="'+(currentUser?escapeHtml(currentUser.name):'')+'" placeholder="Full name" class="w-full bg-white/[.08] border border-white/[.15] rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-gold/60"></div>'+
      '<div><label class="block text-xs uppercase tracking-wide text-white/40 mb-1.5">Phone</label><input id="bkPhone" placeholder="10-digit number" maxlength="10" class="w-full bg-white/[.08] border border-white/[.15] rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-gold/60"></div>'+
    '</div>'+
    '<button onclick="confirmBooking()" class="w-full py-2.5 rounded-full bg-gold text-black font-bold text-sm hover:bg-gold-light transition">Confirm Appointment</button>'+
    (currentUser?'':'<div class="text-center text-[11px] text-white/30 mt-2">Sign in to see this appointment in your dashboard.</div>');

  document.getElementById('bookingModal').classList.add('open');
  if(flatpickrInstance)flatpickrInstance.destroy();
  flatpickrInstance=flatpickr('#bookDate',{minDate:'today',maxDate:new Date().fp_incr(30),dateFormat:'D, d M Y',onChange:function(sel,str){bookingState.date=str}});
}
function selSlot(el,s){document.querySelectorAll('#slotWrap .chip').forEach(function(c){c.classList.remove('active')});el.classList.add('active');bookingState.slot=s}
function selMode(el,m){document.querySelectorAll('#bookingModalInner .chip.flex-1').forEach(function(c){c.classList.remove('active');c.classList.add('border-white/15','text-white/60');c.classList.remove('border-gold')});el.classList.add('active','border-gold');el.classList.remove('border-white/15','text-white/60');bookingState.mode=m}
function closeBooking(){document.getElementById('bookingModal').classList.remove('open')}

function confirmBooking(){
  var name=(document.getElementById('bkName').value||'').trim();
  var phone=(document.getElementById('bkPhone').value||'').trim();
  if(!bookingState.date){toast('⚠️ Please choose a date');return}
  if(!bookingState.slot){toast('⚠️ Please choose a time slot');return}
  if(!name){toast('⚠️ Please enter your name');return}
  if(!/^\d{10}$/.test(phone)){toast('⚠️ Enter a valid 10-digit phone number');return}
  var d=doctors.find(function(x){return x.id===bookingState.doctorId});
  var appt={id:'APT'+Date.now().toString().slice(-6),doctor:d.name,spec:d.spec,date:bookingState.date,slot:bookingState.slot,mode:bookingState.mode,fee:d.fee,status:'Upcoming'};
  if(currentUser){
    var data=loadUserData(currentUser.email);
    data.appointments.unshift(appt);
    saveUserData(currentUser.email,data);
  }
  closeBooking();
  toast('🩺 Booked with '+d.name+' — '+bookingState.slot+', '+bookingState.date);
}

/* ==================== DASHBOARD ==================== */
var activeDashTab='profile';
var _doshaChart=null;

function openDashboard(){
  if(!currentUser){openAuth('login');toast('Sign in to view your dashboard');return}
  document.getElementById('dashAvatar').textContent=currentUser.name[0].toUpperCase();
  document.getElementById('dashName').textContent=currentUser.name;
  document.getElementById('dashEmail').textContent=currentUser.email;
  document.getElementById('dashboardModal').classList.add('open');
  switchDashTab('profile');
}
function closeDashboard(){document.getElementById('dashboardModal').classList.remove('open')}

function switchDashTab(tab){
  activeDashTab=tab;
  document.querySelectorAll('.dash-tab').forEach(function(b){b.classList.toggle('active',b.dataset.tab===tab)});
  var fns={profile:renderDashProfile,orders:renderDashOrders,appointments:renderDashAppointments,dosha:renderDashDosha,routine:renderDashRoutine};
  fns[tab]();
}

function emptyState(icon,title,sub,ctaLabel,ctaFn){
  return '<div class="text-center py-14 text-white/40">'+
    '<div class="text-4xl mb-3">'+icon+'</div>'+
    '<div class="font-semibold text-white/70 mb-1">'+title+'</div>'+
    '<div class="text-sm mb-4">'+sub+'</div>'+
    (ctaLabel?'<button onclick="'+ctaFn+'" class="text-xs font-semibold bg-gold text-black rounded-full px-4 py-2">'+ctaLabel+'</button>':'')+
  '</div>';
}

function renderDashProfile(){
  var data=loadUserData(currentUser.email);
  var latest=data.doshaHistory[0];
  var doshaName={V:'Vata 💨',P:'Pitta 🔥',K:'Kapha 🌊'};
  document.getElementById('dashContent').innerHTML=
    '<h3 class="font-display text-xl font-bold text-white mb-5">Profile</h3>'+
    '<div class="grid sm:grid-cols-2 gap-4 mb-6">'+
      '<div class="bg-white/[.03] border border-white/[.07] rounded-xl p-4"><div class="text-xs text-white/40 mb-1">Name</div><div class="text-white text-sm font-semibold">'+escapeHtml(currentUser.name)+'</div></div>'+
      '<div class="bg-white/[.03] border border-white/[.07] rounded-xl p-4"><div class="text-xs text-white/40 mb-1">Email</div><div class="text-white text-sm font-semibold">'+escapeHtml(currentUser.email)+'</div></div>'+
      '<div class="bg-white/[.03] border border-white/[.07] rounded-xl p-4"><div class="text-xs text-white/40 mb-1">Primary Dosha</div><div class="text-white text-sm font-semibold">'+(latest?doshaName[latest.primary]:'Not taken yet')+'</div></div>'+
      '<div class="bg-white/[.03] border border-white/[.07] rounded-xl p-4"><div class="text-xs text-white/40 mb-1">Member Since</div><div class="text-white text-sm font-semibold">'+(data.orders.length||data.doshaHistory.length?fmtDate((data.orders[data.orders.length-1]||data.doshaHistory[data.doshaHistory.length-1]).date):'Today')+'</div></div>'+
    '</div>'+
    '<button onclick="closeDashboard();openQuiz()" class="text-xs font-semibold bg-gold/15 text-gold-light border border-gold/30 rounded-full px-4 py-2 hover:bg-gold hover:text-black transition">🌿 Retake Dosha Quiz</button>';
}

function renderDashOrders(){
  var data=loadUserData(currentUser.email);
  var html='<h3 class="font-display text-xl font-bold text-white mb-5">My Orders</h3>';
  if(!data.orders.length){
    html+=emptyState('📦','No orders yet','Your herbal orders will show up here once you check out.','Browse Catalog',"closeDashboard();document.getElementById('catalog').scrollIntoView({behavior:'smooth'})");
  }else{
    html+='<div class="flex flex-col gap-3">'+data.orders.map(function(o){
      var items=o.items.map(function(i){return i.name+' ×'+i.qty}).join(', ');
      return '<div class="bg-white/[.03] border border-white/[.07] rounded-xl p-4">'+
        '<div class="flex justify-between items-start mb-1"><span class="text-sm font-semibold text-white">#'+o.id+'</span><span class="text-[11px] px-2 py-0.5 rounded-full bg-sage/30 text-white">'+o.status+'</span></div>'+
        '<div class="text-xs text-white/40 mb-2">'+fmtDate(o.date)+' · Paid via '+o.method.toUpperCase()+'</div>'+
        '<div class="text-xs text-white/60 mb-2">'+items+'</div>'+
        '<div class="text-gold font-bold text-sm">'+money(o.total)+'</div>'+
      '</div>';
    }).join('')+'</div>';
  }
  document.getElementById('dashContent').innerHTML=html;
}

function renderDashAppointments(){
  var data=loadUserData(currentUser.email);
  var html='<h3 class="font-display text-xl font-bold text-white mb-5">My Appointments</h3>';
  if(!data.appointments.length){
    html+=emptyState('🩺','No appointments booked','Book a consultation with an Ayurvedic doctor to see it here.','Find a Doctor',"closeDashboard();document.getElementById('doctors').scrollIntoView({behavior:'smooth'})");
  }else{
    html+='<div class="flex flex-col gap-3">'+data.appointments.map(function(a,idx){
      return '<div class="bg-white/[.03] border border-white/[.07] rounded-xl p-4">'+
        '<div class="flex justify-between items-start mb-1"><span class="text-sm font-semibold text-white">'+a.doctor+'</span><span class="text-[11px] px-2 py-0.5 rounded-full '+(a.status==='Cancelled'?'bg-red-500/20 text-red-300':'bg-sage/30 text-white')+'">'+a.status+'</span></div>'+
        '<div class="text-xs text-white/40 mb-1">'+a.spec+' · '+a.mode+'</div>'+
        '<div class="text-xs text-white/60 mb-2">'+a.date+' at '+a.slot+'</div>'+
        '<div class="flex items-center justify-between"><span class="text-gold font-bold text-sm">'+money(a.fee)+'</span>'+
        (a.status==='Upcoming'?'<button onclick="cancelAppointment('+idx+')" class="text-[11px] text-red-300/70 hover:text-red-300">Cancel</button>':'')+
        '</div></div>';
    }).join('')+'</div>';
  }
  document.getElementById('dashContent').innerHTML=html;
}
function cancelAppointment(idx){
  var data=loadUserData(currentUser.email);
  data.appointments[idx].status='Cancelled';
  saveUserData(currentUser.email,data);
  renderDashAppointments();
  toast('Appointment cancelled');
}

function renderDashDosha(){
  var data=loadUserData(currentUser.email);
  var html='<h3 class="font-display text-xl font-bold text-white mb-5">Dosha History</h3>';
  if(!data.doshaHistory.length){
    document.getElementById('dashContent').innerHTML=html+emptyState('☯️','No assessments yet','Take the quiz to discover — and save — your Ayurvedic constitution.','Take the Quiz',"closeDashboard();openQuiz()");
    return;
  }
  html+='<canvas id="doshaChart" height="140" class="mb-6"></canvas>';
  html+='<div class="flex flex-col gap-2">'+data.doshaHistory.map(function(h){
    var doshaName={V:'Vata',P:'Pitta',K:'Kapha'};
    return '<div class="flex items-center justify-between bg-white/[.03] border border-white/[.07] rounded-xl p-3"><span class="text-xs text-white/50">'+fmtDate(h.date)+'</span><span class="text-sm font-semibold text-white">'+doshaName[h.primary]+'</span></div>';
  }).join('')+'</div>';
  document.getElementById('dashContent').innerHTML=html;

  var ctx=document.getElementById('doshaChart').getContext('2d');
  if(_doshaChart)_doshaChart.destroy();
  var labels=data.doshaHistory.slice().reverse().map(function(h){return fmtDate(h.date)});
  _doshaChart=new Chart(ctx,{
    type:'line',
    data:{labels:labels,datasets:[
      {label:'Vata',data:data.doshaHistory.slice().reverse().map(function(h){return h.scores.V}),borderColor:'#93C4D8',backgroundColor:'transparent',tension:.35},
      {label:'Pitta',data:data.doshaHistory.slice().reverse().map(function(h){return h.scores.P}),borderColor:'#F5A370',backgroundColor:'transparent',tension:.35},
      {label:'Kapha',data:data.doshaHistory.slice().reverse().map(function(h){return h.scores.K}),borderColor:'#85BF85',backgroundColor:'transparent',tension:.35}
    ]},
    options:{plugins:{legend:{labels:{color:'rgba(255,255,255,.6)'}}},scales:{x:{ticks:{color:'rgba(255,255,255,.4)'},grid:{color:'rgba(255,255,255,.05)'}},y:{ticks:{color:'rgba(255,255,255,.4)'},grid:{color:'rgba(255,255,255,.05)'}}}}
  });
}

var routineTasks=[
  {id:'t1',label:'Morning Ashwagandha',icon:'⏰'},
  {id:'t2',label:'8 Glasses of Water',icon:'💧'},
  {id:'t3',label:'10 min Meditation',icon:'🧘'},
  {id:'t4',label:'Evening Pranayama',icon:'🌙'}
];
function renderDashRoutine(){
  var data=loadUserData(currentUser.email);
  var key=todayKey();
  var todays=data.routine[key]||{};
  var doneCount=routineTasks.filter(function(t){return todays[t.id]}).length;

  var streak=0;
  var d=new Date();
  while(true){
    var k=d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
    var day=data.routine[k];
    if(day&&routineTasks.every(function(t){return day[t.id]})){streak++;d.setDate(d.getDate()-1)}else break;
  }

  var html='<div class="flex items-center justify-between mb-5"><h3 class="font-display text-xl font-bold text-white">Routine Tracker</h3><div class="text-xs text-gold-light">🔥 '+streak+'-day streak</div></div>';
  html+='<div class="text-xs text-white/40 mb-3">'+doneCount+' of '+routineTasks.length+' done today</div>';
  html+='<div class="flex flex-col gap-2">'+routineTasks.map(function(t){
    return '<label class="flex items-center gap-3 bg-white/[.03] border border-white/[.07] rounded-xl p-3.5 cursor-pointer">'+
      '<input type="checkbox" class="routine-check" '+(todays[t.id]?'checked':'')+' onchange="toggleRoutine(\''+t.id+'\',this.checked)">'+
      '<span>'+t.icon+'</span><span class="text-sm text-white/80">'+t.label+'</span>'+
    '</label>';
  }).join('')+'</div>';
  document.getElementById('dashContent').innerHTML=html;
}
function toggleRoutine(taskId,checked){
  var data=loadUserData(currentUser.email);
  var key=todayKey();
  if(!data.routine[key])data.routine[key]={};
  data.routine[key][taskId]=checked;
  saveUserData(currentUser.email,data);
  renderDashRoutine();
  renderNotifications();
}

/* ==================== SMART REMINDERS (notifications panel) ====================
   Reads the signed-in user's dosha history + today's routine progress and
   builds the reminder feed around them. Logged-out visitors still see a
   sensible generic feed plus a sign-in nudge, matching how a real push/email
   reminder service (Firebase FCM / Nodemailer, as noted above) would only be
   able to personalize once it knows who it's talking to. */
var activeNotifTab='all';

function defaultNotifPrefs(){return {herb:true,seasonal:true,restock:false,offers:true}}
function getNotifPrefs(){
  if(currentUser){var data=loadUserData(currentUser.email);return data.prefs||defaultNotifPrefs()}
  if(!window._guestNotifPrefs)window._guestNotifPrefs=defaultNotifPrefs();
  return window._guestNotifPrefs;
}
function saveNotifPrefs(prefs){
  if(currentUser){var data=loadUserData(currentUser.email);data.prefs=prefs;saveUserData(currentUser.email,data)}
  else window._guestNotifPrefs=prefs;
}

function tog(cb,label,prefKey){
  var prefs=getNotifPrefs();
  prefs[prefKey]=cb.checked;
  saveNotifPrefs(prefs);
  toast((cb.checked?'✓ Enabled: ':'✗ Disabled: ')+label);
  renderNotifications();
}

function ntab(b,t){
  document.querySelectorAll('.ntab').forEach(function(x){x.classList.remove('on')});
  b.classList.add('on');
  activeNotifTab=t;
  applyNotifTabFilter();
}
function applyNotifTabFilter(){
  document.querySelectorAll('#nlist .nitem').forEach(function(i){
    i.style.display=(activeNotifTab==='all'||i.dataset.type===activeNotifTab)?'flex':'none';
  });
}

function buildNotifications(){
  var doshaName={V:'Vata',P:'Pitta',K:'Kapha'};
  var items=[];

  if(currentUser){
    var data=loadUserData(currentUser.email);
    var latest=data.doshaHistory[0];

    // 1. Herb reminder — personalized once we know the dosha
    if(latest){
      var herb=(doshaHerbMap[latest.primary]||['Ashwagandha'])[0];
      items.push({icon:'⏰',cls:'ni-r',title:'Morning '+herb,desc:'Take as directed — your '+doshaName[latest.primary]+' routine',time:'Now · Wellness',type:'remind',pref:'herb',unread:true});
    }else{
      items.push({icon:'⏰',cls:'ni-r',title:'Set up your herb routine',desc:'Take the dosha quiz so we know what to remind you about',time:'Now · Wellness',type:'remind',pref:'herb',unread:true,action:'openQuiz()'});
    }

    // 2. Dosha check-in — nudges a retake after a week
    if(latest){
      var days=Math.floor((Date.now()-new Date(latest.date).getTime())/86400000);
      items.push({icon:'🌿',cls:'ni-h',title:'Dosha Check-in',desc:days<1?'Assessed today — you\'re all set':'Last checked '+days+' day'+(days===1?'':'s')+' ago · tap to retake',time:(days<1?'Today':days+'d ago')+' · Health',type:'remind',pref:'seasonal',unread:days>=7,action:'closeDashboard();openQuiz()'});
    }else{
      items.push({icon:'🌿',cls:'ni-h',title:'Take Your First Dosha Quiz',desc:'2 minutes — unlocks every personalized recommendation on the site',time:'Health',type:'remind',pref:'seasonal',unread:true,action:'openQuiz()'});
    }

    // 3. Offer — matched to their dosha from the real catalog
    if(latest){
      var matches=catalogProducts.filter(function(p){return p.dosha.indexOf(latest.primary)!==-1});
      var pick=matches[Math.floor(Math.random()*matches.length)]||catalogProducts[0];
      items.push({icon:'🎁',cls:'ni-p',title:'20% Off '+pick.name+' — Today!',desc:'Your '+doshaName[latest.primary]+' profile recommends this herb',time:'3 hrs ago · Offer',type:'offer',pref:'offers',unread:true,action:"openProductModal('"+pick.id+"')"});
    }

    // 4. Today's routine status
    var key=todayKey();
    var todays=data.routine[key]||{};
    var done=routineTasks.filter(function(t){return todays[t.id]}).length;
    items.push({icon: done===routineTasks.length?'✅':'📅',cls:'ni-r',title:done===routineTasks.length?'Routine Complete!':"Today's Routine — "+done+'/'+routineTasks.length+' done',desc:done===routineTasks.length?'Nicely done — see you tomorrow 🌿':'Tap to check off the rest in your dashboard',time:'Yesterday · Routine',type:'remind',pref:'herb',unread:done<routineTasks.length,action:"openDashboard();switchDashTab('routine')"});

  }else{
    // Logged-out: generic, non-personalized defaults
    items.push({icon:'⏰',cls:'ni-r',title:'Morning Ashwagandha',desc:'Take 1 capsule with warm milk — general Vata routine',time:'Now · Wellness',type:'remind',pref:'herb',unread:true});
    items.push({icon:'🌿',cls:'ni-h',title:'Weekly Dosha Check-in',desc:'Sign in and take the quiz for recommendations tuned to you',time:'1 hr ago · Health',type:'remind',pref:'seasonal',unread:true,action:"openQuiz()"});
    items.push({icon:'🎁',cls:'ni-p',title:'20% Off Triphala — Today!',desc:'Sign in to see offers matched to your dosha',time:'3 hrs ago · Offer',type:'offer',pref:'offers',unread:true});
    items.push({icon:'📅',cls:'ni-r',title:'Evening Pranayama',desc:'10 min breathing — a calming close to any dosha\'s day',time:'Yesterday · Routine',type:'remind',pref:'herb',unread:false});
  }
  return items;
}

function renderNotifications(){
  var prefs=getNotifPrefs();
  document.getElementById('notifSignInBanner').style.display=currentUser?'none':'flex';

  var items=buildNotifications().filter(function(i){return prefs[i.pref]});
  document.getElementById('nlist').innerHTML=items.map(function(i){
    return '<div class="nitem'+(i.unread?' unread':'')+'" data-type="'+i.type+'"'+(i.action?' style="cursor:pointer" onclick="'+i.action+'"':'')+'>'+
      '<div class="nicon '+i.cls+'">'+i.icon+'</div>'+
      '<div class="ntext"><h5>'+i.title+'</h5><p>'+i.desc+'</p><div class="ntime">'+i.time+'</div></div>'+
    '</div>';
  }).join('');

  var unreadCount=items.filter(function(i){return i.unread}).length;
  document.getElementById('notifBadge').textContent=unreadCount+' New';
  document.getElementById('notifBadge').style.display=unreadCount>0?'inline-block':'none';

  document.getElementById('togHerb').checked=prefs.herb;
  document.getElementById('togSeasonal').checked=prefs.seasonal;
  document.getElementById('togRestock').checked=prefs.restock;
  document.getElementById('togOffers').checked=prefs.offers;

  applyNotifTabFilter();
}

/* ==================== INIT ==================== */
(function initNewModules(){
  hydrateSession();
  renderAuthNav();
  initCatalogFilters();
  renderCatalog();
  initDoctorFilters();
  renderDoctors();
  renderNotifications();
  updateRzpConfigStatus();
  if(window.AOS)AOS.init({once:true,duration:700,offset:60});
})();
