'use strict';
const fs=require('node:fs');const crypto=require('node:crypto');const path=require('node:path');
const {validate}=require('../core/visual-updates.cjs');
const [input,output]=process.argv.slice(2);
if(!input||!output||!process.env.DROPZONE_VISUAL_SIGNING_KEY)throw Error('Usage: set DROPZONE_VISUAL_SIGNING_KEY to your private key path; node scripts/sign-visual-update.cjs input.json output.json');
const payload=Buffer.from(JSON.stringify(validate(JSON.parse(fs.readFileSync(input,'utf8')))));
const signature=crypto.sign(null,payload,fs.readFileSync(process.env.DROPZONE_VISUAL_SIGNING_KEY));
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify({payload:payload.toString('base64'),signature:signature.toString('base64')},null,2)+'\n');
console.log('Signed visual package written to '+output);
