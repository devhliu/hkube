
const { ApolloServer } = require('apollo-server-express');
const { ApolloServerPluginDrainHttpServer } = require('apollo-server-core');
const { SubscriptionServer } = require('subscriptions-transport-ws');
const { PubSub, withFilter } = require("graphql-subscriptions");
const { GraphQLScalarType, execute, subscribe } = require('graphql');
//const stubs = require('./stub.json');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const typeDefs = require('./graphql-schema');
const resolvers = require('./resolvers');


const pubsub = new PubSub();

async function startApolloServer(typeDefs, resolvers, app, httpServer, port) {

    const schema = makeExecutableSchema({
        typeDefs,
        resolvers,
    });



    const server = new ApolloServer({
        schema,
        plugins: [{
            async serverWillStart() {
                return {
                    async drainServer() {
                        subscriptionServer.close();
                    }
                };
            }
        }],
    });
    await server.start();
    server.applyMiddleware({ app });
    const subscriptionServer = SubscriptionServer.create(
        {
            schema, execute, subscribe, onConnect(connectionParams, webSocket, context) {
                console.log('Connected!')
            },
            onDisconnect(webSocket, context) {
                console.log('Disconnected!')
            },
        },
        { server: httpServer, path: server.graphqlPath },
    );
    // const PORT = 4000;
    // httpServer.listen(PORT, () => {
    console.log(`🚀 Query endpoint ready at http://localhost:${port}${server.graphqlPath}`);
    console.log(`🚀 Subscription endpoint ready at ws://localhost:${port}${server.graphqlPath}`);

    let currentNumber = 0;
    function incrementNumber() {
        currentNumber++;
        pubsub.publish("NUMBER_INCREMENTED", { numberIncremented: currentNumber });
        pubsub.publish("NUMBER_INCREMENTED_ODD", { numberIncrementedOdd: currentNumber });

        setTimeout(incrementNumber, 1000);
    }
    // Start incrementing
    incrementNumber();


    //  });
}





const graphqlServer = (app, httpServer, port) => {
    startApolloServer(typeDefs, resolvers.getResolvers(), app, httpServer, port).catch(err => {
        console.log(err);
    });
}

module.exports = graphqlServer;




// const ObjectScalarType = new GraphQLScalarType({
//     name: 'Object',
//     description: 'Arbitrary object',
//     parseValue: (value) => {
//         return typeof value === 'object' ? value
//             : typeof value === 'string' ? JSON.parse(value)
//                 : null
//     },
//     serialize: (value) => {
//         return typeof value === 'object' ? value
//             : typeof value === 'string' ? JSON.parse(value)
//                 : null
//     },
//     parseLiteral: (ast) => {
//         switch (ast.kind) {
//             case Kind.STRING: return JSON.parse(ast.value)
//             case Kind.OBJECT: throw new Error(`Not sure what to do with OBJECT for ObjectScalarType`)
//             default: return null
//         }
//     }
// })


// const resolvers = {
//     Object: ObjectScalarType,
//     Query: {
//         jobs: () => stubs.jobs,
//         algorithms: () => stubs.algorithms,
//         algorithmsByName: (parent, args, context, info) => {
//             return stubs.algorithms.find(algorithm => algorithm.name === args.name);
//         },
//         jobsByExperimentName: (parent, args, context, info) => {
//             return stubs.jobs.filter(job => job.pipeline.experimentName === args.experimentName);
//         },
//         pipelines: () => stubs.pipelines,
//         algorithmBuilds: () => stubs.algorithmBuilds,
//     },
//     Subscription: {
//         numberIncremented: {
//             subscribe: () => {
//                 return pubsub.asyncIterator(["NUMBER_INCREMENTED"])
//             }
//         },
//         numberIncrementedOdd: {
//             subscribe: withFilter(
//                 () => pubsub.asyncIterator('NUMBER_INCREMENTED_ODD'),
//                 (payload, variables) => {
//                     // Only push an update if the comment is on
//                     // the correct repository for this operation
//                     console.log(variables)
//                     return ((payload.numberIncrementedOdd % variables.number) === 0);
//                 },
//             )
//         }
//     },

// };