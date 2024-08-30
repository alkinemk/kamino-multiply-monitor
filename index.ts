import {
  Channel,
  Client,
  Events,
  GatewayIntentBits,
  TextChannel,
} from "discord.js";
import "dotenv/config";
import { KaminoMarket, KaminoReserve } from "@kamino-finance/klend-sdk";
import { Connection, PublicKey } from "@solana/web3.js";

const POLL_INTERVAL = 60000; // 1 minute in milliseconds
const UTILIZATION_THRESHOLD = 86;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const RPC_URL = process.env.RPC_URL;

async function checkUtilization(market: KaminoMarket, channel: Channel) {
  const solReserve = await market.getReserveByMint(
    new PublicKey("So11111111111111111111111111111111111111112")
  );

  const deposits = Number(solReserve?.getTotalSupply()) / 1e9;
  const borrows = Number(solReserve?.getBorrowedAmount()) / 1e9;
  let utilization = borrows / deposits;

  console.log(`SOL deposit TVL: ${deposits}`);
  console.log(`SOL borrow TVL: ${borrows}`);
  console.log(`Utilization: ${Number(utilization.toFixed(2)) * 100}%`);

  if (utilization < UTILIZATION_THRESHOLD) {
    await (channel as TextChannel).send(
      `<@&1274760310976286765> Il y a ${
        (utilization * deposits - borrows) / 1e9
      } SOL de dispo sur Multiply%`
    );
  }
}

(async () => {
  if (!DISCORD_TOKEN) {
    throw new Error(
      "DISCORD_TOKEN is missing. Make sure DISCORD_TOKEN is set in your .env file."
    );
  }

  if (!CHANNEL_ID) {
    throw new Error(
      "CHANNEL_ID is missing. Make sure CHANNEL_ID is set in your .env file. "
    );
  }

  if (!RPC_URL) {
    throw new Error(
      "RPC_URL is missing. Make sure RPC_URL is set in your .env file. "
    );
  }

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  console.log("Attempting to log in to Discord...");
  await client.login(DISCORD_TOKEN);
  console.log("Login successful");

  const channel = await client.channels.fetch(CHANNEL_ID);
  if (!channel?.isTextBased()) {
    throw new Error("Invalid channel or not a text channel");
  }

  const market = await KaminoMarket.load(
    new Connection(RPC_URL),
    new PublicKey("7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF"),
    0
  );

  if (!market || !channel) return;

  // Initial check
  await checkUtilization(market, channel);

  // Set up interval for polling
  setInterval(() => checkUtilization(market, channel), POLL_INTERVAL);

  await client.login(DISCORD_TOKEN);
})();
