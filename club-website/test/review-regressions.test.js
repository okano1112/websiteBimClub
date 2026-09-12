const test = require('node:test');
const assert = require('node:assert/strict');
const databasePath = require.resolve('../config/database');
function response() { return { statusCode:200, status(code) { this.statusCode=code; return this; }, json(body) { this.body=body; return this; } }; }
function route(file, method, path, database) {
    require.cache[databasePath] = { id:databasePath, filename:databasePath, loaded:true, exports:database };
    delete require.cache[require.resolve(file)];
    return require(file).stack.find(layer => layer.route?.path === path && layer.route.methods[method]).route.stack.at(-1).handle;
}
for (const imageUrl of [undefined, '/uploads/original.jpg', '/uploads/replacement.jpg', null]) {
    test(`CMS cover edit preserves other gallery rows (${imageUrl})`, async () => {
        let images = [{id:1,url:'/uploads/original.jpg',caption:'cover'}, {id:2,url:'/uploads/two.jpg',caption:'second'}, {id:3,url:'/uploads/three.jpg',caption:'third'}];
        const unchanged = structuredClone(images.slice(1));
        let committed=false;
        const connection = {
            beginTransaction:async()=>{}, commit:async()=>{committed=true;}, rollback:async()=>{}, release(){},
            async query(sql, params) {
                if (sql.startsWith('UPDATE achievements ')) return [{affectedRows:1}];
                if (sql.startsWith('SELECT id FROM achievement_images')) return [images];
                if (sql.startsWith('UPDATE achievement_images')) { assert.equal(params[2],42); images.find(i=>i.id===params[1]).url=params[0]; return [{}]; }
                if (sql.startsWith('DELETE FROM achievement_images')) {
                    assert.match(sql,/WHERE id = \? AND achievement_id = \?/);
                    assert.equal(params[1],42); images=images.filter(i=>i.id!==params[0]); return [{}];
                }
                throw new Error(`Unexpected query: ${sql}`);
            }
        };
        const handler=route('../src/routes/cmsContent','put','/:section/:id',{getConnection:async()=>connection,query:async()=>[[{id:42,title:'updated'}]]});
        const res=response();
        await handler({params:{section:'achievements',id:'42'},body:{title:'updated',description:'kept',...(imageUrl===undefined?{}:{imageUrl})}},res);
        assert.equal(res.statusCode,200); assert.equal(res.body.success,true); assert.equal(committed,true);
        assert.deepEqual(images.filter(i=>i.id!==1),unchanged);
        assert.equal(images.length,imageUrl===null?2:3);
        if(imageUrl) assert.equal(images[0].url,imageUrl);
    });
}
for (const isPublic of [0,1]) {
    test(`guest Profile respects independent Portfolio visibility (${isPublic})`, async()=>{
        const db={async query(sql) {
            if(sql.includes('FROM users')) return [[{id:42,username:'fixture',full_name:'Fixture'}]];
            if(sql.includes('FROM member_profiles')) return [[{is_public:1}]];
            if(sql.includes('FROM portfolios')) return [[{is_public:isPublic,headline:'private title',summary:'private summary',skills:['BIM']}]];
            if(sql.includes('FROM honors')||sql.includes('FROM posts')||sql.includes('FROM projects')) return [[]];
            throw new Error(sql);
        }};
        const handler=route('../src/routes/profiles','get','/:userId',db);
        const res=response(); await handler({params:{userId:'42'}},res);
        assert.equal(res.statusCode,200);
        assert.equal(res.body.portfolio.summary,isPublic?'private summary':'');
        assert.deepEqual(res.body.portfolio.skills,isPublic?['BIM']:[]);
    });
}
