/** Original rounded Chinese lettering: every visible mark is SVG geometry, not a font. */
export function BrandLogo({className='brand-logo',width,height}:{className?:string;width?:number|string;height?:number|string}){
  return <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 390 100" width={width} height={height} role="img" aria-label="咪猪头识字" preserveAspectRatio="xMidYMid meet">
    {/* A little reader, nestled into the same baseline as the lettering. */}
    <path d="M12 37 9 18Q22 12 31 28M49 27Q59 10 71 18L68 39" fill="#F4AD99" stroke="#285F52" strokeWidth="3.5" strokeLinejoin="round"/>
    <path d="M9 48C9 27 24 23 40 23S73 29 73 48C73 66 58 76 40 76S9 66 9 48Z" fill="#FFD5BB" stroke="#285F52" strokeWidth="3.5"/>
    <path d="M25 25Q29 14 43 16" fill="none" stroke="#285F52" strokeWidth="3.5" strokeLinecap="round"/>
    <path d="M26 45v3m28-3v3" stroke="#285F52" strokeWidth="4" strokeLinecap="round"/>
    <path d="M31 55Q40 50 49 55Q53 66 40 67Q27 66 31 55Z" fill="#EE9D8B"/>
    <path d="M36 59v2m9-2v2" stroke="#A45A49" strokeWidth="2.8" strokeLinecap="round"/>
    <path d="M12 69Q28 65 40 74Q53 65 69 69L66 87Q51 85 40 92Q28 85 15 87Z" fill="#285F52"/>
    <path d="M40 75v15M22 76l9 2m19 0 10-2" stroke="#FFF5DC" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M15 58h4m42 0h4" stroke="#EF9F8D" strokeWidth="4" strokeLinecap="round"/>
    {/* 咪 — an open, softly squared mouth and a clear 米 radical. */}
    <g fill="none" stroke="#285F52" strokeWidth="5.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M89 37Q88 34 92 34h12v31H89V37Z"/>
      <path d="M123 23v54M111 28l5 9m18-9-5 9M109 45h29M122 46q-4 13-14 22m16-22q5 12 15 21"/>
      {/* 猪 — preserve the radical structure while softening the dense intersections. */}
      <path d="M151 26q15 11 12 36l-1 10q-1 7-9 3M164 25l-15 16m14 7-14 13M180 24v19m-10-11h27m-29 13h33m-3-19q-11 20-30 32M178 57h20v19h-23V60m2 6h20"/>
      {/* 头 — two buoyant dots and a decisive sweeping last stroke. */}
      <path d="m218 27 8 5m-12 11 8 5M238 24q1 31-27 52M212 56h43m-18 5 19 16"/>
    </g>
    {/* 识字 are full-size companions, not an unrelated typographic subtitle. */}
    <g fill="none" stroke="#B86643" strokeWidth="5.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m273 26 7 6M269 44h10v31l8-7M296 30h23v26h-23V30Zm3 35-8 12m22-12 9 12"/>
      <path d="m350 22 5 6M331 42v-9h46v9M341 46h25l-12 11v15q0 7-12 4M332 60h44"/>
    </g>
    {/* A tiny sprout makes discovery part of the wordmark, without extra text. */}
    <path d="M372 17q-8 1-9 10 9 0 9-10Z" fill="#8FAB78"/>
  </svg>
}

export function Pig({small=false}:{small?:boolean}){return <svg className={small?'pig small':'pig'} viewBox="0 0 230 220" aria-label="咪猪头的小猪化身" role="img"><ellipse cx="118" cy="204" rx="73" ry="9" fill="#26695f" opacity=".12"/><path d="M66 82 52 40Q82 27 97 67M139 67q19-40 45-27l-15 48" fill="#f3a69c" stroke="#824d48" strokeWidth="3"/><ellipse cx="118" cy="137" rx="67" ry="64" fill="#ef9e92"/><ellipse cx="115" cy="99" rx="71" ry="63" fill="#ffc2b3" stroke="#ac6e5f" strokeWidth="2"/><path d="M44 72q12-56 77-48 54 4 63 45" fill="#e1ae58" stroke="#947343" strokeWidth="3"/><path d="M34 68q82 15 162-2l-5 14Q114 92 38 81" fill="#efc779"/><path d="M55 44q69 14 109-4" fill="none" stroke="#fbdf99" strokeWidth="5"/><circle cx="89" cy="101" r="5" fill="#543c37"/><circle cx="145" cy="101" r="5" fill="#543c37"/><ellipse cx="117" cy="120" rx="25" ry="18" fill="#f0938b"/><ellipse cx="107" cy="120" rx="3" ry="5" fill="#a25150"/><ellipse cx="128" cy="120" rx="3" ry="5" fill="#a25150"/><path d="M100 148q18 12 35-2" stroke="#a25150" strokeWidth="3" fill="none" strokeLinecap="round"/><ellipse cx="72" cy="121" rx="10" ry="6" fill="#f49994"/><ellipse cx="161" cy="121" rx="10" ry="6" fill="#f49994"/><path d="m73 164 34 18 48-26-1 38-45 17-36-19z" fill="#24766a"/><path d="m107 182 2 27" stroke="#a7d9bc" strokeWidth="2"/><path d="m126 177 14-7" stroke="#f1d17e" strokeWidth="4"/><ellipse cx="65" cy="171" rx="12" ry="18" fill="#ffc2b3" transform="rotate(-30 65 171)"/><ellipse cx="161" cy="174" rx="12" ry="18" fill="#ffc2b3" transform="rotate(30 161 174)"/></svg>}
export function Island({kind=0}:{kind?:number}){return <svg viewBox="0 0 240 150" role="img" aria-label="原创探险岛屿"><ellipse cx="120" cy="119" rx="106" ry="23" fill="#b9ddd2"/><path d="M27 99Q44 55 104 68q77-30 110 31-17 40-93 36Q51 136 27 99" fill="#e8d29b"/><path d="M30 90Q70 47 108 64q71-29 101 25-27 31-97 30-63-4-82-29" fill={['#83baa0','#a9bd83','#82b6b8'][kind%3]}/><path d="M118 77q-4-29 4-52" stroke="#8b734a" strokeWidth="8" fill="none"/><path d="M121 28q-36-33-52-2 29-4 50 6M121 29q27-39 50-13-30 3-46 17M122 29q30-6 45 19-27-3-44-16" fill="#3a8a68"/><path d="M65 83 84 49l25 36z" fill="#fff3ce"/><path d="m84 49 9 36h-11" fill="#d58d65"/><circle cx="166" cy="84" r="8" fill="#f9d078"/><path d="m157 99 10-12 10 12" stroke="#fff0c2" strokeWidth="3" fill="none"/></svg>}