// Cleaned up placeholder markers and kept the module content intact

const TWO_PI = Math.PI*2

function rand(min,max){ return Math.random()*(max-min)+min }

class Entity{
  constructor(id,x,y,color,name,isYou=false){
    this.id = id
    this.x = x
    this.y = y
    this.r = 16
    this.color = color
    this.name = name
    this.vx = 0
    this.vy = 0
    this.speed = 50
    this.isYou = isYou
    this.isAlive = true
  }
  distTo(o){ return Math.hypot(this.x-o.x,this.y-o.y) }
}

export default class Game{
  constructor(canvas,opts={}){
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.w = canvas.width
    this.h = canvas.height
    this.scale = devicePixelRatio || 1
    this.onUpdateHUD = opts.onUpdateHUD || function(){}
    this.onStartVote = opts.onStartVote || function(){}
    this.reset()
    this._bindInput()
  }

  reset(){
    this.timeLimit = 30
    this.timeLeft = this.timeLimit
    this.dtAcc = 0
    this.last = performance.now()
    this.status = 'Jugando'
    this.entities = []
    this.playerId = 'p0'
    // spawn players
    const colors = ['#e74c3c','#27ae60','#f39c12','#3498db','#9b59b6','#e67e22']
    for(let i=0;i<6;i++){
      const isYou = i===0
      const e = new Entity('p'+i, rand(60,innerWidth-60), rand(80, innerHeight-120), colors[i%colors.length], `Jugador ${i+1}`, isYou)
      if(isYou) e.speed = 120
      this.entities.push(e)
    }
    // choose impostor
    this.impostorId = this.entities[Math.floor(rand(0,this.entities.length))].id
    this.votes = {}
    this.gameOver = false
    this.voting = false
  }

  start(){
    this.last = performance.now()
    this.loop()
  }

  resize(){
    this.w = this.canvas.width
    this.h = this.canvas.height
  }

  loop(){
    const now = performance.now()
    let dt = (now - this.last)/1000
    this.last = now
    // cap dt
    dt = Math.min(dt, 0.05)
    this.update(dt)
    this.render()
    if(!this.gameOver) requestAnimationFrame(()=>this.loop())
  }

  update(dt){
    if(this.voting) return
    this.timeLeft -= dt
    if(this.timeLeft<=0){
      // Start voting when time runs out
      this.startVoting()
    }
    // simple AI: wander
    for(const e of this.entities){
      if(!e.isAlive) continue
      if(e.isYou){
        // movement set by input velocities
        e.x += e.vx * dt
        e.y += e.vy * dt
      } else {
        // random walk
        if(Math.random() < 0.02) {
          const ang = rand(0, TWO_PI)
          e.vx = Math.cos(ang)* (e.speed * rand(0.3,1))
          e.vy = Math.sin(ang)* (e.speed * rand(0.3,1))
        }
        e.x += e.vx * dt
        e.y += e.vy * dt
      }
      // clamp
      e.x = Math.max(20, Math.min(innerWidth-20, e.x))
      e.y = Math.max(60, Math.min(innerHeight-20, e.y))
    }

    // impostor behavior: occasionally kill close targets
    const impostor = this.entities.find(e=>e.id===this.impostorId && e.isAlive)
    if(impostor){
      const aliveOthers = this.entities.filter(e=>e.isAlive && e.id!==impostor.id)
      if(aliveOthers.length>0 && Math.random() < 0.01){
        // move toward a random target
        const target = aliveOthers[Math.floor(rand(0,aliveOthers.length))]
        const dx = target.x - impostor.x, dy = target.y - impostor.y
        const d = Math.hypot(dx,dy)
        if(d>1){
          impostor.vx = (dx/d)* (impostor.speed*0.9)
          impostor.vy = (dy/d)* (impostor.speed*0.9)
        }
        // if very close, kill
        if(d < 22){
          target.isAlive = false
          // if target is player -> game over lose
          if(target.isYou){
            this.endGame(false, 'Fuiste asesinado por el impostor')
            return
          }
        }
      }
    }

    // player action: if close to impostor and presses action -> reveal (win)
    if(this._actionPressed && this.player){
      const imp = this.entities.find(e=>e.id===this.impostorId && e.isAlive)
      if(imp && this.player.distTo(imp) < 36){
        this.endGame(true, 'Encontraste al impostor. ¡Ganaste!')
        return
      }
    }

    this.onUpdateHUD({timeLeft: this.timeLeft, status: this.status})
  }

