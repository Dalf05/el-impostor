import 'nipplejs'
import Game from './game.js'

const canvas = document.getElementById('game')
const ctx = canvas.getContext('2d')
const timerEl = document.getElementById('timer')
const statusEl = document.getElementById('status')
const restartBtn = document.getElementById('restart')
const votePanel = document.getElementById('votePanel')
const voteList = document.getElementById('voteList')
const finishVote = document.getElementById('finishVote')

let game = new Game(canvas, {onUpdateHUD:updateHUD, onStartVote:openVote})

function resize(){
  canvas.width = innerWidth * devicePixelRatio
  canvas.height = innerHeight * devicePixelRatio
  canvas.style.width = innerWidth + 'px'
  canvas.style.height = innerHeight + 'px'
  ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0)
  game.resize()
}
addEventListener('resize', resize)
resize()

restartBtn.addEventListener('click', ()=>{ game.reset() })

function updateHUD({timeLeft,status}){
  timerEl.textContent = formatTime(timeLeft)
  statusEl.textContent = status
}

function formatTime(s){
  s = Math.max(0,Math.ceil(s))
  const mm = Math.floor(s/60).toString().padStart(2,'0')
  const ss = (s%60).toString().padStart(2,'0')
  return `${mm}:${ss}`
}

/* Voting UI */
function openVote(players){
  voteList.innerHTML = ''
  players.forEach(p=>{
    const btn = document.createElement('div')
    btn.className = 'voteItem'
    btn.textContent = p.name + (p.isYou ? ' (Tú)' : '')
    btn.dataset.id = p.id
    btn.addEventListener('click', ()=> {
      document.querySelectorAll('.voteItem').forEach(i=>i.classList.remove('selected'))
      btn.classList.add('selected')
    })
    voteList.appendChild(btn)
  })
  votePanel.classList.remove('hidden')
}

finishVote.addEventListener('click', ()=>{
  const sel = document.querySelector('.voteItem.selected')
  const id = sel ? sel.dataset.id : null
  votePanel.classList.add('hidden')
  game.finishVote(id)
})

/* Start */
game.start()