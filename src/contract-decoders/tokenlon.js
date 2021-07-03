const abiDecoder = require('abi-decoder');
const AbstractDecoder = require('./abstract-decoder');
const AMMWrapperAbi = require('./tokenlon/AMMWrapper.json');
const abi = require('./tokenlon/decoderContractAbi.json');

class TokenlonDecoder extends AbstractDecoder {
  constructor(web3, web3Ropsten, logger) {
    super(web3, logger);

    this.web3 = web3;
    this.web3Ropsten = web3Ropsten;
  }

  async decodeInput(tx) {
    let data = tx.input.slice(402);

    // TO PMM
    if (data.slice(0, 8) === '64a3bc15') {
      data = `0x${data}`;

      // 0x2fb99A5B89c48dE63ecC1813D8768B492D8bcFA6
      const web3Contract = new this.web3Ropsten.eth.Contract(
        abi,
        '0x2fb99A5B89c48dE63ecC1813D8768B492D8bcFA6',
      );
      const res = await web3Contract.methods.assemblyAdd(data).call();

      return this.formatDataPMM(res, tx);
    }

    // TO AMM
    data = tx.input.slice(138);
    data = `0x${data}`;

    abiDecoder.addABI(AMMWrapperAbi);
    const decodedInput = abiDecoder.decodeMethod(data);
    return this.formatDataAMM(decodedInput, tx);
  }

  formatDataAMM(data, tx) {
    const { addressConstants } = this;
    const swapProvider = maker => {
      if (maker.toLowerCase() === addressConstants.zeroX) return '0x';
      if (maker.toLowerCase() === addressConstants.uni) return 'Uniswap';
      if (maker.toLowerCase() === addressConstants.sushi) return 'Sushiswap';
      return 'CurveFi';
    };

    return {
      swapProvider: swapProvider(data.params[0].value),
      toBeSwappedFrom:
        data.params[1].value !== addressConstants.nullAddress
          ? `https://etherscan.io/address/${data.params[1].value}`
          : 'ETH',
      toBeSwappedTo:
        data.params[2].value !== addressConstants.nullAddress
          ? `https://etherscan.io/address/${data.params[2].value}`
          : 'ETH',
      swapAmount: data.params[3].value,
      amountToBeRecieved: data.params[4].value,
      txHash: `https://etherscan.io/tx/${tx.hash}`,
    };
  }

  formatDataPMM(data, tx) {
    const swapAsset = takerAssetDataHash => `0x${takerAssetDataHash.slice(34)}`;
    return {
      swapProvider: '0x',
      toBeSwappedFrom: `https://etherscan.io/address/${swapAsset(
        data[0].takerAssetData,
      )}`,
      toBeSwappedTo: `https://etherscan.io/address/${swapAsset(
        data[0].makerAssetData,
      )}`,
      swapAmount: data[0].takerAssetAmount,
      amountToBeRecieved: data[0].makerAssetAmount,
      txHash: `https://etherscan.io/tx/${tx.hash}`,
    };
  }
}

module.exports = TokenlonDecoder;
