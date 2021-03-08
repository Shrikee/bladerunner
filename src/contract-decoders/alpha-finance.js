const abiDecoder = require('abi-decoder');
const BN = require('bn.js');

const AbstractDecoder = require('./abstract-decoder');
const alphaFinanceAbi = require('../../abi/alphaFin.json');
const sushiContractsAddresses = require('./alpha/assets/sushiswap/strategyContractsAdresses.json');
const uniContractsAddresses = require('./alpha/assets/uniswap/strategyContractsAddresses.json');
const { UniSushiStrategy } = require('./alpha');

const UNI = 'uni';
const SUSHI = 'sushi';

class AlphaFinance extends AbstractDecoder {
  constructor(web3, logger) {
    super(web3, logger);

    this.targetAddress = '0x67B66C99D3Eb37Fa76Aa3Ed1ff33E8e39F0b9c7A';
    this.uniSushiStrategy = new UniSushiStrategy(web3);

    abiDecoder.addABI(alphaFinanceAbi);
  }

  async decodeInput(tx) {
    const ethSentWithTx = tx.value;
    const decodedInput = await abiDecoder.decodeMethod(tx.input);
    let loanETH = 0;

    if (decodedInput.params[2].value) {
      loanETH = decodedInput.params[2].value;
    }

    const totalEthToSwap = new BN(ethSentWithTx)
      .add(new BN(loanETH))
      .toString();
    const strategyRaw = this.web3.eth.abi.decodeParameters(
      ['address', 'bytes'],
      decodedInput.params[4].value,
    );

    if (
      uniContractsAddresses.filter(item => item === strategyRaw[0]).length > 0
    ) {
      const strategy = this.getStrategy(strategyRaw[1]);

      const uniPairContract = await this.uniSushiStrategy.getPairContract(
        strategy[0],
        UNI,
      );
      const reserves = await this.uniSushiStrategy.getTradingPairReserves(
        uniPairContract,
      );

      const token0 = await uniPairContract.methods.token0().call();

      let swapAmount;

      if (token0 === this.uniSushiStrategy.wethAddress) {
        swapAmount = await this.optimalSwapAmount(
          totalEthToSwap,
          strategy[1],
          reserves._reserve0,
          reserves._reserve1,
        );
      } else {
        swapAmount = await this.optimalSwapAmount(
          totalEthToSwap,
          strategy[1],
          reserves._reserve1,
          reserves._reserve0,
        );
      }

      const pairPriceAfterTrade = await this.uniSushiStrategy.pairPrice(
        strategy[0],
        this.web3.utils.toWei(swapAmount.swapAmt),
      );

      let txObj = {
        targetAddress: this.targetAddress,
        etherscanLink: `https://etherscan.io/tx/${tx.hash}`,
        decodedInput,
        decodedDataParam: strategy,
        toSwap: swapAmount,
        toLiquidity: {
          ETH: swapAmount.isToken
            ? this.web3.utils.fromWei(totalEthToSwap)
            : this.web3.utils.fromWei(totalEthToSwap) - swapAmount.swapAmt,
        },
        tokenAddress: strategy[0],
        ethInTx: this.web3.utils.fromWei(tx.value),
        pairPriceAfterTrade,
      };

      txObj = this.processData(txObj, 'uniswap');

      return txObj;
    }

    if (
      sushiContractsAddresses.filter(item => item === strategyRaw[0]).length > 0
    ) {
      const strategy = this.getStrategy(strategyRaw[1]);
      // (uint256 ethReserve, uint256 fReserve) = lpToken.token0() == weth ? (r0, r1) : (r1, r0);
      const sushiPairContract = await this.uniSushiStrategy.getPairContract(
        strategy[0],
        SUSHI,
      );

      const reserves = await this.uniSushiStrategy.getTradingPairReserves(
        sushiPairContract,
      );

      const token0 = await sushiPairContract.methods.token0().call();

      let swapAmount;

      if (token0 === this.uniSushiStrategy.wethAddress) {
        swapAmount = await this.optimalSwapAmount(
          totalEthToSwap,
          strategy[1],
          reserves._reserve0,
          reserves._reserve1,
        );
      } else {
        swapAmount = await this.optimalSwapAmount(
          totalEthToSwap,
          strategy[1],
          reserves._reserve1,
          reserves._reserve0,
        );
      }

      let txObj = {
        targetAddress: this.targetAddress,
        etherscanLink: `https://etherscan.io/tx/${tx.hash}`,
        decodedInput,
        decodedDataParam: strategy,
        toSwap: swapAmount,
        toLiquidity: {
          ETH: swapAmount.isToken
            ? this.web3.utils.fromWei(totalEthToSwap)
            : this.web3.utils.fromWei(totalEthToSwap) - swapAmount.swapAmt,
        },
        tokenAddress: strategy[0],
        ethInTx: this.web3.utils.fromWei(tx.value),
      };

      txObj = this.processData(txObj, 'sushiswap');

      return txObj;
    }
    this.logger.error({ tx, strategyRaw });
  }

