/** GPU pixel surface: native screen pixels, nearest textures and stepped lighting. */
export function createGlobeSurface(terrainCanvas,relief) {
  const canvas=document.createElement('canvas');
  const gl=canvas.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:false});
  if(!gl || typeof gl.createShader!=='function') return null;
  const vertex=`
    attribute vec2 aUV;
    uniform sampler2D uHeight;
    uniform vec2 uSize;
    uniform vec2 uAngle;
    uniform float uRadius;
    varying vec2 vUV;
    varying vec3 vNormal;
    vec3 sphere(vec2 uv){float lo=(uv.x-.5)*6.2831853;float la=(.5-uv.y)*3.14159265;return vec3(cos(la)*sin(lo),sin(la),cos(la)*cos(lo));}
    vec3 rotate(vec3 p){float co=cos(uAngle.x),so=sin(uAngle.x),cl=cos(uAngle.y),sl=sin(uAngle.y);float x=p.x*co-p.z*so;float z=p.x*so+p.z*co;return vec3(x,p.y*cl-z*sl,p.y*sl+z*cl);}
    void main(){
      vUV=aUV;
      float h=texture2D(uHeight,aUV).r;
      vec3 n=sphere(aUV);
      vec2 step=vec2(.001,.002);
      vec3 east=sphere(aUV+vec2(step.x,0.))*(1.+texture2D(uHeight,aUV+vec2(step.x,0.)).r*.055)-sphere(aUV-vec2(step.x,0.))*(1.+texture2D(uHeight,aUV-vec2(step.x,0.)).r*.055);
      vec3 south=sphere(aUV+vec2(0.,step.y))*(1.+texture2D(uHeight,aUV+vec2(0.,step.y)).r*.055)-sphere(aUV-vec2(0.,step.y))*(1.+texture2D(uHeight,aUV-vec2(0.,step.y)).r*.055);
      vec3 normal=normalize(cross(east,south));
      if(dot(normal,n)<0.)normal=-normal;
      vNormal=rotate(normal);
      vec3 p=rotate(n*(1.+h*.055));
      gl_Position=vec4(p.x*uRadius*2./uSize.x,p.y*uRadius*2./uSize.y,-p.z*.5,1.);
    }`;
  const fragment=`
    precision mediump float;
    uniform sampler2D uColor;
    varying vec2 vUV;
    varying vec3 vNormal;
    void main(){
      vec3 normal=normalize(vNormal);
      float light=max(0.,dot(normal,normalize(vec3(-.45,.6,1.))));
      vec3 color=texture2D(uColor,vUV).rgb;
      float shade=light>.78?1.02:light>.48?.90:light>.15?.74:.57;
      color=color*shade;
      gl_FragColor=vec4(color,1.);
    }`;
  function shader(type,source){
    const result=gl.createShader(type);gl.shaderSource(result,source);gl.compileShader(result);
    if(!gl.getShaderParameter(result,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(result));
    return result;
  }
  let program;
  try {
    program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)) return null;
  } catch { return null; }
  const segments=240,rings=120,uv=[],indices=[];
  for(let y=0;y<=rings;y++) for(let x=0;x<=segments;x++)uv.push(x/segments,y/rings);
  for(let y=0;y<rings;y++)for(let x=0;x<segments;x++){const a=y*(segments+1)+x,b=a+segments+1;indices.push(a,b,a+1,a+1,b,b+1);}
  gl.useProgram(program);
  const vertices=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vertices);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(uv),gl.STATIC_DRAW);
  const attribute=gl.getAttribLocation(program,'aUV');gl.enableVertexAttribArray(attribute);gl.vertexAttribPointer(attribute,2,gl.FLOAT,false,0,0);
  const elements=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,elements);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
  function texture(unit,source,smooth=false){
    gl.activeTexture(gl.TEXTURE0+unit);const item=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,item);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,smooth?gl.LINEAR:gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,smooth?gl.LINEAR:gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
    return item;
  }
  const colorMap=document.createElement('canvas');colorMap.width=2048;colorMap.height=1024;
  const colorContext=colorMap.getContext('2d');colorContext.fillStyle='#5b8795';colorContext.fillRect(0,0,2048,1024);
  colorContext.imageSmoothingEnabled=false;
  colorContext.drawImage(terrainCanvas,102.4,102.4,1843.2,819.2);
  const heightMap=document.createElement('canvas');heightMap.width=2048;heightMap.height=1024;
  const heightContext=heightMap.getContext('2d');heightContext.fillStyle='#000';heightContext.fillRect(0,0,2048,1024);
  if(relief){
    const grid=document.createElement('canvas');grid.width=relief.columns;grid.height=relief.rows;
    const ctx=grid.getContext('2d'),image=ctx.createImageData(grid.width,grid.height);
    for(let i=0;i<relief.elevation.length;i++){const v=relief.elevation[i]*255;image.data.set([v,v,v,255],i*4);}
    ctx.putImageData(image,0,0);heightContext.drawImage(grid,102.4,102.4,1843.2,819.2);
  }
  const colorTexture=texture(0,colorMap),heightTexture=texture(1,heightMap,true);
  gl.uniform1i(gl.getUniformLocation(program,'uColor'),0);gl.uniform1i(gl.getUniformLocation(program,'uHeight'),1);
  const angle=gl.getUniformLocation(program,'uAngle'),size=gl.getUniformLocation(program,'uSize'),radiusUniform=gl.getUniformLocation(program,'uRadius');
  gl.enable(gl.DEPTH_TEST);gl.clearColor(0,0,0,0);
  return {
    draw({width,height,dpr=1,lon,lat,radius}){
      // One authored pixel per CSS pixel, three times the reference's linear resolution.
      const ratio=1;
      const w=Math.round(width*ratio),h=Math.round(height*ratio);
      if(canvas.width!==w || canvas.height!==h){canvas.width=w;canvas.height=h;}
      gl.viewport(0,0,w,h);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      gl.uniform2f(angle,lon,lat);gl.uniform2f(size,width,height);gl.uniform1f(radiusUniform,radius);
      gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0);
      return canvas;
    },
    destroy(){gl.deleteTexture(colorTexture);gl.deleteTexture(heightTexture);gl.deleteBuffer(vertices);gl.deleteBuffer(elements);gl.deleteProgram(program);},
  };
}
