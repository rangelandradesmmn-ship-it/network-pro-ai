const fs = require('fs');

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
    // Replace-[#07111F] with var(--bg-color)
    content = content.replace(/\[#07111F\]/g, '[var(--bg-color)]');
    // Replace-[#0E1B2B] with var(--panel-color)
    content = content.replace(/\[#0E1B2B\]/g, '[var(--panel-color)]');
    fs.writeFileSync(f, content);
});
console.log('Done backgrounds!');
