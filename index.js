require('dotenv').config();
const Web3 = require('web3');
const pRetry = require('p-retry');
const winston = require('winston');
const delay = require('delay');

const web3 = new Web3(process.env.ETH_NODE);

const { AlphaFinance } = require('./src/contract-decoders');
const Telegram = require('./src/telegram');

const pools = {
  bancorYFIBNT: '0xAeB3a1AeD77b5D6e3feBA0055d79176532e5cEb8',
  uniRouter: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
  tokenlon: '0x03f34bE1BF910116595dB1b11E9d1B2cA5D59659',
  oneInch: '0x111111125434b319222CdBf8C261674aDB56F3ae',
  alphaFin: '0x67B66C99D3Eb37Fa76Aa3Ed1ff33E8e39F0b9c7A',
};

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ level: 'error', filename: 'errors.log' }),
  ],
});

const alphaFinanceDecoder = new AlphaFinance(web3, logger);
const telegram = new Telegram();

async function getData() {
  const ws = web3.eth.subscribe('pendingTransactions');

  let txCounter = 0;
  ws.on('data', async data => {
    txCounter++;

    await pRetry(
      async () => {
        const tx = await web3.eth.getTransaction(data);

        if (tx === null) {
          await delay(3000);
          throw new Error('tx is null');
        }

        if (tx.to === pools.alphaFin) {
          const txObj = await alphaFinanceDecoder.decodeInput(tx);

          if (txObj) {
            try {
              await telegram.sendMessage(txObj);
            } catch (error) {
              logger.error(error);
            }
          }
        }
      },
      {
        onFailedAttempt: error => {
          logger.info(
            `Attempt ${error.attemptNumber} failed. There are ${error.retriesLeft} retries left.`,
          );
          logger.info(`Tx counter: ${txCounter}`);
        },
        retries: 10,
      },
    );
  });
}

async function testData(txHash = null) {
  let txH = txHash;
  let txObj;
  if (txH === null) {
    txH = '0xd047ce8ca0dfaa7f70473c728a44b1c65b4f73fde61aaafacda122b828a0ae25';
  }
  const tx = await web3.eth.getTransaction(txH);

  if (tx.to === pools.alphaFin) {
    txObj = await alphaFinanceDecoder.decodeInput(tx);
  }

  if (txObj) {
    await telegram.sendMessage(txObj);

    return logger.log('info', txObj);
  }
}

getData();
// testData();
