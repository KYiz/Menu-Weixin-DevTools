const assert=require('assert');
const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const config=JSON.parse(fs.readFileSync(path.join(root,'project.config.json'),'utf8'));
const ignored=config.packOptions.ignore;
const ignoredFolders=new Set(ignored.filter(x=>x.type==='folder').map(x=>x.value));
const ignoredFiles=new Set(ignored.filter(x=>x.type==='file').map(x=>x.value));
for(const name of ['preview','tests','tools'])assert.ok(ignoredFolders.has(name),`upload exclusion missing: ${name}`);

function filesIn(dir,relative=''){
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    const next=path.join(relative,entry.name);
    if(entry.isDirectory())return ignoredFolders.has(next)?[]:filesIn(path.join(dir,entry.name),next);
    return ignoredFiles.has(next)?[]:[next];
  });
}

const files=filesIn(root);
const app=JSON.parse(fs.readFileSync(path.join(root,'app.json'),'utf8'));
const roots=(app.subPackages||[]).map(pkg=>path.normalize(pkg.root)+path.sep);
const mainFiles=files.filter(file=>!roots.some(prefix=>file.startsWith(prefix)));
const subFiles=files.filter(file=>roots.some(prefix=>file.startsWith(prefix)));
const sizeOf=list=>list.reduce((sum,file)=>sum+fs.statSync(path.join(root,file)).size,0);
const bytes=sizeOf(mainFiles);
const subBytes=sizeOf(subFiles);
const imageFiles=files.filter(file=>/\.(jpg|jpeg|png|webp|gif)$/i.test(file));
const imageBytes=imageFiles.reduce((sum,file)=>sum+fs.statSync(path.join(root,file)).size,0);
assert.ok(bytes<1600000,`main-package source exceeds 1.6 MB: ${bytes} bytes`);
assert.strictEqual(imageFiles.length,51,'expected 47 dish images, two kitchen banners, one special-service image and one checkout illustration');
assert.strictEqual(imageFiles.filter(file=>file.startsWith(path.join('assets','images','dishes')+path.sep)).length,47);
assert.ok(subBytes<2000000,`chef subpackage exceeds 2 MB: ${subBytes} bytes`);
console.log(`PASS: main-package source ${bytes} bytes (${mainFiles.length} files); chef subpackage ${subBytes} bytes (${subFiles.length} files); images ${imageBytes} bytes (${imageFiles.length} files)`);
