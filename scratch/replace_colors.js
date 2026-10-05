const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if(file.endsWith('.tsx')) results.push(file);
        }
    });
    return results;
}

const files = walk('./src');
files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    // Replace-[#00AEEF] with var(--primary-color)
    content = content.replace(/\[#00AEEF\]/g, '[var(--primary-color)]');
    // Replace-[#00E5FF] with var(--secondary-color)
    content = content.replace(/\[#00E5FF\]/g, '[var(--secondary-color)]');
    fs.writeFileSync(f, content);
});
console.log('Done!');
