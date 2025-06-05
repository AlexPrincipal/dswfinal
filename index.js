const express = require('express');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const {
  ApolloServerPluginLandingPageProductionDefault
} = require('@apollo/server/plugin/landingPage/default');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const productTypeDefs = require('./schemas/productSchema');
const userTypeDefs = require('./schemas/userSchema');
const facturaTypeDefs = require('./schemas/facturaSchema');

const facturaResolvers = require('./controllers/facturaController');
const userResolver = require('./controllers/userController');
const productResolver = require('./controllers/productController');

const typeDefs = [productTypeDefs, userTypeDefs, facturaTypeDefs];
const resolvers = [userResolver, facturaResolvers, productResolver];

const startServer = async () => {
  const app = express();

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado a MongoDB');
  } catch (err) {
    console.error('❌ Error conectando a MongoDB:', err.message);
  }

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: true,
    plugins: [
      ApolloServerPluginLandingPageProductionDefault({ embed: true }) // 👈 Aquí el sandbox
    ]
  });

  await server.start();

  app.use(cors());
  app.use(express.json());

  app.use('/graphql', expressMiddleware(server, {
    context: async ({ req }) => ({ req })
  }));

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`🚀 Server corriendo en http://localhost:${PORT}/graphql`);
  });
};

startServer();
