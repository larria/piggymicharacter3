export const AVATAR_SIZE = 256;
export const AVATAR_MAX_BYTES = 256 * 1024;
export interface Crop { zoom: number; x: number; y: number }
/** Accept only bounded JPEGs whose SOF declares a 256px square. */
export function isAvatarDataUrl(value: unknown): value is string {
 if (typeof value !== 'string' || value.length > 350000 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) return false;
 try {
  const encoded=value.slice(23); if(encoded.length%4!==0)return false;
  const raw=atob(encoded); if(raw.length>AVATAR_MAX_BYTES || raw.charCodeAt(0)!==255 || raw.charCodeAt(1)!==216 || raw.charCodeAt(raw.length-2)!==255 || raw.charCodeAt(raw.length-1)!==217)return false;
  const byte=(i:number)=>raw.charCodeAt(i), word=(i:number)=>byte(i)*256+byte(i+1);
  let found=false;
  for(let i=2;i<raw.length-2;){
   if(byte(i++)!==255)return false; while(byte(i)===255)i++;
   const marker=byte(i++); if(marker===218)return found; if(marker===217)return found;
   if(marker===1 || (marker>=208&&marker<=215))continue;
   const length=word(i);if(length<2||i+length>raw.length)return false;
   if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)){
    if(length<8||word(i+3)!==256||word(i+5)!==256)return false;found=true;
   } i+=length;
  }return false;
 }catch{return false;}
}
export function cropGeometry(width:number,height:number,crop:Crop,size=AVATAR_SIZE){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw new Error('图片尺寸无效');
 const zoom=Math.min(4,Math.max(1,Number.isFinite(crop.zoom)?crop.zoom:1));
 const scale=Math.max(size/width,size/height)*zoom;
 const w=width*scale,h=height*scale;
 const x=Math.max(-(w-size)/2,Math.min((w-size)/2,Number.isFinite(crop.x)?crop.x:0));
 const y=Math.max(-(h-size)/2,Math.min((h-size)/2,Number.isFinite(crop.y)?crop.y:0));
 return {width:w,height:h,left:(size-w)/2+x,top:(size-h)/2+y,x,y,zoom};
}
export function loadAvatarImage(src:string):Promise<HTMLImageElement>{return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>image.naturalWidth?resolve(image):reject(new Error('图片无法读取'));image.onerror=()=>reject(new Error('卡片图片加载失败，请重试'));image.src=src;});}
export async function renderAvatar(image:HTMLImageElement,crop:Crop):Promise<string>{
 const canvas=document.createElement('canvas');canvas.width=canvas.height=AVATAR_SIZE;
 const context=canvas.getContext('2d');if(!context)throw new Error('浏览器不支持图片裁剪');
 const g=cropGeometry(image.naturalWidth,image.naturalHeight,crop);
 context.fillStyle='#fff';context.fillRect(0,0,AVATAR_SIZE,AVATAR_SIZE);context.drawImage(image,g.left,g.top,g.width,g.height);
 for(const quality of [.9,.8,.65,.5]){const result=canvas.toDataURL('image/jpeg',quality);if(isAvatarDataUrl(result))return result;}
 throw new Error('头像超过256KB，请重新选择图片');
}
