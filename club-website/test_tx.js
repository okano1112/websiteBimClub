const db = require('./config/database');
async function test() {
  const connection = await db.getConnection();
  await connection.beginTransaction();
  try {
    await connection.query("SELECT 1");
    await connection.commit();
    console.log("Tx OK");
  } catch(e) {
    await connection.rollback();
    console.log("Tx fail");
  } finally {
    connection.release();
  }
  process.exit(0);
}
test();
