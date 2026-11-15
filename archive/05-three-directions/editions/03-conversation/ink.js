/**
 * A continuous drawn line changes its rhythm with the introduction.
 * This is expressive ink, not scientific data or a simulated instrument.
 */
export function createInk(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { setScene(){}, setPaused(){}, setActive(){}, setPointer(){}, setDetail(){} };
  let width = 1, height = 1, frame = 0, time = 0, last = 0;
  let paused = false, active = true, mode = 'hello', detail = 0;
  let pointer = {x:0,y:0}, eased = {x:0,y:0}, targetMode = 0, modeValue = 0;
  const modes = ['hello','now','path','curious','elsewhere','made'];
  const palettes = ['#f4c797','#8c9d7e','#efc28e','#b4aadf','#72966f','#a1a4c3'];
  function resize() {
    width = innerWidth; height = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width*dpr); canvas.height = Math.round(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    draw();
  }
  function draw() {
    ctx.clearRect(0,0,width,height);
    const small = width < 701;
    const baseX = width*(small?.76:.66) + eased.x*20;
    const baseY = height*(small?.31:.47) + eased.y*15;
    const radius = Math.min(width,height)*(small?.23:.31);
    ctx.strokeStyle = palettes[targetMode];
    ctx.lineCap = 'round';
    const amp = mode === 'hello' ? 1 : mode === 'curious' ? .7 : .48;
    for(let layer=0;layer<5;layer++) {
      ctx.globalAlpha = (mode==='hello'?.19:.14) * (1-layer*.14);
      ctx.lineWidth = layer === 0 ? 1.2 : .6;
      ctx.beginPath();
      for(let i=0;i<=240;i++) {
        const u=i/240, a=u*Math.PI*2;
        const pulse=1+Math.sin(a*3+time*.23+layer*.16+detail*.8)*.13*amp;
        let x,y;
        const phase=time*.07+modeValue*.31;
        if(mode==='path') {
          x=width*u;
          y=height*.46+Math.sin(u*8+time*.4+layer*.1)*60+Math.sin(u*22-time*.3)*15;
        } else if(mode==='elsewhere') {
          x=width*u;
          y=height*.53+Math.cos(a+time*.12+layer*.1)*radius*.22;
        } else if(mode==='made') {
          x=width*.83+Math.cos(a+phase)*radius*.5*pulse;
          y=height*.33+Math.sin(a+phase)*radius*.4;
        } else {
          const r=radius*(1+layer*.045)*pulse;
          x=baseX+Math.cos(a+phase)*r;
          y=baseY+Math.sin(a+phase)*r*.65+Math.sin(a*2+time*.2)*r*.2;
        }
        i?ctx.lineTo(x,y):ctx.moveTo(x,y);
      }
      ctx.stroke();
    }
    if(mode === 'hello'||mode ==='curious'){
      ctx.globalAlpha=.55;
      ctx.fillStyle=palettes[targetMode];
      const angle=time*.16+detail*.8;
      ctx.beginPath();
      ctx.arc(baseX+Math.cos(angle)*radius,baseY+Math.sin(angle)*radius*.65,3,0,Math.PI*2);
      ctx.fill();
    }
    ctx.globalAlpha=1;
  }
  function tick(stamp) {
    frame=0;
    const delta=last?Math.min((stamp-last)/1000,.05):0;last=stamp;
    time+=delta;
    eased.x+=(pointer.x-eased.x)*.035; eased.y+=(pointer.y-eased.y)*.035;
    modeValue+=(targetMode-modeValue)*.03;
    draw();
    if(!paused&&active)frame=requestAnimationFrame(tick);
  }
  function run(){if(!frame&&!paused&&active){last=0;frame=requestAnimationFrame(tick);}}
  window.addEventListener('resize',resize);
  resize();run();
  return {
    setScene(value){mode=value;targetMode=modes.indexOf(value);detail=0;draw();run();},
    setDetail(value){detail=value;draw();run();},
    setPaused(value){paused=value;if(value){cancelAnimationFrame(frame);frame=0;draw();}else run();},
    setActive(value){active=value;if(!value){cancelAnimationFrame(frame);frame=0;}else run();},
    setPointer(x,y){pointer={x,y};}
  };
}
