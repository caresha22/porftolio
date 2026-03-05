
  const cursor = document.getElementById('cursor');
  const ring = document.getElementById('cursorRing');
  let mx=0,my=0,rx=0,ry=0;
  document.addEventListener('mousemove', e => {
    mx=e.clientX; my=e.clientY;
    cursor.style.transform=`translate(${mx-4}px,${my-4}px)`;
  });
  (function animRing(){
    rx+=(mx-rx-16)*0.12; ry+=(my-ry-16)*0.12;
    ring.style.transform=`translate(${rx}px,${ry}px)`;
    requestAnimationFrame(animRing);
  })();
  document.querySelectorAll('a,.proj,.skill-card,.clink').forEach(el=>{
    el.addEventListener('mouseenter',()=>{ ring.style.width='48px';ring.style.height='48px';ring.style.borderColor='var(--accent2)'; });
    el.addEventListener('mouseleave',()=>{ ring.style.width='32px';ring.style.height='32px';ring.style.borderColor='var(--accent)'; });
  });

  const obs = new IntersectionObserver(entries=>{
    entries.forEach((e,i)=>{
      if(e.isIntersecting){
        setTimeout(()=>{
          e.target.classList.add('visible');
          e.target.querySelectorAll('.bar-fill').forEach(b=>{ b.style.width=b.dataset.w+'%'; });
        }, i*80);
      }
    });
  },{threshold:0.12});
  document.querySelectorAll('.reveal').forEach(el=>obs.observe(el));

  function tick(){ document.getElementById('clock').textContent=new Date().toLocaleTimeString('en-CA',{hour12:false}); }
  tick(); setInterval(tick,1000);