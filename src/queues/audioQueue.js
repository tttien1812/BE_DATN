import { Queue } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis({
  host: "127.0.0.1",
  port: 6379,
  maxRetriesPerRequest: null,
});

const audioQueue = new Queue("audio-processing", {
  connection,
});

export default audioQueue;
