import neo4j, { Driver } from 'neo4j-driver';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.NEO4J_URI || '';
const user = process.env.NEO4J_USERNAME || '';
const password = process.env.NEO4J_PASSWORD || '';

let driver: Driver | null = null;

try {
  driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  console.log('Neo4j Driver initialized');
} catch (error) {
  console.error('Failed to initialize Neo4j Driver', error);
}

export const getSession = () => {
  if (!driver) throw new Error('Neo4j Driver not initialized');
  return driver.session({ database: process.env.NEO4J_DATABASE || 'neo4j' });
};

export const closeDriver = async () => {
  if (driver) {
    await driver.close();
  }
};
