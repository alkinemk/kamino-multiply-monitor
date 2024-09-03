import { Channel, Client, GatewayIntentBits, TextChannel } from "discord.js";
import "dotenv/config";
import { KaminoMarket } from "@kamino-finance/klend-sdk";
import { Connection, PublicKey } from "@solana/web3.js";

const POLL_INTERVAL = 60000; // 1 minute in milliseconds
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const RPC_URL = process.env.RPC_URL;

if (!DISCORD_TOKEN || !CHANNEL_ID || !RPC_URL) {
  throw new Error("Missing environment variables. Check your .env file.");
}

const connection = new Connection(RPC_URL);
let multiplyLoop = true;
let pyusdLoop = true;

async function loadMarket() {
  return await KaminoMarket.load(
    connection,
    new PublicKey("7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF"),
    0
  );
}

async function checkMultiply(channel: TextChannel, market: KaminoMarket) {
  const solReserve = await market.getReserveByMint(
    new PublicKey("So11111111111111111111111111111111111111112")
  );

  const deposits = Number(solReserve?.getTotalSupply()) / 1e9;
  const borrows = Number(solReserve?.getBorrowedAmount()) / 1e9;
  const utilization = borrows / deposits;
  const sol_capacity = deposits * utilization - borrows;

  console.log(`SOL deposit TVL: ${deposits}`);
  console.log(`SOL borrow TVL: ${borrows}`);
  console.log(`Utilization: ${Number(utilization) * 100}`);
  console.log(`Capacity: ${sol_capacity}`);

  if (sol_capacity > 10 && multiplyLoop) {
    await channel.send(
      `<@&1274760310976286765> Il y a ${sol_capacity} SOL de dispo sur Multiply`
    );
    multiplyLoop = false;
  } else if (sol_capacity <= 10) {
    multiplyLoop = true;
  }
}

async function checkPyusdDeposits(channel: TextChannel, market: KaminoMarket) {
  const pyusdReserve = await market.getReserveByMint(
    new PublicKey("2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo")
  );

  const deposits = Number(pyusdReserve?.getTotalSupply()) / 1e9;
  const pyusd_deposit_capacity = 400000 - deposits;

  console.log(`PYUSD deposit TVL: ${deposits}`);
  console.log(`PYUSD deposit capacity: ${pyusd_deposit_capacity}`);

  if (pyusd_deposit_capacity > 100000 && pyusdLoop) {
    await channel.send(
      `<@270258388586201089> ${pyusd_deposit_capacity} PYUSD de borrow disponibles`
    );
    pyusdLoop = false;
  } else if (pyusd_deposit_capacity <= 100000) {
    pyusdLoop = true;
  }
}

async function runChecks(channel: TextChannel) {
  const market = await loadMarket();
  if (!market) {
    throw new Error("Failed to load market");
  }

  await Promise.all([
    checkMultiply(channel, market),
    checkPyusdDeposits(channel, market),
  ]);
}

(async () => {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  console.log("Attempting to log in to Discord...");
  await client.login(DISCORD_TOKEN);
  console.log("Login successful");

  const channel = await client.channels.fetch(CHANNEL_ID);
  if (!channel?.isTextBased()) {
    throw new Error("Invalid channel or not a text channel");
  }

  // Initial check
  await runChecks(channel as TextChannel);

  // Set up interval for polling
  setInterval(() => runChecks(channel as TextChannel), POLL_INTERVAL);
})();
