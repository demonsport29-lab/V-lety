const fs = require('fs');
let code = fs.readFileSync('public/js/trips.js', 'utf8');

const targetIdx = code.indexOf('function vykreslitDopravu');

if (targetIdx !== -1) {
    const validFunc = `function vykreslitDopravu(draft) {
    const d = document.getElementById('resDoprava');
    if (draft && draft.doprava && draft.doprava.typ === 'vlak') {
        const queryParams = new URLSearchParams({
            odkud: draft.doprava.z,
            kam: draft.doprava.do
        });
        if (draft.doprava.datumFormatovane) {
            queryParams.append('date', draft.doprava.datumFormatovane);
        }
        
        d.innerHTML = \`
            <p class="ey" style="margin-bottom:8px; font-size:0.8rem; color:#0055A5; font-weight:700;">JAK SE TAM DOSTAT</p>
            <p style="font-size:0.9rem; color:var(--t2); margin-bottom:12px;">Nejpohodlnější cesta je vlakem z \${draft.doprava.z} do \${draft.doprava.do}.</p>
            <a href="https://www.cd.cz/spojeni-a-jizdenka/spojeni-tam?\${queryParams.toString()}" target="_blank" class="btn" style="background:#0055A5; color:white; border:none; padding:12px 20px; border-radius:10px; font-weight:700; display:inline-flex; align-items:center; gap:8px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15V9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6"/><path d="M4 15l2-2h12l2 2"/><path d="M6 13v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6"/><circle cx="8" cy="17" r="1"/><circle cx="16" cy="17" r="1"/></svg>
                Koupit jízdenku (České dráhy)
            </a>
        \`;
        d.style.display = 'block';
    } else {
        if(d) {
            d.style.display = 'none';
            d.innerHTML = '';
        }
    }
}
`;

    code = code.substring(0, targetIdx) + validFunc;
    fs.writeFileSync('public/js/trips.js', code, 'utf8');
}
