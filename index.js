require('dotenv').config();
const Web3 = require('web3');
const pRetry = require('p-retry');
const winston = require('winston');

const web3 = new Web3(process.env.INFURA_WS);

const { AlphaFinance, OneInch } = require('./src/contract-decoders');
const { Uniswap } = require('./src/defi-platforms');
const Telegram = require('./src/telegram');

const pools = {
  bancorYFIBNT: '0xAeB3a1AeD77b5D6e3feBA0055d79176532e5cEb8',
  uniRouter: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
  tokenlon: '0x03f34bE1BF910116595dB1b11E9d1B2cA5D59659',
  oneInch: '0x111111125434b319222CdBf8C261674aDB56F3ae',
  alphaFin: '0x67B66C99D3Eb37Fa76Aa3Ed1ff33E8e39F0b9c7A',
};

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'tx.log' }),
  ],
});

const alphaFinanceDecoder = new AlphaFinance(web3);
const oneInchDecoder = new OneInch(web3);
const uniswap = new Uniswap();
const telegram = new Telegram();

async function getData() {
  const ws = web3.eth.subscribe('pendingTransactions');

  let txCounter = 0;
  ws.on('data', async data => {
    txCounter++;
    try {
      await pRetry(
        async () => {
          const tx = await web3.eth.getTransaction(data);

          if (tx === null) {
            throw new Error('tx is null');
          }

          if (tx.to === pools.alphaFin) {
            const txObj = await alphaFinanceDecoder.decodeInput(tx);

            await telegram.sendMessage(txObj);

            return logger.log('info', txObj);
          }

          if (tx.to === pools.oneInch) {
            const txObj = await oneInchDecoder.decodeInput(tx);

            await telegram.sendMessage(txObj);

            return logger.log('info', txObj);
          }
        },
        {
          onFailedAttempt: error => {
            console.log(
              `Attempt ${error.attemptNumber} failed. There are ${error.retriesLeft} retries left.`,
            );
            console.log('Tx counter: ' + txCounter);
          },
          retries: 12,
        },
      );
    } catch (error) {
      console.log(error);
    }
  });
}
async function testData(txHash = null) {
  let txH = txHash;
  let txObj;
  if (txH === null) {
    txH = '0x3c4dcc0afe756a02c516d0e77ea5ffa9f4ac43b188b55be9a14e5ba5bbde0890';
    // '0xb36a20267ae76242d93a164b9f6b425d8de33d21f7a61f974980489685f2e5bf';
  }
  const tx = await web3.eth.getTransaction(txH);

  if (tx.to === pools.alphaFin) {
    txObj = await alphaFinanceDecoder.decodeInput(tx);
  }

  if (tx.to === pools.oneInch) {
    txObj = await oneInchDecoder.decodeInput(tx);
  }

  await telegram.sendMessage(txObj);

  return logger.log('info', txObj);
}

async function testIt() {
  const { txHash } = require('./testData/testHashes.json');
  txHash.map(async txHash => {
    await testData(txHash);
  });
}

// testIt();
testData();
// getData();
