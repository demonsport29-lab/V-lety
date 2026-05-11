const fs = require('fs');
let code = fs.readFileSync('public/js/trips.js', 'utf8');

// Replace the entire block from <a href="https://www.cd.cz/spojeni-a-jizdenka to </a>
// Actually, it's easier to just replace everything from `\${x.doprava && x.doprava.typ === 'vlak' ? ` to the end of the map callback.

const regex = /\$\{x\.doprava && x\.doprava\.typ === 'vlak' \? `[\s\S]*?<span style="display:block; transform:translateY\(1px\);">Koupit vstupenky<\/span>\s*<\/a>/;

const fixedContent = "\\${x.doprava && x.doprava.typ === 'vlak' ? `\n" +
"                <div style=\"margin-top:auto; margin-bottom:10px;\">\n" +
"                    <p class=\"ey\" style=\"margin-bottom:8px;font-size:0.75rem;color:#0055A5;\">JAK SE TAM DOSTAT</p>\n" +
"                    <a href=\"https://www.cd.cz/spojeni-a-jizdenka/spojeni-tam?odkud=\\${encodeURIComponent(x.doprava.z)}&kam=\\${encodeURIComponent(x.doprava.do)}\\${x.doprava.datumFormatovane ? `&date=\\${x.doprava.datumFormatovane}` : ''}\" target=\"_blank\" class=\"btn\" style=\"background:#0055A5; color:white; width:100%; justify-content:center; border:none; padding:10px; border-radius:var(--rsm);\">\n" +
"                        Koupit jízdenku (České dráhy)\n" +
"                    </a>\n" +
"                </div>\n" +
"                ` : ''}\n\n" +
"                <a href=\"\\${x.vstupenkyUrl}\" target=\"_blank\" class=\"btn bp bf\" style=\"text-decoration:none; margin-top:\\${x.doprava && x.doprava.typ === 'vlak' ? '0' : 'auto'}; display:flex; align-items:center; justify-content:center; gap:8px; line-height:1; padding:12px;\">\n" +
"                    <span style=\"display:block; transform:translateY(1px);\">Koupit vstupenky</span>\n" +
"                </a>";

code = code.replace(regex, fixedContent);

// Fix AnimeJS call if it's missing (it was added in the powershell that we might have overwritten)
if (!code.includes('if (window.spustitAnimaciKaret)')) {
    code = code.replace(/}\s*window\.otevritDetailVerejnehoVyletuZListu/, "    if (window.spustitAnimaciKaret) setTimeout(window.spustitAnimaciKaret, 50);\n}\nwindow.otevritDetailVerejnehoVyletuZListu");
    code = code.replace(/d\.appendChild\(k\);\n    }\);\n}/, "d.appendChild(k);\n    });\n    if (window.spustitAnimaciKaret) setTimeout(window.spustitAnimaciKaret, 50);\n}");
    code = code.replace(/}\n\/\/\s*----\s*6\.\s*ADMIN\s*CMS\s*PRO\s*AKCE\s*----/, "    if (window.spustitAnimaciKaret) setTimeout(window.spustitAnimaciKaret, 50);\n}\n// ---- 6. ADMIN CMS PRO AKCE ----");
}

fs.writeFileSync('public/js/trips.js', code, 'utf8');
