import amqp, { type Channel, type ChannelModel, type ConsumeMessage } from 'amqplib';
import { env } from '@/config/env.js';
import {
  MEMORY_DLX,
  MEMORY_DLQ,
  MEMORY_EXCHANGE,
  MEMORY_QUEUE,
  MEMORY_ROUTING_KEY,
} from './memory-queue.js';

let connection: ChannelModel | null = null;
let publishChannel: Channel | null = null;
let consumerChannel: Channel | null = null;

export function isRabbitMqEnabled() {
  return Boolean(env.RABBITMQ_URL);
}

async function getConnection(): Promise<ChannelModel> {
  if (!env.RABBITMQ_URL) {
    throw new Error('RABBITMQ_URL is not configured');
  }

  if (connection) return connection;

  const conn = await amqp.connect(env.RABBITMQ_URL);
  conn.on('close', () => {
    connection = null;
    publishChannel = null;
    consumerChannel = null;
  });
  conn.on('error', () => {
    connection = null;
    publishChannel = null;
    consumerChannel = null;
  });
  connection = conn;
  return conn;
}

async function assertMemoryTopology(channel: Channel) {
  await channel.assertExchange(MEMORY_EXCHANGE, 'topic', { durable: true });
  await channel.assertExchange(MEMORY_DLX, 'topic', { durable: true });

  await channel.assertQueue(MEMORY_DLQ, { durable: true });
  await channel.bindQueue(MEMORY_DLQ, MEMORY_DLX, MEMORY_ROUTING_KEY);

  await channel.assertQueue(MEMORY_QUEUE, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': MEMORY_DLX,
      'x-dead-letter-routing-key': MEMORY_ROUTING_KEY,
    },
  });
  await channel.bindQueue(MEMORY_QUEUE, MEMORY_EXCHANGE, MEMORY_ROUTING_KEY);
}

export async function getPublisherChannel(): Promise<Channel> {
  if (publishChannel) return publishChannel;
  const conn = await getConnection();
  publishChannel = await conn.createChannel();
  await assertMemoryTopology(publishChannel);
  return publishChannel;
}

export async function getConsumerChannel(): Promise<Channel> {
  if (consumerChannel) return consumerChannel;
  const conn = await getConnection();
  consumerChannel = await conn.createChannel();
  await assertMemoryTopology(consumerChannel);
  await consumerChannel.prefetch(10);
  return consumerChannel;
}

export async function consumeMemoryQueue(
  onMessage: (msg: ConsumeMessage, channel: Channel) => Promise<void>,
) {
  const channel = await getConsumerChannel();
  await channel.consume(MEMORY_QUEUE, async (msg) => {
    if (!msg) return;
    await onMessage(msg, channel);
  });
}

export async function closeRabbitMq() {
  await publishChannel?.close().catch(() => undefined);
  await consumerChannel?.close().catch(() => undefined);
  await connection?.close().catch(() => undefined);
  publishChannel = null;
  consumerChannel = null;
  connection = null;
}
