const stateManager = require('../lib/persistency/data-store');
const { Factory } = require('@hkube/redis-utils');
let config;

before(async function () {
    this.timeout(15000);
    const bootstrap = require('../bootstrap');
    producer = require('../lib/jobs/producer');
    producer._firstJobDequeue = true;
    config = await bootstrap.init();
    const redis = Factory.getClient(config.redis);
    await redis.flushall();
    await stateManager._etcd._client.client.delete().all();
    await stateManager._db.db.dropDatabase();
    await stateManager._db.init();
});

after(async () => {
    const redis = Factory.getClient(config.redis);
    await redis.flushall();
    await stateManager._etcd._client.client.delete().all();
    await stateManager._db.db.dropDatabase();
});