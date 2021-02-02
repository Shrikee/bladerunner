const {
  ChainId,
  Token,
  WETH,
  Fetcher,
  Trade,
  Route,
  TokenAmount,
  TradeType,
} = require('@uniswap/sdk');

class Uniswap {
  constructor() {
    this.mainnet = ChainId.MAINNET;
  }

  async pairPrice(tokenAddress, amount) {
    const token = new Token(this.mainnet, tokenAddress, 18);
    const pair = await Fetcher.fetchPairData(token, WETH[this.mainnet]);
    const route = new Route([pair], WETH[token.chainId]);

    const trade = new Trade(
      route,
      new TokenAmount(WETH[token.chainId], amount),
      TradeType.EXACT_INPUT
    );

    return {
      executionPrice: trade.executionPrice.toSignificant(6),
      nextMidPrice: trade.nextMidPrice.toSignificant(6),
    };
  }
}

module.exports = Uniswap;
