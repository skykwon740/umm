let apiPromise;

function loadAPI() {
  if (window.YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve,reject) => {
    const fail = reason => { clearTimeout(timer); apiPromise = null; reject(new Error(reason)); };
    const timer = setTimeout(() => fail('timeout'),15000);
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(timer);
      previous?.();
      resolve();
    };
    let script=document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    if(!script) {
      script=document.createElement('script');
      script.src='https://www.youtube.com/iframe_api';
      document.head.append(script);
    }
    script.onerror=()=>{ script.remove(); fail('network'); };
  });
  return apiPromise;
}

/** Owns one player and keeps the newest selection through asynchronous API loading. */
export function createShortsPlayer({host,stage,cover,error,errorText,onFocus}) {
  let player=null, ready=false, loading=false, videoId=null, loadedId=null;
  let muted=true, focusPending=false, generation=0, readyTimer;

  function showError(code) {
    stage.classList.remove('is-loading');
    error.dataset.errorCode=String(code);
    error.hidden=false;
    errorText.textContent=code===153 ? '플레이어가 이 브라우저에서 재생을 허용하지 않았어요.'
      : code===100 ? '공개 상태가 변경되었거나 삭제된 영상이에요.'
      : '외부 재생이 제한되었거나 연결할 수 없어요.';
  }
  function sync() {
    if(!ready || !player || !videoId) return;
    if(loadedId!==videoId) {
      stage.classList.add('is-loading');
      player.loadVideoById(videoId); loadedId=videoId;
    } else player.playVideo();
    if(muted) player.mute(); else player.unMute();
    if(focusPending) { onFocus?.(); focusPending=false; }
  }
  return {
    setVideo(id) { videoId=id; },
    setMuted(value) {
      muted=Boolean(value);
      if(!ready || !player) return false;
      if(muted) player.mute(); else player.unMute();
      return true;
    },
    async play(id,options={}) {
      videoId=id; muted=options.muted ?? muted;
      focusPending=focusPending || Boolean(options.focus);
      cover.hidden=true; error.hidden=true;
      if(ready) {
        try { sync(); return; }
        catch { try { player.destroy(); } catch {} player=null; ready=false; }
      }
      if(loading) return;
      loading=true; const request=++generation;
      stage.classList.add('is-loading');
      try {
        await loadAPI();
        if(request!==generation) return;
        const mount=document.createElement('div');
        try { player?.destroy(); } catch {}
        host.replaceChildren(mount);
        loadedId=videoId;
        clearTimeout(readyTimer);
        readyTimer=setTimeout(()=>{
          if(request===generation && !ready) {
            loading=false;
            showError('timeout');
          }
        },15000);
        player=new window.YT.Player(mount,{
          width:'100%',height:'100%',videoId,
          host:'https://www.youtube.com',
          playerVars:{autoplay:1,controls:1,playsinline:1,rel:0,origin:location.origin},
          events:{
            onReady(){
              if(request!==generation) return;
              clearTimeout(readyTimer);
              ready=true; loading=false; error.hidden=true; sync();
            },
            onStateChange(event){ if(request===generation && [0,1,2].includes(event.data)) stage.classList.remove('is-loading'); },
            onError(event){
              if(request!==generation) return;
              const current=event.target.getVideoData?.()?.video_id;
              if(!current || current===videoId) showError(event.data);
            },
          },
        });
      } catch { clearTimeout(readyTimer); loading=false; if(request===generation) showError('network'); }
    },
    destroy() {
      generation++; ready=false; loading=false;
      clearTimeout(readyTimer);
      try { player?.destroy(); } catch {}
      player=null;
    },
  };
}
