const abiDecoder = require('abi-decoder');
const BN = require('bn.js');

const alphaFinanceAbi = require('../../abi/alphaFin.json');

const { UniSushiStrategy } = require('./alpha');

const UNI = 'uni';
const SUSHI = 'sushi';

class AlphaFinance {
  constructor(web3) {
    this.web3 = web3;

    this.targetAddress = '0x67B66C99D3Eb37Fa76Aa3Ed1ff33E8e39F0b9c7A';

    this.strategyAddTwoSidesOptimalUniswap =
      '0xa57F64458D85073911263E4E92C9913805C45d0d';
    this.strategyAddTwoSidesOptimalUniswap2 =
      '0xf98eD25a82F1731578E016fA0145FFfa0Dc517C3';
    this.strategyAddTwoSidesOptimalUniswap3 =
      '0x29797c05706689b41d8024CB42996aB36B5bC815';
    this.strategyAddTwoSidesOptimalSushi =
      '0x3721dCD1C1793f945006a967A91Da81562d1B588';
    this.strategyAddTwoSidesOptimalSushi2 =
      '0x5f8C47B5613B58a2dEC567C7b0F5BEd9022a0520';
    this.strategyAddTwoSidesOptimalSushi3 =
      '0x37BCEb01eaFdDfe8D36FdE3D3b6A380f7e1a452C';
    this.strategyAddTwoSidesOptimalSushi4 =
      '0x68076327B91Ed5AaCe79A0Ab26015EA930810d72';

    this.uniSushiStrategy = new UniSushiStrategy(web3);

    abiDecoder.addABI(alphaFinanceAbi);
  }

  async decodeInput(tx) {
    const ethSentWithTx = tx.value;
    const decodedInput = await abiDecoder.decodeMethod(tx.input);
    const loanETH = decodedInput.params[2].value;
    const totalEthToSwap = new BN(ethSentWithTx)
      .add(new BN(loanETH))
      .toString();
    const strategyRaw = this.web3.eth.abi.decodeParameters(
      ['address', 'bytes'],
      decodedInput.params[4].value,
    );

    if (
      strategyRaw[0] === this.strategyAddTwoSidesOptimalUniswap ||
      strategyRaw[0] === this.strategyAddTwoSidesOptimalUniswap2 ||
      strategyRaw[0] === this.strategyAddTwoSidesOptimalUniswap3
    ) {
      const strategy = this.web3.eth.abi.decodeParameters(
        ['address', 'uint256', 'uint256'],
        strategyRaw[1],
      );
      const uniPairContract = await this.uniSushiStrategy.getPairContract(
        strategy[0],
        UNI,
      );
      const reserves = await this.uniSushiStrategy.getTradingPairReserves(
        uniPairContract,
      );

      const swapAmount = await this.optimalSwapAmount(
        totalEthToSwap,
        strategy[1],
        reserves._reserve1,
        reserves._reserve0,
      );

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

      txObj = this.processData(txObj);

      return txObj;
    }

    if (
      strategyRaw[0] === this.strategyAddTwoSidesOptimalSushi ||
      strategyRaw[0] === this.strategyAddTwoSidesOptimalSushi2 ||
      strategyRaw[0] === this.strategyAddTwoSidesOptimalSushi3 ||
      strategyRaw[0] === this.strategyAddTwoSidesOptimalSushi4
    ) {
      const strategy = this.web3.eth.abi.decodeParameters(
        ['address', 'uint256', 'uint256'],
        strategyRaw[1],
      );

      const sushiPairContract = await this.uniSushiStrategy.getPairContract(
        strategy[0],
        SUSHI,
      );
      const reserves = await this.uniSushiStrategy.getTradingPairReserves(
        sushiPairContract,
      );

      const swapAmount = await this.optimalSwapAmount(
        totalEthToSwap,
        strategy[1],
        reserves._reserve1,
        reserves._reserve0,
      );

      return {
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
    }
  }

  processData(data) {
    if (data) {
      const ethLoan = this.web3.utils.fromWei(
        data.decodedInput.params[2].value,
      );
      return `AlphaFinance, Uniswap, StrategyAddTwoSidesOptimal:
      Loan ETH: ${ethLoan} Amount to swap: ${data.toSwap.swapAmt}${
        data.toSwap.isToken
          ? `token https://etherscan.io/token/${data.tokenAddress}`
          : 'ETH'
      }
      Execution price: ${data.pairPriceAfterTrade.executionPrice}
      NextMiddle price: ${data.pairPriceAfterTrade.nextMidPrice}
      Swap token: https://etherscan.io/token/${data.tokenAddress}
      Transaction: ${data.etherscanLink}
    `;
    }
  }

  async optimalSwapAmount(amtA, amtB, resA, resB) {
    let swapAmt;
    let isToken;

    const ethAmount = new BN(Math.trunc(this.web3.utils.fromWei(amtA)));
    const tAmount = new BN(Math.trunc(this.web3.utils.fromWei(amtB)));
    const resEth = new BN(Math.trunc(this.web3.utils.fromWei(resA)));
    const resT = new BN(Math.trunc(this.web3.utils.fromWei(resB)));

    if (ethAmount.mul(resT) >= tAmount.mul(resEth)) {
      swapAmt = this._optimalDeposit(ethAmount, tAmount, resEth, resT);
      isToken = false;
    } else {
      swapAmt = this._optimalDeposit(tAmount, ethAmount, resT, resEth);
      isToken = true;
    }
    return { swapAmt, isToken };
  }

  _optimalDeposit(amtA, amtB, resA, resB) {
    if (!amtA.mul(resB).gte(amtB.mul(resA))) {
      return null;
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
    e = Math.sqrt(e.toString());
    e = new BN(Math.trunc(e));

    const numerator = e.sub(b);
    const denominator = new BN(a.mul(new BN(2)));

    return numerator.div(denominator).toString();
  }
}

module.exports = AlphaFinance;
