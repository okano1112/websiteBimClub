const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {localImageData,allowedPdfRequest}=require('../src/services/pdfRenderer');
test('PDF refuses traversal and symlink escapes without reading the outside fixture',()=>{
    const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bimclub-pdf-'));
    try {
        const root=path.join(dir,'images'); fs.mkdirSync(root);
        fs.writeFileSync(path.join(dir,'outside.png'),'sentinel');
        fs.writeFileSync(path.join(root,'inside.png'),'fixture');
        fs.symlinkSync(path.join(dir,'outside.png'),path.join(root,'link.png'));
        assert.equal(localImageData(root,'../outside.png'),'');
        assert.equal(localImageData(root,'%2e%2e/outside.png'),'');
        assert.equal(localImageData(root,'link.png'),'');
        assert.match(localImageData(root,'inside.png'),/^data:image\/png;base64,/);
    } finally { fs.rmSync(dir,{recursive:true,force:true}); }
});
test('PDF network policy only permits existing font hosts and raster data',()=>{
    for(const value of ['file:///tmp/fixture.png','http://127.0.0.1/a','https://example.com/a','https://fonts.gstatic.com.evil.test/a','https://fonts.gstatic.com:444/a','data:image/svg+xml;base64,AAAA']) assert.equal(allowedPdfRequest(value),false,value);
    assert.equal(allowedPdfRequest('https://fonts.gstatic.com/font.woff2'),true);
    assert.equal(allowedPdfRequest('data:image/png;base64,AAAA'),true);
});
