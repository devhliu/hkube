
const log = require('@hkube/logger').GetLogFromContainer();
const Etcd = require('@hkube/etcd');
const components = require('../consts/component-name');
const producer = require('../jobs/producer');
class Persistence {
    constructor() {
        this.queue = null;
        this.queueName = null;
        this.etcdConfig = null;
        this.etcd = new Etcd();
    }  
    init({options}) {
        const {etcd, algorithmType, serviceName} = options;
        this.queueName = algorithmType;
        //    this.queue = queue;
        this.etcd.init({ etcd, serviceName });
        return this;
    }

    async store(data) {
        log.debug('storing data to etcd storage', { component: components.ETCD_PERSISTENT});
        const pendingAmount = await producer.getPendingAmount();
        const status = await this.etcd.algorithms.algorithmQueue.setState({queueName: this.queueName, data, pendingAmount});
        if (status) {
            log.debug('queue stored successfully', { component: components.ETCD_PERSISTENT});
        }
    }
    get() {
        return this.etcd.algorithms.algorithmQueue.getState({queueName: this.queueName});
    }
}


module.exports = new Persistence();
