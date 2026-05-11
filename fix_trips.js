const fs = require('fs');
let code = fs.readFileSync('public/js/trips.js', 'utf8');

// Replace the bad Koupit jízdenku code block
const badStr1 = '}

                <a href="';
const startIdx = code.indexOf('Koupit jzdenku (esk drhy)');
if (startIdx !== -1) {
    const fixedContent = "                " + "\\${x.doprava && x.doprava.typ === 'vlak' ? `\n" +
                         "                <div style=\"margin-top:auto; margin-bottom:10px;\">\n" +
                         "                    <p class=\"ey\" style=\"margin-bottom:8px;font-size:0.75rem;color:#0055A5;\">JAK SE TAM DOSTAT</p>\n" +
                         "                    <a href=\"https://www.cd.cz/spojeni-a-jizdenka/spojeni-tam?odkud=\\${encodeURIComponent(x.doprava.z)}&kam=\\${encodeURIComponent(x.doprava.do)}\\${x.doprava.datumFormatovane ? `&date=\\${x.doprava.datumFormatovane}` : ''}\" target=\"_blank\" class=\"btn\" style=\"background:#0055A5; color:white; width:100%; justify-content:center; border:none; padding:10px; border-radius:var(--rsm);\">\n" +
                         "                        Koupit jízdenku (České dráhy)\n" +
                         "                    </a>\n" +
                         "                </div>\n" +
                         "                ` : ''}\n\n                <a href=\"\\${x.vstupenkyUrl}\" target=\"_blank\" class=\"btn bp bf\" style=\"text-decoration:none; margin-top:\\${x.doprava && x.doprava.typ === 'vlak' ? '0' : 'auto'}; display:flex; align-items:center; justify-content:center; gap:8px; line-height:1; padding:12px;\">\n" +
                         "                    <span style=\"display:block; transform:translateY(1px);\">Koupit vstupenky</span>\n" +
                         "                </a>";

    const regex = /<div style="margin-top:auto; margin-bottom:10px;">[\s\S]*?<span style="display:block; transform:translateY\(1px\);">Koupit vstupenky<\/span>\s*<\/a>/;
    code = code.replace(regex, fixedContent.trim());
}

// Fix the other bad block
code = code.replace(/` : \'}/g, '` : \'\'}');
code = code.replace(/` : '}/g, '` : \'\'}');
code = code.replace(/`&date=\\$\{x\.doprava\.datumFormatovane\}` : '}/g, '`&date=\\${x.doprava.datumFormatovane}` : \'\'}');
code = code.replace(/Koupit jzdenku \(esk drhy\)/g, 'Koupit jízdenku (České dráhy)');
code = code.replace(/Koupit jzdenku \(esk drhy\)/g, 'Koupit jízdenku (České dráhy)');

// Ensure syntax error in first line isn't there:
code = code.replace(/^\uFEFF/, "");
code = code.replace(/^.*trips\.js - Hlavní.*$/m, "// trips.js - Hlavní");

fs.writeFileSync('public/js/trips.js', code, 'utf8');
