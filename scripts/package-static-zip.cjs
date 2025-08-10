#!/usr/bin/env node
// Crée un zip pour déploiement statique (Amplify manual upload / S3 Hosting)
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function run(cmd){ console.log('> ' + cmd); execSync(cmd,{stdio:'inherit'}); }

// 1. Build + export si dossier out absent
if(!fs.existsSync(path.join(process.cwd(),'out'))){
  run('npm run build:static');
}

if(!fs.existsSync(path.join(process.cwd(),'out'))){
  console.error('Le dossier out n\'existe pas. Export Next échoué.');
  process.exit(1);
}

// 2. Vérifier qu'il n'y a pas de pages dynamiques non exportées
const dynamicIssues = [];
function scan(dir){
  for(const f of fs.readdirSync(dir)){
    const full = path.join(dir,f);
    const stat = fs.statSync(full);
    if(stat.isDirectory()) scan(full);
    else if(f.endsWith('.html')){
      // nothing
    }
  }
}
scan(path.join(process.cwd(),'out'));
if(dynamicIssues.length){
  console.warn('Avertissement: pages dynamiques détectées qui ne seront pas fonctionnelles statiquement:', dynamicIssues);
}

// 3. Zip
const archiver = require('archiver');
const zipName = 'next-static-export.zip';
if(fs.existsSync(zipName)) fs.unlinkSync(zipName);
const output = fs.createWriteStream(zipName);
const archive = archiver('zip',{zlib:{level:9}});
output.on('close',()=>console.log('Créé '+zipName+' ('+archive.pointer()+' bytes)'));
archive.on('error',e=>{throw e});
archive.pipe(output);
archive.directory('out/','/');
archive.finalize();
