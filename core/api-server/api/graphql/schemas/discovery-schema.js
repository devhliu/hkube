const { gql } = require('apollo-server');

const discoveryTypeDefs = gql`

type Pipelinedriver {
     driverId: String
    paused: Boolean
    driverStatus: String
    jobStatus: String
    podName: String }

  type Workers { total: Int stats: [String ] }

  type Labels { 
    betaubernetesioarch: String
    betakubernetesioinstancetype: String
    betakubernetesioos: String
    failuredomainbetakubernetesioregion: String
    failuredomainbetakubernetesiozone: String
    kopsk8sioinstancegroup: String
    kubernetesioarch: String
    kubernetesiohostname: String
    kubernetesioos: String
    kubernetesiorole: String
    noderolekubernetesionode: String
    noderolekubernetesiospotworker: String
    nodekubernetesioinstancetype: String
    ondemand: String
    topologykubernetesioregion: String
    topologykubernetesiozone: String }

  type WorkersTotal { cpu: Int gpu: Int mem: Int }

  type Other { cpu: Float gpu: Int mem: Int }

  type Requests { cpu: Float gpu: Int mem: Int }

  type Total { cpu: Int gpu: Int mem: Float }

  type DiscoveryNodes { name: String
    workers: Workers
    workers2: [String ]
    labels: Labels
    workersTotal: WorkersTotal
    other: Other
    requests: Requests
    total: Total }

  type ResourcePressure { cpu: Float gpu: Int mem: Float }

  type Stats { algorithmName: String count: Int results: Int }

  type Actual { total: Int stats: [Stats ] }

  type TaskExecutor { 
    nodes: [DiscoveryNodes ]
    resourcePressure: ResourcePressure
    actual: Actual 
}

  type StreamingDiscovery { host: String port: Int }

  type Worker { 
    workerStatus: String
    isMaster: Boolean
    workerStartingTime: String
    jobCurrentTime: String
    workerPaused: Boolean
    hotWorker: Boolean
    error: String
    workerId: String
    algorithmName: String
    podName: String
    streamingDiscovery: StreamingDiscovery }

  type Discovery { pipelinedriver: [Pipelinedriver ]
    TaskExecutor: [TaskExecutor ]
    worker: [Worker ] }

  type AutogeneratedMainType { discovery: Discovery }
`


module.exports = discoveryTypeDefs;