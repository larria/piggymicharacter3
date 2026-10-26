import {describe,it,expect,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {StrokePlayer} from '../src/components/StrokePlayer';
const data={character:'一',strokeCount:1,strokes:['M 0 0 L 100 100'],medians:[[[0,0],[100,100]] as [number,number][]],radical:null,structure:''};
describe('first demonstration presentation',()=>{
  it('does not mount any tracing UI or enable step bypass, even for previously completed practice',()=>{
    vi.stubGlobal('document',{hidden:false});
    try {for(const practiceStatus of [undefined,'complete'] as const){const html=renderToStaticMarkup(<StrokePlayer data={data} practiceStatus={practiceStatus}/>);expect(html).not.toContain('stroke-writing');expect(html).not.toContain('逐笔跟写');expect(html).not.toContain('重新跟写');expect(html).toContain('先看完一遍笔顺，再跟写');expect(html).toContain('disabled="">上一笔');expect(html).toContain('disabled="">下一笔');}} finally {vi.unstubAllGlobals();}
  });
  it('offers explicit reduced-motion opt-in without mounting tracing',()=>{
    vi.stubGlobal('document',{hidden:false});vi.stubGlobal('matchMedia',()=>({matches:true}));
    try {const html=renderToStaticMarkup(<StrokePlayer data={data}/>);expect(html).toContain('播放一遍笔顺，开始跟写');expect(html).toContain('等待主动播放笔顺');expect(html).not.toContain('stroke-writing');} finally {vi.unstubAllGlobals();}
  });
});