  processData(data, provider) {
    if (data) {
      const ethLoan = this.web3.utils.fromWei(
        data.decodedInput.params[2].value,
      );
      return `AlphaFinance, ${
        provider === 'uniswap' ? 'Uniswap' : 'SushiSwap '
      }, StrategyAddTwoSidesOptimal:
      Loan ETH: ${ethLoan}
      Amount to swap: ${data.toSwap.swapAmt}${
        data.toSwap.isReversed
          ? ` tokens https://etherscan.io/token/${data.tokenAddress}`
          : ' ETH'
      }

      ${
        data.pairPriceAfterTrade
          ? `Execution price: ${data.pairPriceAfterTrade.executionPrice}
      NextMiddle price: ${data.pairPriceAfterTrade.nextMidPrice}`
          : ''
      }

      Swap token: https://etherscan.io/token/${data.tokenAddress}
      Transaction: ${data.etherscanLink}
    `;
    }
  }

  async optimalSwapAmount(amtA, amtB, resA, resB) {
    let swapAmt;
    let isReversed;

    const ethAmount = new BN(amtA);
    const tAmount = new BN(amtB);
    const resEth = new BN(resA);
    const resT = new BN(resB);

    if (ethAmount.mul(resT) >= tAmount.mul(resEth)) {
      swapAmt = this.web3.utils.fromWei(
        this._optimalDeposit(ethAmount, tAmount, resEth, resT),
      );
      isReversed = false;
    } else {
      swapAmt = this.web3.utils.fromWei(
        this._optimalDeposit(tAmount, ethAmount, resT, resEth),
      );
      isReversed = true;
    }
    return { swapAmt, isReversed };
  }

  _optimalDeposit(amtA, amtB, resA, resB) {
    if (!amtA.mul(resB).gte(amtB.mul(resA))) {
      throw new Error('Reversed');
    }

    const a = new BN(997);
    let b = new BN(1997);
    b = b.mul(resA);
    const _c = new BN(amtA.mul(resB).sub(amtB.mul(resA)));
    const c = new BN(
      _c
        .mul(new BN(1000))
        .div(amtB.add(resB))
        .mul(resA),
    );
    const d = new BN(a.mul(c).mul(new BN(4)));
    let e = new BN(b.mul(b).add(d));
    e = BigInt(Math.sqrt(e.toString()));
    e = new BN(e.toString());

    const numerator = e.sub(b);
    const denominator = new BN(a.mul(new BN(2)));

    return numerator.div(denominator).toString();
  }

  getStrategy(rawStrategy) {
    return this.web3.eth.abi.decodeParameters(
      ['address', 'uint256', 'uint256'],
      rawStrategy,
    );
  }
}

module.exports = AlphaFinance;
