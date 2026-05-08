import fs from 'fs';
const file = 'server/routes.ts';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(/const AdmZipMod = \(await import\("adm-zip"\)\)\.default;/g, 'const AdmZipMod = (await import("adm-zip")).default;');
code = code.replace(/const zip = new AdmZipMod\(Buffer\.from\(buffer\)\);/g, 'const zip = new AdmZipMod(buffer as any) as any;');
code = code.replace(/displayHeaderFooter,/g, '// @ts-ignore\n          displayHeaderFooter,');
fs.writeFileSync(file, code);
