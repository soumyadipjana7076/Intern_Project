import React, { useCallback, useEffect, useRef, useState } from 'react';

const API = 'http://localhost:8080';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function Game() {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const [status, setStatus] = useState('ready');
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [board, setBoard] = useState([]);
  const [playerName, setPlayerName] = useState('Player');
  const [sound, setSound] = useState(true);

  const loadBoard = useCallback(async () => {
    try { const r = await fetch(`${API}/api/leaderboard`); const d = await r.json(); setBoard(d.scores || []); }
    catch { setBoard([]); }
  }, []);

  useEffect(() => { loadBoard(); }, [loadBoard]);

  const startGame = useCallback(() => {
    gameRef.current = {
      mode: 'playing', lane: 1, targetLane: 1, jump: 0, slide: 0,
      distance: 0, score: 0, coins: 0, speed: 0.34, spawn: 0,
      objects: [], last: performance.now(), overSent: false
    };
    setScore(0); setCoins(0); setStatus('playing');
  }, []);

  const move = useCallback((kind) => {
    const g = gameRef.current;
    if (!g || g.mode !== 'playing') return;
    if (kind === 'left') g.targetLane = Math.max(0, g.targetLane - 1);
    if (kind === 'right') g.targetLane = Math.min(2, g.targetLane + 1);
    if (kind === 'jump' && g.jump <= 0 && g.slide <= 0) g.jump = 1;
    if (kind === 'slide' && g.jump <= 0) g.slide = 0.75;
  }, []);

  useEffect(() => {
    const key = (e) => {
      const k = e.key.toLowerCase();
      if (['arrowleft','arrowright','arrowup','arrowdown',' '].includes(k)) e.preventDefault();
      if (k === 'arrowleft' || k === 'a') move('left');
      if (k === 'arrowright' || k === 'd') move('right');
      if (k === 'arrowup' || k === 'w' || k === ' ') move('jump');
      if (k === 'arrowdown' || k === 's') move('slide');
      if (k === 'enter' && status !== 'playing') startGame();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [move, status, startGame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let raf;
    let touchStart = null;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth, h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize(); window.addEventListener('resize', resize);

    const drawChicken = (x, y, scale, jumping, sliding) => {
      ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
      if (sliding) ctx.rotate(-0.18);
      // shadow
      ctx.fillStyle = 'rgba(30,20,10,.22)'; ctx.beginPath(); ctx.ellipse(0, 5, 30, 9, 0, 0, Math.PI*2); ctx.fill();
      // body
      ctx.fillStyle = '#fff4d5'; ctx.beginPath(); ctx.ellipse(0, -22, 27, 31, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#f6d48a'; ctx.beginPath(); ctx.ellipse(-3, -13, 16, 18, -.2, 0, Math.PI*2); ctx.fill();
      // wing
      ctx.fillStyle = '#f0c96f'; ctx.beginPath(); ctx.ellipse(-14, -23, 12, 18, -.45, 0, Math.PI*2); ctx.fill();
      // head
      ctx.fillStyle = '#fff4d5'; ctx.beginPath(); ctx.arc(8, -57, 20, 0, Math.PI*2); ctx.fill();
      // comb
      ctx.fillStyle = '#e84c42'; ctx.beginPath(); ctx.arc(-2,-76,7,0,Math.PI*2); ctx.arc(8,-79,7,0,Math.PI*2); ctx.arc(17,-75,6,0,Math.PI*2); ctx.fill();
      // beak
      ctx.fillStyle = '#f5a623'; ctx.beginPath(); ctx.moveTo(25,-58); ctx.lineTo(42,-52); ctx.lineTo(25,-47); ctx.closePath(); ctx.fill();
      // eye
      ctx.fillStyle = '#292018'; ctx.beginPath(); ctx.arc(15,-61,3,0,Math.PI*2); ctx.fill();
      // feet
      ctx.strokeStyle = '#e98d22'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      if (!sliding) { ctx.beginPath(); ctx.moveTo(-8,3); ctx.lineTo(-11,13); ctx.lineTo(-19,15); ctx.moveTo(-11,13); ctx.lineTo(-5,16); ctx.moveTo(10,3); ctx.lineTo(12,13); ctx.lineTo(5,16); ctx.stroke(); }
      ctx.restore();
    };

    const render = (now) => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      const g = gameRef.current;
      const dt = g && g.mode === 'playing' ? Math.min((now - g.last) / 16.67, 2) : 1;
      if (g) g.last = now;
      // sky / distant hills
      const sky = ctx.createLinearGradient(0,0,0,h); sky.addColorStop(0,'#8bd8f5'); sky.addColorStop(.58,'#d9f2c2'); sky.addColorStop(1,'#f7d99b');
      ctx.fillStyle = sky; ctx.fillRect(0,0,w,h);
      ctx.fillStyle = '#65a96b';
      ctx.beginPath(); ctx.moveTo(0,h*.48); ctx.quadraticCurveTo(w*.2,h*.25,w*.42,h*.48); ctx.quadraticCurveTo(w*.7,h*.22,w,h*.48); ctx.lineTo(w,h); ctx.lineTo(0,h); ctx.fill();
      // trees
      for (let i=0;i<9;i++) {
        const x = (i*137 + 30) % w, y = h*.34 + (i%3)*13;
        ctx.fillStyle = '#6a482b'; ctx.fillRect(x-5,y,10,50);
        ctx.fillStyle = i%2 ? '#28734b' : '#38894e'; ctx.beginPath(); ctx.arc(x,y,24,0,Math.PI*2); ctx.fill();
      }
      // road perspective
      const horizon = h*.39, bottom = h*1.08, cx=w/2, topW=w*.18, botW=w*.88;
      ctx.fillStyle = '#b58a58'; ctx.beginPath(); ctx.moveTo(cx-topW/2,horizon); ctx.lineTo(cx+topW/2,horizon); ctx.lineTo(cx+botW/2,bottom); ctx.lineTo(cx-botW/2,bottom); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#6e6250'; ctx.beginPath(); ctx.moveTo(cx-topW*.42,horizon); ctx.lineTo(cx+topW*.42,horizon); ctx.lineTo(cx+botW*.43,bottom); ctx.lineTo(cx-botW*.43,bottom); ctx.closePath(); ctx.fill();
      // road lane lines, animated
      const phase = g ? (g.distance * 0.018) % 1 : 0;
      for (let laneLine=1; laneLine<=2; laneLine++) {
        for (let j=0;j<7;j++) {
          const t = ((j/7 + phase)%1);
          const y = horizon + (bottom-horizon)*t;
          const half = topW/2 + (botW/2-topW/2)*t;
          const x = cx - half + (2*half)*(laneLine/3);
          const lineH = 3 + 13*t;
          ctx.fillStyle = 'rgba(255,245,210,.65)'; ctx.fillRect(x-2*t,y,4*t+1,lineH);
        }
      }
      // roadside rocks / bushes
      for(let i=0;i<10;i++){
        const t=((i/10 + phase*.65)%1), y=horizon+(bottom-horizon)*t;
        const half=topW/2+(botW/2-topW/2)*t;
        const side=i%2?1:-1, x=cx+side*(half+15+24*t);
        ctx.fillStyle='#4c7945'; ctx.beginPath(); ctx.arc(x,y,4+18*t,0,Math.PI*2); ctx.fill();
      }

      if (g && g.mode === 'playing') {
        g.distance += dt * (2.3 + g.speed*3);
        g.score = Math.floor(g.distance * 2 + g.coins * 25);
        g.speed = Math.min(1.35, .34 + g.distance/2500);
        g.jump = Math.max(0, g.jump - .035*dt);
        g.slide = Math.max(0, g.slide - .025*dt);
        g.lane += (g.targetLane-g.lane)*Math.min(1,.22*dt);
        g.spawn -= dt;
        if (g.spawn <= 0) {
          const lane = Math.floor(Math.random()*3);
          const type = Math.random() < .62 ? 'obstacle' : 'coin';
          g.objects.push({ lane, z: 0, type, kind: type==='coin' ? 'coin' : (Math.random()<.5?'rock':'barrier') });
          if (Math.random() < .42) g.objects.push({ lane: (lane+1+Math.floor(Math.random()*2))%3, z: -.18, type:'coin', kind:'coin' });
          g.spawn = Math.max(22, 54 - g.speed*22) + Math.random()*20;
        }
        const playerY = h*.79;
        for (const o of g.objects) {
          o.z += .0085 * g.speed * dt;
          const t=clamp(o.z,0,1.1), y=horizon+(playerY-horizon)*t;
          const roadHalf=topW/2+(botW/2-topW/2)*t;
          const x=cx-roadHalf+(roadHalf*2)*(o.lane+.5)/3;
          const scale=.22+t*.95;
          if (o.type==='coin') {
            ctx.save(); ctx.translate(x,y-18*scale); ctx.scale(scale,scale);
            ctx.fillStyle='#ffd43b'; ctx.beginPath(); ctx.ellipse(0,0,11,15,0,0,Math.PI*2); ctx.fill();
            ctx.strokeStyle='#fff2a0'; ctx.lineWidth=3; ctx.stroke();
            ctx.fillStyle='#bd7b12'; ctx.font='bold 15px sans-serif'; ctx.textAlign='center'; ctx.fillText('$',0,5);
            ctx.restore();
          } else {
            ctx.save(); ctx.translate(x,y); ctx.scale(scale,scale);
            if (o.kind==='rock') {
              ctx.fillStyle='#807b70'; ctx.beginPath(); ctx.moveTo(-20,0); ctx.lineTo(-15,-25); ctx.lineTo(5,-33); ctx.lineTo(23,-15); ctx.lineTo(22,0); ctx.closePath(); ctx.fill();
              ctx.fillStyle='#a7a195'; ctx.beginPath(); ctx.moveTo(-15,-25); ctx.lineTo(5,-33); ctx.lineTo(2,-17); ctx.closePath(); ctx.fill();
            } else {
              ctx.fillStyle='#d66a31'; ctx.fillRect(-24,-32,48,32);
              ctx.strokeStyle='#713b23'; ctx.lineWidth=3; ctx.strokeRect(-24,-32,48,32);
              ctx.fillStyle='#f2b15d'; ctx.fillRect(-19,-27,38,5);
            }
            ctx.restore();
          }
          if (o.z > .91 && o.z < 1.07 && Math.abs(o.lane-Math.round(g.lane)) < .38) {
            if (o.type==='coin') { o.hit=true; g.coins++; }
            else if (!o.hit && g.jump < .32 && g.slide < .25) { g.mode='over'; }
            else o.hit=true;
          }
        }
        g.objects = g.objects.filter(o => o.z < 1.12 && !o.hit);
        // chicken lane position with jump arc
        const laneX=cx-botW*.43+(botW*.86)*(g.lane+.5)/3;
        const jumpLift=Math.sin((1-g.jump)*Math.PI)*Math.min(105,h*.18);
        drawChicken(laneX, playerY-jumpLift, 1.05, g.jump, g.slide);
        if (g.mode==='over') {
          setStatus('over'); setScore(g.score); setCoins(g.coins);
          if (!g.overSent) {
            g.overSent=true;
            fetch(`${API}/api/score`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({player:playerName,score:g.score,coins:g.coins})})
              .then(r=>r.json()).then(d=>setBoard(d.leaderboard||[])).catch(()=>{});
          }
        } else {
          setScore(g.score); setCoins(g.coins);
        }
      } else {
        const laneX=cx;
        drawChicken(laneX,h*.79,1.05,0,0);
      }
      // HUD
      ctx.fillStyle='rgba(24,42,31,.72)'; ctx.fillRect(14,14,150,62);
      ctx.fillStyle='#fff'; ctx.font='bold 17px system-ui'; ctx.fillText(`SCORE  ${g?.score || 0}`,26,39);
      ctx.fillStyle='#ffd43b'; ctx.fillText(`COINS  ${g?.coins || 0}`,26,63);
      raf=requestAnimationFrame(render);
    };
    raf=requestAnimationFrame(render);
    const onTouchStart=e=>{touchStart={x:e.changedTouches[0].clientX,y:e.changedTouches[0].clientY};};
    const onTouchEnd=e=>{
      if(!touchStart)return;
      const dx=e.changedTouches[0].clientX-touchStart.x, dy=e.changedTouches[0].clientY-touchStart.y;
      if(Math.max(Math.abs(dx),Math.abs(dy))>24) move(Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'jump':'slide'));
      touchStart=null;
    };
    canvas.addEventListener('touchstart',onTouchStart,{passive:true});
    canvas.addEventListener('touchend',onTouchEnd,{passive:true});
    return ()=>{cancelAnimationFrame(raf);window.removeEventListener('resize',resize);canvas.removeEventListener('touchstart',onTouchStart);canvas.removeEventListener('touchend',onTouchEnd);};
  }, [move, playerName]);

  return <main className="app">
    <header className="topbar"><div className="brand"><span className="brandIcon">🐔</span><div><b>CHICKEN RUN</b><small>THE GREAT ESCAPE</small></div></div><div className="topRight"><span className="pill">ENDLESS RUNNER</span><button className="sound" onClick={()=>setSound(!sound)} title="Sound setting">{sound?'♫':'♪̸'}</button></div></header>
    <section className="layout">
      <div className="gameColumn">
        <div className="gameFrame">
          <canvas ref={canvasRef} className="gameCanvas"/>
          {status !== 'playing' && <div className="overlay">
            <div className="panel">
              {status==='ready' ? <><div className="bigEmoji">🐔</div><p className="eyebrow">READY, SET, RUN!</p><h1>Escape the farm!</h1><p className="muted">Dodge obstacles, collect coins and run as far as you can.</p><input value={playerName} maxLength={18} onChange={e=>setPlayerName(e.target.value)} aria-label="Player name" placeholder="Your name"/><button className="primary" onClick={startGame}>▶ START RUN</button></> :
              <><div className="bigEmoji">💥</div><p className="eyebrow">RUN COMPLETE</p><h1>Oops! You got caught.</h1><div className="result"><div><b>{score}</b><small>SCORE</small></div><div><b>{coins}</b><small>COINS</small></div></div><button className="primary" onClick={startGame}>↻ RUN AGAIN</button><button className="secondary" onClick={loadBoard}>Refresh leaderboard</button></>}
            </div>
          </div>}
        </div>
        <div className="controls"><span><kbd>←</kbd><kbd>→</kbd> Move</span><span><kbd>↑</kbd> Jump</span><span><kbd>↓</kbd> Slide</span><span className="mobileHint">Swipe to control</span></div>
      </div>
      <aside className="sidebar">
        <div className="sideCard"><div className="cardTitle"><span>🏆</span> TOP RUNNERS</div><p className="cardSub">BEST FARM ESCAPES</p>
          {board.length===0 ? <div className="empty">No scores yet.<br/>Be the first runner!</div> : <ol className="leaderboard">{board.map((r)=><li key={`${r.rank}-${r.player}-${r.score}`}><span className="rank">{r.rank}</span><span className="runnerName">{r.player}</span><b>{r.score}</b></li>)}</ol>}
        </div>
        <div className="sideCard tips"><div className="cardTitle"><span>🎮</span> HOW TO PLAY</div><div className="tip"><b>↔ Change lanes</b><small>Move left or right to dodge.</small></div><div className="tip"><b>⬆ Jump</b><small>Leap over rocks and low blocks.</small></div><div className="tip"><b>⬇ Slide</b><small>Slide under barriers.</small></div><div className="tip"><b>🪙 Collect coins</b><small>Coins add bonus points.</small></div></div>
      </aside>
    </section>
    <footer>BUILT FOR THE BRAVEST CHICKEN <span>•</span> REACT + CORE JAVA</footer>
  </main>;
}
export default Game;
