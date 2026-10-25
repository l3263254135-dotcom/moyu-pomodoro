interface CatProps { resting: boolean; paused: boolean; }

export function Cat({ resting, paused }: CatProps) {
  return (
    <svg className={`cat ${resting ? "cat--playing" : "cat--sleeping"} ${paused ? "cat--paused" : ""}`} viewBox="0 0 260 136" role="img" aria-label={resting ? "抱着毛线球玩耍的小猫" : "安静打盹的小猫"}>
      <defs>
        <linearGradient id="fur" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fffaf0"/><stop offset="1" stopColor="#eadbc4"/></linearGradient>
        <linearGradient id="yarn" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#a7cfdf"/><stop offset="1" stopColor="#6fa7c0"/></linearGradient>
      </defs>
      <ellipse className="cat-shadow" cx="130" cy="120" rx="91" ry="8" />
      <path className="cat-tail" d="M77 99C30 126 23 75 49 77C65 78 57 96 46 88" fill="none" stroke="url(#fur)" strokeWidth="18" strokeLinecap="round"/>
      <path d="M61 101C63 59 96 53 137 65C170 74 183 102 166 113C144 128 73 124 61 101Z" fill="url(#fur)"/>
      <path d="M114 77C124 56 134 49 145 41L150 19L166 31C179 29 190 33 196 43L214 37L210 60C220 83 202 103 177 102C151 102 132 92 132 78Z" fill="url(#fur)"/>
      <path d="M150 22L154 38L164 32Z" fill="#e5bcae"/><path d="M207 43L198 49L205 56Z" fill="#e5bcae"/>
      <path d="M170 36C174 32 179 32 183 35M181 43L186 52" stroke="#c6b197" strokeWidth="5" strokeLinecap="round"/>
      <ellipse cx="165" cy="76" rx="8" ry="4" fill="#efb7ae" opacity=".5"/><ellipse cx="200" cy="76" rx="8" ry="4" fill="#efb7ae" opacity=".5"/>
      {paused ? <>
        <path d="M158 63Q166 54 174 63M189 63Q197 54 205 63" fill="none" stroke="#675b52" strokeWidth="3" strokeLinecap="round"/>
      </> : resting ? <>
        <circle cx="167" cy="62" r="3" fill="#675b52"/><circle cx="198" cy="62" r="3" fill="#675b52"/>
      </> : <>
        <path d="M158 63Q166 70 174 63M189 63Q197 70 205 63" fill="none" stroke="#675b52" strokeWidth="3" strokeLinecap="round"/>
      </>}
      <path d="M180 71L184 74L188 71M184 74Q183 80 178 78M184 74Q185 80 190 78" fill="none" stroke="#9b7770" strokeWidth="2" strokeLinecap="round"/>
      <path d="M157 74L140 71M157 79L139 81M204 73L220 68M205 79L222 81" stroke="#b5a28c" strokeWidth="1.5" strokeLinecap="round"/>
      <ellipse cx="147" cy="105" rx="22" ry="10" fill="#fff9eb"/><path d="M138 104L138 109M147 104L147 110" stroke="#d5c3a8" strokeWidth="2" strokeLinecap="round"/>
      {resting ? <g className="yarn-ball"><path d="M107 113Q91 108 94 93Q99 78 114 87" fill="none" stroke="#85b3c7" strokeWidth="2"/><circle cx="89" cy="96" r="22" fill="url(#yarn)"/><path d="M72 89Q88 80 105 91M70 99Q91 89 109 99M77 113Q82 93 97 78M90 117Q86 96 76 83" fill="none" stroke="#c6e1eb" strokeWidth="2" opacity=".8"/></g> : <g className="sleep-marks" fill="#8aabba"><text x="211" y="36" fontSize="17">z</text><text x="225" y="19" fontSize="22">z</text></g>}
    </svg>
  );
}
