const { gql } = require('apollo-server-express');

const facturaTypeDefs = gql`
  input ProductoFacturaInput {
    nombre: String!
    precio: Float!
    cantidad: Int!
  }

  input EmitirFacturaInput {
    legal_name: String!
    rfc: String!
    email: String!
    numero: String!       
    productos: [ProductoFacturaInput!]!
  }

  type ProductoFactura {
    nombre: String!
    precio: Float!
    cantidad: Int!
  }

  type ClienteInfo {
    nombre: String
    rfc: String
    email: String
  }

  type FacturaEmitida {
    id: ID
    cliente: ClienteInfo
    productos: [ProductoFactura]
    total: Float
    pdfUrl: String
    resumen: String
  }

  type Mutation {
    emitirFactura(input: EmitirFacturaInput!): FacturaEmitida
  }
`;

module.exports = facturaTypeDefs;