  render(){
    const ctx = this.ctx
    ctx.clearRect(0,0,this.canvas.width,this.canvas.height)
    // background grid / room
    ctx.save()
    ctx.fillStyle = '#0f1622'
    ctx.fillRect(0,0,innerWidth,innerHeight)
    // simple floor tiles
    ctx.strokeStyle = 'rgba(255,255,255,0.02)'
    for(let x=0;x<innerWidth;x+=48){
      ctx.beginPath(); ctx.moveTo(x,60); ctx.lineTo(x,innerHeight); ctx.stroke()
    }
    for(let y=60;y<innerHeight;y+=48){
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(innerWidth,y); ctx.stroke()
    }
    ctx.restore()

    // draw entities
    for(const e of this.entities){
      if(!e.isAlive) {
        // ghost
        ctx.globalAlpha = 0.35
        ctx.fillStyle = '#aaaaaa'
      } else {
        ctx.globalAlpha = 1
        ctx.fillStyle = e.color
      }
      // body
      ctx.beginPath()
      ctx.ellipse(e.x, e.y, e.r, e.r*1.2, 0, 0, TWO_PI)
      ctx.fill()
      // visor
      ctx.fillStyle = 'rgba(255,255,255,0.65)'
      ctx.beginPath()
      ctx.ellipse(e.x+6, e.y-4, e.r*0.5, e.r*0.4, 0, 0, TWO_PI)
      ctx.fill()

      // name
      ctx.fillStyle = '#fff'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(e.name, e.x, e.y + e.r + 14)
    }
    ctx.globalAlpha = 1
    // if voting show overlay
    if(this.voting){
      ctx.fillStyle = 'rgba(0,0,0,0.35)'
      ctx.fillRect(0,0,innerWidth,innerHeight)
      ctx.fillStyle = '#fff'
      ctx.font = '20px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Votación en curso...', innerWidth/2, 40)
    }
    // debug (not shown)
  }

  get player(){ return this.entities.find(e=>e.isYou) }

  _bindInput(){
    // keyboard WASD
    this.keys = {}
    window.addEventListener('keydown', e=>{
      this.keys[e.key.toLowerCase()] = true
      this._applyKeys()
      if(e.key === 'v') this.startVoting()
      if(e.key === ' ') this._actionPressed = true
    })
    window.addEventListener('keyup', e=>{
      this.keys[e.key.toLowerCase()] = false
      this._applyKeys()
      if(e.key === ' ') this._actionPressed = false
    })

    // touch joystick via nipplejs if available
    import('nipplejs').then(nipple=>{
      const manager = nipple.create({zone:document.getElementById('stick'),mode:'static',position:{left:'60px',top:'60px'},color:'rgba(255,255,255,0.06)'})
      manager.on('move', (evt, data)=>{
        const force = data.force || 0
        const angle = data.angle ? data.angle.radian : 0
        const vx = Math.cos(angle)*force*120
        const vy = Math.sin(angle)*force*120
        if(this.player){
          this.player.vx = vx
          this.player.vy = vy
        }
      })
      manager.on('end', ()=>{ if(this.player){ this.player.vx = 0; this.player.vy = 0 } })
    }).catch(()=>{})
    // action button (mobile)
    const actionBtn = document.getElementById('shoot')
    actionBtn.addEventListener('touchstart', e=>{ e.preventDefault(); this._actionPressed = true })
    actionBtn.addEventListener('touchend', e=>{ e.preventDefault(); this._actionPressed = false })
    actionBtn.addEventListener('mousedown', ()=> this._actionPressed = true)
    actionBtn.addEventListener('mouseup', ()=> this._actionPressed = false)
    // tap to start vote (desktop)
    window.addEventListener('dblclick', ()=> this.startVoting())
  }

  _applyKeys(){
    if(!this.player) return
    const k = this.keys
    let vx = 0, vy = 0
    if(k['w'] || k['arrowup']) vy -= 1
    if(k['s'] || k['arrowdown']) vy += 1
    if(k['a'] || k['arrowleft']) vx -= 1
    if(k['d'] || k['arrowright']) vx += 1
    const mag = Math.hypot(vx,vy)
    if(mag>0){
      vx = (vx/mag)*this.player.speed
      vy = (vy/mag)*this.player.speed
    }
    this.player.vx = vx
    this.player.vy = vy
  }

  startVoting(){
    if(this.voting || this.gameOver) return
    this.voting = true
    this.onStartVote(this.entities.filter(e=>e.isAlive).map(e=>({id:e.id,name:e.name,isYou:e.isYou})))
  }

  finishVote(selectedId){
    this.voting = false
    // simple vote resolution: if selected is impostor -> remove impostor and win, else impostor wins
    if(!selectedId){
      this.endGame(false, 'Nadie fue elegido. El impostor ganó. — Bebed, tripulantes.')
      return
    }
    if(selectedId === this.impostorId){
      // impostor ejected
      const imp = this.entities.find(e=>e.id===this.impostorId)
      if(imp) imp.isAlive = false
      this.endGame(true, 'El impostor fue expulsado. ¡Ganaron los tripulantes! — Bebe el impostor.')
    } else {
      this.endGame(false, 'El impostor sigue libre. Perdiste. — Bebed, tripulantes.')
    }
  }

  endGame(win, msg){
    this.gameOver = true
    this.status = win ? 'Victoria' : 'Derrota'
    // show message in HUD status briefly
    this.onUpdateHUD({timeLeft: this.timeLeft, status: msg})
    // stop loop after a moment to allow drawing final state
    setTimeout(()=>{},300)
  }
}