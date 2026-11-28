// 발걸음 효과음. 파일 없이 Web Audio로 짧은 잡음을 거른 '톡' 소리를 만든다.
// 브라우저 정책상 소리는 첫 사용자 입력 뒤에만 켤 수 있다.
const MIN_GAP=140;   // ms. 빠르게 걸어도 소음이 되지 않도록 간격을 제한한다
export function createFootsteps({enabled=true}={}) {
  let audio=null,noise=null,last=-1e9,on=enabled,count=0;
  function unlock() {
    if(audio)return;
    const Context=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Context)return;
    try {
      audio=new Context();
      noise=audio.createBuffer(1,Math.round(audio.sampleRate*.08),audio.sampleRate);
      const data=noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
    } catch { audio=null; }
  }
  for(const type of ['pointerdown','keydown'])addEventListener(type,unlock,{once:true,capture:true});
  function step(now=performance.now()) {
    if(!on||!audio||now-last<MIN_GAP)return false;
    last=now;count++;
    if(audio.state==='suspended')audio.resume();
    const t=audio.currentTime,source=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();
    source.buffer=noise;source.playbackRate.value=.8+Math.random()*.4;
    filter.type='bandpass';filter.frequency.value=count%2?700:900;filter.Q.value=1.2;
    gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.18,t+.005);gain.gain.exponentialRampToValueAtTime(.0001,t+.07);
    source.connect(filter).connect(gain).connect(audio.destination);source.start(t);source.stop(t+.08);
    return true;
  }
  return {step,setEnabled(value){on=Boolean(value);},get enabled(){return on;}};
}
