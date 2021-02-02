const Web3 = require('web3');
const Web3WsProvider = require('web3-providers-ws');

const options = {
  headers: {
    authorization: 'Basic geth:iZ2vcblhmy3jfl6v0re7z5Z',
  },
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
};

const web3 = new Web3(new Web3WsProvider('ws://103.214.147.112:6458'));

web3.eth.getBlockNumber().then(console.log).catch(console.error)


