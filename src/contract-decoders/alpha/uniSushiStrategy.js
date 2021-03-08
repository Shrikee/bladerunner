const uniFactoryAbi = require('../../../abi/uniFactory.json');
const uniPairAbi = require('../../../abi/uniPair.json');
const sushiFactory = require('../../../abi/sushiFactory.json');
const sushiPair = require('../../../abi/sushiPair.json');
const { Uniswap } = require('../../defi-platforms');

class UniSushiStrategy extends Uniswap {
  constructor(web3) {
    super();

    this.web3 = web3;

    this.wethAddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';

    this.uniRouterAddress = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
    this.uniFactoryAddress = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f';
    this.sushiFactoryAddress = '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac';

    this.uniFactory = new this.web3.eth.Contract(
      uniFactoryAbi,
      this.uniFactoryAddress,
    );
    this.sushiFactory = new this.web3.eth.Contract(
      sushiFactory,
      this.sushiFactoryAddress,
    );
  }

  async getPairContract(tokenAddress, provider) {
    if (provider === 'uni') {
      const pairAddress = await this.uniFactory.methods
        .getPair(tokenAddress, this.wethAddress)
        .call();
      return new this.web3.eth.Contract(uniPairAbi, pairAddress);
    }

    if (provider === 'sushi') {
      const pairAddress = await this.sushiFactory.methods
        .getPair(tokenAddress, this.wethAddress)
        .call();
      return new this.web3.eth.Contract(sushiPair, pairAddress);
    }
  }

  async getTradingPairReserves(pairContract) {
    return pairContract.methods.getReserves().call();
  }
}

module.exports = UniSushiStrategy;
