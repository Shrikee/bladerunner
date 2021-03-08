const Web3 = require('web3');
const Web3WsProvider = require('web3-providers-ws');

// const options = {
//   headers: {
//     authorization: 'Basic geth:iZ2vcblhmy3jfl6v0re7z5Z',
//   },
// clientConfig: {
//   // Useful if requests are large
//   maxReceivedFrameSize: 100000000, // bytes - default: 1MiB
//   maxReceivedMessageSize: 100000000, // bytes - default: 8MiB

//   // Useful to keep a connection alive
//   keepalive: true,
//   keepaliveInterval: 60000, // ms
// },

// // Enable auto reconnection
// reconnect: {
//   auto: true,
//   delay: 5000, // ms
//   maxAttempts: 5,
//   onTimeout: false,
// },
// };

const web3 = new Web3(new Web3WsProvider('ws://157.90.7.86:6458'));

web3.eth
  .getBlockNumber()
  .then(console.log)
  .catch(console.error);

subscription.on('data', txHash => {
  setTimeout(async () => {
    try {
      let tx = await web3.eth.getTransaction(txHash);
      if (tx && tx.to) {
        if (tx.to.toLowerCase() === account) {
          console.log('TX hash: ', txHash);
          console.log('TX confirmation: ', tx.transactionIndex);
          console.log('TX nonce: ', tx.nonce);
          console.log('TX block hash: ', tx.blockHash);
          console.log('TX block number: ', tx.blockNumber);
          console.log('TX sender address: ', tx.from);
          console.log(
            'TX amount(in Ether): ',
            web3.utils.fromWei(tx.value, 'ether'),
          );
          console.log('TX date: ', new Date());
          console.log('TX gas price: ', tx.gasPrice);
          console.log('TX gas: ', tx.gas);
          console.log('TX input: ', tx.input);
          console.log('TX hash: ', txHash);
          console.log('=====================================');
        }
      }
    } catch (err) {
      console.error(err);
    }
  });
});
