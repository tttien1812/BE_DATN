import audioQueue from "./src/queues/audioQueue.js";

const run = async () => {
  await audioQueue.add("test-job", {
    msg: "hello queue",
  });

  console.log("✅ Job pushed vào queue!");
};

run();
