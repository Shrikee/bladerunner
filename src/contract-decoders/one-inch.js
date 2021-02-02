const abiDecoder = require('abi-decoder');
const axios = require('axios');
const oneInchAbi = require('../../abi/inchAbiNew.json');
const oneSplitAudit = require('../../abi/1split.json');

class OneInch {
  constructor(web3) {
    this.web3 = web3;
    this.targetAddress = '0x111111125434b319222CdBf8C261674aDB56F3ae';
    this.ethToken = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
    this.oneSplitAuditAddress = '0xC586BeF4a0992C495Cf22e1aeEE4E446CECDee0E';

    this.oneSplitWrap = new web3.eth.Contract(
      oneSplitAudit,
      this.oneSplitAuditAddress,
    );

    abiDecoder.addABI(oneInchAbi);
  }

  async decodeInput(tx) {
    const decodedInput = await abiDecoder.decodeMethod(tx.input);
    const swapParams = decodedInput.params[1].value;
    const getExpectedReturn = await this.oneSplitWrap.methods
      .getExpectedReturn(
        swapParams.srcToken,
        swapParams.dstToken,
        swapParams.amount,
        20,
        0,
      )
      .call();
    // IERC20 fromToken,
    // IERC20 toToken,
    // uint256 amount,
    // uint256 parts,
    // uint256 flags // See constants in IOneSplit.sol

    const { data } = await axios.get(
      `https://api.1inch.exchange/v2.0/quote?fromTokenAddress=${swapParams.srcToken}&toTokenAddress=${swapParams.dstToken}&amount=${swapParams.amount}`,
    );

    return this.formatData(tx, decodedInput, data);
  }

  formatData(tx, decodedInput, data) {
    return `
    1inch exchange:
    Swap: ${data.fromTokenAmount} ${
      decodedInput.params[1].value.srcToken === this.ethToken
        ? 'ETH'
        : `https://etherscan.io/token/${decodedInput.params[1].value.srcToken}`
    }
    for: ${
      decodedInput.params[1].value.dstToken === this.ethToken
        ? 'ETH'
        : `https://etherscan.io/token/${decodedInput.params[1].value.dstToken}`
    }
    Amount: ${data.toTokenAmount}
    TX: https://etherscan.io/tx/${tx.hash}
    `;
  }
}

module.exports = OneInch;
